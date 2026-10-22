// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'metiers360.session-draft.v1';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  cleanup();
});

describe('SessionDraftButton', () => {
  it('shows the validated persisted count after browser hydration', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        name: '',
        video_ids: ['vid_001', 'vid_002'],
        headset_id: null,
      }),
    );
    const { SessionDraftButton } = await import('./SessionDraftButton');

    render(<SessionDraftButton />);

    const button = await screen.findByRole('button', {
      name: '2 vidéos dans ma séance',
    });
    expect(button).toHaveTextContent('2');
    expect(within(button).getByText('2')).toHaveClass(
      'bg-primary',
      'text-primary-foreground',
    );
  });

  it('shows an accurate empty count after invalid persistence is discarded', async () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');
    const { SessionDraftButton } = await import('./SessionDraftButton');

    render(<SessionDraftButton />);

    expect(
      await screen.findByRole('button', {
        name: 'aucune vidéo dans ma séance',
      }),
    ).toHaveTextContent('0');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('requests the catalogue draft surface from an accessible button', async () => {
    const user = userEvent.setup();
    const openListener = vi.fn();
    document.addEventListener('metiers360:open-session-draft', openListener);
    const { SessionDraftButton } = await import('./SessionDraftButton');

    render(<SessionDraftButton />);
    const button = await screen.findByRole('button', {
      name: 'aucune vidéo dans ma séance',
    });
    await user.click(button);

    expect(openListener).toHaveBeenCalledOnce();
    document.removeEventListener('metiers360:open-session-draft', openListener);
  });

  it('links back to the catalogue draft surface from another route', async () => {
    const { SessionDraftButton } = await import('./SessionDraftButton');

    render(<SessionDraftButton currentPath="/sessions" />);

    expect(
      await screen.findByRole('link', {
        name: 'aucune vidéo dans ma séance, ouvrir dans le catalogue',
      }),
    ).toHaveAttribute('href', '/#ma-seance');
  });
});
