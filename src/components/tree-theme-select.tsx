import type { Key } from 'react'
import { ListBox, Select } from '@heroui/react'

import { TREE_THEME_OPTIONS, type TreeTheme } from '../lib/tree-theme'

type TreeThemeSelectProps = {
  value: TreeTheme
  onChange: (value: TreeTheme) => void
}

export const TreeThemeSelect = ({ value, onChange }: TreeThemeSelectProps) => {
  const handleChange = (nextValue: Key | Key[] | null) => {
    if (typeof nextValue !== 'string') return
    onChange(nextValue as TreeTheme)
  }

  return (
    <Select
      aria-label="TreeView 主题"
      className="select-ghost w-fit shrink-0"
      placeholder="TreeView 主题"
      value={value}
      variant="secondary"
      onChange={handleChange}
    >
      <Select.Trigger className="whitespace-nowrap">
        <Select.Value className="whitespace-nowrap" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="w-max">
        <ListBox>
          {TREE_THEME_OPTIONS.map(option => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              className="whitespace-nowrap pr-8"
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
