import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'json-lens · JSON/JSON5 解析工具',
  description: 'JSON / JSON5 解析、格式化、压缩与树形预览',
  icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' }],
}

/** 首屏同步主题，避免闪烁；从 zustand persist 的存储中读取，默认暗色 */
const THEME_INIT = `(function(){try{var d=true;var r=localStorage.getItem('json-lens:store');if(r){var s=JSON.parse(r);if(s&&s.state&&typeof s.state.dark==='boolean')d=s.state.dark}if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  )
}
