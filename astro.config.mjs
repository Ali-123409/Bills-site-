import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pakistanbill.online',
  integrations: [
    tailwind(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      // Removes the 404 page from the sitemap for cleaner SEO
      filter: (page) => page !== 'https://pakistanbill.online/404/'
    }),
  ],
  output: 'static',
});
