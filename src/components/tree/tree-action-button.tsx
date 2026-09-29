import type { MouseEvent, ReactNode } from 'react';

type TreeActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
};

export const TreeActionButton = ({ children, onClick }: TreeActionButtonProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 font-sans text-[11px] font-semibold leading-none text-accent-foreground outline-none transition-colors hover:bg-accent-hover active:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/35"
      onClick={handleClick}
    >
      {children}
    </button>
  );
};
