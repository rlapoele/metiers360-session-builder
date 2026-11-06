// Keep the Node adapter's supported handler, options and standalone behaviour.
// Its environment setup is evaluated before the runtime imports secret config.
export * from '@astrojs/node/server.js';

import { startCataloguePreparation } from '@features/catalogue/search-runtime.server';

if (process.env.ASTRO_NODE_AUTOSTART !== 'disabled')
  startCataloguePreparation('production');
