// Configuration file for the Astro frontend project.
// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node'; // Import the Node adapter


import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // Add the Node adapter to integrations
  integrations: [react(), mdx(), node({
    mode: 'standalone' // Configure the adapter mode
  })],

  // Change output to server
  output: 'server',

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['framer-motion'],
    },
    build: {
      rollupOptions: {
        external: ['framer-motion'],
      },
    },
  },

  adapter: node({
    mode: 'standalone'
  }),
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ht'],
    routing: {
      prefixDefaultLocale: false, // Default locale (en) will not have a prefix (e.g., / instead of /en/)
    },
  },
});
