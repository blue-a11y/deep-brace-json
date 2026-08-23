/** 展示 JSON5 特性的默认示例：注释、无引号 key、单引号、尾逗号、十六进制 */
export const SAMPLE = `{
  // 一段 JSON5 —— key 可以不带引号
  name: 'json-lens',
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
`
