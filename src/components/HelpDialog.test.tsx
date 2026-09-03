import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  it('explains the live graph and links to contribution resources', () => {
    render(<HelpDialog onClose={() => undefined} />);

    expect(
      screen.getByRole('dialog', { name: 'Explore the Signal Graph' }),
    ).toBeVisible();
    expect(screen.getByText('Three signal types, one graph')).toBeVisible();
    expect(screen.getByText('Starter patches')).toBeVisible();
    expect(screen.getByText('Blank Canvas')).toBeVisible();
    expect(screen.getByText('Beat-Synced Color')).toBeVisible();
    expect(screen.getByText('Camera Dream')).toBeVisible();
    expect(screen.getByText(/Starting any new patch stops active camera/)).toBeVisible();
    expect(screen.getByText('Nodes available now')).toBeVisible();
    expect(screen.getByText('Flow Field')).toBeVisible();
    expect(screen.getByText('AI Chat')).toBeVisible();
    expect(screen.getByText('Video Model')).toBeVisible();
    expect(
      screen.getByText('A hands-on pair of normalized control signals.'),
    ).toBeVisible();
    expect(screen.getByText('Two-axis color control')).toBeVisible();
    expect(screen.getByText('Audio-reactive trails')).toBeVisible();
    expect(screen.getByText('Beat-locked motion')).toBeVisible();
    expect(screen.getByText('Model connector preview')).toBeVisible();
    expect(screen.getByText('AI Chat and Video Model')).toBeVisible();
    expect(screen.getByText(/entering an arbitrary vendor URL/)).toBeVisible();
    expect(screen.getByText(/Display sync follows/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: /model adapter protocol/ }),
    ).toHaveAttribute(
      'href',
      'https://github.com/blechdom/videobrain/blob/main/docs/MODEL_CONNECTORS.md',
    );
    expect(screen.getByRole('link', { name: /Full roadmap/ })).toHaveAttribute(
      'href',
      'https://github.com/blechdom/videobrain/blob/main/docs/FUTURE_DEVELOPMENT.md',
    );
    expect(
      screen.getByRole('link', { name: /Component catalog/ }),
    ).toHaveAttribute('href', 'https://videobrain.org/storybook/');
    expect(screen.getByRole('link', { name: /Contribute on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/blechdom/videobrain',
    );
  });

  it('closes from its close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close help' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps backward keyboard navigation inside the dialog', async () => {
    const user = userEvent.setup();
    render(<HelpDialog onClose={() => undefined} />);

    expect(
      screen.getByRole('dialog', { name: 'Explore the Signal Graph' }),
    ).toHaveFocus();
    await user.tab({ shift: true });

    expect(
      screen.getByRole('link', { name: /Contribute on GitHub/ }),
    ).toHaveFocus();
  });
});
