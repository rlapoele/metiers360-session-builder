import { describe, expect, it } from 'vitest';

import { getNavigationItems } from './navigation';

describe('getNavigationItems', () => {
  it('marks the catalogue as current only on the root route', () => {
    expect(getNavigationItems('/')).toEqual([
      { href: '/', label: 'Catalogue', isCurrent: true },
      { href: '/sessions', label: 'Mes séances', isCurrent: false },
    ]);
  });

  it('keeps Mes séances current on its nested routes', () => {
    expect(getNavigationItems('/sessions/session-1')).toEqual([
      { href: '/', label: 'Catalogue', isCurrent: false },
      { href: '/sessions', label: 'Mes séances', isCurrent: true },
    ]);
  });
});
