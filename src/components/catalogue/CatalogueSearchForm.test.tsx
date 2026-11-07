// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogueSearchForm } from '@components/catalogue/CatalogueSearchForm';
import type { SearchFormCriteria } from '@features/catalogue/search-form';
import {
  addKeyword,
  formCriteriaIdentity,
} from '@features/catalogue/search-form';

const job = {
  category: 'job' as const,
  key: 'I1604',
  jobCode: 'I1604',
  sourceKey: 'appellation/garagiste',
  label: 'Garagiste',
  jobLabel: 'Mécanicien automobile',
};
const title = { category: 'title' as const, key: 'omar', label: 'Omar' };
const references = {
  audiences: {
    data: [
      { id: 'college', label: 'Collégiens' },
      { id: 'tout-public', label: 'Tout public' },
    ],
  },
  headsets: { data: [{ id: 'pico-4', name: 'Pico 4' }] },
};
const defaults: SearchFormCriteria = { selected: [] };
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(applied = defaults) {
  const onChange = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Harness({
    value,
    resetKey,
  }: {
    value: SearchFormCriteria;
    resetKey?: string;
  }) {
    const [criteria, setCriteria] = useState(value);
    useEffect(() => setCriteria(value), [value]);
    return (
      <QueryClientProvider client={client}>
        <CatalogueSearchForm
          criteria={criteria}
          references={references}
          onChange={(next) => {
            onChange(next);
            setCriteria(next);
          }}
          resetKey={resetKey}
        />
      </QueryClientProvider>
    );
  }
  const tree = (value: SearchFormCriteria, resetKey?: string) => (
    <Harness value={value} resetKey={resetKey} />
  );
  const rendered = render(tree(applied));
  return {
    onChange,
    user: userEvent.setup(),
    rerender: (criteria: SearchFormCriteria, resetKey?: string) =>
      rendered.rerender(tree(criteria, resetKey)),
  };
}

describe('responsive automatic search form', () => {
  it('orders native controls, omits submit/pending messaging and commits dropdown choices immediately', async () => {
    const { user, onChange } = setup();
    expect(
      screen.getAllByRole('combobox').map((control) => control.tagName),
    ).toEqual(['SELECT', 'INPUT', 'SELECT']);
    expect(
      screen.queryByRole('button', { name: 'Rechercher' }),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Public'), 'tout-public');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({
      selected: [],
      audience: 'tout-public',
    });
    expect(
      screen.getByText(/Au moins un métier sélectionné doit correspondre/),
    ).toBeVisible();
    expect(screen.queryByText(/Critères modifiés/)).not.toBeInTheDocument();
  });
  it('shows all selected categories in one ordered chip area and removal immediately commits the new selection', async () => {
    const { user, onChange } = setup({
      audience: 'college',
      selected: [title, job],
      legacyQuery: 'ancienne recherche',
      headset: 'pico-4',
    });
    const list = screen.getByRole('list', { name: 'Critères sélectionnés' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Collégiens',
      'Garagiste',
      'Omar',
      'ancienne recherche',
      'Pico 4',
    ]);
    await user.click(
      screen.getByRole('button', {
        name: 'Retirer le critère Public : Collégiens',
      }),
    );
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(screen.getByLabelText('Public')).toHaveFocus();
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', {
        name: 'Retirer le critère Métier : Garagiste',
      }),
    );
    expect(
      screen.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
    ).toHaveFocus();
    await user.click(
      screen.getByRole('button', {
        name: 'Retirer le critère Casque VR : Pico 4',
      }),
    );
    expect(screen.getByLabelText('Casque VR')).toHaveValue('');
    expect(screen.getByLabelText('Casque VR')).toHaveFocus();
  });
  it('typing and Enter do not create a criterion; selecting a suggestion commits once and retains focus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ ...job, availability: { count: 1, available: true } }],
            }),
          ),
      ),
    );
    const { user, onChange } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'gar');
    await user.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('option', { name: /Garagiste/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selected: [expect.objectContaining(job)] }),
    );
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
  it('preserves unfinished text and the input node during ordinary criteria changes', async () => {
    const { user, onChange } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'x');
    await user.selectOptions(screen.getByLabelText('Casque VR'), 'pico-4');
    expect(onChange).toHaveBeenCalledWith({ selected: [], headset: 'pico-4' });
    expect(screen.getByRole('combobox', { name: 'Métiers ou mots-clés' })).toBe(
      input,
    );
    expect(input).toHaveValue('x');
    expect(screen.getByLabelText('Casque VR')).toHaveFocus();
  });
  it('clear-all commits empty criteria, clears input/legacy q, and focuses Public', async () => {
    const { user, onChange } = setup({
      audience: 'college',
      headset: 'pico-4',
      selected: [job, title],
      legacyQuery: 'ancienne',
    });
    await user.click(
      screen.getByRole('button', { name: 'Effacer tous les critères' }),
    );
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Public')).toHaveFocus();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ selected: [] });
  });
  it('restores controlled criteria without clearing text, and clears presentation on history reset', async () => {
    const { user, rerender } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'x');
    rerender({ selected: [job] });
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(input).toHaveValue('x');
    rerender({ selected: [job] }, 'history-2');
    expect(
      screen.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
    ).toHaveValue('');
  });
  it('reveals full chip text for keyboard and touch without changing or removing the selection', async () => {
    const label = 'Appellation très longue '.repeat(12);
    const { user, onChange } = setup({ selected: [{ ...job, label }] });
    const trigger = screen.getByRole('button', {
      name: `Afficher le libellé complet du critère Métier : ${label.trim()}`,
    });
    trigger.focus();
    await user.keyboard('{Enter}');
    const region = screen.getByRole('region', {
      name: 'Libellé complet du critère',
    });
    expect(within(region).getByText(label.trim())).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
    await user.click(
      within(region).getByRole('button', { name: 'Fermer le libellé complet' }),
    );
    expect(trigger).toHaveFocus();
    expect(
      screen.queryByRole('region', { name: 'Libellé complet du critère' }),
    ).not.toBeInTheDocument();
  });
  it('preserves first job source, counts legacy q toward ten, and compares criteria independently of selection order', () => {
    const criteria = { selected: [job, title] };
    expect(
      addKeyword(criteria, {
        ...job,
        label: 'Autre appellation',
        sourceKey: 'appellation/autre',
      }),
    ).toBe(criteria);
    expect(formCriteriaIdentity(criteria)).toBe(
      formCriteriaIdentity({ selected: [title, job] }),
    );
    const full = {
      selected: Array.from({ length: 9 }, (_, i) => ({
        ...title,
        key: `title${i}`,
      })),
      legacyQuery: 'ancien',
    };
    expect(addKeyword(full, job)).toBe(full);
  });
  it('allows clearing unselected input without submitting a criterion', async () => {
    const { user, onChange } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'x');
    await user.click(
      screen.getByRole('button', { name: 'Effacer tous les critères' }),
    );
    expect(input).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        'Critères modifiés — lancez la recherche pour les appliquer.',
      ),
    ).not.toBeInTheDocument();
  });
  it('resets selector help after clearing a newly selected keyword', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ ...job, availability: { count: 1, available: true } }],
            }),
          ),
      ),
    );
    const { user } = setup();
    await user.type(
      screen.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
      'gar',
    );
    await user.click(await screen.findByRole('option', { name: /Garagiste/ }));
    await screen.findByText('Garagiste, métier, ajouté aux critères.');
    await user.click(
      screen.getByRole('button', { name: 'Effacer tous les critères' }),
    );
    expect(
      screen.getByText(
        'Saisissez au moins deux caractères, puis choisissez une suggestion.',
      ),
    ).toBeVisible();
  });
});
