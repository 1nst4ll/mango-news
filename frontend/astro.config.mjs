// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx(), node({
    mode: 'standalone'
  })],

  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  }
});
