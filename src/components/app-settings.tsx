import { Button, Modal, Switch, type UseOverlayStateReturn } from '@heroui/react'
import { Settings } from 'lucide-react'

import { useStore } from '../store/use-store'

type AppSettingsProps = {
  overlayState?: UseOverlayStateReturn
  shouldHideTrigger?: boolean
}

export const AppSettings = ({
  overlayState,
  shouldHideTrigger = false,
}: AppSettingsProps = {}) => {
  const shouldShowFullLongStrings = useStore(state => state.shouldShowFullLongStrings)
  const handleShowFullLongStringsChange = useStore(
    state => state.setShouldShowFullLongStrings,
  )

  return (
    <Modal state={overlayState}>
      <Button
        size="sm"
        variant="ghost"
        aria-label="打开全局设置"
        className={`${shouldHideTrigger ? 'hidden' : ''} w-9 shrink-0 px-0 md:w-8 xl:w-fit xl:px-3`}
      >
        <Settings size={15} />
        <span className="hidden xl:inline">设置</span>
      </Button>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
