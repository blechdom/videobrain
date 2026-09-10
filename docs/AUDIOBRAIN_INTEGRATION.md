# Pairing AudioBrain controls

Open VideoBrain using AudioBrain's **Connections → Open and pair Videobrain**
action. A pairing panel appears in the new VideoBrain window. Choose each
mapping's direction, channel and existing numeric parameter, then click **Pair
AudioBrain**. The panel never connects automatically.

AudioBrain's Brain nodes combine their saved `channel` and `name` with `/`.
The default is `audiobrain-v1/value`. Enter the same complete channel name in
VideoBrain. For a bidirectional example, map AudioBrain's outgoing
`audiobrain-v1/value` to XY Pad X, then map XY Pad Y to an outgoing
`audiobrain-v1/video` channel and set the AudioBrain input's name to `video`.

The panel supports up to eight explicit mappings. It lists only numeric
parameters from the production operator registry. Incoming values pass through
the project store and clamp to the selected parameter's bounds. They change
saved literals; an existing graph wire keeps its usual override precedence.
Outgoing values are the selected **saved literals**, rather than connected or
renderer-evaluated values. This is a parameter integration, with no audio stream,
shader output, remote command execution or general graph mutation API.

Collapse the panel to keep the connection while freeing the workspace.
**Disconnect** keeps the latest saved values. **Restore starting values**
disconnects and restores only the incoming parameters to their pre-pair values.
The connection ends when the peer closes or its heartbeat disappears. New patch,
project import and Return to frame zero also dispose the old pairing grant, even
if the replacement reuses node IDs. Open a fresh paired window from AudioBrain
after those actions. Changing mappings requires disconnecting and pairing again.

Both windows must remain open. Production accepts `https://audiobrain.org`;
local development accepts `http://127.0.0.1:5178` and
`http://localhost:5178`. Pairing uses exact origins and peer window identity,
a random fragment nonce, a handshake and monotonically increasing sequences.
The `brain.control.v1` transport permits 64 mapped channels, 4 KiB messages and
60 controls per second per direction. Invalid values, unselected channels,
replayed sequences, oversized messages and direct same-value echoes are ignored.
No camera, microphone or other device is enabled by pairing.

Session windows, nonces and mappings remain outside the saved project. This
transport uses top-level `postMessage` windows; it does not require iframe
embedding or claim that BroadcastChannel crosses site origins. It does not
change graph schema, node kinds, catalog versions or compiler demand roots.

For local integration, run AudioBrain on port 5178 and VideoBrain on 5179:

```sh
npm run dev -- --host 127.0.0.1 --port 5179 --strictPort
```

Use `http://127.0.0.1:5179` as the VideoBrain URL in AudioBrain. VideoBrain's
browser suite includes a separate-origin popup test. AudioBrain additionally
provides `e2e/brain-pairing.spec.ts`, enabled with `VIDEO_BRAIN_BASE_URL`, which
exercises both real applications, graph output/input routing, saved fallback
restoration and explicit audio start behavior.
