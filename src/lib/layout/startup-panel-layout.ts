import { PANEL_LAYOUT_STORAGE_KEY } from '../storage/storage-keys.js';
import { WORKSPACE_PANEL_CONSTRAINTS, WORKSPACE_PANEL_LAYOUT_KEY } from './panel-layout-config.js';

/** Vite 内联到 HTML，首帧同步恢复比例，不依赖应用脚本或 IndexedDB。 */
export const createStartupPanelLayoutScript = () => `try {
  const saved = JSON.parse(localStorage.getItem(${JSON.stringify(PANEL_LAYOUT_STORAGE_KEY)}) || 'null');
  const sizes = saved?.[${JSON.stringify(WORKSPACE_PANEL_LAYOUT_KEY)}]?.layout;
  if (Array.isArray(sizes) && sizes.length === 2 &&
      sizes.every(size => Number.isFinite(size) && size > 0) &&
      Number.isFinite(sizes[0] + sizes[1])) {
    const editorSize = Math.min(${100 - WORKSPACE_PANEL_CONSTRAINTS.minSize}, Math.max(${WORKSPACE_PANEL_CONSTRAINTS.minSize}, sizes[0] / (sizes[0] + sizes[1]) * 100));
    document.documentElement.style.setProperty('--startup-editor-size', editorSize.toPrecision(3));
    document.documentElement.style.setProperty('--startup-preview-size', (100 - editorSize).toPrecision(3));
  }
} catch { /* Storage may be disabled; CSS retains the default equal split. */ }`;
