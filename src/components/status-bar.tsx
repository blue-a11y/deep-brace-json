import { useMemo } from 'react';
import { LARGE_INPUT_LENGTH } from '../lib/large-document';
import { byteLength, formatBytes } from '../lib/parse';
import { selectActiveTab, useStore } from '../store/use-store';

export const StatusBar = () => {
  const { input, result, isDirty, isParsing } = useStore(selectActiveTab);

  const lines = useMemo(() => (input ? input.split('\n').length : 0), [input]);
  const bytes = useMemo(() => byteLength(input), [input]);

  let text: string;
  let className: string;
  if (isDirty || isParsing) {
    text = input.length >= LARGE_INPUT_LENGTH ? '后台解析中… · 可继续编辑' : '输入中 · 自动解析';
    className = 'text-amber-500';
  } else if (!result) {
    text = '就绪';
    className = 'text-foreground/50';
  } else if (!result.ok) {
    const position = result.line ? ` · ${result.line}:${result.column}` : '';
    text = `解析失败${position} — ${result.message}`;
    className = 'text-red-500';
  } else if (result.isDegraded) {
    const length = (result.data as string).length;
    text = `纯文本 · 已按字符串处理 · ${length} 字符`;
    className = 'text-sky-500';
  } else {
    const { rootType, nodes, maxDepth } = result.stats;
    text = `已解析 · ${rootType} · ${nodes} 节点 · 最大深度 ${maxDepth}`;
    className = 'text-emerald-500';
  }

  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 px-2 py-1 font-mono text-[12.5px]">
      <div className="shrink-0 text-foreground/50">
        {lines} 行 · {input.length} 字符 · {formatBytes(bytes)}
      </div>
      <div className={`min-w-0 truncate ${className}`}>
        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />
        {text}
      </div>
    </footer>
  );
};
