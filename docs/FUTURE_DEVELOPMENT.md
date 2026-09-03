# VideoBrain Future Development

This document is the working product map for a browser-native visual signal studio. It records what exists, what should come next, the larger node catalog worth exploring, useful demonstration patches, browser I/O boundaries, and engineering lessons that are cheapest to preserve while the codebase is still small.

It is intentionally broader than a release plan. Items marked "explore" are ideas, not commitments. Priorities should continue to be driven by real patches, measured performance, browser support, accessibility, and contributor interest.

## Status and priority legend

| Mark | Meaning |
| --- | --- |
| ✅ Implemented | Available in the current proof of concept |
| 🚧 Next | High-value work for the durable browser instrument |
| 🧭 Planned | Fits the architecture, but is not scheduled yet |
| 🔬 Explore | Valuable research or a capability with unresolved product/technical questions |
| 🧩 Bridge | Requires, or works best with, a local/native gateway |
| ⛔ Boundary | Not directly available to a normal web page |

Priority labels used below:

- **P0** — preserve and harden what already makes the demo work.
- **P1** — makes everyday browser patching useful.
- **P2** — enables live shows, installations, and richer media work.
- **P3** — advanced creation, extensibility, and research.

## Product direction

VideoBrain should become an approachable live-media instrument, not merely a large list of effects. Five principles should guide the catalog:

1. **A useful patch opens instantly.** The default project requires no login, server, asset download, or device permission.
2. **Signals have clear types.** Invalid connections are rejected before they enter project state, and conversion is always explicit.
3. **The graph describes intent; the runtime owns resources.** Cameras, microphones, sockets, GPU textures, and device handles are session state and never serialized into project JSON.
4. **Local-first remains the baseline.** Network and cloud features extend the instrument; they do not become prerequisites for editing or playback.
5. **Live reliability is a feature.** Preflight checks, deterministic reset, useful errors, stable timing, and graceful quality reduction matter as much as visual breadth.

The most common creative workflows seen across the real-time visual community are strong guideposts: audio-reactive imagery, multi-layer VJ systems, projection mapping, feedback, GPU particles, camera and depth interaction, hand/body/face tracking, LED pixel mapping, lighting control, remote audience input, multi-camera switching, generative 3D scenes, network video, and increasingly ML-assisted live performance.

## Current proof of concept

The app currently has a typed graph, demand-rooted execution plan, WebGL2 multipass renderer, editor history, bounded JSON persistence, live diagnostics, and responsive UI.

### Implemented node catalog

| Domain | Node | Current behavior |
| --- | --- | --- |
| Control | ✅ Time | Monotonic playback time with speed and offset |
| Control | ✅ Oscillator | Sine, triangle, saw, and square modulation with frequency, phase, amplitude, and offset |
| Control | ✅ Pointer | Normalized pointer X and Y from the output stage |
| Control | ✅ Audio Level | Normalized energy with gain/floor controls; deterministic fallback until microphone access is explicitly enabled |
| Frame input | ✅ Video Input | Opt-in live camera frames with front/rear preference, cover/contain/stretch fit, and mirroring |
| Frame source | ✅ Flow Field | Procedural animated color field with time and energy modulation |
| Frame source | ✅ Cells | Procedural animated cellular field |
| Frame process | ✅ Warp | Flowing coordinate distortion with a control input for amount |
| Frame process | ✅ Blend | Normal, screen, add, and multiply composition of two frames |
| Frame process | ✅ Trails | Retained-frame accumulation with feedback control |
| Frame process | ✅ Color Grade | Hue, exposure, contrast, and saturation adjustment |
| Output | ✅ Display | Marks a frame path for presentation on the output stage |

### Implemented application modules

- ✅ Searchable operator library and keyboard command palette.
- ✅ Pan, zoom, select, move, connect, rewire, disconnect, duplicate, and delete.
- ✅ Typed `control.f32` and `frame.rgba` ports.
- ✅ Parameter inspector with gesture-aware undo history.
- ✅ Play, pause, deterministic reset, FPS, and GPU-pass diagnostics.
- ✅ Explicit microphone and camera permission controls.
- ✅ Fullscreen output.
- ✅ Versioned local autosave and transactional JSON import/export.
- ✅ Graph size, file size, resolution, pixel count, render-target, and pass budgets.
- ✅ Cycle rejection except for state intentionally retained inside Trails.
- ✅ Static HTTPS deployment design using private object storage and a CDN.

## Signal types to grow toward

Adding a node should start with its data contract. The renderer can change from WebGL2 to WebGPU; a stable project should not have to.

| Signal type | Status | Purpose |
| --- | --- | --- |
| `control.f32` | ✅ | A scalar sampled once per visual frame |
| `frame.rgba` | ✅ | A color texture in the current working color space |
| `control.bool` | 🚧 | Gates, toggles, comparisons, and device buttons |
| `event.trigger` | 🚧 | Discrete events that must not be confused with a sustained value |
| `control.vec2/3/4` | 🚧 | Coordinates, color, multi-axis sensors, and packed controls |
| `audio.block` | 🧭 | Sample-rate audio buffers evaluated by an audio clock |
| `audio.spectrum` | 🧭 | Frequency bins with sample rate, FFT size, and window metadata |
| `data.table` | 🧭 | Rows/columns for CSV, device maps, cues, and structured transforms |
| `data.json` | 🧭 | Bounded structured messages and API responses |
| `text.utf8` | 🧭 | Text rendering, labels, paths, and protocol payloads |
| `frame.depth` | 🧭 | Calibrated depth texture with unit/range metadata |
| `geometry.points` | 🔬 | GPU point buffers for particles, point clouds, and instances |
| `geometry.mesh` | 🔬 | Indexed geometry plus attributes |
| `material.pbr` | 🔬 | Render-state/resource description, not an image |
| `resource.asset` | 🔬 | A safe reference to an imported media asset |

Conversions should be explicit nodes: scalar-to-vector, spectrum-band-to-scalar, image-to-points, depth-to-points, table-column-to-channels, and render-to-frame. Avoid hidden coercion; it makes a patch difficult to inspect and automate.

## Node and module catalog

### Control, events, and timing

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P0 | ✅ Time, Oscillator, Pointer, Audio Level | Existing modulation baseline |
| P1 | 🚧 Constant | Reusable numeric value with named output |
| P1 | 🚧 Math | Add, subtract, multiply, divide, modulo, power, min, and max |
| P1 | 🚧 Map Range | Remap, clamp, wrap, fold, and optionally ease a range |
| P1 | 🚧 Smooth / Slew | Attack/release or rise/fall filtering for noisy controls |
| P1 | 🚧 Compare | Equal, greater, less, inside range, and changed |
| P1 | 🚧 Logic | AND, OR, XOR, NOT for boolean/event work |
| P1 | 🚧 Gate / Switch | Route one control from several sources |
| P1 | 🚧 Trigger | Convert thresholds and button edges into discrete events |
| P1 | 🚧 Hold / Latch | Retain a value until the next event |
| P1 | 🚧 Sample & Hold | Sample a signal on a trigger |
| P1 | 🚧 Random | Seeded values, impulses, walk, and noise |
| P1 | 🚧 Envelope | ADSR and multi-stage value curves |
| P1 | 🚧 Counter | Increment, decrement, wrap, and reset |
| P1 | 🚧 Timer | Duration, fraction, done event, repeat, and pause |
| P1 | 🚧 Vector | Compose/decompose 2D, 3D, 4D, and color values |
| P2 | 🧭 Step Sequencer | Rows of values/events clocked at a musical division |
| P2 | 🧭 Curve / Keyframes | Editable automation with interpolation and loop regions |
| P2 | 🧭 Spring | Position/velocity response for organic motion |
| P2 | 🧭 Clock | BPM, beat, bar, phrase, swing, and transport state |
| P2 | 🧭 Tap Tempo | Estimate tempo from user or device taps |
| P2 | 🧭 Quantize | Align events or values to rhythmic/time grids |
| P2 | 🧭 Cue List | Ordered show states with GO, back, hold, and notes |
| P2 | 🧭 State Machine | Explicit modes and guarded transitions for installations |
| P2 | 🧭 Date / Schedule | Wall clock, calendar rules, sunrise/sunset, opening hours |
| P3 | 🔬 Timecode | LTC/MTC parsing and frame-rate-aware position |
| P3 | 🔬 Expression | Safe, bounded expression language without arbitrary page access |

### Frame sources and media

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P0 | ✅ Video Input | User-enabled camera texture for the current session |
| P0 | ✅ Flow Field, Cells | Permission-free procedural sources |
| P1 | 🚧 Solid | Flat color with alpha |
| P1 | 🚧 Gradient | Linear, radial, conic, and multi-stop gradients |
| P1 | 🚧 Noise | Value, simplex-like, cellular, curl, and fractal variants |
| P1 | 🚧 Shape | Rectangle, ellipse, line, polygon, star, and rounded forms |
| P1 | 🚧 Text | Font asset, layout, alignment, wrapping, and live string input |
| P1 | 🚧 Image File | Drag/drop or picker import with orientation and color handling |
| P1 | 🚧 Video File | Local clip playback with loop, rate, seek, and frame metadata |
| P1 | 🚧 Screen Capture | User-selected tab, window, or display via browser capture prompt |
| P1 | 🚧 SVG | Safe rasterization of imported vector artwork |
| P1 | 🚧 Checker / Grid | Calibration, mapping, and debugging pattern |
| P1 | 🚧 Test Card | Resolution, color, frame number, and sync diagnostics |
| P2 | 🧭 Playlist / Clip Deck | Preload, cue, loop, transition, and asset-missing states |
| P2 | 🧭 Canvas Input | Capture a safe in-app drawing surface or UI component |
| P2 | 🧭 Browser Capture | Render an allowlisted same-origin page/component to a frame |
| P2 | 🧭 Network Image | CORS-aware still/image-sequence fetch with caching |
| P2 | 🧭 HLS/DASH Player | Browser/media-element stream ingest where platform codecs permit |
| P2 | 🧭 WebRTC Receiver | Low-latency remote camera/screen source |
| P2 | 🧩 Gateway Video | Frames delivered by a native gateway for specialist protocols |
| P3 | 🔬 Shader Source | Constrained custom shader with declared uniforms and budgets |
| P3 | 🔬 ML Image Source | Locally generated or remotely served model frames with queue policy |

### Frame processing and compositing

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P0 | ✅ Warp, Blend, Trails, Color Grade | Existing multipass processing core |
| P1 | 🚧 Transform 2D | Translate, scale, rotate, pivot, aspect fit, repeat, and edge mode |
| P1 | 🚧 Crop / Fit | Crop, letterbox, cover, contain, and safe-area guides |
| P1 | 🚧 Resize | Explicit resolution and filtering boundary |
| P1 | 🚧 Blur | Separable Gaussian/box blur with bounded radius |
| P1 | 🚧 Levels | Black/white points, gamma, lift, gain, and clamp |
| P1 | 🚧 HSV / HSL | Direct color component adjustment |
| P1 | 🚧 Threshold | Luma/color threshold with softness |
| P1 | 🚧 Luma Key | Generate alpha from luminance |
| P1 | 🚧 Chroma Key | Spill-aware foreground keying |
| P1 | 🚧 Matte / Mask | Apply, invert, multiply, and combine masks |
| P1 | 🚧 Composite | Full Porter-Duff and artistic blend modes |
| P1 | 🚧 Switch / Crossfade | Select or transition between N frame inputs |
| P1 | 🚧 Displace | Use another frame as an XY displacement field |
| P1 | 🚧 Edge | Sobel-like edges for style and vision pre-processing |
| P1 | 🚧 Pixelate | Resolution/grid quantization |
| P1 | 🚧 Tile / Kaleidoscope | Repeat, mirror, polar mirror, and symmetry |
| P1 | 🚧 Channel Shuffle | Reorder, extract, combine, and synthesize RGBA channels |
| P2 | 🧭 Bloom / Glow | Multi-resolution highlight glow |
| P2 | 🧭 Sharpen | Controlled high-frequency enhancement |
| P2 | 🧭 LUT | 1D/3D color lookup with asset validation |
| P2 | 🧭 Tone Map | HDR-to-display mapping and exposure strategy |
| P2 | 🧭 Lens | Distortion, vignette, chromatic offset, and calibration profile |
| P2 | 🧭 Film | Grain, halation-like glow, dust, scratches, and weave |
| P2 | 🧭 Dither | Ordered, blue-noise, and error-diffusion-inspired output |
| P2 | 🧭 Time Slice | Delay, frame hold, stutter, echo, and time displacement |
| P2 | 🧭 Motion Blur | Frame- or velocity-assisted temporal blur |
| P2 | 🧭 Optical Flow Warp | Motion-aware feedback and interpolation |
| P2 | 🧭 Multi-view Layout | Grid, picture-in-picture, split, and monitor wall |
| P2 | 🧭 Projection Warp | Corner pin, mesh warp, blend mask, and calibration points |
| P2 | 🧭 LED Pixel Map | Sample a canvas into fixture/channel ordering |
| P3 | 🔬 Reaction Diffusion | Persistent compute simulation |
| P3 | 🔬 Fluid | GPU velocity/dye simulation with deterministic reset |
| P3 | 🔬 Cellular Automata | General stateful grid simulation |
| P3 | 🔬 Depth Composite | Occlusion and depth-aware focus/fog |
| P3 | 🔬 Neural Effect | Segmentation, depth, style, or generation with explicit latency |

### Audio analysis and processing

Visual-rate analysis and sample-rate audio are different runtimes. An `AudioWorklet` should own sample-critical nodes; visual controls receive downsampled analysis values.

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P0 | ✅ Audio Level | Visual-frame energy control from an opt-in microphone |
| P1 | 🚧 Audio Device In | Select device, channels, monitor policy, and permission state |
| P1 | 🚧 Audio File | Decode and play a local asset against an audio clock |
| P1 | 🚧 Spectrum / FFT | Windowed frequency bins and logarithmic views |
| P1 | 🚧 Band Energy | Bass, low-mid, high-mid, and treble envelopes |
| P1 | 🚧 Envelope Follower | Peak/RMS with attack and release |
| P1 | 🚧 Onset / Beat | Transient events with confidence and refractory period |
| P1 | 🚧 Pitch | Fundamental estimate plus confidence |
| P1 | 🚧 Waveform | Time-domain block for scope and geometry conversion |
| P2 | 🧭 Audio Output | Explicit destination and safety gain |
| P2 | 🧭 Gain / Pan | Audio-rate amplitude and stereo placement |
| P2 | 🧭 Mixer | Multi-channel gain, mute, solo, and metering |
| P2 | 🧭 Filter / EQ | Biquad filters and parametric bands |
| P2 | 🧭 Compressor / Limiter | Dynamics and output protection |
| P2 | 🧭 Delay / Reverb | Time effects with tail lifecycle |
| P2 | 🧭 Oscillator / Noise Audio | Sound generation distinct from visual-rate control |
| P2 | 🧭 Recorder | Audio buffer/file capture with clear duration limits |
| P2 | 🧭 Tempo Estimate | BPM and phase from an audio stream |
| P3 | 🔬 Spatial Audio | Listener/source graph and multi-channel layouts |
| P3 | 🧩 DAW Bridge | Transport, tracks, parameters, and audio routing through a companion |
| P3 | 🧩 Plug-in Host | Native-only plug-in hosting exposed through a constrained bridge |

### Data, text, and networking nodes

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P1 | 🚧 JSON Parse / Select | Convert bounded JSON into typed values |
| P1 | 🚧 CSV / Table | Import, edit, filter, sort, join, and select columns |
| P1 | 🚧 Text Format | Join, replace, number format, and templates |
| P1 | 🚧 Fetch | CORS-aware HTTP request with timeout and rate limit |
| P1 | 🚧 WebSocket | Client connection, reconnect policy, status, send, and receive |
| P1 | 🚧 Server Events | Receive one-way event streams |
| P1 | 🚧 Storage | Namespaced local settings with quota/error reporting |
| P2 | 🧭 Table Transform | Map, filter, group, pivot, aggregate, and lookup |
| P2 | 🧭 GeoJSON | Decode points/paths/polygons for maps and installations |
| P2 | 🧭 MQTT over WebSocket | Sensor/venue messaging through a browser-compatible broker |
| P2 | 🧭 WebRTC Data | Peer-to-peer control/events with ordering options |
| P2 | 🧭 WebTransport | Low-latency client/server data where infrastructure supports it |
| P2 | 🧭 QR / Barcode | Decode camera frames into text/events |
| P2 | 🧭 Log / Inspect | Bounded live data viewer with sampling and redaction |
| P2 | 🧭 Record / Replay | Capture timestamped control/data streams for deterministic tests |
| P3 | 🔬 Sandbox Script | Capability-limited worker code with time/memory quotas |
| P3 | 🔬 Database Query | Read-only, parameterized query through an authenticated service |
| P3 | 🧩 OSC Gateway | Typed OSC messages over authenticated WebSocket to UDP gateway |
| P3 | 🧩 Lighting Gateway | Art-Net/sACN/DMX frames through an allowlisted venue bridge |

### Computer vision, tracking, and ML

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P1 | 🚧 Grayscale / Normalize | Predictable pre-processing for vision nodes |
| P1 | 🚧 Frame Difference | Motion regions without a large model |
| P1 | 🚧 Background Model | Foreground mask for fixed-camera installations |
| P1 | 🚧 Blur / Morphology | Denoise, erode, dilate, open, and close masks |
| P1 | 🚧 Contours / Blobs | Regions, centroids, area, bounds, and tracking IDs |
| P2 | 🧭 Optical Flow | Dense or sparse motion vectors |
| P2 | 🧭 Face Landmarks | Face pose and expression features |
| P2 | 🧭 Hand Landmarks | Multi-hand points, handedness, pinch, and gesture signals |
| P2 | 🧭 Body Pose | Skeleton joints, confidence, and derived angles |
| P2 | 🧭 Person Segmentation | Foreground alpha and confidence |
| P2 | 🧭 Tracking | Associate detections across frames with stable IDs |
| P2 | 🧭 Zones | Presence, entry/exit, dwell, direction, and occupancy |
| P2 | 🧭 Spatial Buttons | Trigger virtual controls from tracked body/hand regions |
| P2 | 🧭 Marker Tracking | QR, ArUco-like, AprilTag-like, and calibrated transforms |
| P2 | 🧭 Object Detection | Bounded local model with labels and confidence |
| P2 | 🧭 Monocular Depth | Estimated depth from a normal camera frame |
| P2 | 🧭 Depth Unproject | Calibrated depth image to 3D points |
| P2 | 🧭 Point-cloud Filter | Crop, decimate, denoise, colorize, and transform points |
| P3 | 🔬 Gesture Classifier | User-trainable sequences over landmarks |
| P3 | 🔬 Style / Image Transform | Local model effect with explicit frame queue and fallback |
| P3 | 🔬 Generative Model | Remote/local generation with cancellation, seed, and provenance |
| P3 | 🔬 Gaussian Splat Viewer | Stream and render captured volumetric scenes |

ML nodes must expose model download size, warmup status, execution provider, latency, and whether any frame leaves the device. They must drop stale work rather than building an unbounded queue.

### Geometry, particles, materials, and rendering

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P2 | 🧭 Primitive | Plane, box, sphere, cylinder, line, and text geometry |
| P2 | 🧭 Transform 3D | Translation, rotation, scale, pivot, and hierarchy |
| P2 | 🧭 Merge | Combine compatible geometry streams |
| P2 | 🧭 Scatter | Seeded point distribution over geometry/images |
| P2 | 🧭 Grid / Line | Structured points useful for displacement and scopes |
| P2 | 🧭 Image to Points | Convert pixels into positioned/colorized points |
| P2 | 🧭 Instance | Draw many objects from point/control attributes |
| P2 | 🧭 Particle Source | Emit by shape, image, depth, event, or audio band |
| P2 | 🧭 Particle Update | Force, drag, curl, attractor, collision, age, and kill |
| P2 | 🧭 Camera 3D | Perspective/orthographic camera with control inputs |
| P2 | 🧭 Light | Directional, point, spot, area-like approximation, and environment |
| P2 | 🧭 PBR Material | Base color, metallic, roughness, normal, emission, and alpha |
| P2 | 🧭 Render 3D | Geometry/material/camera/lights to `frame.rgba` and depth |
| P2 | 🧭 glTF Asset | Browser-friendly scene/animation import |
| P2 | 🧭 Environment Map | HDR environment and reflections |
| P3 | 🔬 Mesh Operators | Normals, subdivision, deform, skin, and attribute transforms |
| P3 | 🔬 Physics | Bounded rigid/soft-body or particle constraints in a worker/WASM |
| P3 | 🔬 Signed Distance Field | Raymarched shapes and compositing |
| P3 | 🔬 Generative Architecture | Rule, repeat, scatter, facade, and instancing tools |
| P3 | 🔬 Volumetric Render | Raymarching for fields, fog, and depth volumes |

### Components, UI, reuse, and show control

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P1 | 🚧 Group / Comment | Visual organization without runtime semantics |
| P1 | 🚧 Named Parameter | Expose a patch value with label, range, unit, and default |
| P1 | 🚧 Preset | Capture and recall named parameter snapshots |
| P1 | 🚧 Macro Controls | Curated performance surface separate from editing UI |
| P1 | 🚧 Module / Subgraph | Reusable nested patch with declared typed interface |
| P1 | 🚧 Bypass / Mute | Compare or disable an operator predictably |
| P1 | 🚧 Favorites / Recent | Faster node creation for live work |
| P1 | 🚧 Asset Bin | See ownership, type, missing state, and memory estimate |
| P2 | 🧭 Preset Morph | Interpolate compatible preset parameters over time |
| P2 | 🧭 Scene / Bank | Organize patches into live-performance scenes |
| P2 | 🧭 Router | Switch whole visual/control buses atomically |
| P2 | 🧭 Cue Stack | Rehearsable transitions and go/back show controls |
| P2 | 🧭 Panel Builder | Buttons, sliders, XY pads, text, meters, and color controls |
| P2 | 🧭 Mobile Control Page | Share a constrained touch UI by QR code |
| P2 | 🧭 Clone / Instance | Reuse one definition with per-instance parameters |
| P2 | 🧭 Template Project | Versioned starter patch plus assets and required capabilities |
| P2 | 🧭 Snapshot / Compare | Visual diff and rollback for patch state |
| P3 | 🔬 Package | Signed/versioned third-party node bundle with capability manifest |
| P3 | 🔬 Automation Gateway | Schema discovery and transactional graph commands over authentication |
| P3 | 🔬 Collaboration | Shared command log, presence, conflict policy, and role controls |

Automation should use a typed command protocol—create node, connect ports, set parameter, compile, inspect diagnostics, capture preview—rather than evaluating arbitrary command strings inside the page.

### Outputs, recording, mapping, and distribution

| Priority | Node/module | Purpose |
| --- | --- | --- |
| P0 | ✅ Display | Present one connected frame in the app/fullscreen canvas |
| P1 | 🚧 Snapshot | Download a still with size, alpha, and color metadata |
| P1 | 🚧 Recorder | Capture canvas/audio through supported browser codecs |
| P1 | 🚧 Multi Display | Named program, preview, confidence, and utility outputs |
| P2 | 🧭 WebRTC Publisher | Low-latency program feed to peers/viewers |
| P2 | 🧭 WebSocket Frame/Data Out | Debug/low-rate output with strong bandwidth limits |
| P2 | 🧭 Projection Output | Mesh warp, edge blend, masks, test patterns, and per-project calibration |
| P2 | 🧭 LED Output | Pixel map preview, fixture mapping, gamma, dimmer, and channel packing |
| P2 | 🧭 Stream Encoder | Browser-supported encode feeding a service/gateway |
| P2 | 🧭 Virtual Camera Bridge | Publish through a native companion where needed |
| P2 | 🧩 Broadcast Gateway | RTMP/SRT/RTSP/SDI output through an authenticated process |
| P2 | 🧩 Network Video Gateway | Venue network-video output through a companion |
| P2 | 🧩 Lighting Output | Art-Net, sACN, or USB-DMX through a venue gateway |
| P3 | 🔬 XR Output | Immersive WebXR scene/view layers |
| P3 | 🔬 Laser Gateway | Calibrated point output with mandatory safety interlocks and venue operator control |
| P3 | 🔬 Render Queue | Deterministic offline/high-quality export, locally or remotely |

## Browser and bridge I/O matrix

"Direct" means a web page can implement the path with a standard browser API. It does not mean every browser, codec, device, or operating system supports it. Every integration needs feature detection and a useful unavailable state.

| I/O family | Examples | Path | Status / important constraints |
| --- | --- | --- | --- |
| Pointer, keyboard, touch | Mouse, pen, multitouch, keys | Direct, stable | Pointer is ✅; keyboard/touch nodes are 🚧. Do not hijack assistive/browser shortcuts. |
| Camera | Webcam, phone cameras, UVC capture card | Direct, stable | ✅ HTTPS + explicit `getUserMedia` permission. Device labels often appear only after grant. |
| Microphone | Built-in, USB interface input | Direct, stable | ✅ level analysis. HTTPS + explicit permission; echo/noise processing constraints must be visible. |
| Screen/window/tab | Screen, app window, browser tab | Direct, stable | 🚧 Explicit chooser every session; system-audio capture varies by browser/OS. |
| Local media | Image, video, audio, font, 3D asset | Direct, stable | 🚧 Picker/drop. Persist imported bytes deliberately; object URLs are session-only. |
| Game controller | Gamepad, joystick, some wheels | Direct, stable | 🚧 Usually requires a user interaction before data is exposed; mappings vary. |
| Device motion/orientation | Phone rotation, acceleration | Direct with platform variance | 🧭 Permission/user-gesture requirements differ; sensor access may be unavailable in embedded contexts. |
| MIDI | Notes, CC, clock, MTC, surfaces | Direct but limited | 🧭 Web MIDI support/permissions vary. SysEx needs stronger permission; always learn/map by stable user choice. |
| Serial | Arduino, Teensy, microcontroller sensors | Direct but limited | 🧭 Web Serial is chiefly available in Chromium-family desktop environments and requires a chooser. |
| USB | Custom control devices | Direct but limited | 🧭 WebUSB requires compatible device/driver policy, filters, chooser, and protocol implementation. |
| HID | Button decks, custom controllers | Direct but limited | 🧭 WebHID support is limited; protected device classes remain unavailable. |
| Bluetooth LE | Heart rate, EEG, environmental sensors | Direct but limited | 🧭 Web Bluetooth support is limited and GATT-oriented; discovery requires user choice. |
| XR | Headsets, controllers, immersive sessions | Direct but limited | 🔬 WebXR varies by device/browser; immersive mode requires explicit session start. |
| Infrared/depth camera | Structured light, time-of-flight, skeletal sensor | Mixed | 🧩 A sensor exposed as ordinary UVC video may be direct. Calibrated depth/skeleton/vendor SDK paths generally need a companion. |
| Phone LiDAR/depth | Mobile depth camera | Mixed | 🧩 Stream processed depth/points through WebRTC/WebSocket, or use an installable capture companion. |
| EEG/biometric | Brainwave band powers, heart rate, GSR | Mixed | 🧭 Standard BLE/Serial devices may be direct; proprietary dongles/SDKs need a bridge. Treat as sensitive data. |
| HTTP APIs | REST, JSON, images | Direct, stable | 🧭 `fetch`; remote server must allow CORS. Use timeouts, quotas, and secret-safe backend proxies. |
| WebSocket/SSE | Live controls, telemetry, show state | Direct, stable | 🧭 Browser client only. Authenticate, bound message size/rate, and define reconnect semantics. |
| MQTT | Venue/IoT messages | Direct through WebSocket | 🧭 Requires a broker WebSocket endpoint and appropriate authentication. |
| OSC | UDP messages from music/control tools | Gateway | 🧩 Browsers cannot open arbitrary UDP sockets. Translate OSC ↔ authenticated WebSocket/WebTransport locally. |
| Raw TCP/UDP | Device protocols | Not direct | ⛔ Use a narrowly scoped bridge; never expose a general network socket proxy to untrusted patches. |
| WebRTC media/data | Peer camera, screen, program video, controls | Direct, stable foundation | 🧭 Production needs signaling plus TURN for difficult networks; permission and reconnect state are session data. |
| HLS/DASH playback | CDN live/VOD streams | Direct where codecs/player permit | 🧭 Latency varies; CORS and media autoplay rules apply. Use native playback or a bounded demux path. |
| MediaRecorder | Canvas, camera, audio capture | Direct, stable foundation | 🧭 Container/codec combinations vary; test capabilities and memory duration before recording. |
| WebCodecs | Low-level encode/decode | Direct but platform-dependent | 🔬 Powerful for worker pipelines, but codec availability and hardware paths vary. It is not a network protocol. |
| WebTransport | HTTP/3 low-latency data | Direct to a compatible server | 🔬 Not arbitrary UDP and not universally available; requires purpose-built infrastructure. |
| RTMP/SRT/RTSP | Broadcast ingest/output, contribution links | Gateway | 🧩 No direct browser socket/media path. Terminate, transcode, and monitor in a service or companion. |
| Network video | NDI-style production feeds | Gateway | 🧩 Discovery, codecs, multicast, and native SDKs require a local/native gateway. WebRTC is the browser-facing leg. |
| Shared GPU textures | Spout/Syphon-style zero-copy sharing | Gateway | 🧩 Browser sandboxes do not expose native cross-process texture handles. Use a native capture/publish companion. |
| SDI | Capture/output cards | Mixed/gateway | 🧩 A card exposing UVC may appear as a camera; professional format, key/fill, and output control need native APIs. |
| DAW/plug-in APIs | Transport, tracks, VST/AU parameters | Gateway | 🧩 MIDI/WebSocket can carry controls; native plug-in hosting and deep DAW APIs require a companion/plugin. |
| Lighting | USB-DMX, Art-Net, sACN | Gateway or limited device path | 🧩 USB hardware may be reachable in some browsers, but UDP lighting protocols and reliable show output belong in a venue gateway. |
| Time sync | MIDI clock, MTC, LTC, NTP-like service | Mixed | 🧭 MIDI may be direct; LTC can be decoded from audio; genlock/frame-lock and authoritative venue time need native hardware/service support. |
| Recording/download | PNG, WebM/MP4 where supported, project archive | Direct | 🚧 Use streaming writes where available, report codec support, and warn before memory-heavy captures. |

### Internal and external streaming model

Keep these paths distinct in product language and implementation:

1. **Inside one graph:** pass GPU resource references between frame nodes. Do not read pixels back to the CPU unless a node explicitly requires it.
2. **Between tabs/workers:** use transferable data, `ImageBitmap`, `VideoFrame`, or shared memory only after profiling. An `OffscreenCanvas` worker is a likely scaling path.
3. **Browser to browser:** use WebRTC media/data. A real deployment needs a signaling service, TURN credentials, peer lifecycle, bitrate policy, and observability.
4. **Browser to server/CDN:** encode with supported browser facilities, then hand off to a service designed for distribution and archival.
5. **Browser to venue protocols:** terminate WebSocket/WebRTC at a local authenticated gateway that owns UDP, lighting, native video, SDI, or GPU-sharing APIs.

## Example patch and preset library

Arrows show the primary signal path. A semicolon separates modulation. Nodes not yet shipped are marked with their roadmap status. Each preset should include a thumbnail, short learning goal, required capabilities, expected GPU cost, output aspect, and a "restore original" action.

### Beginner: learn one idea at a time

1. **Signal Garden — available now**

   `Time → Flow Field → Warp → Blend(A); Cells → Blend(B) → Trails → Color Grade → Display`

   Learn source/process/output flow and control modulation.

2. **First Oscillator — available now**

   `Flow Field → Color Grade → Display; Oscillator → Color Grade.Hue`

   Change waveform and frequency to see one control signal clearly.

3. **Pointer Bend — available now**

   `Cells → Warp → Display; Pointer.X → Warp.Amount`

   Introduces direct interaction without a permission prompt.

4. **Camera Dream — available now**

   `Video Input → Warp → Trails → Color Grade → Display; Oscillator → Warp.Amount`

   Demonstrates explicit camera start, live texture upload, feedback, and mirroring.

5. **Mic Pulse — available now**

   `Flow Field → Color Grade → Display; Audio Level → Flow Field.Energy`

   Works with a demo signal first; enable the microphone only when desired.

6. **Two Worlds — available now**

   `Flow Field → Blend.A; Cells → Blend.B → Display; Oscillator → Blend.Mix`

   Compare blend modes and slow automatic crossfades.

7. **Poster Maker — P1**

   `Gradient 🚧 → Text 🚧 → Composite 🚧 → Color Grade → Display`

   A still-first exercise suitable for screenshots.

8. **Feedback Basics — available now**

   `Cells → Warp → Trails → Display; Oscillator → Trails.Feedback`

   Explains why retained state differs from a normal graph cycle.

9. **Shape Rhythm — P1**

   `Shape 🚧 → Transform 2D 🚧 → Display; Oscillator → Transform.Rotate`

   Covers pivots and mapped modulation.

10. **Image Remix — P1**

    `Image File 🚧 → Kaleidoscope 🚧 → Color Grade → Display`

    Teaches local assets and non-destructive image processing.

### Live visuals and performance

1. **A/B Clip Deck — P1/P2**

   `Playlist A 🧭 + Playlist B 🧭 → Crossfade 🚧 → Grade → Program Display; MIDI 🧭 → Crossfade.Mix`.

2. **Audio Spectrum City — P1/P2**

   `Audio Device In 🚧 → Spectrum 🚧 → Band Energy 🚧 → Instance 🧭 → Render 3D 🧭 → Bloom 🧭 → Display`.

3. **Camera Feedback Tunnel — current/P1**

   `Video Input → Transform 2D 🚧 → Trails → Color Grade → Display; Audio Level → Transform.Scale`.

4. **Four-camera Switcher — P2**

   `Video Input ×4 → Switch 🚧 → Grade → Display; MIDI/Gamepad 🧭 → Switch.Index`.

5. **Lyric Overlay — P1**

   `Video/File source → Composite 🚧; Text 🚧 → Composite → Display; WebSocket 🧭 → Text.String`.

6. **Beat-cut Montage — P1/P2**

   `Playlist 🧭 → Switch 🚧 → Display; Onset 🚧 → Counter 🚧 → Switch.Index`.

7. **MIDI Performance Rack — P1/P2**

   `Macro Controls 🚧 → visual parameters; MIDI In 🧭 → Map Range 🚧 → Macro Controls` with learn, takeover, and feedback.

8. **Phrase-synced Scene Bank — P2**

   `Clock 🧭 → Quantize 🧭 → Scene Bank 🧭 → Router 🧭 → Program Display`.

9. **Network FOH Feed — P2**

   `Program → WebRTC Publisher 🧭 → receiver browser at front of house`; include bitrate and reconnect controls.

10. **Broadcast Companion — P2**

    `Program → Broadcast Gateway 🧩 → SRT/RTMP`; browser shows gateway health and return preview.

11. **LED Color Conductor — P2**

    `Program → Downsample 🚧 → LED Pixel Map 🧭 → Lighting Gateway 🧩`; add master dimmer and blackout.

12. **Touring Show Preflight — P2**

    `Cue Stack 🧭 + Asset Bin 🚧 + Device Status 🧭 → Preflight panel`; verifies assets, devices, permissions, resolution, and network before GO.

### Interactive installation and spatial work

1. **Silhouette Garden — P1/P2**

   `Video Input → Person Segmentation 🧭 → Matte 🚧; Flow Field → Composite 🚧 → Projection Output 🧭`.

2. **Motion History Mirror — P1/P2**

   `Video Input → Frame Difference 🚧 → Trails → Color Grade → Display`.

3. **Air-drawing Ribbons — P2**

   `Video Input → Hand Landmarks 🧭 → Gesture 🧭 → Particle Source 🧭 → Render 3D → Display`.

4. **Depth Point-cloud Portrait — P2/bridge**

   `Depth Gateway 🧩 → Depth Unproject 🧭 → Point Filter 🧭 → Render 3D → Display`.

5. **Spatial Buttons — P2**

   `Body Pose 🧭 or Depth Zones 🧭 → Spatial Buttons 🧭 → State Machine 🧭 → Scene Bank`.

6. **Projection-mapped Memory Wall — P2**

   `Camera motion → Zones → particle/flower scene → Projection Warp 🧭 → Display` with saved calibration.

7. **Interactive Floor — P2/bridge**

   `Ceiling depth sensor 🧩 → Zones/Blobs 🧭 → GPU particles 🧭 → Projector output`.

8. **Audience Phone Constellation — P2**

   `Mobile Control Page 🧭 → authenticated WebSocket → point positions/colors → Render 3D` with rate limits.

9. **EEG Aura — P2/bridge**

   `BLE EEG 🧭 or gateway 🧩 → Smooth 🚧 → Flow Field/particles → Display`; never store biometric data by default.

10. **Environmental Data Sculpture — P2**

    `Serial/BLE sensors 🧭 → Map Range → geometry/material controls → Display` with record/replay for testing.

11. **Generative Escape Room — P2**

    `Device inputs → State Machine → Cue Stack → visuals + lighting gateway`; provide watchdog and manual override.

12. **24/7 Gallery Kiosk — P2**

    `Schedule → Scene Bank → Display`; health dashboard, automatic recovery, cached assets, and remote read-only status.

### Network, remote, and collaborative patches

1. **Remote Director:** mobile macro panel → WebSocket → performer browser.
2. **Peer Camera Quilt:** multiple WebRTC receivers → Multi-view Layout → Program.
3. **Control Relay:** OSC Gateway 🧩 → typed controls → visual patch; expose only mapped addresses.
4. **Venue Lighting Mirror:** sACN/Art-Net gateway 🧩 → fixture state preview; no output until armed.
5. **Distributed Render Wall:** one authoritative clock/state service → several browser outputs, with drift diagnostics rather than pretending to provide hardware genlock.
6. **Rehearsal Replay:** record control/network events → replay without devices at deterministic time.
7. **Audience Vote Visual:** QR control page → rate-limited votes → aggregate → palette/scene selection.
8. **Shared Patch Review:** read-only share link + captured preview + graph comments before real-time co-editing.

### Advanced and research demos

1. **Reaction-Diffusion Canvas:** persistent compute texture → grade → projection.
2. **Audio Nebula:** spectrum → GPU particle forces → PBR render → bloom.
3. **Hand-tracked Chaotic Attractor:** hand landmarks → attractor parameters → ribbon/particle render.
4. **Monocular Parallax Portrait:** image/video → estimated depth → depth warp → grade.
5. **Pose-to-Art:** body pose → local/remote generative model → temporal stabilizer → display.
6. **Neural Style Camera:** camera → bounded ML transform → queue/drop-late → fallback composite.
7. **Gaussian Splat Flythrough:** splat asset → camera controls → render → tone map.
8. **Generative Architecture:** rules/scatter/instances → PBR material → multi-camera render.
9. **XR Light Sculpture:** particle/geometry graph → immersive WebXR output.
10. **Custom Shader Lab:** declared inputs/uniforms → compile diagnostics → safe fallback frame.
11. **Hybrid Venue Router:** browser composition + gateway video ingest + lighting + remote control, all with capability status.
12. **Deterministic Render Study:** fixed-step clock + seeded random + render queue; compare live and offline frames.

## Preset packaging requirements

Every bundled example should ship with:

- a stable ID and preset schema version;
- title, one-sentence goal, difficulty, tags, and thumbnail;
- declared device, permission, network, and bridge requirements;
- expected resolution, frame rate, render-pass count, and memory class;
- bundled/remote asset inventory with licenses and hashes;
- a no-device fallback whenever it can still teach the concept;
- saved node positions and a short guided-tour sequence;
- one-click restore that never overwrites the user's saved patch without confirmation;
- automated load/compile/render smoke coverage.

A useful initial gallery is 12 excellent, legible examples rather than 100 fragile patches.

## Architecture lessons worth preserving

### Graph evaluation

- Continue compiling backward from connected outputs. Disconnected experiments should not consume GPU time or request devices.
- Keep the serialized graph declarative and immutable from the renderer's perspective.
- Keep ordinary graphs acyclic. Stateful time nodes need an explicit delay contract with separate read/update phases and deterministic reset.
- Give every port and parameter a stable ID. Titles can change; serialized IDs cannot change casually.
- Return structured diagnostics with node/port IDs so the editor, automation clients, and tests see the same errors.
- Define behavior for multiple Displays early: selected program, preview, named output, or explicit output routing.

### Runtime boundaries

- The editor owns commands and project state; the compiler owns validation/planning; runtimes own GPU, audio, media, network, and device resources.
- Upload a camera/video frame once per source per display frame, then reuse its GPU texture throughout the plan.
- Evaluate audio on its own sample clock and expose analysis snapshots to the visual clock.
- Prefer workers for expensive parsing, ML, geometry, and codec work. Move the visual renderer off-main-thread only after measuring browser/GPU behavior.
- Keep WebGL2 as a reliable baseline while introducing WebGPU behind a capability-neutral renderer interface.
- Make loss and recovery normal states: WebGL context, camera track, audio device, Bluetooth device, WebSocket, WebRTC peer, and bridge can all disappear.

### Project and asset model

- Store capability wishes, not live handles: for example, preferred camera facing mode rather than a `MediaStreamTrack` or browser device ID.
- Add migrations before changing the schema version. Import remains all-or-nothing and bounded.
- Treat assets as first-class records with type, byte size, hash, origin, license/note, and missing state.
- Decide deliberately whether assets live in browser storage, an exported project archive, or cloud storage. A temporary object URL is never durable project state.
- Preserve deterministic seeds, clock mode, and reset semantics so examples and tests reproduce.

### Modules and extensibility

- A module should declare typed public inputs, outputs, parameters, capability needs, and version.
- Start with first-party modules serialized using the same internal graph; delay third-party execution until a real permissions/package design exists.
- Future packages need signing or trust UI, exact API versions, a capability manifest, CSP-compatible loading, resource budgets, and revocation.
- Custom shader nodes must validate source, cap texture/pass sizes, surface line-mapped compile errors, and display a safe fallback.
- Automation and AI-assisted building should call the same transactional command model as the UI and must never bypass validation or budgets.

### Time and synchronization

- Separate wall clock, visual elapsed time, audio time, media time, show timecode, and network-authoritative time.
- Pause/reset behavior must be defined for every stateful node.
- Clamp or deliberately catch up after a suspended tab; never let a long sleep create an accidental simulation explosion.
- Browser outputs can synchronize state and estimate drift, but hardware frame lock/genlock is a native-system feature.
- For performance presets, support a fixed-step rehearsal/render mode in addition to live display-clock mode.

## Permissions, privacy, and security

Device and network nodes are capabilities, not ordinary values.

| Concern | Product rule |
| --- | --- |
| Camera/microphone/screen | Start only from a clear user action. Show requesting/live/denied/ended states and a visible stop control. |
| Device selection | Remember a preference only when useful; tolerate changed IDs and missing hardware. |
| Media privacy | Process locally by default. Label every node that transmits frames/audio and show its destination/connection state. |
| Biometrics | Treat face, body, voice, EEG, heart rate, and presence as sensitive. Do not retain or transmit by default. |
| Remote assets | Enforce size/type/time limits and explain CORS failures. Avoid leaking credentials in project files. |
| Network inputs | Authenticate where appropriate; cap message bytes/rate/queue depth; validate shape before graph state. |
| Bridge | Bind locally by default, use short-lived pairing, origin checks, capability allowlists, and visible armed/output states. |
| Lighting/laser/show control | Include master dimmer/blackout/manual override and explicit arming. Safety-critical interlocks stay outside the browser. |
| Scripts/shaders/packages | Sandbox, declare capabilities, enforce resource budgets, and never silently fall back to unrestricted evaluation. |
| Shared projects | Strip secrets/tokens/device identifiers and ask before including media assets or captured data. |

The app should include a capability center listing which nodes want camera, microphone, MIDI, devices, network, or bridge access; current grant/connection state; and one place to stop/revoke live sessions.

## Performance and reliability plan

### Budgets and observability

- Preserve hard import and graph limits; add per-node estimates before raising them.
- Track CPU frame time, GPU time where reliably available, frame queue depth, dropped media frames, render-target bytes, asset bytes, and audio underruns.
- Make resolution an explicit output/runtime choice. Add adaptive resolution as an opt-in policy, never a silent project mutation.
- Pool compatible render targets only after lifetime analysis proves reuse is safe.
- Precompile shaders and warm media/ML nodes before a live cue becomes program output.
- Drop stale video/ML/network work. A live system should prefer the newest result over an ever-growing queue.

### Graceful degradation

- Missing camera: show a diagnostic/test frame and keep the graph editable.
- Unsupported API: explain the browser/platform boundary and suggest a compatible input or gateway.
- Lost network: retain last safe frame or switch to a configured fallback scene.
- Lost graphics context: stop issuing commands, report recovery, rebuild resources, and reset state predictably.
- Over budget: reject or bypass the responsible operation with a specific message; never crash the whole patch silently.
- Background tab: communicate throttling and provide a dedicated-display/window recommendation for shows.

### Deployment modes to plan for

1. **Creator:** full editor, local autosave, devices on demand.
2. **Performer:** curated controls, preview/program, presets, preflight, recording.
3. **Player/kiosk:** locked patch, auto-start after allowable user gesture, watchdog, cached assets, remote status.
4. **Gateway-connected venue:** paired local service for specialist I/O with explicit health and arm state.
5. **Viewer:** read-only program stream or shared patch with no editing capabilities.

## Testing strategy

### Every node

- Registry/default parameter test.
- Port type and required-input test.
- Import validation and migration coverage.
- Deterministic evaluation test where applicable.
- Runtime resource create/update/dispose test.
- Lost/unavailable capability path.
- Budget boundary and malformed input test.
- At least one representative graph compile/render test.

### Browser and device features

- Use fake camera/microphone devices in browser automation for the normal path.
- Unit-test late permission resolution and ensure tracks are stopped after cancellation/unmount.
- Test denied, missing API, ended track, device change, and context restoration.
- Maintain a small real-device matrix for camera, audio interface, MIDI, gamepad, and each gateway release.
- Do not make CI depend on a physical device or public network service.

### Visual and performance coverage

- Keep deterministic reference patches at fixed size/time/seed for pixel-tolerance snapshots.
- Run long-lived feedback/media smoke tests to catch resource growth.
- Record startup, steady-state, graph-edit, resize, and context-restore performance traces.
- Exercise low-power/integrated GPUs and high-DPI displays before increasing default quality.
- Validate keyboard navigation, modal focus, contrast, reduced motion, and screen-reader names.

### Deployment coverage

- Build from a clean install.
- Scan committed product code/docs for prohibited names and unintended secrets.
- Validate infrastructure templates and security headers.
- Smoke the deployed HTTPS origin, asset caching, camera/microphone permission policy, SPA fallback, and stale HTML behavior.
- Keep deployment credentials short-lived through CI identity federation.

## Suggested delivery sequence

### Phase 1 — durable browser instrument (P1)

- Harden camera input and add screen/image/video-file sources.
- Add Constant, Math, Map Range, Smooth, Compare, Trigger, and Vector controls.
- Add Transform, Crop/Fit, Resize, Blur, Levels, Key/Mask, Composite, Switch, and Displace.
- Add spectrum/band/onset analysis while keeping sample-rate work out of the visual frame loop.
- Add grouping, named parameters, presets, macro controls, asset bin, and a preset gallery.
- Add snapshot/recording, capability center, improved diagnostics, and adaptive-resolution experiments.

### Phase 2 — performance and installations (P2)

- Add reusable modules, scene banks, cue stack, preview/program, and preflight.
- Add MIDI/gamepad/device mapping and browser-friendly WebSocket/WebRTC I/O.
- Add CV landmarks/segmentation/zones and first GPU particle/3D render pipeline.
- Add projection warp, multi-output concepts, LED pixel map, and a paired gateway protocol.
- Add player/kiosk mode, offline asset caching, watchdog behavior, and remote health.

### Phase 3 — advanced creation (P3)

- Add WebGPU compute backend where it materially improves nodes.
- Add geometry/material/point types, simulations, depth pipelines, and advanced ML nodes.
- Define secure custom shader and package systems.
- Add typed automation gateway and optional AI-assisted patch authoring.
- Explore collaboration and cloud assets without weakening local-first use.

## Contribution guide

The project lives at [github.com/blechdom/videobrain](https://github.com/blechdom/videobrain). Issues, focused pull requests, example patches, browser/device reports, design feedback, and documentation improvements are welcome.

### Good first contributions

- A small control node with unit tests.
- A deterministic procedural visual or single-pass frame effect.
- A polished example patch using only existing nodes.
- An unavailable/permission error-state improvement.
- Accessibility, keyboard, responsive layout, or documentation work.
- A real browser/GPU/device compatibility report with exact versions and reproduction steps.

### Before implementing a node

Open an issue or discussion describing:

1. the creative use case and at least one example patch;
2. proposed typed inputs, outputs, parameters, defaults, and units;
3. runtime domain: UI, visual-frame CPU, GPU, audio, worker/WASM, device, network, or bridge;
4. permissions/capabilities and a no-device fallback;
5. expected memory/pass/latency cost and failure behavior;
6. serialized schema impact and migration needs;
7. test plan and browser support assumptions.

### Pull request checklist

- Use stable IDs and the existing registry/command model.
- Keep runtime handles out of project state.
- Add validation, cleanup, and actionable errors.
- Add focused unit tests plus an end-to-end path when user interaction changes.
- Verify `npm run verify` and browser smoke tests.
- Update Help/About and this roadmap when current behavior changes.
- Include an example patch for creative nodes whenever practical.
- Document any remote data transfer, permission, experimental API, or gateway requirement.

## Browser API reading list

These references define the capabilities and constraints behind the I/O plan:

- [Media capture and `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Screen capture and `getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
- [WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)

## Decisions to revisit with real users

- Whether the primary metaphor is a project, patch, scene, composition, or show—and how those nest.
- Whether control ports should appear for every numeric parameter or be added on demand.
- How multiple displays/program outputs are selected and routed.
- Whether media assets are embedded in exported archives by default.
- How much audio generation belongs in the product versus analysis/control only.
- Which first gateway platform and protocols unlock the most installations.
- Whether modules can contain device permissions or must receive devices through explicit outer ports.
- How custom shaders and third-party nodes earn trust.
- Which 12 example patches best teach the system and look compelling on first launch.

This document should stay honest: move a line to ✅ only when it is usable, cleaned up, tested, and documented in the shipping app.
