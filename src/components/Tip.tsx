import type { ReactNode } from 'react'
import { Tooltip } from '@heroui/react'

/** v3 Tooltip compound 结构的便捷封装 */
export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  )
}
