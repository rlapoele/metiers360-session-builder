// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
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

    expect(
      await screen.findByRole('status', { name: '2 vidéos dans ma séance' }),
    ).toHaveTextContent('2');
  });

  it('shows an accurate empty count after invalid persistence is discarded', async () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');
    const { SessionDraftButton } = await import('./SessionDraftButton');

    render(<SessionDraftButton />);

    expect(
      await screen.findByRole('status', {
        name: 'aucune vidéo dans ma séance',
      }),
    ).toHaveTextContent('0');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
