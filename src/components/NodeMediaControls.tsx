import { useContext } from 'react';
import { Mic2, Video } from 'lucide-react';
import type { GraphParamValue, NodeKind } from '../graph';
import type { AudioInputState } from '../hooks/useAudioLevel';
import type {
  VideoFacingMode,
  VideoInputState,
} from '../hooks/useVideoInput';
import {
  OperatorInputRuntimeContext,
  type OperatorInputRuntime,
} from './operatorInputRuntime';

export type { OperatorInputRuntime } from './operatorInputRuntime';

interface NodeMediaControlsProps {
  kind: NodeKind;
  params: Record<string, GraphParamValue>;
  runtime?: OperatorInputRuntime;
  onSelect: () => void;
}

function clampLevel(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function audioStatus(state: AudioInputState): string {
  switch (state) {
    case 'live':
      return 'MIC LIVE';
    case 'requesting':
      return 'REQUESTING';
    case 'unavailable':
      return 'UNAVAILABLE';
    default:
      return 'DEMO';
  }
}

function videoStatus(
  state: VideoInputState,
  facingMode: VideoFacingMode,
): string {
  switch (state) {
    case 'live':
      return facingMode === 'environment' ? 'rear live' : 'front live';
    case 'requesting':
      return 'requesting';
    case 'denied':
      return 'blocked';
    case 'unavailable':
      return 'unavailable';
    case 'error':
      return 'input error';
    default:
      return 'camera off';
  }
}

export function NodeMediaControls({
  kind,
  params,
  runtime: runtimeOverride,
  onSelect,
}: NodeMediaControlsProps) {
  const contextualRuntime = useContext(OperatorInputRuntimeContext);
  const runtime = runtimeOverride ?? contextualRuntime;

  if (!runtime) {
    return null;
  }

  if (kind === 'audioLevel') {
    const gain = typeof params.gain === 'number' ? params.gain : 1.5;
    const floor = typeof params.floor === 'number' ? params.floor : 0.02;
    const rawLevel = clampLevel(runtime.audio.meterLevel);
    const level = clampLevel((rawLevel - floor) * gain);
    const percentage = Math.round(level * 100);
    const live = runtime.audio.inputState === 'live';
    const requesting = runtime.audio.inputState === 'requesting';
    return (
      <section
        className="node-input-runtime nodrag nopan nowheel"
        aria-label="Audio input controls"
      >
        <div className="node-input-readout">
          <div className="node-input-label">
            <span
              className={`node-input-state ${live ? 'is-live' : ''}`}
              aria-live="polite"
            >
              <i aria-hidden="true" />
              {audioStatus(runtime.audio.inputState)}
            </span>
            <span>control out</span>
          </div>
          <div
            className="node-level-meter"
            role="meter"
            aria-label={`${live ? 'Microphone' : 'Demo'} control output level`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
            aria-valuetext={`${percentage} percent`}
          >
            <i
              style={{ '--meter-level': `${percentage}%` } as React.CSSProperties}
            />
          </div>
        </div>
        <button
          type="button"
          className={`node-input-button ${live ? 'is-stop' : ''}`}
          disabled={requesting}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
            if (live) {
              runtime.audio.disable();
            } else {
              void runtime.audio.enable();
            }
          }}
        >
          <Mic2 aria-hidden="true" />
          {live ? 'Stop mic' : requesting ? 'Requesting…' : 'Start mic'}
        </button>
        <p className="node-input-hint">
          {live
            ? 'Level → control, not speakers · Stop → demo'
            : 'Level → control · no speaker output'}
        </p>
      </section>
    );
  }

  if (kind === 'videoInput') {
    const live = runtime.video.inputState === 'live';
    const requesting = runtime.video.inputState === 'requesting';
    return (
      <section
        className="node-input-runtime nodrag nopan nowheel"
        aria-label="Camera input controls"
      >
        <span
          className={`node-input-state ${live ? 'is-live' : ''}`}
          aria-live="polite"
          aria-label={
            runtime.video.errorMessage ??
            videoStatus(runtime.video.inputState, runtime.video.facingMode)
          }
          title={runtime.video.errorMessage ?? undefined}
        >
          <i aria-hidden="true" />
          {videoStatus(runtime.video.inputState, runtime.video.facingMode)}
        </span>
        <button
          type="button"
          className={`node-input-button ${live ? 'is-stop' : ''}`}
          disabled={requesting}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
            if (live) {
              runtime.video.disable();
            } else {
              void runtime.video.enable(
                params.facing === 'environment' ? 'environment' : 'user',
              );
            }
          }}
        >
          <Video aria-hidden="true" />
          {live ? 'Stop camera' : requesting ? 'Requesting…' : 'Start camera'}
        </button>
      </section>
    );
  }

  return null;
}
