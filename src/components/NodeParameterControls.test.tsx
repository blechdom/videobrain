import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getDefaultParams, getOperatorDefinition } from '../graph';
import { NodeParameterControls } from './NodeParameterControls';

function renderControls(kind: 'oscillator' | 'videoInput') {
  const definition = getOperatorDefinition(kind);
  const props = {
    nodeId: `${kind}-1`,
    definition,
    params: getDefaultParams(kind),
    onParamChange: vi.fn(),
    onGestureStart: vi.fn(),
    onGestureEnd: vi.fn(),
    onSelect: vi.fn(),
  };
  render(<NodeParameterControls {...props} />);
  return props;
}

describe('NodeParameterControls', () => {
  it('renders every numeric value as a compact node-safe slider', () => {
    renderControls('oscillator');

    expect(
      screen.getByRole('group', { name: 'Oscillator parameters' }),
    ).toBeVisible();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(4);
    expect(sliders[0]).toHaveClass('nodrag', 'nopan', 'nowheel');
    expect(screen.getByRole('combobox', { name: 'Oscillator Waveform' })).toBeVisible();
  });

  it('updates a numeric parameter inside one undo gesture', () => {
    const props = renderControls('oscillator');
    const slider = screen.getByRole('slider', { name: 'Oscillator Frequency' });

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '2.5' } });
    fireEvent.pointerUp(slider);

    expect(props.onSelect).toHaveBeenCalled();
    expect(props.onGestureStart).toHaveBeenCalledOnce();
    expect(props.onParamChange).toHaveBeenCalledWith(
      'oscillator-1',
      'frequency',
      2.5,
    );
    expect(props.onGestureEnd).toHaveBeenCalledOnce();
  });

  it('exposes enumerated node values as compact selects', async () => {
    const user = userEvent.setup();
    const props = renderControls('videoInput');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Video Input Fit' }),
      'contain',
    );

    expect(props.onParamChange).toHaveBeenCalledWith(
      'videoInput-1',
      'fit',
      'contain',
    );
  });
});
