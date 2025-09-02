import React, { useState, useEffect } from 'react';

const useCoreManagement = () => {
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [coreDownloadProgress, setCoreDownloadProgress] = useState(0);
  const [coreDownloadError, setCoreDownloadError] = useState('');
  const [coreDownloadSuccess, setCoreDownloadSuccess] = useState(false);

  // 监听下载进度
  useEffect(() => {
    const handleDownloadProgress = (progress) => {
      setCoreDownloadProgress(progress.progress);

      if (progress.progress === 100) {
        setTimeout(() => {
          setIsDownloadingCore(false);
        }, 1000);
      } else if (progress.progress === -1) {
        setIsDownloadingCore(false);
        setCoreDownloadError('下载失败: ' + (progress.message || '未知错误'));
      }
    };

    const handleDownloadComplete = (data) => {
      console.log('Core management download complete:', data);

      if (data.success) {
        setIsDownloadingCore(false);
        setCoreDownloadProgress(100);
        setCoreDownloadError(null);
        // 可以在这里添加成功回调
      } else {
        setIsDownloadingCore(false);
        setCoreDownloadProgress(0);
        setCoreDownloadError('下载失败: ' + (data.error || '未知错误'));
      }
    };

    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('core-download-progress', handleDownloadProgress);
      window.electron.ipcRenderer.on('core-download-complete', handleDownloadComplete);

      return () => {
        window.electron.ipcRenderer.removeListener('core-download-progress', handleDownloadProgress);
        window.electron.ipcRenderer.removeListener('core-download-complete', handleDownloadComplete);
      };
    }
  }, []);
  
  const handleCoreDownload = async () => {
    if (!window.electron?.coreManager?.downloadCore) {
      setCoreDownloadError('下载功能不可用');
      throw new Error('下载功能不可用');
    }

    setIsDownloadingCore(true);
    setCoreDownloadError('');
    setCoreDownloadSuccess(false);

    try {
      // 指定下载 sing-box v1.12.0-rc.4
      const coreType = 'sing-box';
      const version = 'v1.12.0-rc.4';

      const result = await window.electron.coreManager.downloadCore(coreType, version);

      if (result?.success) {
        setCoreDownloadSuccess(true);
        setTimeout(() => {
          setCoreDownloadSuccess(false);
        }, 3000);
      } else {
        setIsDownloadingCore(false);
        setCoreDownloadError(result?.error || '下载失败');
        throw new Error(result?.error || '下载失败');
      }
    } catch (err) {
      setIsDownloadingCore(false);
      setCoreDownloadError(err.message || '下载过程中发生错误');
      throw err;
    }
  };

  const setupCoreDownloadListener = (callback) => {
    if (window.electron && window.electron.download && window.electron.download.onCoreProgress) {
      return window.electron.download.onCoreProgress(progress => {
        setCoreDownloadProgress(progress.progress);
        if (callback) callback(progress);
      });
    }
    return null;
  };

  return {
    isDownloadingCore,
    coreDownloadProgress,
    coreDownloadError,
    coreDownloadSuccess,
    handleCoreDownload,
    setupCoreDownloadListener
  };
};

export default useCoreManagement;