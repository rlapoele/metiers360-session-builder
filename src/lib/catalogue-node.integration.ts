import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import type { AstroIntegration } from 'astro';
import { isRunnableDevEnvironment } from 'vite';

/** Preserve the official adapter; wrap only its production entry point. */
export default function catalogueNode(): AstroIntegration {
  const integration = node({ mode: 'standalone' });
  const configureNode = integration.hooks['astro:config:done'];
  let stopDevelopmentRuntime: (() => void) | undefined;
  return {
    ...integration,
    hooks: {
      ...integration.hooks,
      async 'astro:config:done'(options) {
        await configureNode?.({
          ...options,
          setAdapter(adapter) {
            options.setAdapter({
              ...adapter,
              serverEntrypoint: new URL(
                './catalogue-entrypoint.server.ts',
                import.meta.url,
              ),
            });
          },
        });
      },
      async 'astro:server:setup'({ server }) {
        // Vitest also creates a Vite server; it is not an application startup.
        if (process.env.VITEST) return;
        const environment = server.environments.ssr;
        if (!environment || !isRunnableDevEnvironment(environment))
          throw new Error(
            'Catalogue startup requires the Node SSR environment.',
          );
        // Use the same SSR runner as requests, not a config-side module copy.
        const runtime = await environment.runner.import<
          typeof import('@features/catalogue/search-runtime.server')
        >(
          fileURLToPath(
            new URL(
              '../features/catalogue/search-runtime.server.ts',
              import.meta.url,
            ),
          ),
        );
        stopDevelopmentRuntime = runtime.stopCataloguePreparation;
        runtime.startCataloguePreparation('development');
        server.httpServer?.once('close', runtime.stopCataloguePreparation);
      },
      'astro:server:done'() {
        stopDevelopmentRuntime?.();
      },
    },
  };
}
