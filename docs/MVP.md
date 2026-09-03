# VideoBrain Browser MVP

Status: implementation decision for the first end-to-end proof of concept.

## Product question

The MVP must answer one question: can a user build and manipulate a live, convincing visual system entirely in a browser through a node graph?

The demo succeeds when editing the graph feels immediate, control signals visibly animate image parameters, the project survives a reload, and no native helper or rendering service is required.

## Decision

Build a static, client-only TypeScript application with:

- React and `@xyflow/react` for the editor;
- Zustand for project and session commands;
- WebGL2 for frame generation and processing;
- a small CPU evaluator for scalar and vector controls;
- one visible output canvas driven by the browser display clock;
- versioned JSON plus local storage for persistence.

WebGL2 is the only rendering backend required for the MVP. The runtime will hide it behind a renderer interface so WebGPU can be added without changing graph semantics.

This decision tests the actual product architecture while retaining broad browser reach and static hosting. It avoids the latency, cost, authentication, and lifecycle complexity of a remote renderer.

## Options considered

| Option | Strengths | Costs and limitations | Decision |
| --- | --- | --- | --- |
| Canvas 2D | Very fast to prototype; simple debugging | Limited shader composition and poor fit for multi-pass visual processing | Use only for editor decoration or fallback messaging |
| WebGL2 visual graph | Broad support; direct texture-to-texture passes; enough capability for rich 2D effects | Manual GPU resource management and shader plumbing | Selected |
| WebGPU visual graph | Modern compute and resource model; strong path to points and simulation | More implementation surface and greater device variance than the POC needs | Add behind the renderer interface later |
| CPU processing in WebAssembly | Portable for algorithms with mature native libraries | Moving full image frames between CPU and GPU undermines the live pipeline | Add selectively, not as the visual backbone |
| Remote desktop runtime | Can expose mature effects quickly | Not standalone; setup and connection failure become part of every demo | Rejected |
| Cloud rendering streamed to the browser | Centralized high-end compute | Persistent cost, latency, media transport, accounts, and operations | Revisit only for workloads that cannot run locally |

## Demo experience

The application opens directly into a working project. The user can:

1. see the animated result immediately;
2. pan, zoom, select, and move nodes;
3. add a node from a searchable palette;
4. connect compatible ports and receive clear feedback for invalid connections;
5. edit a node from its visible inline controls or the selected-node inspector;
6. connect a control output to a visual parameter and see it animate;
7. play, pause, reset, and enter a focused output view;
8. undo and redo graph edits;
9. reload the page and recover the saved project;
10. import or export the project as JSON.

The default composition should be attractive without media permissions. A procedural pattern passes through transform and color stages into the output, with periodic control nodes driving motion and color. A Delay-based trail can be included if it is stable before launch. Camera and microphone inputs remain optional and activate only after an explicit user action.

## MVP scope

### Editor

- Infinite graph canvas with pan and zoom.
- Select, move, connect, disconnect, create, duplicate, and delete.
- Searchable node palette.
- Custom node cards with category, name, typed ports, reachability state, and always-visible parameter controls.
- Inspector with parameter sliders and operator details.
- Distinct visual treatment for `frame` and `control` connections.
- Toolbar for transport, undo, redo, reset project, import, export, and focused output.
- Keyboard deletion and escape-to-cancel for core interactions.

### Implemented frame nodes

- Video Input with explicit opt-in camera access, facing preference, fit, and mirror controls.
- Flow Field and Cells procedural producers.
- Warp and two-input Blend processors.
- Trails with internally managed previous-frame state.
- Color Grade.
- Display output.

### Implemented control nodes

- Time.
- Oscillator with sine, triangle, saw, and square waveforms.
- Pointer position.
- XY Pad with normalized, independently connectable X and Y values.
- Audio Level with deterministic demo input and explicit opt-in microphone analysis.

Every animatable numeric visual parameter uses the same typed control-port mechanism. The graph does not rely on node-specific animation wiring.

### Deferred node breadth

- Solid color, uploaded image, blur, and general transform processors.
- Constant, arithmetic, range mapping, smoothing, and sample-and-hold controls.
- A general-purpose Delay node beyond the retained state inside Trails.

### Runtime

- Typed port validation.
- Reachability from display outputs, with the first connected display presented.
- Topological execution planning.
- Detection and rejection of zero-delay cycles.
- Stable elapsed-time behavior when frame rate changes.
- Shader and renderer failures shown in the output monitor.
- WebGL context-loss messaging and recovery.
- Resolution and pixel-density caps.
- Throttled frames-per-second and GPU-pass counters.

### Persistence

- Versioned project schema.
- Debounced local autosave.
- JSON import/export.
- A known-good built-in project used when saved data is absent or invalid.

## Explicitly out of scope

- Three-dimensional scenes and geometry processing.
- Sample-accurate audio generation or effects.
- Arbitrary JavaScript execution.
- User-authored shader code.
- Third-party node packages.
- Nested modules.
- Multi-user collaboration.
- Accounts or cloud project storage.
- Server-side rendering.
- Video recording and codec selection.
- Mobile-first graph editing.
- Compatibility with another product's files, node catalog, or terminology.

## Runtime budgets

The initial target is a current desktop browser on an integrated or discrete GPU.

| Budget | Target |
| --- | --- |
| Output resolution | Responsive canvas, capped to 1.5× device pixel ratio |
| Visual rate | Smooth 60 Hz where hardware permits; no correctness dependency on 60 Hz |
| UI response | Parameter changes visible by the next rendered frame |
| Default graph | 12 nodes and 7 GPU passes |
| Startup | Working default output without a network request after assets load |
| Persistence | Autosave without visible frame hitching |

Quality should degrade predictably. The UI reports measured frame rate and does not alter the project silently.

## Acceptance criteria

The POC is complete when all of the following are demonstrable in a production build:

- The built-in project renders immediately after page load.
- Adding, removing, and rewiring supported nodes changes the output correctly.
- At least one periodic control visibly modulates a transform parameter.
- One control can be rewired to a color or mix parameter without custom code.
- Incompatible connections are rejected before entering project state.
- A malformed project import leaves the current project intact and reports an error.
- Export followed by import reproduces node positions, parameters, and connections.
- Undo and redo cover node, edge, and parameter commands.
- Pausing freezes time-dependent output; reset produces a deterministic initial state.
- Shader and graphics-context failures are surfaced visibly, and context restoration rebuilds runtime resources.
- The build, unit tests, and a browser smoke test pass in CI.

## Main risks and mitigations

### Editor and renderer contend for the main thread

Keep editor state updates out of the frame loop, memoize node views, and throttle diagnostics. Preserve a renderer boundary that can move to an offscreen worker after profiling.

### GPU resources leak during graph edits

Make the renderer the sole owner of GPU objects and dispose resources when a plan is replaced. Texture pooling remains a measured follow-up optimization.

### Feedback creates unstable cycles

Reject all ordinary cycles. Permit retained state only through the Delay contract with separate read and commit phases and a deterministic reset.

### Browser suspension causes large time jumps

Use monotonic timestamps, cap simulation catch-up, and reset or clamp excessive elapsed intervals after a tab resumes.

### Media permissions damage the first-run experience

The built-in project uses no protected device. Camera and microphone activation are optional, user initiated, and explain why permission is needed.

### Remote assets fail because of origin policy

Prefer uploads, packaged assets, and same-origin URLs. Validate remote responses and explain that a server must explicitly permit use as a visual input.

### Browser and GPU behavior differs

Perform capability checks before project startup, use conservative texture formats, keep shader variants small, and show an actionable unsupported-browser screen.

### Scope expands into a node-catalog race

Judge the MVP by graph fluency, modulation, visual quality, and reliability. Add node breadth only after the contracts for ports, parameters, diagnostics, and persistence are proven.

## Roadmap

### Phase 0: end-to-end POC

- Complete the graph editor and inspector.
- Implement the selected frame and control nodes.
- Ship the built-in composition, output view, local persistence, and core tests.
- Publish as a static application over HTTPS.

### Phase 1: durable browser instrument

- Add texture pooling, better GPU timing, adaptive resolution, and offscreen-worker evaluation.
- Harden camera and microphone inputs; add media upload and recording.
- Add richer control mapping, events, presets, and reusable modules.
- Expand browser and accessibility testing.

### Phase 2: modern compute and extensibility

- Add a WebGPU backend with compute-oriented nodes.
- Add point and geometry data types.
- Define a signed, versioned node-package format with capability declarations.
- Add a constrained shader authoring experience.

### Phase 3: connected workflows

- Add cloud project storage and shareable links.
- Add collaborative command synchronization.
- Expose an authenticated automation gateway with schema discovery, transactional graph edits, diagnostics, and preview capture.
- Evaluate optional cloud execution separately from the local browser runtime.

Each phase should extend the same project schema and command model rather than introducing a parallel representation.
