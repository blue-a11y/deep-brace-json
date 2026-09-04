import type { LargeSampleId } from './sample';

/** 仅在 Worker 中按需调用；不在首屏创建或缓存大对象和字符串。 */
export const createLargeSample = (id: LargeSampleId): string => {
  const count = id === 'large-1mb' ? 2000 : 20000;
  return JSON.stringify(
    Array.from({ length: count }, (_, index) => ({
      id: index,
      name: `sample-row-${index}`,
      message: 'Sample JSON text for scrolling and wrapping. '.repeat(10),
      isEnabled: index % 2 === 0,
    })),
    null,
    2,
  );
};
