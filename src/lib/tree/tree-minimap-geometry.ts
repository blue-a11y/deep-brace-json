const MIN_VIEWPORT_HEIGHT = 16;
const MIN_CONTENT_HEIGHT = 40;
const TREE_TO_MINIMAP_SCALE = 1 / 6;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/** 约 24px 的树行压成 4px；长文档再按画布高度整体压缩。 */
export const getMinimapContentHeight = (trackHeight: number, scrollHeight: number) =>
  Math.min(trackHeight, Math.max(MIN_CONTENT_HEIGHT, scrollHeight * TREE_TO_MINIMAP_SCALE));

export const getMinimapViewport = (
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  trackHeight: number,
) => {
  const height = Math.max(0, trackHeight);
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll === 0) return { height, maxScroll, top: 0 };
  const viewportHeight = Math.min(
    height,
    Math.max(MIN_VIEWPORT_HEIGHT, (clientHeight / scrollHeight) * height),
  );
  return {
    height: viewportHeight,
    maxScroll,
    top: (clamp(scrollTop, 0, maxScroll) / maxScroll) * (height - viewportHeight),
  };
};

export const getMinimapScrollTop = (
  pointerY: number,
  grabOffset: number,
  trackHeight: number,
  viewportHeight: number,
  maxScroll: number,
) => {
  const travel = trackHeight - viewportHeight;
  if (travel <= 0 || maxScroll <= 0) return 0;
  return (clamp(pointerY - grabOffset, 0, travel) / travel) * maxScroll;
};
