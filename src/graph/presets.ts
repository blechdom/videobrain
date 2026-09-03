import { createDefaultGraph } from './defaultGraph';
import { createGraphNode } from './model';
import {
  GRAPH_SCHEMA_VERSION,
  type GraphDocument,
  type GraphEdge,
  type GraphNode,
} from './types';

export const GRAPH_PRESETS = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    description: 'An empty graph ready for your own nodes.',
  },
  {
    id: 'full-studio',
    title: 'Full Studio',
    description: 'The complete built-in tour of signals, visuals, and models.',
  },
  {
    id: 'beat-color',
    title: 'Beat-Synced Color',
    description: 'Tempo, oscillator, warp, and trails in one rhythmic visual.',
  },
  {
    id: 'two-world-mixer',
    title: 'Two-World Mixer',
    description: 'Blend Flow Field and Cells with an animated mix control.',
  },
  {
    id: 'pointer-bend',
    title: 'Pointer Bend',
    description: 'Move and click over the monitor to shape a flowing image.',
  },
  {
    id: 'mic-pulse-trails',
    title: 'Mic Pulse Trails',
    description: 'Audio energy drives color and feedback, with a demo pulse fallback.',
  },
  {
    id: 'camera-dream',
    title: 'Camera Dream',
    description: 'Mix an opt-in camera with a visible procedural fallback.',
  },
  {
    id: 'prompted-preview',
    title: 'Prompted Visual Preview',
    description: 'A ready-to-connect prompt and model preview frame path.',
  },
] as const;

export type GraphPresetId = (typeof GRAPH_PRESETS)[number]['id'];
export type GraphPreset = (typeof GRAPH_PRESETS)[number];

const edge = (
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
): GraphEdge => ({
  id,
  source: { nodeId: sourceNodeId, portId: sourcePortId },
  target: { nodeId: targetNodeId, portId: targetPortId },
});

function graph(nodes: GraphNode[], edges: GraphEdge[]): GraphDocument {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes,
    edges,
  };
}

function createBlankGraph(): GraphDocument {
  return graph([], []);
}

function createBeatColorGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -540, y: -180 }, {}, 'beat-time'),
      createGraphNode(
        'beatClock',
        { x: -300, y: -260 },
        { bpm: 124, pulseWidth: 0.18 },
        'beat-clock',
      ),
      createGraphNode(
        'oscillator',
        { x: -300, y: -40 },
        { frequency: 1, waveform: 'triangle', amplitude: 0.8 },
        'beat-wave',
      ),
      createGraphNode(
        'plasma',
        { x: -60, y: -180 },
        { scale: 4.2, speed: 0.5, hue: 0.12 },
        'beat-field',
      ),
      createGraphNode(
        'warp',
        { x: 180, y: -180 },
        { amount: 0.4, frequency: 8, speed: 0.32 },
        'beat-warp',
      ),
      createGraphNode(
        'trails',
        { x: 420, y: -180 },
        { feedback: 0.82 },
        'beat-trails',
      ),
      createGraphNode('display', { x: 660, y: -180 }, {}, 'beat-display'),
    ],
    [
      edge('beat-time-clock', 'beat-time', 'value', 'beat-clock', 'time'),
      edge('beat-clock-wave', 'beat-clock', 'phase', 'beat-wave', 'phase'),
      edge('beat-time-field', 'beat-time', 'value', 'beat-field', 'time'),
      edge('beat-wave-field', 'beat-wave', 'value', 'beat-field', 'energy'),
      edge('beat-field-warp', 'beat-field', 'frame', 'beat-warp', 'source'),
      edge('beat-clock-warp', 'beat-clock', 'beat', 'beat-warp', 'amount'),
      edge('beat-warp-trails', 'beat-warp', 'frame', 'beat-trails', 'source'),
      edge(
        'beat-trails-display',
        'beat-trails',
        'frame',
        'beat-display',
        'source',
      ),
    ],
  );
}

function createTwoWorldMixerGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -500, y: -260 }, {}, 'mixer-time'),
      createGraphNode(
        'oscillator',
        { x: -260, y: -260 },
        { frequency: 0.08, amplitude: 1, offset: 0 },
        'mixer-wave',
      ),
      createGraphNode(
        'plasma',
        { x: -500, y: 20 },
        { scale: 5.8, hue: -0.08 },
        'mixer-field',
      ),
      createGraphNode(
        'cells',
        { x: -260, y: 20 },
        { scale: 9.5, contrast: 1.8 },
        'mixer-cells',
      ),
      createGraphNode(
        'blend',
        { x: 0, y: 20 },
        { mode: 'normal', mix: 0.5 },
        'mixer-blend',
      ),
      createGraphNode(
        'colorGrade',
        { x: 260, y: 20 },
        { saturation: 1.45, contrast: 1.2 },
        'mixer-grade',
      ),
      createGraphNode('display', { x: 520, y: 20 }, {}, 'mixer-display'),
    ],
    [
      edge('mixer-time-wave', 'mixer-time', 'value', 'mixer-wave', 'phase'),
      edge('mixer-time-field', 'mixer-time', 'value', 'mixer-field', 'time'),
      edge('mixer-time-cells', 'mixer-time', 'value', 'mixer-cells', 'time'),
      edge('mixer-field-blend', 'mixer-field', 'frame', 'mixer-blend', 'a'),
      edge('mixer-cells-blend', 'mixer-cells', 'frame', 'mixer-blend', 'b'),
      edge('mixer-wave-blend', 'mixer-wave', 'value', 'mixer-blend', 'mix'),
      edge('mixer-blend-grade', 'mixer-blend', 'frame', 'mixer-grade', 'source'),
      edge(
        'mixer-grade-display',
        'mixer-grade',
        'frame',
        'mixer-display',
        'source',
      ),
    ],
  );
}

function createPointerBendGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -500, y: -220 }, {}, 'pointer-time'),
      createGraphNode('pointer', { x: -500, y: 80 }, {}, 'pointer-input'),
      createGraphNode(
        'plasma',
        { x: -240, y: -120 },
        { scale: 6.5, speed: 0.22 },
        'pointer-field',
      ),
      createGraphNode(
        'warp',
        { x: 20, y: -120 },
        { frequency: 10, speed: 0.45 },
        'pointer-warp',
      ),
      createGraphNode(
        'colorGrade',
        { x: 280, y: -120 },
        { saturation: 1.35 },
        'pointer-grade',
      ),
      createGraphNode('display', { x: 540, y: -120 }, {}, 'pointer-display'),
    ],
    [
      edge('pointer-time-field', 'pointer-time', 'value', 'pointer-field', 'time'),
      edge(
        'pointer-field-warp',
        'pointer-field',
        'frame',
        'pointer-warp',
        'source',
      ),
      edge(
        'pointer-x-warp',
        'pointer-input',
        'x',
        'pointer-warp',
        'amount',
      ),
      edge(
        'pointer-warp-grade',
        'pointer-warp',
        'frame',
        'pointer-grade',
        'source',
      ),
      edge(
        'pointer-y-grade',
        'pointer-input',
        'y',
        'pointer-grade',
        'hue',
      ),
      edge(
        'pointer-held-grade',
        'pointer-input',
        'down',
        'pointer-grade',
        'saturation',
      ),
      edge(
        'pointer-grade-display',
        'pointer-grade',
        'frame',
        'pointer-display',
        'source',
      ),
    ],
  );
}

function createMicPulseTrailsGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -500, y: -220 }, {}, 'mic-time'),
      createGraphNode(
        'audioLevel',
        { x: -500, y: 80 },
        { gain: 2.2, floor: 0.03 },
        'mic-level',
      ),
      createGraphNode(
        'plasma',
        { x: -240, y: -120 },
        { scale: 4.8, speed: 0.4 },
        'mic-field',
      ),
      createGraphNode(
        'trails',
        { x: 20, y: -120 },
        { feedback: 0.9 },
        'mic-trails',
      ),
      createGraphNode(
        'colorGrade',
        { x: 280, y: -120 },
        { contrast: 1.25, saturation: 1.5 },
        'mic-grade',
      ),
      createGraphNode('display', { x: 540, y: -120 }, {}, 'mic-display'),
    ],
    [
      edge('mic-time-field', 'mic-time', 'value', 'mic-field', 'time'),
      edge('mic-level-field', 'mic-level', 'value', 'mic-field', 'energy'),
      edge('mic-field-trails', 'mic-field', 'frame', 'mic-trails', 'source'),
      edge('mic-level-trails', 'mic-level', 'value', 'mic-trails', 'feedback'),
      edge('mic-trails-grade', 'mic-trails', 'frame', 'mic-grade', 'source'),
      edge('mic-level-grade', 'mic-level', 'value', 'mic-grade', 'hue'),
      edge(
        'mic-grade-display',
        'mic-grade',
        'frame',
        'mic-display',
        'source',
      ),
    ],
  );
}

function createCameraDreamGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -560, y: -260 }, {}, 'camera-time'),
      createGraphNode(
        'plasma',
        { x: -320, y: -220 },
        { scale: 5.5, speed: 0.24, hue: 0.18 },
        'camera-field',
      ),
      createGraphNode('videoInput', { x: -320, y: 80 }, {}, 'camera-input'),
      createGraphNode('pointer', { x: -80, y: 220 }, {}, 'camera-pointer'),
      createGraphNode(
        'blend',
        { x: -60, y: -100 },
        { mode: 'screen', mix: 0.72 },
        'camera-blend',
      ),
      createGraphNode(
        'warp',
        { x: 200, y: -100 },
        { frequency: 6.5, speed: 0.16 },
        'camera-warp',
      ),
      createGraphNode(
        'colorGrade',
        { x: 460, y: -100 },
        { saturation: 1.25, contrast: 1.15 },
        'camera-grade',
      ),
      createGraphNode('display', { x: 720, y: -100 }, {}, 'camera-display'),
    ],
    [
      edge('camera-time-field', 'camera-time', 'value', 'camera-field', 'time'),
      edge(
        'camera-field-blend',
        'camera-field',
        'frame',
        'camera-blend',
        'a',
      ),
      edge(
        'camera-input-blend',
        'camera-input',
        'frame',
        'camera-blend',
        'b',
      ),
      edge(
        'camera-blend-warp',
        'camera-blend',
        'frame',
        'camera-warp',
        'source',
      ),
      edge(
        'camera-pointer-warp',
        'camera-pointer',
        'x',
        'camera-warp',
        'amount',
      ),
      edge(
        'camera-warp-grade',
        'camera-warp',
        'frame',
        'camera-grade',
        'source',
      ),
      edge(
        'camera-pointer-grade',
        'camera-pointer',
        'y',
        'camera-grade',
        'hue',
      ),
      edge(
        'camera-grade-display',
        'camera-grade',
        'frame',
        'camera-display',
        'source',
      ),
    ],
  );
}

function createPromptedPreviewGraph(): GraphDocument {
  return graph(
    [
      createGraphNode('time', { x: -500, y: -220 }, {}, 'prompt-time'),
      createGraphNode(
        'plasma',
        { x: -240, y: -180 },
        { scale: 4.5, speed: 0.28, hue: -0.12 },
        'prompt-field',
      ),
      createGraphNode(
        'aiPrompt',
        { x: -240, y: 140 },
        {
          text: 'Slow aurora ribbons folding through an infinite glass garden',
          negative: 'flicker, lettering, abrupt cuts',
        },
        'prompt-chat',
      ),
      createGraphNode(
        'videoModel',
        { x: 40, y: -100 },
        { runtime: 'preview', strength: 0.78, seed: 108 },
        'prompt-model',
      ),
      createGraphNode('display', { x: 340, y: -100 }, {}, 'prompt-display'),
    ],
    [
      edge('prompt-time-field', 'prompt-time', 'value', 'prompt-field', 'time'),
      edge(
        'prompt-field-model',
        'prompt-field',
        'frame',
        'prompt-model',
        'source',
      ),
      edge(
        'prompt-chat-model',
        'prompt-chat',
        'prompt',
        'prompt-model',
        'prompt',
      ),
      edge(
        'prompt-model-display',
        'prompt-model',
        'frame',
        'prompt-display',
        'source',
      ),
    ],
  );
}

const PRESET_FACTORIES: Readonly<
  Record<GraphPresetId, () => GraphDocument>
> = {
  blank: createBlankGraph,
  'full-studio': createDefaultGraph,
  'beat-color': createBeatColorGraph,
  'two-world-mixer': createTwoWorldMixerGraph,
  'pointer-bend': createPointerBendGraph,
  'mic-pulse-trails': createMicPulseTrailsGraph,
  'camera-dream': createCameraDreamGraph,
  'prompted-preview': createPromptedPreviewGraph,
};

export function getGraphPreset(id: GraphPresetId): GraphPreset {
  const preset = GRAPH_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new RangeError('Unknown graph preset "' + id + '".');
  }
  return preset;
}

export function createGraphPreset(id: GraphPresetId): GraphDocument {
  return PRESET_FACTORIES[id]();
}
