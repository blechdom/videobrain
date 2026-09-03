import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  GRAPH_SCHEMA_VERSION,
  MAX_RENDER_DIMENSION,
  MAX_RENDER_PIXELS,
  createGraphNode,
  type GraphDocument,
} from '../graph';
import {
  WebGLRenderer,
  constrainRenderSize,
  readVideoFrameSize,
} from './WebGLRenderer';

interface FakeWebGLContext {
  gl: WebGL2RenderingContext;
  deleteTexture: Mock;
  pixelStorei: Mock;
  texImage2D: Mock;
  uniform1f: Mock;
}

function createFakeWebGLContext(): FakeWebGLContext {
  let resourceId = 0;
  const resource = () => ({ id: (resourceId += 1) });
  const deleteTexture = vi.fn();
  const pixelStorei = vi.fn();
  const texImage2D = vi.fn();
  const uniform1f = vi.fn();
  const gl = {
    DEPTH_TEST: 0x0b71,
    CULL_FACE: 0x0b44,
    BLEND: 0x0be2,
    MAX_TEXTURE_SIZE: 0x0d33,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    RGBA8: 0x8058,
    UNSIGNED_BYTE: 0x1401,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    COLOR_ATTACHMENT0: 0x8ce0,
    COLOR_BUFFER_BIT: 0x4000,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TEXTURE0: 0x84c0,
    TRIANGLES: 0x0004,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    getParameter: vi.fn(() => MAX_RENDER_DIMENSION),
    disable: vi.fn(),
    createVertexArray: vi.fn(resource),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    createTexture: vi.fn(resource),
    deleteTexture,
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D,
    texStorage2D: vi.fn(),
    pixelStorei,
    createFramebuffer: vi.fn(resource),
    deleteFramebuffer: vi.fn(),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 0x8cd5),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    createShader: vi.fn(resource),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => null),
    deleteShader: vi.fn(),
    createProgram: vi.fn(resource),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => null),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(
      (_program: WebGLProgram, name: string) => ({ name }),
    ),
    uniform1f,
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    activeTexture: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGL2RenderingContext;
  return { gl, deleteTexture, pixelStorei, texImage2D, uniform1f };
}

function createVideoGraph(): GraphDocument {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      createGraphNode('videoInput', { x: 0, y: 0 }, {}, 'camera'),
      createGraphNode('display', { x: 300, y: 0 }, {}, 'display'),
    ],
    edges: [
      {
        id: 'camera-to-display',
        source: { nodeId: 'camera', portId: 'frame' },
        target: { nodeId: 'display', portId: 'source' },
      },
    ],
  };
}

function createXYControlGraph(): GraphDocument {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      createGraphNode('xyPad', { x: 0, y: 0 }, { x: 0.23, y: 0.77 }, 'pad'),
      createGraphNode('plasma', { x: 250, y: 0 }, {}, 'source'),
      createGraphNode('colorGrade', { x: 500, y: 0 }, {}, 'grade'),
      createGraphNode('display', { x: 750, y: 0 }, {}, 'display'),
    ],
    edges: [
      {
        id: 'source-grade',
        source: { nodeId: 'source', portId: 'frame' },
        target: { nodeId: 'grade', portId: 'source' },
      },
      {
        id: 'pad-grade-hue',
        source: { nodeId: 'pad', portId: 'x' },
        target: { nodeId: 'grade', portId: 'hue' },
      },
      {
        id: 'pad-grade-exposure',
        source: { nodeId: 'pad', portId: 'y' },
        target: { nodeId: 'grade', portId: 'exposure' },
      },
      {
        id: 'grade-display',
        source: { nodeId: 'grade', portId: 'frame' },
        target: { nodeId: 'display', portId: 'source' },
      },
    ],
  };
}

function createRendererHarness(): {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  deleteTexture: Mock;
  pixelStorei: Mock;
  renderer: WebGLRenderer;
  texImage2D: Mock;
  uniform1f: Mock;
} {
  const canvas = document.createElement('canvas');
  const { gl, deleteTexture, pixelStorei, texImage2D, uniform1f } =
    createFakeWebGLContext();
  Object.defineProperty(canvas, 'getContext', {
    configurable: true,
    value: vi.fn(() => gl),
  });
  const renderer = new WebGLRenderer(canvas, {
    width: 640,
    height: 360,
    pixelRatio: 1,
  });
  renderer.setGraph(createVideoGraph());
  return {
    canvas,
    gl,
    deleteTexture,
    pixelStorei,
    renderer,
    texImage2D,
    uniform1f,
  };
}

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

describe('control-node evaluation', () => {
  it('routes both XY Pad parameters through their control outputs', () => {
    const { renderer, uniform1f } = createRendererHarness();
    renderer.setGraph(createXYControlGraph());

    expect(renderer.render(0)).toMatchObject({ rendered: true, passCount: 3 });
    const wroteUniform = (name: string, value: number) =>
      uniform1f.mock.calls.some(
        ([location, writtenValue]) =>
          (location as unknown as { name?: string } | null)?.name === name &&
          writtenValue === value,
      );
    expect(wroteUniform('uHue', 0.23)).toBe(true);
    expect(wroteUniform('uExposure', 0.77)).toBe(true);
    renderer.dispose();
  });
});

describe('live video frame validation', () => {
  it('accepts a ready frame within the texture budget', () => {
    expect(
      readVideoFrameSize({
        readyState: 2,
        videoWidth: 1_920,
        videoHeight: 1_080,
      }),
    ).toEqual({ width: 1_920, height: 1_080 });
  });

  it('waits for current frame data and positive integral dimensions', () => {
    expect(
      readVideoFrameSize({ readyState: 1, videoWidth: 640, videoHeight: 480 }),
    ).toBeNull();
    expect(
      readVideoFrameSize({ readyState: 4, videoWidth: 0, videoHeight: 480 }),
    ).toBeNull();
    expect(
      readVideoFrameSize({
        readyState: 4,
        videoWidth: 640.5,
        videoHeight: 480,
      }),
    ).toBeNull();
  });

  it('rejects frames beyond either dimension or total-pixel cap', () => {
    expect(
      readVideoFrameSize({
        readyState: 4,
        videoWidth: MAX_RENDER_DIMENSION + 1,
        videoHeight: 1,
      }),
    ).toBeNull();
    expect(
      readVideoFrameSize(
        { readyState: 4, videoWidth: 1_001, videoHeight: 1_000 },
        2_000,
        1_000_000,
      ),
    ).toBeNull();
  });
});

describe('live video texture lifecycle', () => {
  it('uploads only ready frames and clears the texture when stopped', () => {
    const { deleteTexture, gl, pixelStorei, renderer, texImage2D } =
      createRendererHarness();
    const video = {
      readyState: 1,
      videoWidth: 640,
      videoHeight: 480,
    } as HTMLVideoElement;
    renderer.setVideoSource(video);

    const beforeWaitingRender = texImage2D.mock.calls.length;
    expect(renderer.render(0).rendered).toBe(true);
    expect(texImage2D).toHaveBeenCalledTimes(beforeWaitingRender);

    Object.defineProperty(video, 'readyState', { value: 2 });
    const result = renderer.render(1 / 60);
    expect(result).toMatchObject({ rendered: true, passCount: 2 });
    expect(
      texImage2D.mock.calls.some(
        (call) => call.length === 6 && call[5] === video,
      ),
    ).toBe(true);
    expect(pixelStorei).toHaveBeenCalledWith(gl.UNPACK_FLIP_Y_WEBGL, 1);
    expect(pixelStorei).toHaveBeenCalledWith(gl.UNPACK_FLIP_Y_WEBGL, 0);

    renderer.setVideoSource(null);
    const resetCall = texImage2D.mock.calls.at(-1);
    expect(resetCall).toHaveLength(9);
    expect(resetCall?.[8]).toBeInstanceOf(Uint8Array);
    renderer.dispose();
    expect(deleteTexture).toHaveBeenCalled();
  });

  it('retains the source element and resumes upload after context restore', () => {
    const { canvas, renderer, texImage2D } = createRendererHarness();
    const video = {
      readyState: 4,
      videoWidth: 640,
      videoHeight: 480,
    } as HTMLVideoElement;
    renderer.setVideoSource(video);
    renderer.render(0);

    const lostEvent = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lostEvent);
    expect(lostEvent.defaultPrevented).toBe(true);
    expect(renderer.isContextLost).toBe(true);
    expect(renderer.render(1).rendered).toBe(false);

    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(renderer.isContextLost).toBe(false);
    expect(renderer.render(2).rendered).toBe(true);
    expect(
      texImage2D.mock.calls.filter(
        (call) => call.length === 6 && call[5] === video,
      ),
    ).toHaveLength(2);
    renderer.dispose();
  });
});
