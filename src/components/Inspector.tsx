import { Braces, Copy, Mic2, Trash2, Video } from 'lucide-react';
import {
  getOperatorDefinition,
  type GraphNode,
  type GraphParamValue,
} from '../graph';
import type { AudioInputState } from '../hooks/useAudioLevel';
import type {
  VideoFacingMode,
  VideoInputState,
} from '../hooks/useVideoInput';
import { formatParameterNumber } from './parameterFormatting';
import { DOMAIN_LABELS, OPERATOR_META } from './operatorMeta';

interface InspectorProps {
  node: GraphNode | null;
  audioInputState: AudioInputState;
  videoInputState: VideoInputState;
  videoInputError: string | null;
  videoFacingMode: VideoFacingMode;
  onParamChange: (nodeId: string, paramId: string, value: GraphParamValue) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (node: GraphNode) => void;
  onEnableMicrophone: () => Promise<void>;
  onDisableMicrophone: () => void;
  onEnableCamera: (facingMode: VideoFacingMode) => Promise<void>;
  onDisableCamera: () => void;
}

export function Inspector({
  node,
  audioInputState,
  videoInputState,
  videoInputError,
  videoFacingMode,
  onParamChange,
  onGestureStart,
  onGestureEnd,
  onDelete,
  onDuplicate,
  onEnableMicrophone,
  onDisableMicrophone,
  onEnableCamera,
  onDisableCamera,
}: InspectorProps) {
  if (!node) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="inspector-empty">
          <div className="inspector-empty-icon" aria-hidden="true">
            <Braces size={20} />
          </div>
          <h2>Nothing selected</h2>
          <p>Select a node to tune its parameters and inspect its signal contract.</p>
        </div>
      </aside>
    );
  }

  const definition = getOperatorDefinition(node.kind);
  const meta = OPERATOR_META[node.kind];
  const Icon = meta.icon;
  const selectedFacingMode: VideoFacingMode =
    node.params.facing === 'environment' ? 'environment' : 'user';

  return (
    <aside
      className="inspector"
      aria-label={`${definition.title} inspector`}
      style={{ '--node-accent': meta.accent } as React.CSSProperties}
    >
      <header className="inspector-header">
        <span className="inspector-kind-icon" aria-hidden="true">
          <Icon size={17} />
        </span>
        <div>
          <h2 className="inspector-name">{definition.title}</h2>
          <div className="inspector-kind">{DOMAIN_LABELS[definition.domain]} / {node.id}</div>
        </div>
      </header>

      <section className="inspector-section">
        <div className="section-label">About</div>
        <p className="inspector-description">{definition.summary}</p>
        <div className="signal-readout">
          <div className="readout-cell">
            <span>Inputs</span>
            <strong>{definition.inputs.length}</strong>
          </div>
          <div className="readout-cell">
            <span>Outputs</span>
            <strong>{definition.outputs.length}</strong>
          </div>
          <div className="readout-cell">
            <span>Domain</span>
            <strong>{definition.domain}</strong>
          </div>
        </div>
      </section>

      {Object.keys(definition.params).length > 0 ? (
        <section className="inspector-section">
          <div className="section-label">Parameters</div>
          <div className="parameter-list">
            {Object.entries(definition.params).map(([paramId, parameter]) => {
              const value = node.params[paramId] ?? parameter.defaultValue;
              if (parameter.type === 'select') {
                return (
                  <label className="parameter-row" key={paramId}>
                    <span className="parameter-label">{parameter.label}</span>
                    <select
                      value={String(value)}
                      onChange={(event) =>
                        onParamChange(node.id, paramId, event.target.value)
                      }
                    >
                      {parameter.options.map((option) => (
                        <option value={option.value} key={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                );
              }

              const numericValue = typeof value === 'number' ? value : parameter.defaultValue;
              const progress = ((numericValue - parameter.min) / (parameter.max - parameter.min)) * 100;
              return (
                <label className="parameter-row" key={paramId}>
                  <span className="parameter-label-row">
                    <span className="parameter-label">{parameter.label}</span>
                    <output className="parameter-value">
                      {formatParameterNumber(numericValue, parameter.step)}
                    </output>
                  </span>
                  <input
                    type="range"
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    value={numericValue}
                    style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
                    onPointerDown={onGestureStart}
                    onPointerUp={onGestureEnd}
                    onPointerCancel={onGestureEnd}
                    onChange={(event) => onParamChange(node.id, paramId, Number(event.target.value))}
                  />
                  <span className="parameter-help">{parameter.min} — {parameter.max}</span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {node.kind === 'audioLevel' ? (
        <section className="inspector-section">
          <div className="section-label">Input source</div>
          <p className="inspector-description">
            {audioInputState === 'live'
              ? 'Microphone analysis is active in this tab.'
              : 'Demo pulse is active. Microphone access is optional and stays on this device.'}
          </p>
          <button
            type="button"
            className={audioInputState === 'live' ? 'danger-button' : 'primary-button'}
            onClick={() => {
              if (audioInputState === 'live') {
                onDisableMicrophone();
              } else {
                void onEnableMicrophone();
              }
            }}
            disabled={audioInputState === 'requesting'}
          >
            <Mic2 size={13} />
            {audioInputState === 'live'
              ? 'Stop microphone'
              : audioInputState === 'requesting'
                ? 'Requesting…'
                : 'Enable microphone'}
          </button>
        </section>
      ) : null}

      {node.kind === 'videoInput' ? (
        <section className="inspector-section camera-input-section">
          <div className="section-label">Input source</div>
          <div className={`input-state input-state-${videoInputState}`} aria-live="polite">
            <i aria-hidden="true" />
            <strong>{videoStateLabel(videoInputState)}</strong>
            {videoInputState === 'live' ? (
              <span>{videoFacingMode === 'environment' ? 'rear' : 'front'}</span>
            ) : null}
          </div>
          <p
            className="inspector-description"
            role={videoInputError ? 'alert' : undefined}
          >
            {videoInputError ?? videoStateDescription(videoInputState)}
          </p>
          <button
            type="button"
            className={videoInputState === 'live' ? 'danger-button' : 'primary-button'}
            onClick={() => {
              if (videoInputState === 'live') {
                onDisableCamera();
              } else {
                void onEnableCamera(selectedFacingMode);
              }
            }}
            disabled={videoInputState === 'requesting'}
          >
            <Video size={13} />
            {videoInputState === 'live'
              ? 'Stop camera'
              : videoInputState === 'requesting'
                ? 'Requesting…'
                : videoInputState === 'idle'
                  ? 'Enable camera'
                  : 'Try camera again'}
          </button>
          <p className="input-privacy-note">
            Permission is requested only when you enable the camera. Frames stay in this tab.
          </p>
        </section>
      ) : null}

      <div className="inspector-actions">
        <button type="button" className="text-button" onClick={() => onDuplicate(node)}>
          <Copy size={13} /> Duplicate
        </button>
        <button type="button" className="danger-button" onClick={() => onDelete(node.id)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </aside>
  );
}

function videoStateLabel(state: VideoInputState): string {
  switch (state) {
    case 'idle':
      return 'Camera off';
    case 'requesting':
      return 'Waiting for permission';
    case 'live':
      return 'Camera live';
    case 'denied':
      return 'Permission blocked';
    case 'unavailable':
      return 'Camera unavailable';
    case 'error':
      return 'Camera error';
  }
}

function videoStateDescription(state: VideoInputState): string {
  switch (state) {
    case 'idle':
      return 'The camera is off. Enable it to feed live frames into this node.';
    case 'requesting':
      return 'Choose Allow in the browser prompt to start the selected camera.';
    case 'live':
      return 'Live frames are available to every connected branch of this patch.';
    case 'denied':
      return 'Allow camera permission for this site, then try again.';
    case 'unavailable':
      return 'Connect a camera or choose another available input.';
    case 'error':
      return 'Check the camera and browser permissions, then try again.';
  }
}
