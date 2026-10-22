export const OPEN_SESSION_DRAFT_EVENT =
  'metiers360:open-session-draft' as const;

export interface OpenSessionDraftDetail {
  trigger: HTMLElement;
}

export function requestSessionDraftOpen(trigger: HTMLElement) {
  document.dispatchEvent(
    new CustomEvent<OpenSessionDraftDetail>(OPEN_SESSION_DRAFT_EVENT, {
      detail: { trigger },
    }),
  );
}
