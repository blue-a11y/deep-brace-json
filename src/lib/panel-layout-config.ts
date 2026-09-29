/** 骨架与实际 Panel 共用约束；序列化顺序与 react-resizable-panels 一致。 */
export const WORKSPACE_PANEL_CONSTRAINTS = { defaultSize: 50, minSize: 20 } as const;

export const WORKSPACE_PANEL_LAYOUT_KEY = [
  JSON.stringify(WORKSPACE_PANEL_CONSTRAINTS),
  JSON.stringify(WORKSPACE_PANEL_CONSTRAINTS),
].join(',');
