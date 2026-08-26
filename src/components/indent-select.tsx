import type { Key } from 'react';
import { ListBox, Select } from '@heroui/react';
import { INDENT_OPTIONS, type IndentSize } from '../lib/indent';

type IndentSelectProps = {
  value: IndentSize;
  onChange: (value: IndentSize) => void;
};

export const IndentSelect = ({ value, onChange }: IndentSelectProps) => {
  const handleChange = (nextValue: Key | Key[] | null) => {
    if (typeof nextValue !== 'number') return;
    onChange(nextValue as IndentSize);
  };

  return (
    <Select
      aria-label="缩进"
      className="select-ghost w-fit shrink-0"
      placeholder="缩进"
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
          {INDENT_OPTIONS.map(option => (
            <ListBox.Item
              key={option}
              id={option}
              className="whitespace-nowrap pr-8"
              textValue={`${option} 空格`}
            >
              {option} 空格
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
};
