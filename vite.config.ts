import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createStartupPanelLayoutScript } from './src/lib/layout/startup-panel-layout.ts';
import { TOOLBAR_ACTION_MIN_WIDTH } from './src/lib/layout/toolbar-breakpoints.ts';
import { STORAGE_KEYS } from './src/lib/storage/storage-keys.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'startup-panel-layout',
      transformIndexHtml: () => [
        {
          tag: 'script',
          attrs: { 'data-startup-panel-layout': '' },
          injectTo: 'head-prepend',
          children: createStartupPanelLayoutScript(),
        },
      ],
    },
    {
      name: 'startup-toolbar-visibility',
      transformIndexHtml: () => [
        {
          tag: 'style',
          attrs: { 'data-startup-toolbar': '' },
          injectTo: 'head',
          children: [
            ...Object.entries(TOOLBAR_ACTION_MIN_WIDTH).map(
              ([action, width]) =>
                `@media (min-width: ${width}px) { .startup-tool[data-action="${action}"] { display: flex; } }`,
            ),
            `@media (min-width: ${Math.max(...Object.values(TOOLBAR_ACTION_MIN_WIDTH))}px) {
  .startup-tool[data-action="overflow"] { display: none; }
  :root { --workspace-toolbar-height: 44px; }
}`,
          ].join('\n'),
        },
      ],
    },
    {
      name: 'startup-color-mode',
      transformIndexHtml: () => [
        {
          tag: 'script',
          attrs: { 'data-startup-theme': '' },
          injectTo: 'head-prepend',
          children: `try {
  const mode = localStorage.getItem(${JSON.stringify(STORAGE_KEYS.colorMode)});
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
} catch { /* Storage may be disabled; CSS falls back to the system theme. */ }`,
        },
      ],
    },
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
