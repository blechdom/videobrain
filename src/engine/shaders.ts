import type { NodeKind } from '../graph';

export const FULLSCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const plasma = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uEnergy;
uniform float uHue;

vec3 palette(float t) {
  vec3 phase = vec3(0.00, 0.23, 0.47) + uHue;
  return 0.5 + 0.5 * cos(6.2831853 * (t + phase));
}

void main() {
  vec2 p = vUv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float t = uTime;
  float a = sin((p.x + p.y * 0.35) * uScale + t * 1.31);
  float b = sin(length(p + vec2(sin(t * 0.31), cos(t * 0.27)) * 0.22) * uScale * 2.3 - t);
  float c = cos((p.y - p.x * 0.28) * uScale * 1.37 - t * 0.73);
  float field = (a + b + c) / 3.0;
  field += sin((p.x * p.y) * uScale * 4.0 + t) * uEnergy;
  vec3 color = palette(field * 0.19 + t * 0.025);
  float vignette = 1.0 - smoothstep(0.18, 0.95, length(p));
  outColor = vec4(color * (0.68 + vignette * 0.42), 1.0);
}
`;

const cells = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform float uContrast;

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 p = uv * uScale;
  vec2 cell = floor(p);
  vec2 local = fract(p);
  float nearest = 1.0;
  float secondNearest = 1.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 seed = hash22(cell + neighbor);
      seed = 0.5 + 0.45 * sin(uTime + 6.2831853 * seed);
      float distanceToSeed = length(neighbor + seed - local);
      if (distanceToSeed < nearest) {
        secondNearest = nearest;
        nearest = distanceToSeed;
      } else if (distanceToSeed < secondNearest) {
        secondNearest = distanceToSeed;
      }
    }
  }

  float ridge = pow(clamp(secondNearest - nearest, 0.0, 1.0), uContrast);
  vec3 cool = vec3(0.015, 0.08, 0.18);
  vec3 hot = vec3(0.98, 0.24, 0.52);
  vec3 color = mix(cool, hot, smoothstep(0.01, 0.28, ridge));
  color += vec3(0.04, 0.30, 0.42) * (1.0 - nearest) * 0.55;
  outColor = vec4(color, 1.0);
}
`;

const videoInput = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform vec2 uResolution;
uniform float uFit;
uniform float uMirror;

void main() {
  vec2 uv = vUv;
  float sourceAspect = uSourceSize.x / max(uSourceSize.y, 1.0);
  float outputAspect = uResolution.x / max(uResolution.y, 1.0);

  if (uFit < 0.5) {
    if (sourceAspect > outputAspect) {
      uv.x = (uv.x - 0.5) * outputAspect / sourceAspect + 0.5;
    } else {
      uv.y = (uv.y - 0.5) * sourceAspect / outputAspect + 0.5;
    }
  } else if (uFit < 1.5) {
    if (sourceAspect > outputAspect) {
      uv.y = (uv.y - 0.5) * sourceAspect / outputAspect + 0.5;
    } else {
      uv.x = (uv.x - 0.5) * outputAspect / sourceAspect + 0.5;
    }
  }

  if (uMirror > 0.5) {
    uv.x = 1.0 - uv.x;
  }
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  outColor = texture(uSource, uv);
}
`;

const warp = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform float uTime;
uniform float uAmount;
uniform float uFrequency;

void main() {
  vec2 uv = vUv;
  float xWave = sin(uv.y * uFrequency * 6.2831853 + uTime * 1.17);
  float yWave = cos(uv.x * uFrequency * 6.2831853 - uTime * 0.83);
  vec2 offset = vec2(xWave, yWave) * uAmount * 0.075;
  vec3 color = texture(uSource, fract(uv + offset)).rgb;
  float split = uAmount * 0.012;
  color.r = texture(uSource, fract(uv + offset + vec2(split, 0.0))).r;
  color.b = texture(uSource, fract(uv + offset - vec2(split, 0.0))).b;
  outColor = vec4(color, 1.0);
}
`;

const blend = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uMode;

void main() {
  vec3 a = texture(uA, vUv).rgb;
  vec3 b = texture(uB, vUv).rgb;
  vec3 combined;
  if (uMode < 0.5) {
    combined = b;
  } else if (uMode < 1.5) {
    combined = 1.0 - (1.0 - a) * (1.0 - b);
  } else if (uMode < 2.5) {
    combined = min(a + b, 1.0);
  } else {
    combined = a * b;
  }
  outColor = vec4(mix(a, combined, clamp(uMix, 0.0, 1.0)), 1.0);
}
`;

const trails = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform sampler2D uPrevious;
uniform float uFeedback;

void main() {
  vec3 current = texture(uSource, vUv).rgb;
  vec2 drift = (vUv - 0.5) * 0.0025;
  vec3 previous = texture(uPrevious, clamp(vUv + drift, 0.0, 1.0)).rgb;
  vec3 accumulated = max(current, previous * clamp(uFeedback, 0.0, 0.995));
  outColor = vec4(accumulated, 1.0);
}
`;

const colorGrade = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform float uHue;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;

vec3 rotateHue(vec3 color, float angle) {
  vec3 axis = normalize(vec3(1.0));
  float cosine = cos(angle);
  float sine = sin(angle);
  return color * cosine + cross(axis, color) * sine + axis * dot(axis, color) * (1.0 - cosine);
}

void main() {
  vec3 color = texture(uSource, vUv).rgb;
  color *= exp2(uExposure);
  color = (color - 0.5) * uContrast + 0.5;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, uSaturation);
  color = rotateHue(color, uHue * 6.2831853);
  color = color / (1.0 + max(color, vec3(0.0)) * 0.18);
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const display = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;

void main() {
  outColor = texture(uSource, vUv);
}
`;

export const FRAME_FRAGMENT_SHADERS: Partial<Record<NodeKind, string>> = {
  videoInput,
  plasma,
  cells,
  warp,
  blend,
  trails,
  colorGrade,
  display,
};
