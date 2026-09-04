import { describe, expect, it } from 'vitest';
import { CODE_FONT_OPTIONS, DEFAULT_CODE_FONT, isCodeFont } from './code-font';

describe('代码字体选项', () => {
  it('提供默认字体和完整的可选字体集合', () => {
    expect(DEFAULT_CODE_FONT).toBe('jetbrains-mono');
    expect(CODE_FONT_OPTIONS.map(option => option.label)).toEqual([
      'JetBrains Mono',
      'Fira Code',
      'Source Code Pro',
      'IBM Plex Mono',
      'Roboto Mono',
      'Ubuntu Mono',
      'Inconsolata',
    ]);
  });

  it('只接受已声明的字体值', () => {
    expect(isCodeFont('ibm-plex-mono')).toBe(true);
    expect(isCodeFont('system-ui')).toBe(false);
    expect(isCodeFont(null)).toBe(false);
  });
});
