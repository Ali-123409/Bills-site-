import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pakistanbill.online',
  integrations: [
    tailwind(),
    sitemap({
      // 🚀 SEO Settings Kept
      changefreq: 'monthly',
      priority: 0.7,
      // 🛠️ Stable Filter Logic
      filter: (page) => {
        // Only include pages that start with your domain and are not 404
        return page.startsWith('https://pakistanbill.online/') && !page.endsWith('/404/');
      },
      serialize(item) {
        // High priority for the homepage
        if (item.url === 'https://pakistanbill.online/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        return item;
      },
    }),
  ],
  output: 'static',
});
