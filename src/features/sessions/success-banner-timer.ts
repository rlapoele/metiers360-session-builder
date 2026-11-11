import { atom } from 'nanostores';
import * as z from 'zod';

const DISPLAY_MS = 8000;
const STORAGE_KEY = 'metiers360.success-banner.v1';
const NoticeSchema = z
  .object({
    operation_id: z.uuid(),
    remaining_ms: z.number().min(0).max(DISPLAY_MS),
  })
  .strict();
type Notice = z.infer<typeof NoticeSchema>;
type PauseReason = 'pointer' | 'focus';

/** Presentation only: per-tab display time never changes the save-operation record. */
export function createSuccessBannerTimer() {
  const $dismissed = atom<string | undefined>();
  let notice: Notice | undefined;
  let runningSince: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const owners = new Map<symbol, Set<PauseReason>>();

  function read(id: string): Notice {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const value: unknown = raw === null ? undefined : JSON.parse(raw);
      const parsed = NoticeSchema.safeParse(value);
      if (parsed.success && parsed.data.operation_id === id) return parsed.data;
    } catch {
      /* Unavailable presentation storage must not affect saving. */
    }
    return { operation_id: id, remaining_ms: DISPLAY_MS };
  }
  function persist() {
    try {
      if (notice) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice));
    } catch {
      /* Retain the in-memory timeout when session storage is unavailable. */
    }
  }
  function stop() {
    if (timer === undefined || !notice || runningSince === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    notice.remaining_ms = Math.max(
      0,
      notice.remaining_ms - Math.max(0, Date.now() - runningSince),
    );
    runningSince = undefined;
    persist();
  }
  function sync() {
    stop();
    if (!notice) return;
    persist();
    if (notice.remaining_ms === 0) {
      $dismissed.set(notice.operation_id);
      return;
    }
    if (
      owners.size === 0 ||
      document.visibilityState !== 'visible' ||
      [...owners.values()].some((reasons) => reasons.size > 0)
    )
      return;
    runningSince = Date.now();
    timer = setTimeout(() => {
      timer = undefined;
      runningSince = undefined;
      if (!notice) return;
      notice.remaining_ms = 0;
      persist();
      $dismissed.set(notice.operation_id);
    }, notice.remaining_ms);
  }
  const onPageHide = () => {
    stop();
    persist();
  };
  function listeners(attach: boolean) {
    if (attach) {
      document.addEventListener('visibilitychange', sync);
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', sync);
    } else {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', sync);
    }
  }
  function observe(id: string, owner: symbol) {
    if (notice?.operation_id !== id) {
      stop();
      owners.clear();
      notice = read(id);
      $dismissed.set(notice.remaining_ms === 0 ? id : undefined);
    }
    if (owners.size === 0) listeners(true);
    owners.set(owner, new Set());
    sync();
    return () => {
      if (notice?.operation_id !== id) return;
      owners.delete(owner);
      sync();
      if (owners.size === 0) listeners(false);
    };
  }
  return {
    $dismissed,
    observe,
    wasDismissed(id: string) {
      return (
        (notice?.operation_id === id ? notice : read(id)).remaining_ms === 0
      );
    },
    pause(owner: symbol, reason: PauseReason) {
      owners.get(owner)?.add(reason);
      sync();
    },
    resume(owner: symbol, reason: PauseReason) {
      owners.get(owner)?.delete(reason);
      sync();
    },
    dispose() {
      stop();
      listeners(false);
      owners.clear();
      notice = undefined;
      $dismissed.set(undefined);
    },
  };
}
export const successBannerTimer = createSuccessBannerTimer();
if (import.meta.hot)
  import.meta.hot.dispose(() => successBannerTimer.dispose());
