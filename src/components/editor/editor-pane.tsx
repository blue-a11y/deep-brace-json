import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';
import { Button } from '@heroui/react';
import { Braces, FileJson, Minimize2, Package, PackageOpen } from 'lucide-react';
import { EDITOR_BLUR_SHORTCUT } from '../../lib/shortcuts/shortcuts';
import { useShortcutLabels } from '../../lib/shortcuts/use-shortcut-labels';
import { bindEditorTabScrollPosition } from '../../lib/storage/tab-scroll';
import { getCodeMirrorTheme } from '../../lib/theme/cm-theme';
import { useWorkspaceCommand } from '../../lib/workspace/use-workspace-command';
import { selectActiveTab, useStore } from '../../store/use-store';
import { Tip } from '../shared/tip';
import { ShortcutHint, ShortcutKbd } from '../shortcuts/shortcut-hint';

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
const EXTERNAL_EDITOR_CHANGE = Annotation.define<boolean>();
const JSON_EDITOR_EXTENSIONS = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  highlightActiveLine(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
  ]),
  keymap.of([indentWithTab]),
  placeholder('粘贴 JSON / JSON5，输入即自动解析…'),
  json(),
  JSON_FOLD_GUTTER,
  JSON_EDITOR_ATTRIBUTES,
  EditorView.lineWrapping,
];

export const EditorPane = () => {
  const { getAriaShortcut, getShortcutRef } = useShortcutLabels();
  const focusShortcut = getAriaShortcut('toggleEditorFocus');
  const themeCompartment = useMemo(() => new Compartment(), []);
  const shortcutCompartment = useMemo(() => new Compartment(), []);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  useWorkspaceCommand('toggleEditorFocus', () => {
    const view = editorRef.current;
    if (!view) return;
    if (view.hasFocus) view.contentDOM.blur();
    else view.focus();
  });
  const activeTab = useStore(selectActiveTab);
  const input = activeTab.input;
  const isDark = useStore(state => state.isDark);
  const treeTheme = useStore(state => state.treeTheme);
  const codeFont = useStore(state => state.codeFont);
  const isCodeBold = useStore(state => state.isCodeBold);
  const isCodeItalic = useStore(state => state.isCodeItalic);
  const format = useStore(state => state.format);
  const minify = useStore(state => state.minify);
  const escape = useStore(state => state.escape);
  const unescape = useStore(state => state.unescape);
  const [formatPulse, setFormatPulse] = useState(0);
  const [minifyPulse, setMinifyPulse] = useState(0);
  const [escapePulse, setEscapePulse] = useState(0);
  const [unescapePulse, setUnescapePulse] = useState(0);
  const editorTheme = getCodeMirrorTheme(isDark, treeTheme);
  const appliedThemeRef = useRef(editorTheme);
  const appliedShortcutRef = useRef(focusShortcut);
  const measuredTypographyRef = useRef({ codeFont, isCodeBold, isCodeItalic });

  useLayoutEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;
    const tabId = activeTab.id;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: selectActiveTab(useStore.getState()).input,
        extensions: [
          ...JSON_EDITOR_EXTENSIONS,
          themeCompartment.of(editorTheme),
          shortcutCompartment.of(
            EditorView.contentAttributes.of({
              'aria-keyshortcuts': `${focusShortcut} ${EDITOR_BLUR_SHORTCUT.key}`,
            }),
          ),
          EditorView.updateListener.of(update => {
            if (
              !update.docChanged ||
              update.transactions.some(transaction =>
                transaction.annotation(EXTERNAL_EDITOR_CHANGE),
              )
            )
              return;
            if (useStore.getState().activeTabId === tabId)
              useStore.getState().editInput(update.state.doc.toString());
          }),
        ],
      }),
    });
    editorRef.current = view;
    appliedThemeRef.current = editorTheme;
    appliedShortcutRef.current = focusShortcut;
    const unbindScroll = bindEditorTabScrollPosition(tabId, view);
    return () => {
      unbindScroll();
      if (editorRef.current === view) editorRef.current = null;
      view.destroy();
    };
  }, [activeTab.id, shortcutCompartment, themeCompartment]);

  useLayoutEffect(() => {
    if (appliedThemeRef.current === editorTheme) return;
    appliedThemeRef.current = editorTheme;
    editorRef.current?.dispatch({ effects: themeCompartment.reconfigure(editorTheme) });
  }, [editorTheme, themeCompartment]);

  useLayoutEffect(() => {
    if (appliedShortcutRef.current === focusShortcut) return;
    appliedShortcutRef.current = focusShortcut;
    editorRef.current?.dispatch({
      effects: shortcutCompartment.reconfigure(
        EditorView.contentAttributes.of({
          'aria-keyshortcuts': `${focusShortcut} ${EDITOR_BLUR_SHORTCUT.key}`,
        }),
      ),
    });
  }, [focusShortcut, shortcutCompartment]);

  useLayoutEffect(() => {
    const view = editorRef.current;
    const state = useStore.getState();
    if (!view || state.activeTabId !== activeTab.id) return;
    const currentInput = view.state.doc.toString();
    const nextInput = selectActiveTab(state).input;
    if (currentInput === nextInput) return;
    view.dispatch({
      changes: { from: 0, to: currentInput.length, insert: nextInput },
      annotations: EXTERNAL_EDITOR_CHANGE.of(true),
    });
  }, [activeTab.id, input]);

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const view = editorRef.current;
    if (
      !view?.hasFocus ||
      event.key !== EDITOR_BLUR_SHORTCUT.key ||
      event.defaultPrevented ||
      event.repeat ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    view.contentDOM.blur();
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

  useLayoutEffect(() => {
    const typography = measuredTypographyRef.current;
    if (
      typography.codeFont === codeFont &&
      typography.isCodeBold === isCodeBold &&
      typography.isCodeItalic === isCodeItalic
    )
      return;
    measuredTypographyRef.current = { codeFont, isCodeBold, isCodeItalic };
    editorRef.current?.requestMeasure();
  }, [codeFont, isCodeBold, isCodeItalic]);

  return (
    <section
      className="pane-responsive-actions flex h-full min-h-0 flex-col"
      onKeyDownCapture={handleEditorKeyDown}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 px-4 py-1 text-xs text-foreground/55">
        <FileJson size={13} className="shrink-0" />
        <span className="shrink-0 font-medium">编辑器</span>
        <div className="panel-header-actions ml-auto flex min-w-0 flex-wrap justify-end gap-0.5">
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
              <ShortcutKbd shortcut="format" variant="default" className="pane-action-shortcut" />
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
              <ShortcutKbd shortcut="minify" variant="default" className="pane-action-shortcut" />
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
              <ShortcutKbd shortcut="escape" variant="default" className="pane-action-shortcut" />
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
              <ShortcutKbd shortcut="unescape" variant="default" className="pane-action-shortcut" />
            </Button>
          </Tip>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <div ref={editorHostRef} className="cm-theme h-full" />
      </div>
    </section>
  );
};
