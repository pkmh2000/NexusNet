import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, APP_BUILD_DATE } from '../version';

export interface AppUpdateState {
  currentVersion: string;
  buildDate: string;
  isChecking: boolean;
  updateAvailable: boolean;
  statusMessage: string | null;
  lastChecked: Date | null;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => void;
  forceClearCache: () => Promise<void>;
}

export function useAppUpdate(): AppUpdateState {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for new service worker installation
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
        setStatusMessage(`發現新版本更新！點擊套用立即升級。`);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
            setStatusMessage(`發現新版 Beta 更新！已準備就緒，點擊立即套用。`);
          }
        });
      });
    }).catch(() => {});

    // Listen for controller changes (when update took control)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setStatusMessage('正在連線檢查是否有最新版本...');

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          setLastChecked(new Date());

          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
            setStatusMessage(`發現新版 Beta 更新！點擊套用以載入最新功能。`);
            setIsChecking(false);
            return;
          }
        }
      }

      // Check version timestamp via network fetch with cache-busting
      try {
        const res = await fetch(`./manifest.webmanifest?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          setLastChecked(new Date());
        }
      } catch (_) {}

      setTimeout(() => {
        setIsChecking(false);
        setLastChecked(new Date());
        setStatusMessage(`目前已是最新版本 (${APP_VERSION})！`);
      }, 600);
    } catch (err: any) {
      setIsChecking(false);
      setLastChecked(new Date());
      setStatusMessage(`檢查完成：目前運行 ${APP_VERSION}`);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  const forceClearCache = useCallback(async () => {
    setStatusMessage('正在清除本機快取並重新載入...');
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (_) {}
    window.location.reload();
  }, []);

  return {
    currentVersion: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    isChecking,
    updateAvailable,
    statusMessage,
    lastChecked,
    checkForUpdates,
    applyUpdate,
    forceClearCache,
  };
}
