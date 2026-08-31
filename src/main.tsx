import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app.tsx';
import { hydratePanelLayoutStorage } from './lib/panel-layout-storage';
import { hydrateTabScrollStorage } from './lib/tab-scroll';
import { applyTheme, useStore } from './store/use-store';

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

const initializeApp = async () => {
  const hydrationResults = await Promise.allSettled([
    useStore.persist.rehydrate(),
    hydratePanelLayoutStorage(),
    hydrateTabScrollStorage(),
  ]);
  const rejectedHydration = hydrationResults.find(result => result.status === 'rejected');
  if (rejectedHydration?.status === 'rejected') {
    console.warn('持久化状态恢复失败，已使用默认状态启动。', rejectedHydration.reason);
  }
  applyTheme(useStore.getState().isDark);
  renderApp();
};

void initializeApp();
