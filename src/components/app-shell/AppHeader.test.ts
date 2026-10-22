import { getContainerRenderer } from '@astrojs/react/container-renderer';
import { loadRenderers } from 'astro:container';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import AppHeader from './AppHeader.astro';

describe('AppHeader', () => {
  it('renders the shared navigation with the current destination', async () => {
    const renderers = await loadRenderers([getContainerRenderer()]);
    const container = await AstroContainer.create({ renderers });
    const html = await container.renderToString(AppHeader, {
      props: { currentPath: '/sessions' },
    });

    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toMatch(/<a[^>]*href="\/sessions"[^>]*aria-current="page"/);
    expect(html).toContain('text-navigation-current');
    expect(html).not.toMatch(/focus-visible:rounded-(?:xs|sm|md|lg|xl|full)/);
    expect(html).toContain('alt="Métiers360"');
  });

  it('renders a non-numeric draft placeholder before browser hydration', async () => {
    const renderers = await loadRenderers([getContainerRenderer()]);
    const container = await AstroContainer.create({ renderers });
    const html = await container.renderToString(AppHeader, {
      props: { currentPath: '/' },
    });

    expect(html).toContain('Ma séance');
    expect(html).toContain('Chargement de ma séance');
    expect(html).not.toContain('aria-label="aucune vidéo"');
    expect(html).not.toMatch(/>\s*0\s*</);
  });
});
