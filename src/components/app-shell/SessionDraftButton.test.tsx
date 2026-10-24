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
  it.each([0, 1, 2])(
    'keeps the visible label/count order for %i videos on every route',
    async (count) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          name: '',
          headset_id: null,
          video_ids: ['vid_001', 'vid_002'].slice(0, count),
        }),
      );
      const { SessionDraftButton } = await import('./SessionDraftButton');
      for (const currentPath of ['/', '/sessions', '/sessions/ses_001']) {
        render(<SessionDraftButton currentPath={currentPath} />);
        const label = `Ma séance, ${count} ${count > 1 ? 'vidéos' : 'vidéo'}`;
        const control = await screen.findByRole(
          currentPath === '/' ? 'button' : 'link',
          {
            name:
              currentPath === '/'
                ? label
                : `${label}, ouvrir dans le catalogue`,
          },
        );
        expect(control).toHaveTextContent(`Ma séance ${count}`);
        cleanup();
      }
    },
  );

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
      name: 'Ma séance, 2 vidéos',
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
        name: 'Ma séance, 0 vidéo',
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
      name: 'Ma séance, 0 vidéo',
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
        name: 'Ma séance, 0 vidéo, ouvrir dans le catalogue',
      }),
    ).toHaveAttribute('href', '/#ma-seance');
  });
});
