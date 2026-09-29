/** 骨架与实际 Panel 共用约束；序列化顺序与 react-resizable-panels 一致。 */
export const WORKSPACE_PANEL_CONSTRAINTS = { defaultSize: 50, minSize: 20 } as const;

export const WORKSPACE_PANEL_CENTER_SNAP_THRESHOLD_PX = 4;

export const shouldSnapWorkspacePanelsToCenter = (
  layout: readonly number[],
  groupWidth: number,
) => {
  if (layout.length !== 2 || !Number.isFinite(groupWidth) || groupWidth <= 0) return false;

  const [leftSize] = layout;
  return (
    Number.isFinite(leftSize) &&
    Math.abs(leftSize - 50) * (groupWidth / 100) <= WORKSPACE_PANEL_CENTER_SNAP_THRESHOLD_PX
  );
};

export const WORKSPACE_PANEL_LAYOUT_KEY = [
  JSON.stringify(WORKSPACE_PANEL_CONSTRAINTS),
  JSON.stringify(WORKSPACE_PANEL_CONSTRAINTS),
].join(',');
