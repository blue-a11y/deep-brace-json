import { describe, expect, it, vi } from 'vitest';
import { WORKSPACE_PANEL_LAYOUT_KEY } from './panel-layout-config';
import { createStartupPanelLayoutScript } from './startup-panel-layout';
import { PANEL_LAYOUT_STORAGE_KEY } from './storage-keys';

const runStartupScript = new Function('localStorage', 'document', createStartupPanelLayoutScript());

const renderSkeleton = (saved: string | null) => {
  const properties = new Map<string, string>();
  const getItem = vi.fn(() => saved);
  runStartupScript(
    { getItem },
    {
      documentElement: {
        style: { setProperty: (name: string, value: string) => properties.set(name, value) },
      },
    },
  );
  return { properties, getItem };
};

const serializeLayout = (layout: unknown) =>
  JSON.stringify({ [WORKSPACE_PANEL_LAYOUT_KEY]: { layout } });

describe('startup panel layout', () => {
  it('restores the saved ratio synchronously without IndexedDB or application scripts', () => {
    const { properties, getItem } = renderSkeleton(serializeLayout([31, 69]));
    expect(getItem).toHaveBeenCalledWith(PANEL_LAYOUT_STORAGE_KEY);
    expect([...properties]).toEqual([
      ['--startup-editor-size', '31.0'],
      ['--startup-preview-size', '69.0'],
    ]);
  });

  it.each([
    null,
    'not JSON',
    '[]',
    '{}',
    serializeLayout([20]),
    serializeLayout([-1, 101]),
    serializeLayout(['30', 70]),
    serializeLayout([0, 100]),
  ])('retains CSS defaults for missing or invalid storage: %s', saved => {
    expect(renderSkeleton(saved).properties.size).toBe(0);
  });

  it.each([
    { layout: [35, 15], expected: ['70.0', '30.0'] },
    { layout: [10, 90], expected: ['20.0', '80.0'] },
    { layout: [90, 10], expected: ['80.0', '20.0'] },
    { layout: [33.0508474576, 66.9491525424], expected: ['33.1', '66.9'] },
  ])('uses the same size limits as the panels: $layout', ({ layout, expected }) => {
    const { properties } = renderSkeleton(serializeLayout(layout));
    expect([...properties.values()]).toEqual(expected);
  });

  it('retains the skeleton when localStorage access is denied', () => {
    expect(() =>
      runStartupScript({
        getItem: () => {
          throw new Error('storage disabled');
        },
      }),
    ).not.toThrow();
  });
});
