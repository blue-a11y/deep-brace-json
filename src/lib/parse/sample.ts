export const SAMPLE_OPTIONS = [
  { id: 'default', label: '普通示例', description: 'JSON5 与嵌套 JSON 字符串' },
  { id: 'large-1mb', label: '大文档 · 约 1 MB', description: '2,000 条记录 · 约 10,000 个节点' },
  {
    id: 'large-10mb',
    label: '大文档 · 约 10 MB',
    description: '20,000 条记录 · 约 100,000 个节点',
  },
] as const;

export type SampleId = (typeof SAMPLE_OPTIONS)[number]['id'];
export type LargeSampleId = Exclude<SampleId, 'default'>;
export const isSampleId = (value: unknown): value is SampleId =>
  SAMPLE_OPTIONS.some(option => option.id === value);

/** 展示 JSON5 特性及可二次解析的 JSON 字符串 */
export const SAMPLE = `{
  // 一段 JSON5 —— key 可以不带引号
  name: 'deep-brace-json',
  // 字符串值里装着 JSON：树形预览中点 Parse 即可继续下钻；
  // webhookEvent 剥开一层后 payload 里还有一层，可连续下钻
  jsonStrings: {
    object: '{"user":{"name":"Ada","active":true},"roles":["admin","editor"]}',
    array: '[{"id":1,"status":"ready"},{"id":2,"status":"pending"}]',
    webhookEvent: '{"eventId":"evt_1001","type":"payment.succeeded","payload":"{\\\\"orderId\\\\":\\\\"ord_2002\\\\",\\\\"amount\\\\":9900}"}',
    plainText: '这是一段普通字符串，不应该显示 Parse',
  },
  version: '1.0.0',
  keywords: ['json', 'json5', 'parser', 'tree'],
  config: {
    indent: 2,
    hex: 0xff,
    unicode: '\\u00e9',
    features: {
      parse: true,
      format: true,
      minify: true,
      fold: true, // 尾逗号也没问题
    },
  },
  releases: [
    { version: '1.0.0', date: '2026-08-23', stable: true },
    { version: '0.9.0', date: '2026-07-01', stable: false },
  ],
  description: "把左边任意 JSON5 粘进来，右边立刻长出一棵可以折叠的树。",
}
`;
