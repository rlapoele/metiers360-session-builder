// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveStatusBanner } from '@components/sessions/SessionSaveStatus';
import {
  $draftSaveState,
  $draftCanSave,
  $sessionDraftHydrated,
} from '@features/sessions/session-draft.store';
import type { DraftSave } from '@features/sessions/session-draft.persistence';

const request: DraftSave['request'] = {
  operation_id: crypto.randomUUID(),
  client_id: crypto.randomUUID(),
  draft_id: 'initial',
  revision: 1,
  expected_runtime_id: crypto.randomUUID(),
  session: { name: 'Atelier', video_ids: ['one'], headset_id: null },
};
function show(save: DraftSave) {
  $sessionDraftHydrated.set(true);
  $draftCanSave.set(true);
  $draftSaveState.set(save);
  return render(<SaveStatusBanner />);
}
afterEach(() => {
  cleanup();
  $draftSaveState.set(undefined);
  $sessionDraftHydrated.set(false);
  $draftCanSave.set(false);
  vi.useRealTimers();
});
describe('save status feedback', () => {
  it('announces a pending save and changes its semantic tone for a delayed response', () => {
    vi.useFakeTimers();
    show({ request, started_at: Date.now() });
    expect(screen.getByRole('status')).toHaveTextContent(
      /temporairement en lecture seule/,
    );
    expect(screen.getByRole('region')).toHaveClass('bg-primary');
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole('region')).toHaveClass('bg-warning');
    expect(
      screen.getByRole('button', { name: 'Vérifier le statut' }),
    ).toBeEnabled();
  });
  it('makes unknown outcomes explicit without offering another save', () => {
    show({ request, started_at: Date.now(), uncertain: 'runtime' });
    expect(screen.getByRole('status')).toHaveTextContent(
      /résultat est inconnu/,
    );
    expect(
      screen.getByRole('link', { name: 'Consulter Mes séances' }),
    ).toHaveAttribute('href', '/sessions');
    expect(
      screen.queryByRole('button', { name: /Enregistrer/ }),
    ).not.toBeInTheDocument();
  });
  it('announces failure in the existing destructive colors', () => {
    show({
      request,
      started_at: Date.now(),
      result: {
        ...request,
        runtime_id: request.expected_runtime_id,
        status: 'failed',
        failure: {
          http_status: 503,
          body: { error: 'unavailable', message: 'Try later' },
        },
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      /brouillon est conservé/,
    );
    expect(screen.getByRole('region')).toHaveClass('bg-destructive');
  });
  it('confirms success and links to the actual saved session', () => {
    show({
      request,
      started_at: Date.now(),
      result: {
        ...request,
        runtime_id: request.expected_runtime_id,
        status: 'succeeded',
        session: {
          id: 'saved',
          ...request.session,
          created_at: '2026-11-11T12:00:00Z',
          total_duration_seconds: 60,
        },
      },
    });
    expect(screen.getByRole('region')).toHaveClass('bg-success');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sessions/saved');
  });
});
