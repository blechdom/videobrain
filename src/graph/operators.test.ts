import { describe, expect, it } from 'vitest';
import {
  NODE_KINDS,
  OPERATOR_DEFINITIONS,
  OPERATOR_REGISTRY,
  getDefaultParams,
} from './index';

describe('operator registry', () => {
  it('contains exactly one definition for every node kind', () => {
    expect(OPERATOR_DEFINITIONS.map(({ kind }) => kind)).toEqual(NODE_KINDS);
    expect(Object.keys(OPERATOR_REGISTRY).sort()).toEqual(
      [...NODE_KINDS].sort(),
    );
  });

  it('uses unique input and output IDs within every definition', () => {
    for (const definition of OPERATOR_DEFINITIONS) {
      const inputIds = definition.inputs.map(({ id }) => id);
      const outputIds = definition.outputs.map(({ id }) => id);
      expect(new Set(inputIds).size, `${definition.kind} inputs`).toBe(
        inputIds.length,
      );
      expect(new Set(outputIds).size, `${definition.kind} outputs`).toBe(
        outputIds.length,
      );
    }
  });

  it('provides valid defaults for every parameter', () => {
    for (const definition of OPERATOR_DEFINITIONS) {
      const defaults = getDefaultParams(definition.kind);
      for (const [id, parameter] of Object.entries(definition.params)) {
        expect(defaults[id]).toBe(parameter.defaultValue);
        if (parameter.type === 'number') {
          expect(parameter.defaultValue).toBeGreaterThanOrEqual(parameter.min);
          expect(parameter.defaultValue).toBeLessThanOrEqual(parameter.max);
          expect(parameter.step).toBeGreaterThan(0);
        } else if (parameter.type === 'select') {
          expect(
            parameter.options.some(
              ({ value }) => value === parameter.defaultValue,
            ),
          ).toBe(true);
        } else {
          expect(typeof parameter.defaultValue).toBe('string');
          expect(parameter.defaultValue.length).toBeLessThanOrEqual(
            parameter.maxLength,
          );
          expect(parameter.maxLength).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps all public signals within the three exact port types', () => {
    const signalTypes = new Set(
      OPERATOR_DEFINITIONS.flatMap((definition) => [
        ...definition.inputs.map(({ type }) => type),
        ...definition.outputs.map(({ type }) => type),
      ]),
    );

    expect(signalTypes).toEqual(
      new Set(['frame.rgba', 'control.f32', 'text.utf8']),
    );
  });

  it('defines tempo timing with phase, pulse, and bar outputs', () => {
    const definition = OPERATOR_REGISTRY.beatClock;

    expect(definition.domain).toBe('control');
    expect(definition.inputs).toEqual([
      { id: 'time', label: 'Time', type: 'control.f32', optional: true },
    ]);
    expect(definition.outputs).toEqual([
      { id: 'phase', label: 'Phase', type: 'control.f32', optional: false },
      { id: 'beat', label: 'Beat', type: 'control.f32', optional: false },
      { id: 'bar', label: 'Bar', type: 'control.f32', optional: false },
    ]);
    expect(getDefaultParams('beatClock')).toEqual({
      bpm: 120,
      beatsPerBar: 4,
      pulseWidth: 0.12,
      offset: 0,
    });
  });

  it('exposes pointer position and button-edge signals independently', () => {
    expect(OPERATOR_REGISTRY.pointer.outputs).toEqual([
      { id: 'x', label: 'X', type: 'control.f32', optional: false },
      { id: 'y', label: 'Y', type: 'control.f32', optional: false },
      { id: 'down', label: 'Held', type: 'control.f32', optional: false },
      { id: 'press', label: 'Press', type: 'control.f32', optional: false },
      { id: 'release', label: 'Release', type: 'control.f32', optional: false },
    ]);
  });

  it('defines a bounded text prompt source for model instructions', () => {
    const definition = OPERATOR_REGISTRY.aiPrompt;

    expect(definition.domain).toBe('control');
    expect(definition.outputs).toEqual([
      { id: 'prompt', label: 'Prompt', type: 'text.utf8', optional: false },
    ]);
    expect(definition.params.text).toMatchObject({
      type: 'text',
      maxLength: 4_000,
      multiline: true,
    });
    expect(definition.params.negative).toMatchObject({
      type: 'text',
      maxLength: 2_000,
      multiline: true,
    });
  });

  it('defines a model frame operator with typed prompt and optional source inputs', () => {
    const definition = OPERATOR_REGISTRY.videoModel;

    expect(definition.domain).toBe('frame');
    expect(definition.inputs).toEqual([
      { id: 'source', label: 'Source', type: 'frame.rgba', optional: true },
      { id: 'prompt', label: 'Prompt', type: 'text.utf8', optional: false },
    ]);
    expect(definition.outputs).toEqual([
      { id: 'frame', label: 'Frame', type: 'frame.rgba', optional: false },
    ]);
    expect(getDefaultParams('videoModel')).toMatchObject({
      runtime: 'preview',
      transport: 'websocket',
      endpoint: 'ws://127.0.0.1:8189/v1/stream',
      model: 'realtime-video',
      strength: 0.7,
      guidance: 1.2,
      seed: 42,
      inputFps: 12,
    });
  });

  it('defines live video as a frame source with safe presentation defaults', () => {
    const definition = OPERATOR_REGISTRY.videoInput;

    expect(definition.domain).toBe('frame');
    expect(definition.inputs).toEqual([]);
    expect(definition.outputs).toEqual([
      { id: 'frame', label: 'Frame', type: 'frame.rgba', optional: false },
    ]);
    expect(getDefaultParams('videoInput')).toEqual({
      facing: 'user',
      fit: 'cover',
      mirror: 'on',
    });
  });

  it('defines the XY pad as two normalized editable control outputs', () => {
    const definition = OPERATOR_REGISTRY.xyPad;

    expect(definition.domain).toBe('control');
    expect(definition.inputs).toEqual([]);
    expect(definition.outputs).toEqual([
      { id: 'x', label: 'X', type: 'control.f32', optional: false },
      { id: 'y', label: 'Y', type: 'control.f32', optional: false },
    ]);
    expect(definition.params).toEqual({
      x: {
        type: 'number',
        label: 'X',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      y: {
        type: 'number',
        label: 'Y',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    });
    expect(definition.parameterLayout).toEqual({
      type: 'xy',
      label: 'Position',
      xParamId: 'x',
      yParamId: 'y',
    });
    expect(getDefaultParams('xyPad')).toEqual({ x: 0.5, y: 0.5 });
  });
});
