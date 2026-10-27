# UI specification

## Screens

### 1. Landing (`/`)
One-line value statement, "Open workspace" button, and a short "How it works" strip: Upload → Ask → Watch steps → Verify. Shows the mock-mode badge when active.

### 2. Workspace (`/workspace`) — main screen, 3 panels

```
┌──────────────┬───────────────────────────────┬──────────────────────┐
│ DATA (280px) │ RUN (flex)                    │ RESULTS (420px)      │
│ Dataset pick │ Query box + suggestions       │ Chart canvas         │
│ Upload zone  │ Step timeline                 │ Table / metric cards │
│ Profile:     │  └ step card: goal, status,   │ Findings summary     │
│  rows, cols, │    code (collapsible), retry  │ Verified / Not       │
│  issues list │ Terminal (xterm, 200px)       │ verified badge       │
└──────────────┴───────────────────────────────┴──────────────────────┘
```

Below 1024px wide, panels become tabs: Data · Run · Results.

### 3. History (`/history`)
Table of runs this session: question, dataset, status, duration; click to replay the stored events.

## Components and states

| Component | States |
| --- | --- |
| UploadDropzone | idle, dragging, uploading (progress), error (type/size), done |
| ProfilePanel | loading skeleton, loaded, issues highlighted (amber chips with icon + text) |
| QueryBox | empty (disabled send), typing, submitting, disabled while run active |
| StepCard | pending, running (spinner), retrying (attempt n/3), ok, failed |
| Terminal | streams stdout; errors in red with "Error" prefix text |
| ChartCanvas | empty hint, loading, chart, render error |
| FindingsPanel | empty, streaming, final; numbers in summary are clickable and highlight the source artifact |
| VerifiedBadge | "Steps shown — review before use" (succeeded) · "Not verified — send to analyst" (not_verified) |

## Visual system

- Font: Inter (UI), JetBrains Mono (code / terminal)
- Colour: neutral slate base; one accent (teal `#0F766E`); amber for data issues; red only for errors
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32; radius 8 for controls, 12 for cards
- Dark mode via Tailwind `class` strategy
- Status always shown with icon + text, never colour alone

## Copy rules

- Plain language for PMs: "Cleaning dates" not "Coercing dtype".
- Demo badge text: "Demo scenario — scripted data".
- Never claim accuracy in UI copy.
