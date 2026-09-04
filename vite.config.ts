import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'non-blocking-workspace-styles',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: html =>
          html.replace(
            /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="\/assets\/[^"<>]+\.css")[^>]*>/g,
            tag =>
              tag.replace(
                '<link ',
                '<link media="print" fetchpriority="high" data-workspace-styles="pending" onload="this.media=\'all\';this.dataset.workspaceStyles=\'ready\'" onerror="this.dataset.workspaceStyles=\'error\'" ',
              ),
          ),
      },
    },
  ],
});
