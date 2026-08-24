import type { Key } from 'react'
import { ListBox, Select } from '@heroui/react'

import { TREE_THEME_OPTIONS, type TreeTheme } from '../lib/tree-theme'

type ITreeThemeSelectProps = {
  value: TreeTheme
  onChange: (value: TreeTheme) => void
}

export const TreeThemeSelect = ({ value, onChange }: ITreeThemeSelectProps) => {
  const handleChange = (nextValue: Key | Key[] | null) => {
    if (typeof nextValue !== 'string') return
    onChange(nextValue as TreeTheme)
  }

  return (
    <Select
      aria-label="TreeView 主题"
      className="w-28"
      placeholder="TreeView 主题"
      value={value}
      variant="secondary"
      onChange={handleChange}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {TREE_THEME_OPTIONS.map(option => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
