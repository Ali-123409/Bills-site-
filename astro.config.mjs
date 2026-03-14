import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pakistanbill.online',
  integrations: [
    tailwind(),
    sitemap({
      // 🚀 SEO Settings
      changefreq: 'monthly',
      priority: 0.7,
    }),
  ],
  // Explicitly setting output to static
  output: 'static',
});
