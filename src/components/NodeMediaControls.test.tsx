import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  NodeMediaControls,
  type OperatorInputRuntime,
} from './NodeMediaControls';

function createRuntime(
  overrides: {
    audioState?: OperatorInputRuntime['audio']['inputState'];
    meterLevel?: number;
    videoState?: OperatorInputRuntime['video']['inputState'];
    videoError?: string | null;
    facingMode?: OperatorInputRuntime['video']['facingMode'];
  } = {},
) {
  const runtime: OperatorInputRuntime = {
    audio: {
      inputState: overrides.audioState ?? 'demo',
      meterLevel: overrides.meterLevel ?? 0.42,
      enable: vi.fn(() => Promise.resolve()),
      disable: vi.fn(),
    },
    video: {
      inputState: overrides.videoState ?? 'idle',
      errorMessage: overrides.videoError ?? null,
      facingMode: overrides.facingMode ?? 'user',
      enable: vi.fn(() => Promise.resolve()),
      disable: vi.fn(),
    },
  };
  const onSelect = vi.fn();
  return { runtime, onSelect };
}

describe('NodeMediaControls', () => {
  it('shows the processed control meter and explains its silent output', () => {
    const props = createRuntime({ meterLevel: 0.42 });
    render(
      <NodeMediaControls
        kind="audioLevel"
        params={{ gain: 2, floor: 0.1 }}
        {...props}
      />,
    );

    expect(screen.getByText('DEMO')).toBeVisible();
    expect(screen.getByText('control out')).toBeVisible();
    expect(screen.getByText('Level → control · no speaker output')).toBeVisible();
    expect(screen.getByRole('meter', { name: 'Demo control output level' })).toHaveAttribute(
      'aria-valuenow',
      '64',
    );
  });

  it('starts and stops the microphone while selecting the owning node', () => {
    const stopped = createRuntime();
    const { rerender } = render(
      <NodeMediaControls
        kind="audioLevel"
        params={{}}
        {...stopped}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start mic' }));
    expect(stopped.onSelect).toHaveBeenCalledOnce();
    expect(stopped.runtime.audio.enable).toHaveBeenCalledOnce();

    const live = createRuntime({ audioState: 'live' });
    rerender(
      <NodeMediaControls
        kind="audioLevel"
        params={{}}
        {...live}
      />,
    );
    expect(screen.getByText('Level → control, not speakers · Stop → demo')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Stop mic' }));
    expect(live.runtime.audio.disable).toHaveBeenCalledOnce();
  });

  it('disables the microphone action while permission is being requested', () => {
    const props = createRuntime({ audioState: 'requesting' });
    render(
      <NodeMediaControls
        kind="audioLevel"
        params={{}}
        {...props}
      />,
    );
    expect(screen.getByRole('button', { name: 'Requesting…' })).toBeDisabled();
  });

  it('starts the camera with the facing mode selected in the node', () => {
    const props = createRuntime({
      videoState: 'denied',
      videoError: 'Camera permission was blocked.',
    });
    render(
      <NodeMediaControls
        kind="videoInput"
        params={{ facing: 'environment' }}
        {...props}
      />,
    );

    expect(screen.getByText('blocked')).toHaveAttribute(
      'title',
      'Camera permission was blocked.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(props.onSelect).toHaveBeenCalledOnce();
    expect(props.runtime.video.enable).toHaveBeenCalledWith('environment');
  });

  it('stops a live camera and reports the active device direction', () => {
    const props = createRuntime({
      videoState: 'live',
      facingMode: 'environment',
    });
    render(
      <NodeMediaControls
        kind="videoInput"
        params={{ facing: 'environment' }}
        {...props}
      />,
    );

    expect(screen.getByText('rear live')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }));
    expect(props.runtime.video.disable).toHaveBeenCalledOnce();
  });
});
