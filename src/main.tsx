import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app.tsx';
import { waitForWorkspaceStyles } from './lib/layout/workspace-styles';
import { hydratePanelLayoutStorage } from './lib/storage/panel-layout-storage';
import { hydrateTabScrollStorage } from './lib/storage/tab-scroll';
import { applyCodeFont, applyCodeStyle, applyTheme, useStore } from './store/use-store';

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

const initializeApp = async () => {
  const [, hydrationResults] = await Promise.all([
    waitForWorkspaceStyles(),
    Promise.allSettled([
      useStore.persist.rehydrate(),
      hydratePanelLayoutStorage(),
      hydrateTabScrollStorage(),
    ]),
  ]);
  const rejectedHydration = hydrationResults.find(result => result.status === 'rejected');
  if (rejectedHydration?.status === 'rejected') {
    console.warn('持久化状态恢复失败，已使用默认状态启动。', rejectedHydration.reason);
  }
  applyTheme(useStore.getState().isDark);
  applyCodeFont(useStore.getState().codeFont);
  applyCodeStyle(useStore.getState().isCodeBold, useStore.getState().isCodeItalic);
  renderApp();
};

void initializeApp().catch(error => {
  console.error('工作区启动失败。', error);
  const status = document.querySelector('.startup-shell [role="status"]');
  if (status) status.textContent = '工作区样式加载失败，请重新加载。';
});
