import { useEffect, useMemo, useRef, useState } from 'react';
import { json } from '@codemirror/lang-json';
import { foldGutter } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { Button } from '@heroui/react';
import CodeMirror from '@uiw/react-codemirror';
import { Braces, FileJson, Minimize2, Package, PackageOpen } from 'lucide-react';
import { getCodeMirrorTheme } from '../lib/cm-theme';
import { bindEditorTabScrollPosition } from '../lib/tab-scroll';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { selectActiveTab, useStore } from '../store/use-store';
import { ShortcutHint } from './shortcut-hint';
import { Tip } from './tip';

/** 与 TreeView 同款 chevron:默认 ⌄/› 字形墨迹偏行底,换 SVG 在 24px 行内精确居中 */
const FOLD_MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{d}"/></svg>';
const CHEVRON_DOWN_SVG = FOLD_MARKER_SVG.replace('{d}', 'm6 9 6 6 6-6');
const CHEVRON_RIGHT_SVG = FOLD_MARKER_SVG.replace('{d}', 'm9 18 6-6-6-6');

const JSON_FOLD_GUTTER = foldGutter({
  markerDOM: isOpen => {
    const marker = document.createElement('span');
    marker.className = 'cm-fold-marker';
    marker.title = isOpen ? '折叠' : '展开';
    marker.innerHTML = isOpen ? CHEVRON_DOWN_SVG : CHEVRON_RIGHT_SVG;
    return marker;
  },
});
const JSON_EDITOR_ATTRIBUTES = EditorView.contentAttributes.of({ 'aria-label': 'JSON 编辑器' });
const JSON_EDITOR_EXTENSIONS = [
  json(),
  JSON_FOLD_GUTTER,
  JSON_EDITOR_ATTRIBUTES,
  EditorView.lineWrapping,
];
const JSON_EDITOR_BASIC_SETUP = {
  foldGutter: false,
  autocompletion: false,
  highlightSelectionMatches: false,
};

export const EditorPane = () => {
  const { getAriaShortcut, getShortcutRef } = useShortcutLabels();
  const focusShortcut = getAriaShortcut('focusEditor');
  const extensions = useMemo(
    () => [
      ...JSON_EDITOR_EXTENSIONS,
      EditorView.contentAttributes.of({ 'aria-keyshortcuts': focusShortcut }),
    ],
    [focusShortcut],
  );
  const editorRef = useRef<EditorView | null>(null);
  useWorkspaceCommand('focusEditor', () => editorRef.current?.focus());
  const activeTab = useStore(selectActiveTab);
  const input = activeTab.input;
  const isDark = useStore(state => state.isDark);
  const treeTheme = useStore(state => state.treeTheme);
  const handleInputChange = useStore(state => state.editInput);
  const format = useStore(state => state.format);
  const minify = useStore(state => state.minify);
  const escape = useStore(state => state.escape);
  const unescape = useStore(state => state.unescape);
  const [formatPulse, setFormatPulse] = useState(0);
  const [minifyPulse, setMinifyPulse] = useState(0);
  const [escapePulse, setEscapePulse] = useState(0);
  const [unescapePulse, setUnescapePulse] = useState(0);
  const editorScrollCleanupRef = useRef<(() => void) | null>(null);

  const handleCreateEditor = (view: EditorView) => {
    editorRef.current = view;
    editorScrollCleanupRef.current?.();
    editorScrollCleanupRef.current = bindEditorTabScrollPosition(activeTab.id, view);
  };

  const handleFormat = () => {
    if (format()) setFormatPulse(pulse => pulse + 1);
  };

  const handleMinify = () => {
    if (minify()) setMinifyPulse(pulse => pulse + 1);
  };

  const handleEscape = () => {
    if (escape()) setEscapePulse(pulse => pulse + 1);
  };

  const handleUnescape = () => {
    if (unescape()) setUnescapePulse(pulse => pulse + 1);
  };

  useEffect(() => () => editorScrollCleanupRef.current?.(), []);

  return (
    <section className="pane-responsive-actions flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
        <FileJson size={13} />
        <span className="font-medium">编辑器</span>
        <div className="panel-header-actions ml-auto flex items-center gap-0.5">
          <Tip
            ariaKeyShortcuts={getAriaShortcut('format')}
            label={<ShortcutHint shortcut="format">格式化 · JSON5 → 标准 JSON</ShortcutHint>}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('format')}
              ref={getShortcutRef('format')}
              onPress={handleFormat}
            >
              <Braces
                size={14}
                key={formatPulse}
                className={formatPulse > 0 ? 'icon-feedback-format' : undefined}
              />
              <span className="pane-action-label">格式化</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('minify')}
            label={<ShortcutHint shortcut="minify">压缩为单行</ShortcutHint>}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('minify')}
              ref={getShortcutRef('minify')}
              onPress={handleMinify}
            >
              <Minimize2
                size={14}
                key={minifyPulse}
                className={minifyPulse > 0 ? 'icon-feedback-minify' : undefined}
              />
              <span className="pane-action-label">压缩</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('escape')}
            label={
              <ShortcutHint shortcut="escape">
                转义 · 包成 JSON 字符串字面量，可反复叠加
              </ShortcutHint>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('escape')}
              ref={getShortcutRef('escape')}
              onPress={handleEscape}
            >
              <Package
                size={14}
                key={escapePulse}
                className={escapePulse > 0 ? 'icon-feedback-wrap' : undefined}
              />
              <span className="pane-action-label">转义</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('unescape')}
            label={
              <ShortcutHint shortcut="unescape">反转义 · 剥开一层转义，可反复点击</ShortcutHint>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('unescape')}
              ref={getShortcutRef('unescape')}
              onPress={handleUnescape}
            >
              <PackageOpen
                size={14}
                key={unescapePulse}
                className={unescapePulse > 0 ? 'icon-feedback-unwrap' : undefined}
              />
              <span className="pane-action-label">反转义</span>
            </Button>
          </Tip>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CodeMirror
          key={activeTab.id}
          value={input}
          height="100%"
          theme={getCodeMirrorTheme(isDark, treeTheme)}
          extensions={extensions}
          basicSetup={JSON_EDITOR_BASIC_SETUP}
          onCreateEditor={handleCreateEditor}
          onChange={handleInputChange}
          placeholder="粘贴 JSON / JSON5，输入即自动解析…"
        />
      </div>
    </section>
  );
};
