// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import {
  SessionDraftContent,
  type DraftVideoItem,
} from '@components/catalogue/SessionDraftContent';

afterEach(cleanup);
const item = (id: string): DraftVideoItem => ({
  id,
  isPending: false,
  isError: false,
  retry() {},
  video: {
    id,
    title: id,
    description: '',
    duration_seconds: 60,
    jobs: [],
    audiences: [],
    compatible_headsets: [],
    thumbnail_url: null,
    published_at: '2024-01-01',
  },
});
const content = (items: DraftVideoItem[]) => (
  <SessionDraftContent
    idPrefix="test"
    items={items}
    headsetId={null}
    onMoveUp={() => {}}
    onMoveDown={() => {}}
    onRemove={() => {}}
  />
);

it('restores focus to a surviving row when a focused row is removed externally', () => {
  const view = render(content([item('one'), item('two')]));
  screen.getByRole('button', { name: 'Retirer one de ma séance' }).focus();
  view.rerender(content([item('two')]));
  expect(
    screen.getByRole('button', { name: 'Retirer two de ma séance' }),
  ).toHaveFocus();
});

it('focuses the empty state when the last focused row is removed externally', () => {
  const view = render(content([item('one')]));
  screen.getByRole('button', { name: 'Retirer one de ma séance' }).focus();
  view.rerender(content([]));
  expect(
    screen.getByRole('heading', { name: 'Votre séance est vide' }),
  ).toHaveFocus();
});

it('does not steal focus when another tab adds a row', () => {
  const view = render(content([item('one')]));
  const remove = screen.getByRole('button', {
    name: 'Retirer one de ma séance',
  });
  remove.focus();
  view.rerender(content([item('one'), item('two')]));
  expect(remove).toHaveFocus();
});

it('keeps the focused control when another tab reorders its row', () => {
  const view = render(content([item('one'), item('two')]));
  const remove = screen.getByRole('button', {
    name: 'Retirer two de ma séance',
  });
  remove.focus();
  view.rerender(content([item('two'), item('one')]));
  expect(remove).toHaveFocus();
});
