import type {
  GraphParamValue,
  NodeKind,
  OperatorDefinition,
  OperatorParamDefinition,
  PortDefinition,
  PortType,
} from './types';

const port = (
  id: string,
  label: string,
  type: PortType,
  optional = false,
): PortDefinition => ({ id, label, type, optional });

const numberParam = (
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
): OperatorParamDefinition => ({
  type: 'number',
  label,
  defaultValue,
  min,
  max,
  step,
});

const selectParam = (
  label: string,
  defaultValue: string,
  options: readonly string[],
): OperatorParamDefinition => ({
  type: 'select',
  label,
  defaultValue,
  options: options.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  })),
});

const definitions = [
  {
    kind: 'time',
    title: 'Time',
    summary: 'A continuously advancing control signal.',
    domain: 'control',
    inputs: [],
    outputs: [port('value', 'Time', 'control.f32')],
    params: {
      speed: numberParam('Speed', 1, -4, 4, 0.01),
      offset: numberParam('Offset', 0, -60, 60, 0.01),
    },
  },
  {
    kind: 'oscillator',
    title: 'Oscillator',
    summary: 'A normalized repeating control signal.',
    domain: 'control',
    inputs: [port('phase', 'Phase', 'control.f32', true)],
    outputs: [port('value', 'Value', 'control.f32')],
    params: {
      frequency: numberParam('Frequency', 0.12, 0, 8, 0.01),
      phase: numberParam('Phase', 0, -1, 1, 0.01),
      amplitude: numberParam('Amplitude', 1, 0, 1, 0.01),
      offset: numberParam('Offset', 0, -1, 1, 0.01),
      waveform: selectParam('Waveform', 'sine', [
        'sine',
        'triangle',
        'saw',
        'square',
      ]),
    },
  },
  {
    kind: 'pointer',
    title: 'Pointer',
    summary: 'Normalized pointer coordinates from the stage.',
    domain: 'control',
    inputs: [],
    outputs: [
      port('x', 'X', 'control.f32'),
      port('y', 'Y', 'control.f32'),
    ],
    params: {},
  },
  {
    kind: 'audioLevel',
    title: 'Audio Level',
    summary: 'A normalized audio-energy control signal.',
    domain: 'control',
    inputs: [],
    outputs: [port('value', 'Level', 'control.f32')],
    params: {
      gain: numberParam('Gain', 1.5, 0, 8, 0.01),
      floor: numberParam('Floor', 0.02, 0, 1, 0.01),
    },
  },
  {
    kind: 'videoInput',
    title: 'Video Input',
    summary: 'A live camera frame from this browser session.',
    domain: 'frame',
    inputs: [],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      facing: selectParam('Camera', 'user', ['user', 'environment']),
      fit: selectParam('Fit', 'cover', ['cover', 'contain', 'stretch']),
      mirror: selectParam('Mirror', 'on', ['on', 'off']),
    },
  },
  {
    kind: 'plasma',
    title: 'Flow Field',
    summary: 'A fluid procedural color field.',
    domain: 'frame',
    inputs: [
      port('time', 'Time', 'control.f32', true),
      port('energy', 'Energy', 'control.f32', true),
    ],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      scale: numberParam('Scale', 5, 1, 14, 0.1),
      speed: numberParam('Speed', 0.35, -3, 3, 0.01),
      energy: numberParam('Energy', 0.35, 0, 1, 0.01),
      hue: numberParam('Hue', 0.08, -1, 1, 0.01),
    },
  },
  {
    kind: 'cells',
    title: 'Cells',
    summary: 'An animated cellular noise field.',
    domain: 'frame',
    inputs: [port('time', 'Time', 'control.f32', true)],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      scale: numberParam('Scale', 7, 2, 24, 0.1),
      speed: numberParam('Speed', 0.16, -3, 3, 0.01),
      contrast: numberParam('Contrast', 1.4, 0.25, 4, 0.01),
    },
  },
  {
    kind: 'warp',
    title: 'Warp',
    summary: 'Distorts a frame with a flowing coordinate field.',
    domain: 'frame',
    inputs: [
      port('source', 'Source', 'frame.rgba'),
      port('amount', 'Amount', 'control.f32', true),
    ],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      amount: numberParam('Amount', 0.22, 0, 1, 0.01),
      frequency: numberParam('Frequency', 5, 0.25, 20, 0.1),
      speed: numberParam('Speed', 0.2, -3, 3, 0.01),
    },
  },
  {
    kind: 'blend',
    title: 'Blend',
    summary: 'Combines two frame signals.',
    domain: 'frame',
    inputs: [
      port('a', 'A', 'frame.rgba'),
      port('b', 'B', 'frame.rgba'),
      port('mix', 'Mix', 'control.f32', true),
    ],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      mix: numberParam('Mix', 0.5, 0, 1, 0.01),
      mode: selectParam('Mode', 'screen', [
        'normal',
        'screen',
        'add',
        'multiply',
      ]),
    },
  },
  {
    kind: 'trails',
    title: 'Trails',
    summary: 'Accumulates an internally delayed previous frame.',
    domain: 'frame',
    inputs: [
      port('source', 'Source', 'frame.rgba'),
      port('feedback', 'Feedback', 'control.f32', true),
    ],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      feedback: numberParam('Feedback', 0.88, 0, 0.99, 0.01),
    },
  },
  {
    kind: 'colorGrade',
    title: 'Color Grade',
    summary: 'Adjusts hue, exposure, contrast, and saturation.',
    domain: 'frame',
    inputs: [
      port('source', 'Source', 'frame.rgba'),
      port('hue', 'Hue', 'control.f32', true),
      port('exposure', 'Exposure', 'control.f32', true),
      port('saturation', 'Saturation', 'control.f32', true),
    ],
    outputs: [port('frame', 'Frame', 'frame.rgba')],
    params: {
      hue: numberParam('Hue', 0, -1, 1, 0.01),
      exposure: numberParam('Exposure', 0.05, -2, 2, 0.01),
      contrast: numberParam('Contrast', 1.1, 0, 3, 0.01),
      saturation: numberParam('Saturation', 1.2, 0, 3, 0.01),
    },
  },
  {
    kind: 'display',
    title: 'Display',
    summary: 'Presents a frame on the stage.',
    domain: 'display',
    inputs: [port('source', 'Source', 'frame.rgba')],
    outputs: [],
    params: {},
  },
] as const satisfies readonly OperatorDefinition[];

export const OPERATOR_DEFINITIONS: readonly OperatorDefinition[] = definitions;

export const OPERATOR_REGISTRY: Readonly<Record<NodeKind, OperatorDefinition>> =
  Object.freeze(
    Object.fromEntries(
      definitions.map((definition) => [definition.kind, definition]),
    ) as unknown as Record<NodeKind, OperatorDefinition>,
  );

export function getOperatorDefinition(kind: NodeKind): OperatorDefinition {
  return OPERATOR_REGISTRY[kind];
}

export function getDefaultParams(kind: NodeKind): Record<string, GraphParamValue> {
  return Object.fromEntries(
    Object.entries(OPERATOR_REGISTRY[kind].params).map(([id, definition]) => [
      id,
      definition.defaultValue,
    ]),
  );
}
