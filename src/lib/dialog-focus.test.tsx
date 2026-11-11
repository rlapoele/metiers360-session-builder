// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { keepFocusInside } from '@lib/dialog-focus';

afterEach(cleanup);

describe('dialog keyboard focus boundaries', () => {
  function renderDialog() {
    render(
      <dialog open aria-label="Example" onKeyDown={keepFocusInside}>
        <button disabled>Unavailable first action</button>
        <a href="#help">Help</a>
        <input aria-label="Name" />
        <textarea aria-label="Notes" />
        <button disabled>Unavailable last action</button>
      </dialog>,
    );
  }

  it('wraps Tab from the last enabled control to the first', () => {
    renderDialog();
    const last = screen.getByRole('textbox', { name: 'Notes' });
    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('link'));
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    renderDialog();
    const first = screen.getByRole('link');
    first.focus();
    expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(
      false,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Notes' }),
    );
  });

  it('leaves interior Tab navigation to the browser', () => {
    renderDialog();
    const interior = screen.getByRole('textbox', { name: 'Name' });
    interior.focus();
    expect(fireEvent.keyDown(interior, { key: 'Tab' })).toBe(true);
    expect(document.activeElement).toBe(interior);
  });

  it('does not intercept Escape', () => {
    renderDialog();
    const last = screen.getByRole('textbox', { name: 'Notes' });
    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Escape' })).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('allows Tab when there are no focusable controls', () => {
    render(<dialog open aria-label="Empty" onKeyDown={keepFocusInside} />);
    expect(fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })).toBe(
      true,
    );
  });
});
