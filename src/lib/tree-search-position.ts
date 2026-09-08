export type TreeSearchPosition = {
  x: number;
  y: number;
};

const SEARCH_PANEL_INSET = 8;

export const isTreeSearchPosition = (value: unknown): value is TreeSearchPosition => {
  if (!value || typeof value !== 'object') return false;
  const position = value as Partial<TreeSearchPosition>;
  return (
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    position.x >= 0 &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y) &&
    position.y >= 0
  );
};

export const clampTreeSearchPosition = (
  position: TreeSearchPosition,
  boundaryWidth: number,
  boundaryHeight: number,
  panelWidth: number,
  panelHeight: number,
): TreeSearchPosition => ({
  x: Math.min(
    Math.max(SEARCH_PANEL_INSET, position.x),
    Math.max(SEARCH_PANEL_INSET, boundaryWidth - panelWidth - SEARCH_PANEL_INSET),
  ),
  y: Math.min(
    Math.max(SEARCH_PANEL_INSET, position.y),
    Math.max(SEARCH_PANEL_INSET, boundaryHeight - panelHeight - SEARCH_PANEL_INSET),
  ),
});
