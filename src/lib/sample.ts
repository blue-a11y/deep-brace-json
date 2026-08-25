/** 展示 JSON5 特性及可二次解析的 JSON 字符串 */
export const SAMPLE = `{
  // 一段 JSON5 —— key 可以不带引号
  name: 'deep-brace-json',
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
  jsonStrings: {
    object: '{"user":{"name":"Ada","active":true},"roles":["admin","editor"]}',
    array: '[{"id":1,"status":"ready"},{"id":2,"status":"pending"}]',
    plainText: '这是一段普通字符串，不应该显示 Parse',
  },
  description: "把左边任意 JSON5 粘进来，右边立刻长出一棵可以折叠的树。",
}
`
