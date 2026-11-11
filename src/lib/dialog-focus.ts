import type { KeyboardEvent } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const elements = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
  );
  const first = elements.at(0);
  const last = elements.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
