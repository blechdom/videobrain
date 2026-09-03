import { describe, expect, it } from 'vitest';

import {
  MAX_RENDER_DIMENSION,
  MAX_RENDER_PIXELS,
} from '../graph';
import { constrainRenderSize } from './WebGLRenderer';

describe('renderer size constraints', () => {
  it('keeps ordinary responsive dimensions and pixel density', () => {
    expect(constrainRenderSize(640, 360, 1.5, 1.5)).toEqual({
      width: 960,
      height: 540,
    });
  });

  it('scales large surfaces proportionally into dimension and pixel caps', () => {
    const result = constrainRenderSize(3_840, 2_160, 2);

    expect(result).toEqual({ width: 1_920, height: 1_080 });
    expect(result.width).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    expect(result.height).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    expect(result.width * result.height).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
  });

  it('does not allow callers to raise the application caps', () => {
    const result = constrainRenderSize(
      8_000,
      8_000,
      4,
      20,
      MAX_RENDER_DIMENSION * 10,
      MAX_RENDER_PIXELS * 10,
    );

    expect(result.width).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    expect(result.height).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    expect(result.width * result.height).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
  });

  it('normalizes invalid and non-positive dimensions safely', () => {
    expect(
      constrainRenderSize(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN),
    ).toEqual({ width: 1, height: 1 });
    expect(constrainRenderSize(-10, 0, 1)).toEqual({ width: 1, height: 1 });
  });
});
