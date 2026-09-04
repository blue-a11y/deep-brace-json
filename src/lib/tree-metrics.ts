/** 解析结果不可变；弱引用缓存随旧数据回收，不跨文档保留字符串或 DOM。 */
const lineCounts = new WeakMap<object, number>();

const childValues = (value: object): unknown[] =>
  Array.isArray(value) ? value : Object.values(value);

/** 大纲行数：非空容器 = 开括号 + 子树 + 闭括号；叶子和空容器 = 1。 */
export const getTreeLineCount = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 1;
  const cached = lineCounts.get(value);
  if (cached !== undefined) return cached;

  // 后序遍历一次填充所有子树，避免每个容器再扫描全部后代。
  const stack = [{ value, isExpanded: false }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (lineCounts.has(current.value)) continue;
    const children = childValues(current.value);
    if (!current.isExpanded) {
      stack.push({ value: current.value, isExpanded: true });
      for (const child of children) {
        if (child && typeof child === 'object' && !lineCounts.has(child)) {
          stack.push({ value: child, isExpanded: false });
        }
      }
      continue;
    }
    let count = children.length === 0 ? 1 : 2;
    for (const child of children) {
      count += child && typeof child === 'object' ? lineCounts.get(child)! : 1;
    }
    lineCounts.set(current.value, count);
  }
  return lineCounts.get(value)!;
};
