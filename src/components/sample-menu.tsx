import { Dropdown } from '@heroui/react';
import { isSampleId, SAMPLE_OPTIONS } from '../lib/sample';
import { useStore } from '../store/use-store';

/** 直显与溢出入口共享选项与动作，加载仅替换当前标签的内容。 */
export const SampleMenu = () => {
  const handleLoadSample = useStore(state => state.loadSample);
  return (
    <Dropdown.Menu
      aria-label="示例数据"
      aria-description="选择后替换当前标签内容"
      className="min-w-60"
      onAction={key => {
        if (isSampleId(key)) handleLoadSample(key);
      }}
    >
      {SAMPLE_OPTIONS.map(option => (
        <Dropdown.Item
          key={option.id}
          id={option.id}
          textValue={option.label}
          aria-label={option.label}
        >
          <span className="flex flex-col gap-0.5">
            <span>{option.label}</span>
            <span className="text-xs text-muted">{option.description}</span>
          </span>
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );
};
