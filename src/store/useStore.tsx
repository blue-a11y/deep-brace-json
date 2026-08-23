import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { toast } from '@heroui/react'
import {
  type ParseOk,
  type ParseResult,
  collectContainerPaths,
  parseInput,
} from '../lib/parse'
import { SAMPLE } from '../lib/sample'

const notifyResult = (r: ParseResult) => {
  if (r.ok && r.degraded) {
    toast.info(`已按纯文本字符串处理 · ${(r.data as string).length} 字符`)
  } else if (r.ok) {
    toast.success(`已解析 · ${r.stats.nodes} 节点 · 深度 ${r.stats.maxDepth}`)
  } else {
    toast.danger(`解析失败${r.line ? ` · ${r.line}:${r.column}` : ''}`, {
      description: r.message,
    })
  }
}

const LS_KEY = 'json-lens:store'

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

interface JsonLensState {
  input: string
  result: ParseResult | null
  dirty: boolean
  collapsed: Set<string>
  /** 曾展开过的容器路径:保留 DOM 以获得折叠动画(未展开过的保持懒渲染) */
  touched: Set<string>
  dark: boolean
  /** 缩进宽度(空格数),影响格式化输出与树形预览嵌套缩进 */
  indent: number

  /** 挂载时调用：对 persist 恢复的 input 补一次解析（静默） */
  bootstrap: () => void
  editInput: (value: string) => void
  parse: (quiet?: boolean) => void
  format: () => void
  minify: () => void
  loadSample: () => void
  clear: () => void
  toggleTheme: () => void
  setIndent: (n: number) => void
  toggleCollapse: (key: string) => void
  expandAll: () => void
  collapseAll: () => void
}

/** 输入防抖自动解析(静默,不弹 toast,避免每次输入打扰) */
const AUTO_PARSE_DELAY = 300
let autoParseTimer: ReturnType<typeof setTimeout> | undefined

const applyOk = (r: ParseOk) => ({
  result: r as ParseResult,
  dirty: false,
  collapsed: new Set<string>(),
  touched: new Set<string>(),
})

/** 解析成功后把标准 JSON 写回编辑器；失败则只更新错误 */
const makeRewrite =
  (set: (partial: Partial<JsonLensState>) => void, get: () => JsonLensState) =>
  (transform: (data: unknown) => string, successMsg: string) => {
    const r = parseInput(get().input)
    if (!r.ok) {
      set({ result: r, dirty: false })
      notifyResult(r)
      return
    }
    set({ input: transform(r.data), ...applyOk(r) })
    toast.success(successMsg)
  }

export const useStore = create<JsonLensState>()(
  persist(
    (set, get) => {
      const rewrite = makeRewrite(set, get)
      return {
      input: SAMPLE,
      result: null,
      dirty: false,
      collapsed: new Set<string>(),
      touched: new Set<string>(),
      dark: false,
      indent: 2,

      bootstrap: () => {
        const { input, result } = get()
        if (result) return
        if (input.trim()) get().parse(true)
      },

      editInput: value => {
        set({ input: value, dirty: true })
        clearTimeout(autoParseTimer)
        autoParseTimer = setTimeout(() => get().parse(true), AUTO_PARSE_DELAY)
      },

      parse: (quiet = false) => {
        const r = parseInput(get().input)
        if (r.ok) set(applyOk(r))
        else set({ result: r, dirty: false })
        if (!quiet) notifyResult(r)
      },

      format: () => rewrite(d => JSON.stringify(d, null, get().indent), '已格式化 · JSON5 → 标准 JSON'),
      minify: () => rewrite(d => JSON.stringify(d), '已压缩为单行'),

      loadSample: () => {
        const r = parseInput(SAMPLE)
        if (r.ok) set({ input: SAMPLE, ...applyOk(r) })
        toast.info('已载入示例')
      },

      clear: () => {
        set({ input: '', result: null, dirty: false, collapsed: new Set() })
        toast('已清空')
      },

      toggleTheme: () => {
        const dark = !get().dark
        set({ dark })
        applyTheme(dark)
      },

      setIndent: n => set({ indent: n }),

      toggleCollapse: key =>
        set(s => {
          const collapsed = new Set(s.collapsed)
          if (collapsed.has(key)) collapsed.delete(key)
          else collapsed.add(key)
          const touched = new Set(s.touched)
          touched.add(key)
          return { collapsed, touched }
        }),

      expandAll: () => set({ collapsed: new Set() }),

      collapseAll: () => {
        const { result } = get()
        // 把所有路径补进 touched,确保子树保留 DOM 走 grid 收起过渡
        // (默认展开的节点未经 toggleCollapse,touched 里没有它们的 key)
        if (result?.ok) {
          const collapsed = collectContainerPaths(result.data, 'all')
          const touched = new Set(get().touched)
          for (const key of collapsed) touched.add(key)
          set({ collapsed, touched })
        }
      },
      }
    },
    {
      name: LS_KEY,
      storage: createJSONStorage(() => localStorage),
      // 只持久化输入与主题；result/collapsed 由重新解析得到
      partialize: s => ({ input: s.input, dark: s.dark, indent: s.indent }),
    },
  ),
)
