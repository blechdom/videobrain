import {
  MAX_GPU_RENDER_TARGETS,
  MAX_RENDER_DIMENSION,
  MAX_RENDER_PIXEL_RATIO,
  MAX_RENDER_PIXELS,
  MAX_RENDER_RESOURCE_PIXELS,
  compileGraph,
  type CompiledGraph,
  type CompiledNode,
  type GraphDocument,
  type NodeKind,
  type OperatorParamDefinition,
} from '../graph';
import { FRAME_FRAGMENT_SHADERS, FULLSCREEN_VERTEX_SHADER } from './shaders';

export interface RenderPointer {
  x: number;
  y: number;
}

export interface RendererOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
  maxPixelRatio?: number;
}

export interface RenderResult {
  rendered: boolean;
  frame: number;
  fps: number;
  passCount: number;
  width: number;
  height: number;
  error: string | null;
}

interface RenderTarget {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

interface NodeResources {
  kind: NodeKind;
  targets: RenderTarget[];
  nextTargetIndex: number;
}

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

const DEFAULT_POINTER: RenderPointer = Object.freeze({ x: 0.5, y: 0.5 });
const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export interface RenderSize {
  width: number;
  height: number;
}

export function constrainRenderSize(
  width: number,
  height: number,
  pixelRatio = 1,
  maxPixelRatio = MAX_RENDER_PIXEL_RATIO,
  maxDimension = MAX_RENDER_DIMENSION,
  maxPixels = MAX_RENDER_PIXELS,
): RenderSize {
  const safeWidth = Math.max(1, Math.round(finiteOr(width, 1)));
  const safeHeight = Math.max(1, Math.round(finiteOr(height, 1)));
  const safeMaxPixelRatio = clamp(
    finiteOr(maxPixelRatio, MAX_RENDER_PIXEL_RATIO),
    1,
    MAX_RENDER_PIXEL_RATIO,
  );
  const safePixelRatio = clamp(
    finiteOr(pixelRatio, 1),
    0.25,
    safeMaxPixelRatio,
  );
  const safeMaxDimension = Math.max(
    1,
    Math.min(
      MAX_RENDER_DIMENSION,
      Math.floor(finiteOr(maxDimension, MAX_RENDER_DIMENSION)),
    ),
  );
  const safeMaxPixels = Math.max(
    1,
    Math.min(
      MAX_RENDER_PIXELS,
      Math.floor(finiteOr(maxPixels, MAX_RENDER_PIXELS)),
    ),
  );
  const requestedWidth = Math.min(
    Number.MAX_SAFE_INTEGER,
    safeWidth * safePixelRatio,
  );
  const requestedHeight = Math.min(
    Number.MAX_SAFE_INTEGER,
    safeHeight * safePixelRatio,
  );
  const scale = Math.min(
    1,
    safeMaxDimension / requestedWidth,
    safeMaxDimension / requestedHeight,
    Math.sqrt(safeMaxPixels / (requestedWidth * requestedHeight)),
  );

  return {
    width: Math.max(1, Math.floor(requestedWidth * scale)),
    height: Math.max(1, Math.floor(requestedHeight * scale)),
  };
}

function modeIndex(mode: string): number {
  switch (mode) {
    case 'normal':
      return 0;
    case 'screen':
      return 1;
    case 'add':
      return 2;
    case 'multiply':
      return 3;
    default:
      return 1;
  }
}

function videoFitIndex(fit: string): number {
  switch (fit) {
    case 'cover':
      return 0;
    case 'contain':
      return 1;
    case 'stretch':
      return 2;
    default:
      return 0;
  }
}

interface VideoFrameSource {
  readonly readyState: number;
  readonly videoWidth: number;
  readonly videoHeight: number;
}

export function readVideoFrameSize(
  video: VideoFrameSource,
  maxDimension = MAX_RENDER_DIMENSION,
  maxPixels = MAX_RENDER_PIXELS,
): RenderSize | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (
    video.readyState < 2 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width > maxDimension ||
    height > maxDimension ||
    width * height > maxPixels
  ) {
    return null;
  }
  return { width, height };
}

export class RendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RendererError';
  }
}

export class WebGLRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly maxPixelRatio: number;
  private readonly maxTextureDimension: number;
  private plan: CompiledGraph | null = null;
  private programs = new Map<NodeKind, ProgramInfo>();
  private nodeResources = new Map<string, NodeResources>();
  private outputTextures = new Map<string, WebGLTexture>();
  private controlValues = new Map<string, number>();
  private vertexArray: WebGLVertexArrayObject | null = null;
  private blackTexture: WebGLTexture | null = null;
  private videoTexture: WebGLTexture | null = null;
  private videoSource: HTMLVideoElement | null = null;
  private videoSourceWidth = 1;
  private videoSourceHeight = 1;
  private renderWidth = 1;
  private renderHeight = 1;
  private frameCount = 0;
  private frameRate = 0;
  private lastRenderTimestamp: number | null = null;
  private lastPassCount = 0;
  private errorState: Error | null = null;
  private contextLost = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.maxPixelRatio = clamp(
      finiteOr(options.maxPixelRatio ?? 1.5, 1.5),
      1,
      MAX_RENDER_PIXEL_RATIO,
    );
    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!context) {
      throw new RendererError('WebGL2 is not available in this browser.');
    }
    this.gl = context;
    const reportedMaxTextureSize = context.getParameter(
      context.MAX_TEXTURE_SIZE,
    ) as unknown;
    this.maxTextureDimension = Math.max(
      1,
      Math.min(
        MAX_RENDER_DIMENSION,
        typeof reportedMaxTextureSize === 'number' &&
          Number.isFinite(reportedMaxTextureSize)
          ? Math.floor(reportedMaxTextureSize)
          : MAX_RENDER_DIMENSION,
      ),
    );
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    this.initializeContextResources();

    const width = options.width ?? (canvas.clientWidth || canvas.width || 960);
    const height = options.height ?? (canvas.clientHeight || canvas.height || 540);
    const browserPixelRatio =
      typeof window === 'undefined' ? 1 : window.devicePixelRatio;
    this.resize(width, height, options.pixelRatio ?? browserPixelRatio);
  }

  get width(): number {
    return this.renderWidth;
  }

  get height(): number {
    return this.renderHeight;
  }

  get lastError(): Error | null {
    return this.errorState;
  }

  get isContextLost(): boolean {
    return this.contextLost;
  }

  setGraph(document: GraphDocument): void {
    try {
      this.setCompiledGraph(compileGraph(document));
    } catch (error) {
      this.errorState = this.asError(error);
      throw this.errorState;
    }
  }

  setVideoSource(video: HTMLVideoElement | null): void {
    this.assertActive();
    if (this.videoSource === video) {
      return;
    }
    this.videoSource = video;
    this.videoSourceWidth = 1;
    this.videoSourceHeight = 1;
    if (!this.contextLost) {
      this.resetVideoTexture();
    }
  }

  setCompiledGraph(graph: CompiledGraph): void {
    this.assertActive();
    const validatedGraph = compileGraph(graph.document);
    this.assertResourceBudget(validatedGraph);
    const previousPlan = this.plan;
    this.plan = validatedGraph;
    if (!this.contextLost) {
      this.errorState = null;
      try {
        this.reconcileNodeResources();
      } catch (error) {
        this.plan = previousPlan;
        this.errorState = this.asError(error);
        throw this.errorState;
      }
    }
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    this.assertActive();
    const physicalSize = constrainRenderSize(
      width,
      height,
      pixelRatio,
      this.maxPixelRatio,
      this.maxTextureDimension,
    );
    const physicalWidth = physicalSize.width;
    const physicalHeight = physicalSize.height;
    if (
      physicalWidth === this.renderWidth &&
      physicalHeight === this.renderHeight &&
      this.canvas.width === physicalWidth &&
      this.canvas.height === physicalHeight
    ) {
      return;
    }

    const previousWidth = this.renderWidth;
    const previousHeight = this.renderHeight;
    const previousCanvasWidth = this.canvas.width;
    const previousCanvasHeight = this.canvas.height;
    try {
      this.renderWidth = physicalWidth;
      this.renderHeight = physicalHeight;
      this.canvas.width = physicalWidth;
      this.canvas.height = physicalHeight;
      if (!this.contextLost) {
        this.reconcileNodeResources();
        this.errorState = null;
      }
    } catch (error) {
      this.renderWidth = previousWidth;
      this.renderHeight = previousHeight;
      this.canvas.width = previousCanvasWidth;
      this.canvas.height = previousCanvasHeight;
      this.errorState = this.asError(error);
      throw this.errorState;
    }
  }

  render(
    timeSeconds: number,
    audioLevel = 0,
    pointer: RenderPointer = DEFAULT_POINTER,
  ): RenderResult {
    if (this.disposed) {
      return this.result(false, new RendererError('Renderer has been disposed.'));
    }
    if (this.contextLost) {
      return this.result(false, this.errorState);
    }

    try {
      this.updateFrameRate();
      const time = finiteOr(timeSeconds, 0);
      const audio = clamp(finiteOr(audioLevel, 0), 0, 1);
      const safePointer = {
        x: clamp(finiteOr(pointer.x, 0.5), 0, 1),
        y: clamp(finiteOr(pointer.y, 0.5), 0, 1),
      };

      this.controlValues.clear();
      this.outputTextures.clear();
      if (!this.plan || this.plan.displayNodes.length === 0) {
        this.clearDisplay();
        this.lastPassCount = 0;
        this.errorState = null;
        this.frameCount += 1;
        return this.result(true, null);
      }

      for (const node of this.plan.controlNodes) {
        this.evaluateControlNode(node, time, audio, safePointer);
      }
      if (this.plan.frameNodes.some(({ node }) => node.kind === 'videoInput')) {
        this.uploadVideoFrame();
      }
      for (const node of this.plan.frameNodes) {
        this.renderFrameNode(node, time);
      }
      const displayNode =
        this.plan.displayNodes.find((node) => node.inputs.source !== undefined) ??
        this.plan.displayNodes[0];
      this.renderDisplayNode(displayNode);
      this.lastPassCount = this.plan.frameNodes.length + 1;
      this.errorState = null;
      this.frameCount += 1;
      return this.result(true, null);
    } catch (error) {
      this.errorState = this.asError(error);
      return this.result(false, this.errorState);
    }
  }

  clearError(): void {
    this.errorState = null;
  }

  reset(): void {
    this.assertActive();
    this.frameCount = 0;
    this.frameRate = 0;
    this.lastRenderTimestamp = null;
    this.lastPassCount = 0;
    this.controlValues.clear();
    this.outputTextures.clear();
    for (const resources of this.nodeResources.values()) {
      resources.nextTargetIndex = 0;
      for (const target of resources.targets) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
        this.gl.viewport(0, 0, target.width, target.height);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      }
    }
    if (!this.contextLost) {
      this.resetVideoTexture();
      this.clearDisplay();
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    if (!this.contextLost) {
      this.releaseNodeResources();
      for (const info of this.programs.values()) {
        this.gl.deleteProgram(info.program);
      }
      if (this.blackTexture) {
        this.gl.deleteTexture(this.blackTexture);
      }
      if (this.videoTexture) {
        this.gl.deleteTexture(this.videoTexture);
      }
      if (this.vertexArray) {
        this.gl.deleteVertexArray(this.vertexArray);
      }
    }
    this.programs.clear();
    this.outputTextures.clear();
    this.controlValues.clear();
    this.blackTexture = null;
    this.videoTexture = null;
    this.videoSource = null;
    this.videoSourceWidth = 1;
    this.videoSourceHeight = 1;
    this.vertexArray = null;
    this.plan = null;
    this.disposed = true;
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    if (this.disposed) {
      return;
    }
    this.contextLost = true;
    this.errorState = new RendererError('The graphics context was lost.');
    this.nodeResources.clear();
    this.outputTextures.clear();
    this.controlValues.clear();
    this.programs.clear();
    this.blackTexture = null;
    this.videoTexture = null;
    this.videoSourceWidth = 1;
    this.videoSourceHeight = 1;
    this.vertexArray = null;
  };

  private readonly handleContextRestored = (): void => {
    if (this.disposed) {
      return;
    }
    this.contextLost = false;
    try {
      this.initializeContextResources();
      this.reconcileNodeResources();
      this.errorState = null;
    } catch (error) {
      this.errorState = this.asError(error);
    }
  };

  private initializeContextResources(): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    const vertexArray = gl.createVertexArray();
    const blackTexture = gl.createTexture();
    const videoTexture = gl.createTexture();
    if (!vertexArray || !blackTexture || !videoTexture) {
      if (vertexArray) {
        gl.deleteVertexArray(vertexArray);
      }
      if (blackTexture) {
        gl.deleteTexture(blackTexture);
      }
      if (videoTexture) {
        gl.deleteTexture(videoTexture);
      }
      throw new RendererError('Unable to allocate graphics resources.');
    }
    this.vertexArray = vertexArray;
    this.blackTexture = blackTexture;
    this.videoTexture = videoTexture;
    gl.bindTexture(gl.TEXTURE_2D, blackTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.resetVideoTexture();
  }

  private resetVideoTexture(): void {
    const texture = this.videoTexture;
    if (!texture) {
      return;
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.videoSourceWidth = 1;
    this.videoSourceHeight = 1;
  }

  private uploadVideoFrame(): void {
    const video = this.videoSource;
    const texture = this.videoTexture;
    if (!video || !texture) {
      return;
    }
    const size = readVideoFrameSize(
      video,
      this.maxTextureDimension,
      MAX_RENDER_PIXELS,
    );
    if (!size) {
      return;
    }

    const gl = this.gl;
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video,
      );
      this.videoSourceWidth = size.width;
      this.videoSourceHeight = size.height;
    } catch {
      // Media readiness can change between inspection and upload. Keep the
      // previous valid frame and retry on the next render.
    } finally {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  private assertResourceBudget(graph: CompiledGraph): void {
    const targetCount = graph.frameNodes.reduce(
      (count, { node }) => count + (node.kind === 'trails' ? 2 : 1),
      0,
    );
    if (targetCount > MAX_GPU_RENDER_TARGETS) {
      throw new RendererError(
        `Graph requires ${targetCount} offscreen frames; the limit is ${MAX_GPU_RENDER_TARGETS}.`,
      );
    }
    if (
      this.renderWidth * this.renderHeight * targetCount >
      MAX_RENDER_RESOURCE_PIXELS
    ) {
      throw new RendererError('The graph exceeds the graphics resource budget.');
    }
  }

  private reconcileNodeResources(): void {
    if (this.contextLost || !this.plan) {
      return;
    }
    const previous = this.nodeResources;
    const next = new Map<string, NodeResources>();
    const created: NodeResources[] = [];
    try {
      for (const compiledNode of this.plan.frameNodes) {
        const node = compiledNode.node;
        const targetCount = node.kind === 'trails' ? 2 : 1;
        const existing = previous.get(node.id);
        const canReuse =
          existing?.kind === node.kind &&
          existing.targets.length === targetCount &&
          existing.targets.every(
            (target) =>
              target.width === this.renderWidth &&
              target.height === this.renderHeight,
          );
        if (existing && canReuse) {
          next.set(node.id, existing);
          continue;
        }
        const resources: NodeResources = {
          kind: node.kind,
          targets: [],
          nextTargetIndex: 0,
        };
        created.push(resources);
        for (let index = 0; index < targetCount; index += 1) {
          resources.targets.push(this.createRenderTarget());
        }
        next.set(node.id, resources);
      }
    } catch (error) {
      for (const resources of created) {
        this.releaseResources(resources);
      }
      throw error;
    }
    for (const [nodeId, resources] of previous) {
      if (next.get(nodeId) !== resources) {
        this.releaseResources(resources);
      }
    }
    this.nodeResources = next;
  }

  private createRenderTarget(): RenderTarget {
    const gl = this.gl;
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) {
      if (texture) {
        gl.deleteTexture(texture);
      }
      if (framebuffer) {
        gl.deleteFramebuffer(framebuffer);
      }
      throw new RendererError('Unable to allocate an offscreen frame.');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(
      gl.TEXTURE_2D,
      1,
      gl.RGBA8,
      this.renderWidth,
      this.renderHeight,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new RendererError('An offscreen frame is incomplete.');
    }
    gl.viewport(0, 0, this.renderWidth, this.renderHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return {
      texture,
      framebuffer,
      width: this.renderWidth,
      height: this.renderHeight,
    };
  }

  private releaseNodeResources(): void {
    for (const resources of this.nodeResources.values()) {
      this.releaseResources(resources);
    }
    this.nodeResources.clear();
    this.outputTextures.clear();
  }

  private releaseResources(resources: NodeResources): void {
    for (const target of resources.targets) {
      this.gl.deleteFramebuffer(target.framebuffer);
      this.gl.deleteTexture(target.texture);
    }
    resources.targets.length = 0;
  }

  private evaluateControlNode(
    compiledNode: CompiledNode,
    time: number,
    audio: number,
    pointer: RenderPointer,
  ): void {
    const node = compiledNode.node;
    switch (node.kind) {
      case 'time': {
        const speed = this.numberParam(compiledNode, 'speed');
        const offset = this.numberParam(compiledNode, 'offset');
        this.setControl(node.id, 'value', time * speed + offset);
        return;
      }
      case 'oscillator': {
        const phaseSignal = this.controlInput(compiledNode, 'phase', time);
        const frequency = this.numberParam(compiledNode, 'frequency');
        const phase = this.numberParam(compiledNode, 'phase');
        const amplitude = this.numberParam(compiledNode, 'amplitude');
        const offset = this.numberParam(compiledNode, 'offset');
        const cycle = phaseSignal * frequency + phase;
        const fraction = cycle - Math.floor(cycle);
        const waveform = this.stringParam(compiledNode, 'waveform');
        let value: number;
        switch (waveform) {
          case 'triangle':
            value = 1 - Math.abs(fraction * 2 - 1);
            break;
          case 'saw':
            value = fraction;
            break;
          case 'square':
            value = fraction < 0.5 ? 1 : 0;
            break;
          default:
            value = Math.sin(cycle * TWO_PI) * 0.5 + 0.5;
        }
        this.setControl(node.id, 'value', offset + value * amplitude);
        return;
      }
      case 'pointer':
        this.setControl(node.id, 'x', pointer.x);
        this.setControl(node.id, 'y', pointer.y);
        return;
      case 'audioLevel': {
        const gain = this.numberParam(compiledNode, 'gain');
        const floor = this.numberParam(compiledNode, 'floor');
        this.setControl(
          node.id,
          'value',
          clamp((audio - floor) * gain, 0, 1),
        );
        return;
      }
      default:
        return;
    }
  }

  private renderFrameNode(compiledNode: CompiledNode, time: number): void {
    const resources = this.nodeResources.get(compiledNode.node.id);
    if (!resources || resources.targets.length === 0) {
      throw new RendererError(
        `No offscreen frame exists for node "${compiledNode.node.id}".`,
      );
    }

    if (compiledNode.node.kind === 'trails') {
      const writeTarget = resources.targets[resources.nextTargetIndex];
      const previousTarget = resources.targets[1 - resources.nextTargetIndex];
      if (!writeTarget || !previousTarget) {
        throw new RendererError('The Trails node requires two frame buffers.');
      }
      const program = this.beginPass('trails', writeTarget);
      this.bindTexture(
        program,
        'uSource',
        this.frameInput(compiledNode, 'source'),
        0,
      );
      this.bindTexture(program, 'uPrevious', previousTarget.texture, 1);
      this.uniform1f(
        program,
        'uFeedback',
        clamp(
          this.controlInput(
            compiledNode,
            'feedback',
            this.numberParam(compiledNode, 'feedback'),
          ),
          0,
          0.99,
        ),
      );
      this.draw(program);
      this.outputTextures.set(compiledNode.node.id, writeTarget.texture);
      resources.nextTargetIndex = 1 - resources.nextTargetIndex;
      return;
    }

    const target = resources.targets[0];
    if (!target) {
      throw new RendererError('The frame target is unavailable.');
    }
    const kind = compiledNode.node.kind;
    const program = this.beginPass(kind, target);

    switch (kind) {
      case 'videoInput':
        this.bindTexture(
          program,
          'uSource',
          this.videoTexture ?? this.fallbackTexture(),
          0,
        );
        this.uniform2f(
          program,
          'uSourceSize',
          this.videoSourceWidth,
          this.videoSourceHeight,
        );
        this.uniform1f(
          program,
          'uFit',
          videoFitIndex(this.stringParam(compiledNode, 'fit')),
        );
        this.uniform1f(
          program,
          'uMirror',
          this.stringParam(compiledNode, 'mirror') === 'on' ? 1 : 0,
        );
        break;
      case 'plasma': {
        const phase = this.controlInput(compiledNode, 'time', time);
        const speed = this.numberParam(compiledNode, 'speed');
        this.uniform1f(program, 'uTime', phase * speed);
        this.uniform1f(program, 'uScale', this.numberParam(compiledNode, 'scale'));
        this.uniform1f(
          program,
          'uEnergy',
          clamp(
            this.controlInput(
              compiledNode,
              'energy',
              this.numberParam(compiledNode, 'energy'),
            ),
            0,
            1,
          ),
        );
        this.uniform1f(program, 'uHue', this.numberParam(compiledNode, 'hue'));
        break;
      }
      case 'cells': {
        const phase = this.controlInput(compiledNode, 'time', time);
        this.uniform1f(
          program,
          'uTime',
          phase * this.numberParam(compiledNode, 'speed'),
        );
        this.uniform1f(program, 'uScale', this.numberParam(compiledNode, 'scale'));
        this.uniform1f(
          program,
          'uContrast',
          this.numberParam(compiledNode, 'contrast'),
        );
        break;
      }
      case 'warp':
        this.bindTexture(
          program,
          'uSource',
          this.frameInput(compiledNode, 'source'),
          0,
        );
        this.uniform1f(
          program,
          'uAmount',
          clamp(
            this.controlInput(
              compiledNode,
              'amount',
              this.numberParam(compiledNode, 'amount'),
            ),
            0,
            1,
          ),
        );
        this.uniform1f(
          program,
          'uFrequency',
          this.numberParam(compiledNode, 'frequency'),
        );
        this.uniform1f(
          program,
          'uTime',
          time * this.numberParam(compiledNode, 'speed'),
        );
        break;
      case 'blend':
        this.bindTexture(
          program,
          'uA',
          this.frameInput(compiledNode, 'a'),
          0,
        );
        this.bindTexture(
          program,
          'uB',
          this.frameInput(compiledNode, 'b'),
          1,
        );
        this.uniform1f(
          program,
          'uMix',
          clamp(
            this.controlInput(
              compiledNode,
              'mix',
              this.numberParam(compiledNode, 'mix'),
            ),
            0,
            1,
          ),
        );
        this.uniform1f(
          program,
          'uMode',
          modeIndex(this.stringParam(compiledNode, 'mode')),
        );
        break;
      case 'colorGrade':
        this.bindTexture(
          program,
          'uSource',
          this.frameInput(compiledNode, 'source'),
          0,
        );
        this.uniform1f(
          program,
          'uHue',
          clamp(
            this.controlInput(
              compiledNode,
              'hue',
              this.numberParam(compiledNode, 'hue'),
            ),
            -1,
            1,
          ),
        );
        this.uniform1f(
          program,
          'uExposure',
          clamp(
            this.controlInput(
              compiledNode,
              'exposure',
              this.numberParam(compiledNode, 'exposure'),
            ),
            -2,
            2,
          ),
        );
        this.uniform1f(
          program,
          'uContrast',
          this.numberParam(compiledNode, 'contrast'),
        );
        this.uniform1f(
          program,
          'uSaturation',
          clamp(
            this.controlInput(
              compiledNode,
              'saturation',
              this.numberParam(compiledNode, 'saturation'),
            ),
            0,
            3,
          ),
        );
        break;
      default:
        throw new RendererError(`Node kind "${kind}" is not a frame operator.`);
    }

    this.draw(program);
    this.outputTextures.set(compiledNode.node.id, target.texture);
  }

  private renderDisplayNode(compiledNode: CompiledNode | undefined): void {
    if (!compiledNode) {
      this.clearDisplay();
      return;
    }
    const program = this.beginPass('display', null);
    this.bindTexture(
      program,
      'uSource',
      this.frameInput(compiledNode, 'source'),
      0,
    );
    this.draw(program);
  }

  private beginPass(
    kind: NodeKind,
    target: RenderTarget | null,
  ): ProgramInfo {
    const gl = this.gl;
    const program = this.programFor(kind);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(0, 0, this.renderWidth, this.renderHeight);
    gl.useProgram(program.program);
    gl.bindVertexArray(this.vertexArray);
    this.uniform2f(program, 'uResolution', this.renderWidth, this.renderHeight);
    return program;
  }

  private draw(program: ProgramInfo): void {
    this.gl.useProgram(program.program);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private programFor(kind: NodeKind): ProgramInfo {
    const existing = this.programs.get(kind);
    if (existing) {
      return existing;
    }
    const fragmentSource = FRAME_FRAGMENT_SHADERS[kind];
    if (!fragmentSource) {
      throw new RendererError(`No shader is registered for "${kind}".`);
    }
    const program: ProgramInfo = {
      program: this.createProgram(FULLSCREEN_VERTEX_SHADER, fragmentSource),
      uniforms: new Map(),
    };
    this.programs.set(kind, program);
    return program;
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    let fragmentShader: WebGLShader;
    try {
      fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    } catch (error) {
      gl.deleteShader(vertexShader);
      throw error;
    }
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new RendererError('Unable to create a shader program.');
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const detail = gl.getProgramInfoLog(program) ?? 'Unknown link error.';
      gl.deleteProgram(program);
      throw new RendererError(`Shader link failed: ${detail}`);
    }
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new RendererError('Unable to create a shader.');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const detail = gl.getShaderInfoLog(shader) ?? 'Unknown compile error.';
      gl.deleteShader(shader);
      throw new RendererError(`Shader compilation failed: ${detail}`);
    }
    return shader;
  }

  private uniformLocation(
    program: ProgramInfo,
    name: string,
  ): WebGLUniformLocation | null {
    if (program.uniforms.has(name)) {
      return program.uniforms.get(name) ?? null;
    }
    const location = this.gl.getUniformLocation(program.program, name);
    program.uniforms.set(name, location);
    return location;
  }

  private uniform1f(program: ProgramInfo, name: string, value: number): void {
    const location = this.uniformLocation(program, name);
    if (location) {
      this.gl.uniform1f(location, finiteOr(value, 0));
    }
  }

  private uniform2f(
    program: ProgramInfo,
    name: string,
    x: number,
    y: number,
  ): void {
    const location = this.uniformLocation(program, name);
    if (location) {
      this.gl.uniform2f(location, x, y);
    }
  }

  private bindTexture(
    program: ProgramInfo,
    name: string,
    texture: WebGLTexture,
    unit: number,
  ): void {
    const location = this.uniformLocation(program, name);
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    if (location) {
      this.gl.uniform1i(location, unit);
    }
  }

  private frameInput(compiledNode: CompiledNode, inputId: string): WebGLTexture {
    const binding = compiledNode.inputs[inputId];
    const texture = binding
      ? this.outputTextures.get(binding.sourceNodeId)
      : undefined;
    if (texture) {
      return texture;
    }
    return this.fallbackTexture();
  }

  private fallbackTexture(): WebGLTexture {
    if (!this.blackTexture) {
      throw new RendererError('The fallback texture is unavailable.');
    }
    return this.blackTexture;
  }

  private controlInput(
    compiledNode: CompiledNode,
    inputId: string,
    fallback: number,
  ): number {
    const binding = compiledNode.inputs[inputId];
    if (!binding) {
      return fallback;
    }
    return (
      this.controlValues.get(
        this.controlKey(binding.sourceNodeId, binding.sourcePortId),
      ) ?? fallback
    );
  }

  private setControl(nodeId: string, portId: string, value: number): void {
    this.controlValues.set(this.controlKey(nodeId, portId), finiteOr(value, 0));
  }

  private controlKey(nodeId: string, portId: string): string {
    return `${nodeId}\u0000${portId}`;
  }

  private numberParam(compiledNode: CompiledNode, id: string): number {
    const definition = compiledNode.definition.params[id];
    const fallback = this.numberDefault(definition, id, compiledNode.node.id);
    const value = compiledNode.node.params[id];
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (definition?.type !== 'number') {
        return fallback;
      }
      return clamp(value, definition.min, definition.max);
    }
    return fallback;
  }

  private numberDefault(
    definition: OperatorParamDefinition | undefined,
    id: string,
    nodeId: string,
  ): number {
    if (definition?.type !== 'number') {
      throw new RendererError(
        `Numeric parameter "${id}" is not defined on node "${nodeId}".`,
      );
    }
    return definition.defaultValue;
  }

  private stringParam(compiledNode: CompiledNode, id: string): string {
    const definition = compiledNode.definition.params[id];
    const value = compiledNode.node.params[id];
    if (
      typeof value === 'string' &&
      definition?.type === 'select' &&
      definition.options.some((option) => option.value === value)
    ) {
      return value;
    }
    if (definition?.type !== 'select') {
      throw new RendererError(
        `Select parameter "${id}" is not defined on node "${compiledNode.node.id}".`,
      );
    }
    return definition.defaultValue;
  }

  private clearDisplay(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.renderWidth, this.renderHeight);
    this.gl.clearColor(0.008, 0.01, 0.016, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  private result(rendered: boolean, error: Error | null): RenderResult {
    return {
      rendered,
      frame: this.frameCount,
      fps: this.frameRate,
      passCount: this.lastPassCount,
      width: this.renderWidth,
      height: this.renderHeight,
      error: error?.message ?? null,
    };
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new RendererError('Renderer has been disposed.');
    }
  }

  private updateFrameRate(): void {
    const timestamp = performance.now();
    if (this.lastRenderTimestamp !== null) {
      const elapsed = timestamp - this.lastRenderTimestamp;
      if (elapsed > 0) {
        const instantaneous = 1000 / elapsed;
        this.frameRate =
          this.frameRate === 0
            ? instantaneous
            : this.frameRate * 0.9 + instantaneous * 0.1;
      }
    }
    this.lastRenderTimestamp = timestamp;
  }

  private asError(error: unknown): Error {
    return error instanceof Error
      ? error
      : new RendererError(`Unknown renderer error: ${String(error)}`);
  }
}
