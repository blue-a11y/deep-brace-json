import {
  AlertDialog,
  Button,
  Modal,
  Switch,
  useOverlayState,
  type UseOverlayStateReturn,
} from '@heroui/react';
import { RotateCcw, Settings } from 'lucide-react';
import { resetAllWithUndo } from '../lib/reset-actions';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { useStore } from '../store/use-store';

type AppSettingsProps = {
  overlayState?: UseOverlayStateReturn;
  shouldHideTrigger?: boolean;
};

export const AppSettings = ({ overlayState, shouldHideTrigger = false }: AppSettingsProps = {}) => {
  // 独立挂载时自带 overlay 状态,重置后才能主动收起弹窗
  const fallbackOverlayState = useOverlayState();
  const activeOverlayState = overlayState ?? fallbackOverlayState;
  const { getAriaShortcut, getShortcutLabel, getShortcutRef } = useShortcutLabels();
  useWorkspaceCommand('openSettings', () => activeOverlayState.open());
  const shouldShowFullLongStrings = useStore(state => state.shouldShowFullLongStrings);
  const handleShowFullLongStringsChange = useStore(state => state.setShouldShowFullLongStrings);
  const handleResetConfirm = () => {
    resetAllWithUndo();
    activeOverlayState.close();
  };

  return (
    <Modal state={activeOverlayState}>
      <Button
        size="sm"
        variant="ghost"
        aria-label="打开全局设置"
        aria-keyshortcuts={getAriaShortcut('openSettings')}
        ref={getShortcutRef('openSettings')}
        aria-description={getShortcutLabel('openSettings')}
        className={`${shouldHideTrigger ? 'hidden' : ''} w-9 shrink-0 px-0 md:w-8 xl:w-fit xl:px-3`}
      >
        <Settings size={15} />
        <span className="hidden xl:inline">设置</span>
      </Button>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭设置" />
            <Modal.Header className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0">
              <Modal.Icon className="row-span-2 bg-default text-foreground">
                <Settings className="size-5" />
              </Modal.Icon>
              <Modal.Heading>全局设置</Modal.Heading>
              <p className="text-sm leading-5 text-muted">这些偏好会应用到所有标签</p>
            </Modal.Header>
            <Modal.Body>
              <section>
                <h3 className="mb-2 px-1 text-xs font-semibold text-muted">树形预览</h3>
                <Switch
                  className="w-full"
                  isSelected={shouldShowFullLongStrings}
                  onChange={handleShowFullLongStringsChange}
                >
                  <Switch.Content className="w-full justify-between gap-4 rounded-2xl bg-default/45 px-4 py-3">
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground">完整展示长字符串</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted">
                        关闭后，超过 120 个字符的字符串将被截断，悬浮可查看全文
                      </p>
                    </div>
                    <Switch.Control className="shrink-0">
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </section>
            </Modal.Body>
            <Modal.Footer className="border-t border-default/60 pt-4">
              <AlertDialog>
                <Button variant="danger" className="w-full">
                  <RotateCcw size={15} />
                  重置所有数据
                </Button>
                <AlertDialog.Backdrop>
                  <AlertDialog.Container placement="center" size="sm">
                    <AlertDialog.Dialog>
                      <AlertDialog.CloseTrigger />
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>重置所有数据?</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        <p className="text-sm leading-6 text-muted">
                          将清空全部标签页内容，恢复默认偏好（主题、代码字体、缩进、树形主题、
                          长字符串展示），并回到示例数据。此操作不可撤销。
                        </p>
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button slot="close" variant="tertiary">
                          取消
                        </Button>
                        <Button slot="close" variant="danger" onPress={handleResetConfirm}>
                          确认重置
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
