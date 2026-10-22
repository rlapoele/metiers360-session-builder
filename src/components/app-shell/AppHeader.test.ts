import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import AppHeader from './AppHeader.astro';

describe('AppHeader', () => {
  it('renders the shared navigation with the current destination', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AppHeader, {
      props: { currentPath: '/sessions' },
    });

    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toMatch(/<a[^>]*href="\/sessions"[^>]*aria-current="page"/);
    expect(html).toContain('alt="Métiers360"');
  });

  it('does not expose the future draft control as an available action', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AppHeader, {
      props: { currentPath: '/' },
    });

    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Ma séance/s);
  });
});
