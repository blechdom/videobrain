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
        } else {
          expect(
            parameter.options.some(
              ({ value }) => value === parameter.defaultValue,
            ),
          ).toBe(true);
        }
      }
    }
  });

  it('keeps all public signals within the two exact port types', () => {
    const signalTypes = new Set(
      OPERATOR_DEFINITIONS.flatMap((definition) => [
        ...definition.inputs.map(({ type }) => type),
        ...definition.outputs.map(({ type }) => type),
      ]),
    );

    expect(signalTypes).toEqual(new Set(['frame.rgba', 'control.f32']));
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
});
