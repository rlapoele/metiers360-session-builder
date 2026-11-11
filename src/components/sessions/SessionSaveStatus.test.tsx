// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveStatusBanner } from '@components/sessions/SessionSaveStatus';
import {
  $draftSaveState,
  $draftCanSave,
  $sessionDraftHydrated,
} from '@features/sessions/session-draft.store';
import type { DraftSave } from '@features/sessions/session-draft.persistence';
import { successBannerTimer } from '@features/sessions/success-banner-timer';

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
  successBannerTimer.dispose();
  sessionStorage.clear();
  $draftSaveState.set(undefined);
  $sessionDraftHydrated.set(false);
  $draftCanSave.set(false);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const success = (operationId = request.operation_id): DraftSave => ({
  request: { ...request, operation_id: operationId },
  started_at: Date.now(),
  result: {
    ...request,
    operation_id: operationId,
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

describe('save status feedback', () => {
  it('dismisses success after eight visible seconds while retaining the tracking result', () => {
    vi.useFakeTimers();
    const saved = success();
    show(saved);
    act(() => vi.advanceTimersByTime(7999));
    expect(screen.getByRole('region')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect($draftSaveState.get()).toEqual(saved);
  });

  it('pauses for pointer and keyboard interaction, including overlap', () => {
    vi.useFakeTimers();
    show(success());
    act(() => vi.advanceTimersByTime(3000));
    const banner = screen.getByRole('region');
    fireEvent.pointerEnter(banner, { pointerType: 'mouse' });
    act(() => screen.getByRole('link').focus());
    act(() => vi.advanceTimersByTime(20_000));
    fireEvent.pointerLeave(banner, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(20_000));
    expect(banner).toBeVisible();
    act(() => screen.getByRole('link').blur());
    act(() => vi.advanceTimersByTime(4999));
    expect(banner).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('waits for a background tab to become visible and pauses again when hidden', () => {
    vi.useFakeTimers();
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    show(success());
    act(() => vi.advanceTimersByTime(20_000));
    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(3000));
    visibility.mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByRole('region')).toBeVisible();
    visibility.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('carries remaining display time across navigation and does not resurrect a dismissed success', () => {
    vi.useFakeTimers();
    const first = show(success());
    act(() => vi.advanceTimersByTime(3000));
    first.unmount();
    successBannerTimer.dispose();
    act(() => vi.advanceTimersByTime(60_000));
    const next = show(success());
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByRole('region')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    next.unmount();
    successBannerTimer.dispose();
    show(success());
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect($draftSaveState.get()?.result?.status).toBe('succeeded');
  });

  it.each(['pending', 'unknown', 'failed'] as const)(
    'does not apply the success timeout to %s results',
    (status) => {
      vi.useFakeTimers();
      show({
        request,
        started_at: Date.now(),
        uncertain: status === 'unknown' ? 'network' : undefined,
        result:
          status === 'failed'
            ? {
                ...request,
                runtime_id: request.expected_runtime_id,
                status: 'failed',
                failure: {
                  http_status: 503,
                  body: { error: 'unavailable', message: 'Try later' },
                },
              }
            : undefined,
      });
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByRole('region')).toBeVisible();
    },
  );

  it('shares one countdown between page and dialog banners without resetting on another mount', () => {
    vi.useFakeTimers();
    const first = show(success());
    act(() => vi.advanceTimersByTime(3000));
    render(<SaveStatusBanner onlyOperation />);
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getAllByRole('region')).toHaveLength(2);
    act(() => screen.getAllByRole('link')[0].focus());
    act(() => vi.advanceTimersByTime(10_000));
    first.unmount();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('starts a fresh display period for a different successful operation', () => {
    vi.useFakeTimers();
    show(success());
    act(() => vi.advanceTimersByTime(8000));
    const next = success(crypto.randomUUID());
    act(() => $draftSaveState.set(next));
    expect(screen.getByRole('region')).toBeVisible();
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
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
