import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, APP_BUILD_DATE } from '../version';

export interface AppUpdateState {
  currentVersion: string;
  remoteVersion: string | null;
  buildDate: string;
  isChecking: boolean;
  updateAvailable: boolean;
  statusMessage: string | null;
  lastChecked: Date | null;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => void;
  forceBypassCacheReload: () => Promise<void>;
}

export function useAppUpdate(): AppUpdateState {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Check remote version.json on mount
  useEffect(() => {
    // Initial silent check
    const silentCheck = async () => {
      try {
        const res = await fetch(`./version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            setRemoteVersion(data.version);
            if (data.version !== APP_VERSION) {
              setUpdateAvailable(true);
              setStatusMessage(`發現伺服器最新發布：${data.version}（本機為 ${APP_VERSION}）！點擊立即套用更新。`);
            }
          }
        }
      } catch (_) {}
    };

    silentCheck();

    if (!('serviceWorker' in navigator)) return;

    // Listen for new service worker installation
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
        setStatusMessage(`發現新版本更新！點擊套用以升級最新功能。`);
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
    setStatusMessage('正在連線伺服器檢查最新版本...');

    try {
      // 1. Fetch real remote version.json
      let detectedRemoteVer: string | null = null;
      try {
        const res = await fetch(`./version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            detectedRemoteVer = data.version;
            setRemoteVersion(data.version);
          }
        }
      } catch (err) {
        console.warn('version.json fetch error:', err);
      }

      // 2. Query service worker registration update
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
            setStatusMessage(`發現新版更新（${detectedRemoteVer || '最新版'}）！點擊套用立即升級。`);
            setIsChecking(false);
            setLastChecked(new Date());
            return;
          }
        }
      }

      setLastChecked(new Date());

      // 3. Compare detected remote version with current version
      if (detectedRemoteVer && detectedRemoteVer !== APP_VERSION) {
        setUpdateAvailable(true);
        setStatusMessage(`伺服器已有新版本：${detectedRemoteVer}（目前為 ${APP_VERSION}）！點擊立即升級。`);
      } else {
        setStatusMessage(`目前已是最新版本 (${APP_VERSION})！伺服器與本機快取均為最新。`);
      }

      setIsChecking(false);
    } catch (err: any) {
      setIsChecking(false);
      setLastChecked(new Date());
      setStatusMessage(`檢查完成：目前運行版本 ${APP_VERSION}`);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    // Clean caches and reload with cache-buster query
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
    }
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    window.location.replace(`${baseUrl}?v=${Date.now()}`);
  }, [waitingWorker]);

  const forceBypassCacheReload = useCallback(async () => {
    setStatusMessage('正在清除所有快取、重置 Service Worker 並強制重新拉取最新版本...');
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

    // Reload bypassing cache
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    window.location.replace(`${baseUrl}?v=${Date.now()}`);
  }, []);

  return {
    currentVersion: APP_VERSION,
    remoteVersion,
    buildDate: APP_BUILD_DATE,
    isChecking,
    updateAvailable,
    statusMessage,
    lastChecked,
    checkForUpdates,
    applyUpdate,
    forceBypassCacheReload,
  };
}
