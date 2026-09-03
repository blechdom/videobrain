import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, Maximize2 } from 'lucide-react';
import type { GraphDocument } from '../graph';
import {
  WebGLRenderer,
  type RenderPointer,
  type RenderResult,
} from '../engine';
import type { AudioInputState } from '../hooks/useAudioLevel';
import type { VideoInputState } from '../hooks/useVideoInput';

interface PreviewPanelProps {
  document: GraphDocument;
  playing: boolean;
  resetToken: number;
  audioInputState: AudioInputState;
  videoInputState: VideoInputState;
  videoSource: HTMLVideoElement | null;
  meterLevel: number;
  sampleAudioLevel: (timeSeconds: number) => number;
  onRuntimeUpdate: (result: RenderResult | null) => void;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function PreviewPanel({
  document,
  playing,
  resetToken,
  audioInputState,
  videoInputState,
  videoSource,
  meterLevel,
  sampleAudioLevel,
  onRuntimeUpdate,
  onNotify,
}: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const animationRef = useRef(0);
  const elapsedRef = useRef(0);
  const previousTimestampRef = useRef<number | null>(null);
  const pointerRef = useRef<RenderPointer>({ x: 0.5, y: 0.5 });
  const publishTimestampRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<RenderResult | null>(null);

  const publishResult = useCallback(
    (result: RenderResult, force = false) => {
      const now = performance.now();
      if (!force && now - publishTimestampRef.current < 180) {
        return;
      }
      publishTimestampRef.current = now;
      setRuntime(result);
      onRuntimeUpdate(result);
      setError(result.error);
    },
    [onRuntimeUpdate],
  );

  const renderOnce = useCallback(
    (forcePublish = false) => {
      const renderer = rendererRef.current;
      if (!renderer) {
        return;
      }
      const audio = sampleAudioLevel(elapsedRef.current);
      const result = renderer.render(elapsedRef.current, audio, pointerRef.current);
      publishResult(result, forcePublish);
    },
    [publishResult, sampleAudioLevel],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    try {
      const renderer = new WebGLRenderer(canvas, { maxPixelRatio: 1.5 });
      rendererRef.current = renderer;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to start the renderer.';
      queueMicrotask(() => {
        setError(message);
        onRuntimeUpdate(null);
      });
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [onRuntimeUpdate]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    try {
      renderer.setGraph(document);
      renderOnce(true);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The graph could not be compiled.';
      queueMicrotask(() => setError(message));
      onNotify(message, 'error');
    }
  }, [document, onNotify, renderOnce]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    renderer.setVideoSource(videoSource);
    renderOnce(true);
  }, [renderOnce, videoSource]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      renderer.resize(width, height, window.devicePixelRatio);
      renderOnce(true);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderOnce]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    elapsedRef.current = 0;
    previousTimestampRef.current = null;
    renderer.reset();
    renderOnce(true);
  }, [renderOnce, resetToken]);

  useEffect(() => {
    cancelAnimationFrame(animationRef.current);
    previousTimestampRef.current = null;

    if (!playing || !rendererRef.current) {
      renderOnce(true);
      return;
    }

    const tick = (timestamp: number) => {
      const previous = previousTimestampRef.current;
      previousTimestampRef.current = timestamp;
      if (previous !== null) {
        elapsedRef.current += Math.min(0.1, Math.max(0, (timestamp - previous) / 1000));
      }
      renderOnce();
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [playing, renderOnce]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height)),
    };
    if (!playing) {
      renderOnce(true);
    }
  };

  const saveFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    renderOnce(true);
    canvas.toBlob((blob) => {
      if (!blob) {
        onNotify('The current frame could not be captured.', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `videobrain-frame-${new Date().toISOString().replaceAll(':', '-')}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      onNotify('Frame exported as PNG.', 'success');
    }, 'image/png');
  };

  const enterFullscreen = async () => {
    const canvas = canvasRef.current;
    if (!canvas?.requestFullscreen) {
      onNotify('Fullscreen is unavailable in this browser.', 'error');
      return;
    }
    try {
      await canvas.requestFullscreen();
    } catch {
      onNotify('Fullscreen could not be opened.', 'error');
    }
  };

  return (
    <section className="preview-panel" aria-label="Live output">
      <header className="preview-header">
        <div>
          <div className="panel-eyebrow">Monitor</div>
          <div className="panel-title">Live output</div>
        </div>
        <div className="preview-meta">
          <AudioMeter value={meterLevel} />
          <span className="runtime-pill">{playing ? 'running' : 'held'}</span>
          <button type="button" className="icon-button" onClick={saveFrame} title="Export PNG">
            <Camera size={14} />
            <span className="sr-only">Export current frame</span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void enterFullscreen()}
            title="Fullscreen output"
          >
            <Maximize2 size={14} />
            <span className="sr-only">Open output fullscreen</span>
          </button>
        </div>
      </header>
      <div className="preview-surface">
        <canvas
          ref={canvasRef}
          className="preview-canvas"
          data-rendered={runtime?.rendered ?? false}
          data-frame={runtime?.frame ?? 0}
          onPointerMove={updatePointer}
          onPointerDown={updatePointer}
          aria-label="Rendered visual output. Move the pointer here to drive pointer signals."
        />
        {error ? (
          <div className="preview-error" role="alert">
            <strong>Output unavailable</strong>
            <span>{error}</span>
          </div>
        ) : null}
        {!runtime && !error ? <div className="preview-loading">Starting GPU runtime…</div> : null}
        {runtime ? (
          <div className="preview-hud">
            <span>{runtime.width}×{runtime.height}</span>
            <span>·</span>
            <span>{runtime.passCount} passes</span>
            <span>·</span>
            <span>{Math.round(runtime.fps)} fps</span>
            {audioInputState === 'live' ? <><span>·</span><span>mic</span></> : null}
            {videoInputState === 'live' ? <><span>·</span><span>camera</span></> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AudioMeter({ value }: { value: number }) {
  const activeBars = Math.round(Math.min(1, Math.max(0, value)) * 8);
  return (
    <span className="audio-meter" aria-label={`Audio level ${Math.round(value * 100)} percent`}>
      {Array.from({ length: 8 }, (_, index) => (
        <i
          className={index < activeBars ? 'active' : ''}
          style={{ height: `${5 + index * 1.25}px` }}
          key={index}
        />
      ))}
    </span>
  );
}
