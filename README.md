# VideoBrain

VideoBrain is a browser-native visual signal studio. It combines a typed node editor, a real-time control graph, and a multipass GPU renderer in one static web application.

The proof of concept opens into a working composition and runs locally without an account, backend, or device permission. Connect signal nodes to visual parameters, rewire frame processors, tune the selected node, and watch the result update live.

## What is included

- Typed `control.f32` and `frame.rgba` connections
- Demand-rooted graph compilation with cycle rejection
- Procedural GPU sources, warp, blend, trails, color grading, and display
- Clock, oscillator, pointer, and opt-in microphone controls
- Opt-in live camera frames with facing, fit, and mirror controls
- Live WebGL2 output with play, pause, reset, and fullscreen modes
- Node creation, connection, deletion, movement, and parameter editing
- Undo and redo for project edits
- Versioned local autosave plus JSON import and export
- Transactional import validation with bounded graph and GPU resource budgets
- Responsive editor layout and keyboard shortcuts
- Built-in Help & About guide with quick-start recipes and contribution links
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

## Controls

| Action | Shortcut |
| --- | --- |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |
| Delete selected nodes or links | `Backspace` / `Delete` |
| Play or pause | `Space` while focus is outside a form control |
| Open node search | `/` |
| Dismiss a panel | `Escape` |

Camera and microphone input are optional and begin only after pressing their explicit enable controls. Without microphone access, the included composition uses a deterministic demo pulse. The built-in composition does not request either permission.

## Project structure

```text
src/graph/       Serializable graph model, registry, validation, and planning
src/engine/      WebGL2 programs, texture passes, feedback state, and presentation
src/store/       Commands, history, persistence, and session state
src/components/  Editor, nodes, inspector, monitor, and application chrome
docs/            Architecture and MVP decision records
infra/           CloudFormation for the production static site
scripts/         Infrastructure bootstrap and manual deployment helpers
```

The editor never owns GPU resources, and the renderer never mutates the project. See [the architecture](docs/ARCHITECTURE.md), [the MVP decision](docs/MVP.md), and the comprehensive [future-development catalog](docs/FUTURE_DEVELOPMENT.md) for the reasoning, node roadmap, I/O options, and example patches.

Use the question-mark button in the app for a quick start, signal concepts, current nodes, starter recipes, device guidance, and direct contribution links.

## Deployment

Pull requests and pushes are verified by GitHub Actions. A push to `main` deploys only when the four AWS repository variables described in [the infrastructure guide](infra/README.md) are present. The workflow uses short-lived GitHub OIDC credentials; it does not require stored AWS access keys.

The infrastructure helper provisions the production stack for `videobrain.org` after checking the hosted zone and existing apex records. Review its preflight output before confirming any AWS change.

## Status

This is an intentionally focused proof of concept. Three-dimensional scenes, arbitrary scripting, custom shaders, cloud projects, collaboration, and sample-accurate audio processing remain outside the first release.
