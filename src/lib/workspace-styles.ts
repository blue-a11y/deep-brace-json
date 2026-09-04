/** 生产 CSS 与脚本并行下载；骨架先绘制，真实工作区等待样式完成后再挂载。 */
export const waitForWorkspaceStyles = () =>
  Promise.all(
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-workspace-styles]')).map(
      link =>
        new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            window.clearTimeout(timeout);
            link.removeEventListener('load', handleLoad);
            link.removeEventListener('error', handleError);
          };
          const handleLoad = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error('工作区样式加载失败'));
          };
          const timeout = window.setTimeout(handleError, 30_000);
          link.addEventListener('load', handleLoad);
          link.addEventListener('error', handleError);
          if (link.dataset.workspaceStyles === 'ready') handleLoad();
          else if (link.dataset.workspaceStyles === 'error') handleError();
        }),
    ),
  );
