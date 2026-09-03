import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createGraphNode } from '../graph';
import { Inspector } from './Inspector';

function renderVideoInspector(
  overrides: Partial<Parameters<typeof Inspector>[0]> = {},
) {
  const props: Parameters<typeof Inspector>[0] = {
    node: createGraphNode('videoInput', { x: 0, y: 0 }, {}, 'camera-1'),
    audioInputState: 'demo',
    videoInputState: 'idle',
    videoInputError: null,
    videoFacingMode: 'user',
    onParamChange: vi.fn(),
    onGestureStart: vi.fn(),
    onGestureEnd: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onEnableMicrophone: vi.fn().mockResolvedValue(undefined),
    onDisableMicrophone: vi.fn(),
    onEnableCamera: vi.fn().mockResolvedValue(undefined),
    onDisableCamera: vi.fn(),
    ...overrides,
  };
  render(createElement(Inspector, props));
  return props;
}

describe('video input inspector', () => {
  it('keeps permission opt-in and starts the persisted camera facing mode', async () => {
    const user = userEvent.setup();
    const props = renderVideoInspector();

    expect(screen.getByText('Camera off')).toBeVisible();
    expect(screen.getByText(/permission is requested only/i)).toBeVisible();
    expect(props.onEnableCamera).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Enable camera' }));

    expect(props.onEnableCamera).toHaveBeenCalledWith('user');
  });

  it('switches an active device when the camera parameter changes', async () => {
    const user = userEvent.setup();
    const onParamChange = vi.fn();
    const onEnableCamera = vi.fn().mockResolvedValue(undefined);
    const onDisableCamera = vi.fn();
    renderVideoInspector({
      videoInputState: 'live',
      onParamChange,
      onEnableCamera,
      onDisableCamera,
    });

    await user.selectOptions(screen.getByLabelText('Camera'), 'environment');

    expect(onParamChange).toHaveBeenCalledWith('camera-1', 'facing', 'environment');
    expect(onEnableCamera).toHaveBeenCalledWith('environment');

    await user.click(screen.getByRole('button', { name: 'Stop camera' }));
    expect(onDisableCamera).toHaveBeenCalledOnce();
  });

  it('surfaces a useful camera error and allows retry', () => {
    renderVideoInspector({
      videoInputState: 'denied',
      videoInputError: 'Camera access was blocked for this site.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Camera access was blocked');
    expect(screen.getByRole('button', { name: 'Try camera again' })).toBeEnabled();
  });
});
