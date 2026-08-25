import { Button, Modal } from '@heroui/react'
import { Keyboard } from 'lucide-react'

import { SHORTCUT_GROUPS } from '../lib/shortcuts'
import { ShortcutKbd } from './shortcut-hint'

export const ShortcutHelp = () => (
  <Modal>
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label="查看快捷键"
    >
      <Keyboard size={15} />
    </Button>
    <Modal.Backdrop variant="blur">
      <Modal.Container placement="center" size="lg">
        <Modal.Dialog className="sm:max-w-2xl">
          <Modal.CloseTrigger />
          <Modal.Header className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0">
            <Modal.Icon className="row-span-2 bg-default text-foreground">
              <Keyboard className="size-5" />
            </Modal.Icon>
            <Modal.Heading>快捷键</Modal.Heading>
            <p className="text-sm leading-5 text-muted">在编辑器获得焦点时同样可以使用</p>
          </Modal.Header>
          <Modal.Body className="grid items-start gap-4 sm:grid-cols-2">
            {SHORTCUT_GROUPS.map(group => (
              <section
                key={group.title}
                className={`rounded-2xl bg-default/45 p-3 ${group.items.length <= 2 ? 'sm:col-span-2' : ''}`}
              >
                <h3 className="mb-1 px-2 text-xs font-semibold text-muted">{group.title}</h3>
                <div className={`grid gap-1 ${group.items.length <= 2 ? 'sm:grid-cols-2' : ''}`}>
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 py-2 text-foreground/80 hover:bg-surface"
                    >
                      <span className="text-sm">{item.label}</span>
                      <ShortcutKbd
                        className="min-w-16 justify-center"
                        shortcut={item.id}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary">完成</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)
