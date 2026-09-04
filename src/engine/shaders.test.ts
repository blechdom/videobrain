import { describe, expect, it } from 'vitest';

import type { NodeKind } from '../graph';
import { FRAME_FRAGMENT_SHADERS } from './shaders';

function shaderFor(kind: NodeKind): string {
  const shader = FRAME_FRAGMENT_SHADERS[kind];
  expect(shader, `${kind} shader`).toBeTypeOf('string');
  return shader ?? '';
}

describe('frame shader alpha contracts', () => {
  it('preserves source alpha through coordinate and color processors', () => {
    const warp = shaderFor('warp');
    const colorGrade = shaderFor('colorGrade');

    expect(warp).toContain('vec4 source = texture(uSource');
    expect(warp).toContain('outColor = vec4(color, source.a);');
    expect(colorGrade).toContain('vec4 source = texture(uSource');
    expect(colorGrade).toContain('outColor = vec4(clamp(color, 0.0, 1.0), source.a);');
  });

  it('accumulates Trails color in premultiplied form and fades its alpha', () => {
    const trails = shaderFor('trails');

    expect(trails).toContain('previous.a * feedback');
    expect(trails).toContain('current.rgb * current.a');
    expect(trails).toContain('previous.rgb * previous.a * feedback');
    expect(trails).toContain('outColor = vec4(clamp(color, 0.0, 1.0), alpha);');
  });

  it('uses premultiplied interpolation for every Blend mode', () => {
    const blend = shaderFor('blend');

    expect(blend).toContain('combinedPremultiplied = b.rgb * b.a;');
    expect(blend).toContain('combinedAlpha = a.a + b.a - a.a * b.a;');
    expect(blend).toContain('mix(a.rgb * a.a, combinedPremultiplied, amount)');
    expect(blend).toContain('mix(a.a, combinedAlpha, amount)');
    expect(blend).not.toContain('outColor = vec4(mix(a, combined');
  });
});
