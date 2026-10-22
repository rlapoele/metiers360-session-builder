import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      CATALOG_API_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:4000',
      }),
    },
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
