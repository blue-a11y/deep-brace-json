import type { MouseEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { TreePathMenuTarget } from './tree-path-menu';

type TreePathMenuButtonProps = {
  onOpen: (target: TreePathMenuTarget) => void;
  path: TreePathMenuTarget['path'];
  value: unknown;
};

export const TreePathMenuButton = ({ onOpen, path, value }: TreePathMenuButtonProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    onOpen({ path, value, x: bounds.right, y: bounds.bottom });
  };

  return (
    <button
      type="button"
      aria-label="节点复制选项"
      className="mb-0.5 inline-grid size-5 shrink-0 cursor-pointer place-items-center self-end rounded text-foreground/35 opacity-0 outline-none transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/20 group-hover:opacity-100"
      onClick={handleClick}
    >
      <MoreHorizontal size={12} />
    </button>
  );
};
