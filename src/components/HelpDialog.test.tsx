import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  it('explains the live graph and links to contribution resources', () => {
    render(<HelpDialog onClose={() => undefined} />);

    expect(
      screen.getByRole('dialog', { name: 'Build a live signal patch' }),
    ).toBeVisible();
    expect(screen.getByText('Two signal types, one graph')).toBeVisible();
    expect(screen.getByText('Nodes available now')).toBeVisible();
    expect(screen.getByText('Flow Field')).toBeVisible();
    expect(screen.getByText('Audio-reactive trails')).toBeVisible();
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
      screen.getByRole('dialog', { name: 'Build a live signal patch' }),
    ).toHaveFocus();
    await user.tab({ shift: true });

    expect(
      screen.getByRole('link', { name: /Contribute on GitHub/ }),
    ).toHaveFocus();
  });
});
