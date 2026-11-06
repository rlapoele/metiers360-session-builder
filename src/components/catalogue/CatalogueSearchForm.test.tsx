// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
  const onSubmit = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const tree = (criteria: SearchFormCriteria, resetKey?: string) => (
    <QueryClientProvider client={client}>
      <CatalogueSearchForm
        applied={criteria}
        references={references}
        onSubmit={onSubmit}
        resetKey={resetKey}
      />
    </QueryClientProvider>
  );
  const rendered = render(tree(applied));
  return {
    onSubmit,
    user: userEvent.setup(),
    rerender: (criteria: SearchFormCriteria, resetKey?: string) =>
      rendered.rerender(tree(criteria, resetKey)),
  };
}

describe('responsive pending search form', () => {
  it('orders controls, keeps native dropdowns and stages changes until explicit submission', async () => {
    const { user, onSubmit } = setup();
    const controls = screen.getAllByRole('combobox');
    expect(controls.map((control) => control.tagName)).toEqual([
      'SELECT',
      'INPUT',
      'SELECT',
    ]);
    expect(controls[0]).toHaveAccessibleName('Public');
    expect(controls[2]).toHaveAccessibleName('Casque VR');
    await user.selectOptions(screen.getByLabelText('Public'), 'tout-public');
    expect(
      screen.getByText(
        'Critères modifiés — lancez la recherche pour les appliquer.',
      ),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Tous les critères sélectionnés doivent correspondre.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'tout-public', selected: [] }),
    );
  });
  it('shows all selected categories in one ordered chip area and removal changes pending state only', async () => {
    const { user, onSubmit } = setup({
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
    expect(onSubmit).not.toHaveBeenCalled();
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
  it('requires explicit suggestion selection before submitting and focuses the input on invalid submission', async () => {
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
    const { user, onSubmit } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'gar');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    expect(
      screen.getByText(
        'Choisissez une suggestion ou effacez le texte avant de rechercher.',
      ),
    ).toBeVisible();
    await user.click(await screen.findByRole('option', { name: /Garagiste/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ selected: [expect.objectContaining(job)] }),
    );
  });
  it('clear-all is pending, clears input and legacy q, and focuses Public', async () => {
    const { user, onSubmit } = setup({
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
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(onSubmit).toHaveBeenCalledWith({ selected: [] });
  });
  it('restores submitted values on a new applied selection or navigation reset key', async () => {
    const { user, rerender } = setup();
    await user.selectOptions(screen.getByLabelText('Public'), 'college');
    rerender({ selected: [job] });
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(
      screen.queryByText(
        'Critères modifiés — lancez la recherche pour les appliquer.',
      ),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Public'), 'college');
    rerender({ selected: [job] }, 'navigation-2');
    expect(screen.getByLabelText('Public')).toHaveValue('');
  });
  it('reveals full chip text for keyboard and touch without changing or removing the selection', async () => {
    const label = 'Appellation très longue '.repeat(12);
    const { user, onSubmit } = setup({ selected: [{ ...job, label }] });
    const trigger = screen.getByRole('button', {
      name: `Afficher le libellé complet du critère Métier : ${label.trim()}`,
    });
    trigger.focus();
    await user.keyboard('{Enter}');
    const region = screen.getByRole('region', {
      name: 'Libellé complet du critère',
    });
    expect(within(region).getByText(label.trim())).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
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
    const { user, onSubmit } = setup();
    const input = screen.getByRole('combobox', {
      name: 'Métiers ou mots-clés',
    });
    await user.type(input, 'x');
    await user.click(
      screen.getByRole('button', { name: 'Effacer tous les critères' }),
    );
    expect(input).toHaveValue('');
    expect(onSubmit).not.toHaveBeenCalled();
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
