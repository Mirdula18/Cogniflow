# Sandbox design (T20)

> **Design and skeleton only.** Nothing in this document has been built, run or tested. The P3 demo runs in mock mode and executes no generated code. The `sandbox/Dockerfile` is a skeleton that has not been built.

## 1. Why

The agent writes Python and runs it on a user's file. That code is untrusted: the model can make mistakes, and text inside a cell of the data can try to steer the model (prompt injection). The sandbox has to contain the worst case so that generated code cannot reach the host, the network, other runs' data or any secret. It also keeps a runaway cell from taking the machine down.

Out of scope for P3: multi-tenant hosting, GPUs, GUI libraries, installing packages at run time.

## 2. Shape

```
API (FastAPI) ──► orchestrator ──docker run──► one container per run
                       │                          ├─ /data       dataset, read-only
                       │   JSON lines via         ├─ /workspace  scratch, size-limited tmpfs
                       └── docker attach ───────► └─ runner: persistent Python interpreter
```

- **One container per run**, started when the run starts and removed when it ends. Cells of the same run share the interpreter, so a variable from step 1 is there in step 2 (as in the scenarios).
- **No network in the container, so no network channel to it either.** The orchestrator talks to the runner over stdin and stdout (`docker attach`): one JSON cell per line in, one JSON result per line out (`stdout`, `error`, artifact). No ports, no sockets, no shared volume for commands.
- Everything that comes back is untrusted. The orchestrator validates it against the event contract (`docs/API_CONTRACT.md`) before it becomes a `RunEvent`: table rows at most 100, chart JSON under a size cap, stdout truncated at 1 MB per cell.
- The model sees the schema, the profile and error text, not the full raw data where that can be avoided (`docs/ARCHITECTURE.md` §6).

## 3. Controls

| Control | Setting | What it stops |
| --- | --- | --- |
| Non-root | `USER 10001:10001` in the image, and `--user 10001:10001` | Root inside the container |
| No privileges | `--cap-drop ALL`, `--security-opt no-new-privileges` | Gaining capabilities through setuid binaries |
| No network | `--network none` | Data leaving, calls to internal services, downloads |
| CPU | `--cpus 1` | One cell starving the host |
| Memory | `--memory 1g --memory-swap 1g` | Large allocations; the container is OOM-killed, not the host |
| Processes | `--pids-limit 128`, `--ulimit nproc=128` | Fork bombs |
| Files | `--ulimit nofile=256:256`, `--ulimit fsize=104857600`, `--ulimit core=0` | Descriptor exhaustion, huge files, core dumps |
| Read-only root | `--read-only` | Changing the image or installed libraries |
| Writable paths | `--tmpfs /workspace:rw,nosuid,nodev,noexec,size=256m`, `--tmpfs /tmp:rw,nosuid,nodev,noexec,size=64m` | Filling the host disk; running dropped binaries |
| Input data | `-v <run dir>/input:/data:ro` | Changing or deleting the source file |
| Profile | Docker default seccomp and AppArmor profiles | Dangerous syscalls. A tighter custom profile can come later |
| Environment | No variables passed, no credentials, no mounted sockets | Secrets in the container |
| Cell timeout | **60 s**, enforced by the orchestrator (see §4) | Infinite loops |
| Run limits | 3 attempts per step (contract), 10 minute total wall time per run | Endless retry loops |

## 4. Cell timeout (60 s)

The orchestrator owns the clock, not the runner, because code inside the container cannot be trusted to stop itself.

1. Orchestrator sends a cell and starts a 60 s timer.
2. On timeout it sends `SIGINT` to the interpreter (`docker kill --signal INT`) and waits 5 s.
3. If the cell is still running it kills and removes the container.
4. It emits `error` with `error_type: "TimeoutError"` and message "Cell exceeded 60 s"; the normal retry path applies (up to 3 attempts per step). A killed container loses interpreter state, so the next attempt starts a new container and re-runs the earlier steps' code.

The runner also arms `signal.alarm(60)` per cell as a second layer. It is a backstop only.

## 5. Idle reaper

Containers must never outlive the run that owns them.

- The orchestrator keeps a registry: `run_id -> {container_id, started_at, last_activity}`. Every container is started with `--rm` and the label `cogniflow.sandbox=1` (set in the image and on `docker run`), plus `cogniflow.run_id=<id>`.
- A background task runs every 30 s and kills and removes any container that is **idle for more than 5 minutes** (no cell sent or result received) or **older than 30 minutes** (hard lifetime).
- **On API startup**, before accepting runs, it removes every container with the label `cogniflow.sandbox=1`. That clears orphans left by a crash.
- **On shutdown** it kills the registry's containers (best effort).
- **In-container backstop:** the image's command is wrapped in `timeout 1800`, so a container ends by itself after 30 minutes even if the host forgets it.
- Per-run input directories on the host are deleted when the run ends or the container is reaped.

## 6. Reference `docker run` (not executed)

```bash
docker run --rm -i \
  --name cogniflow-r_001 \
  --label cogniflow.sandbox=1 --label cogniflow.run_id=r_001 \
  --network none \
  --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges \
  --cpus 1 --memory 1g --memory-swap 1g --pids-limit 128 \
  --ulimit nproc=128 --ulimit nofile=256:256 --ulimit fsize=104857600 --ulimit core=0 \
  --read-only \
  --tmpfs /workspace:rw,nosuid,nodev,noexec,size=256m \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=64m \
  -v "$RUN_DIR/input:/data:ro" \
  cogniflow-sandbox:dev
```

## 7. The five safety checks (`docs/POC_TEST_PLAN.md`)

Expected behaviour if the controls work. **None of these has been run.** The pass threshold is 0 escapes in 5 checks; results go in the test plan's table only after a real run.

| Check | Control expected to stop it | Expected result |
| --- | --- | --- |
| Attempted network call | `--network none` | Connection fails; cell raises an error |
| File read outside `/workspace` (for example `/etc/shadow`, host paths) | Non-root user, no host mounts, `/data` read-only | Permission denied or file not found; nothing from the host is visible |
| Fork bomb | `--pids-limit 128`, `ulimit nproc` | Fork fails; cell errors or hits the 60 s timeout; host unaffected |
| 10 GB allocation | `--memory 1g --memory-swap 1g` | Container OOM-killed; orchestrator reports failure and starts a fresh container for the retry |
| Infinite loop | 60 s timeout (§4) | Cell killed at 60 s; `TimeoutError` event |

## 8. Risks and open questions

1. **The orchestrator needs to start containers, which usually means access to the Docker socket.** That is root-equivalent on the host, so a bug in the API would be as serious as an escape. Options: rootless Docker, or a small separate runner service that only accepts "start run / send cell / stop run" and is the only thing with the socket. Decide before any real execution.
2. **Containers share the host kernel.** For stronger isolation use gVisor (`--runtime=runsc`) or Firecracker. Worth it if the tests in §7 show any weakness, or before real client data is used.
3. **Docker Desktop on Windows and macOS runs a Linux VM**, so limits behave a little differently from a Linux server. Run the five checks on the machine that will host the demo.
4. **Supply chain.** Pin the base image by digest and install libraries with `--require-hashes`. The skeleton pins versions only.
5. **Cold start.** A container per run adds roughly one to two seconds before the first cell (to be measured). A pre-warmed pool is possible but adds state to manage.
6. **Output trust.** Plotly JSON from generated code is data, but its size and shape must be capped before it reaches the browser.

## 9. Not done here

The runner program, the orchestrator and reaper code, building or running the image, and the five checks. Next step after T20: write the runner and orchestrator against this design, then run §7 and record the results.
