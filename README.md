# VideoBrain

VideoBrain is a browser-native visual signal studio. Its **Signal Graph** combines typed control, text, and frame paths with a multipass GPU renderer in one static web application.

The proof of concept opens into a working composition and runs locally without an account, backend, or device permission. Connect signal nodes to visual parameters, rewire frame processors, tune values directly in the nodes, and watch the result update live.

## What is included

- Typed `control.f32`, `text.utf8`, and `frame.rgba` connections
- Demand-rooted graph compilation with cycle rejection
- Procedural GPU sources, warp, blend, trails, color grading, and display
- Transport/beat clocks, oscillator, pointer position/held/press/release,
  editable XY pad, and opt-in microphone controls
- Opt-in live camera frames with facing, fit, and mirror controls
- AI Chat prompt text and a Video Model node with a permission-free built-in
  visual preview plus compatible user-run local/API adapter modes
- Live WebGL2 output with play, pause, reset, fullscreen, and selectable
  display-synced/60/30 fps monitor pacing
- Node creation, connection, deletion, movement, and parameter editing
- A New patch menu with Blank Canvas and seven complete starter graphs
- Always-visible inline sliders, selects, and XY controls synchronized with the inspector
- Undo and redo for project edits
- Versioned local autosave plus JSON import and export
- Transactional import validation with bounded graph and GPU resource budgets
- Responsive editor layout and keyboard shortcuts
- Built-in Help & About guide with quick-start recipes and contribution links
- A production component catalog at [videobrain.org/storybook](https://videobrain.org/storybook/)
- Static AWS deployment through private S3, CloudFront, ACM, Route 53, and GitHub OIDC

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. The production build is fully static:

```bash
npm run verify
npm run preview
```

Run the component catalog separately during UI development:

```bash
npm run storybook
```

Build the complete deployable site, including the catalog, with
`npm run build:deploy`.

## Controls

| Action | Shortcut |
| --- | --- |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |
| Delete selected nodes or links | `Backspace` / `Delete` |
| Play or pause | `Space` while focus is outside a form control |
| Open node search | `/` |
| Dismiss a panel | `Escape` |

Camera and microphone input are optional and begin only after pressing their explicit enable controls. Without microphone access, the included Signal Graph uses a deterministic demo pulse. Its Video Model starts in a built-in procedural preview that performs no model inference or network request, so the default project requests neither device permission nor a server connection.

Use **New patch** to start from Blank Canvas, Full Studio, Beat-Synced
Color, Two-World Mixer, Pointer Bend, Mic Pulse Trails, Camera Dream, or
Prompted Visual Preview. The graph replacement is undoable, but it stops active
camera and microphone sessions, closes model connections, and clears
session-only model keys. Device-based starters remain in fallback mode until
access is explicitly enabled again.

Local/API model modes connect only to endpoints implementing the
`videobrain.frames.v1` adapter contract; arbitrary vendor endpoints are not
directly compatible. Endpoint URLs and prompts are project data, while API keys
remain in memory for the current tab and are never saved or exported. Camera
frames leave the tab only when Video Input is live, directly connected to a
Video Model, and its compatible WebSocket is connected. API mode and any
session key require HTTPS/WSS; credential-free plain transport is limited to a
Local loopback adapter. The hosted secure page rejects both `ws://` and
`http://` model endpoints, so use a local development page for a plaintext
loopback endpoint or give the adapter TLS.
Other visual inputs affect Preview mode locally but are not uploaded by this
release.

The monitor's frame-pacing menu defaults to **Display sync**, which renders once
per browser display callback. Choose **60 fps** or **30 fps** to cap GPU
work while keeping playback time synchronized. Fixed modes skip render slots on
the same animation-frame scheduler, so delayed callbacks do not accumulate timer
drift. The FPS readout is a rolling measurement of monitor renders.

## Project structure

```text
src/graph/       Serializable graph model, registry, validation, and planning
src/engine/      WebGL2 programs, texture passes, feedback state, and presentation
src/store/       Commands, history, persistence, and session state
src/components/  Editor, nodes, inspector, monitor, and application chrome
stories/         Production-component examples and state matrices
docs/            Architecture and MVP decision records
infra/           CloudFormation for the production static site
scripts/         Infrastructure bootstrap and manual deployment helpers
```

The editor never owns GPU resources, and the renderer never mutates the project. See [the architecture](docs/ARCHITECTURE.md), [the MVP decision](docs/MVP.md), the [model connector protocol](docs/MODEL_CONNECTORS.md), and the comprehensive [future-development catalog](docs/FUTURE_DEVELOPMENT.md) for the reasoning, node roadmap, I/O options, adapter boundary, and example patches.

Use the question-mark button in the app for a quick start, signal concepts, current nodes, starter recipes, device guidance, and direct contribution links.

## Deployment

Pull requests and pushes are verified by GitHub Actions. A push to `main` deploys only when the four AWS repository variables described in [the infrastructure guide](infra/README.md) are present. The workflow uses short-lived GitHub OIDC credentials; it does not require stored AWS access keys.

The infrastructure helper provisions the production stack for `videobrain.org` after checking the hosted zone and existing apex records. Review its preflight output before confirming any AWS change.

## Status

This is an intentionally focused proof of concept. The built-in Video Model preview is a visual stand-in, not an inference runtime. Three-dimensional scenes, arbitrary scripting, custom shaders, bundled model execution, cloud projects, collaboration, and sample-accurate audio processing remain outside the first release.
