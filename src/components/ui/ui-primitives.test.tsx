// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from './button';
import { Input } from './input';
import { NativeSelect, NativeSelectOption } from './native-select';

afterEach(cleanup);

describe('UI primitives', () => {
  it('gives every button variant the shared touch and focus treatment', () => {
    render(
      <>
        <Button>Ajouter</Button>
        <Button variant="outline">Voir les détails</Button>
        <Button variant="destructive">Retirer</Button>
      </>,
    );

    const primary = screen.getByRole('button', { name: 'Ajouter' });
    const outline = screen.getByRole('button', { name: 'Voir les détails' });
    const destructive = screen.getByRole('button', { name: 'Retirer' });

    for (const button of [primary, outline, destructive]) {
      expect(button).toHaveAttribute('data-slot', 'button');
      expect(button).toHaveClass(
        'min-h-11',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2',
      );
    }

    expect(primary).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(outline).toHaveClass('border-border', 'bg-card');
    expect(destructive).toHaveClass('text-destructive');
  });

  it('keeps native select semantics while reserving space for its visual caret', () => {
    render(
      <>
        <label htmlFor="headset">Casque VR</label>
        <NativeSelect id="headset" defaultValue="">
          <NativeSelectOption value="">Tous les casques</NativeSelectOption>
          <NativeSelectOption value="pico-4">Pico 4</NativeSelectOption>
        </NativeSelect>
      </>,
    );

    const select = screen.getByRole('combobox', { name: 'Casque VR' });
    expect(select).toHaveClass('appearance-none', 'pr-10', 'border-input');
    expect(screen.getByRole('option', { name: 'Pico 4' })).toHaveValue(
      'pico-4',
    );
  });

  it('forwards refs to the native input and select controls', () => {
    const inputRef = createRef<HTMLInputElement>();
    const selectRef = createRef<HTMLSelectElement>();

    render(
      <>
        <Input ref={inputRef} aria-label="Recherche" />
        <NativeSelect ref={selectRef} aria-label="Métier">
          <NativeSelectOption value="">Tous les métiers</NativeSelectOption>
        </NativeSelect>
      </>,
    );

    expect(inputRef.current).toBe(screen.getByRole('textbox'));
    expect(inputRef.current).toHaveClass('border-input');
    expect(selectRef.current).toBe(screen.getByRole('combobox'));
  });
});
