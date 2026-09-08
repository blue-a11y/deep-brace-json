import type { Key } from 'react';
import { Dropdown } from '@heroui/react';
import { Braces, Copy, Route } from 'lucide-react';
import { serializeForCopy } from '../lib/indent';
import { toJsonPath, toJsonPointer } from '../lib/json-path';
import type { NodePath } from '../lib/parse';
import { toast } from '../lib/toast';
import { useStore } from '../store/use-store';

export type TreePathMenuTarget = {
  path: NodePath;
  value: unknown;
  x: number;
  y: number;
};

type TreePathMenuProps = {
  target: TreePathMenuTarget | null;
  onOpenChange: (isOpen: boolean) => void;
};

export const TreePathMenu = ({ target, onOpenChange }: TreePathMenuProps) => {
  const handleAction = async (key: Key) => {
    if (!target) return;
    const text =
      key === 'json-path'
        ? toJsonPath(target.path)
        : key === 'json-pointer'
          ? toJsonPointer(target.path)
          : serializeForCopy(target.value, useStore.getState().indentSize);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        key === 'json-path'
          ? '已复制 JSONPath'
          : key === 'json-pointer'
            ? target.path.length === 0
              ? '已复制根 JSON Pointer（空字符串）'
              : '已复制 JSON Pointer'
            : '已复制节点',
      );
      onOpenChange(false);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  };

  return (
    <Dropdown isOpen={target !== null} onOpenChange={onOpenChange}>
      <Dropdown.Trigger
        aria-hidden="true"
        excludeFromTabOrder
        className="pointer-events-none fixed size-px opacity-0"
        style={{ left: target?.x ?? 0, top: target?.y ?? 0 }}
      />
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="节点复制选项" className="min-w-48" onAction={handleAction}>
          <Dropdown.Item id="value" textValue="复制当前值">
            <Copy size={15} />
            <span>复制当前值</span>
          </Dropdown.Item>
          <Dropdown.Item id="json-path" textValue="复制 JSONPath">
            <Route size={15} />
            <span>复制 JSONPath</span>
          </Dropdown.Item>
          <Dropdown.Item id="json-pointer" textValue="复制 JSON Pointer">
            <Braces size={15} />
            <span>复制 JSON Pointer</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
