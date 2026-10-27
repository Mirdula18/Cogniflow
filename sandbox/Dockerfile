# Skeleton for the CogniFlow analysis sandbox. Design: docs/SANDBOX.md.
# NOT built or run in P3: no untrusted code executes anywhere yet.
#
# The limits that make this a sandbox (--network none, CPU, memory, PIDs, read-only root, dropped
# capabilities) are flags on `docker run`, listed in docs/SANDBOX.md. They are not set by this file,
# so an image on its own is not isolated.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/workspace \
    MPLCONFIGDIR=/tmp/mpl

# Build time only: this is the only step that needs the network.
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Non-root user with no login shell and no home directory of its own.
RUN groupadd --gid 10001 sandbox \
 && useradd --uid 10001 --gid sandbox --no-create-home --shell /usr/sbin/nologin sandbox \
 && mkdir /workspace /data \
 && chown sandbox:sandbox /workspace

LABEL cogniflow.sandbox="1"

# /workspace: the only writable path (mounted as a size-limited tmpfs at run time).
# /data: the dataset, mounted read-only at run time.
WORKDIR /workspace
USER 10001:10001

# Placeholder. The cell runner (reads one JSON cell per line on stdin, runs it in a persistent
# interpreter, writes JSON results on stdout) is not written yet. `timeout` is the in-container
# backstop for the 30 minute hard lifetime; the host reaper is the primary control.
CMD ["timeout", "1800", "python", "-c", "import time; time.sleep(1800)"]
