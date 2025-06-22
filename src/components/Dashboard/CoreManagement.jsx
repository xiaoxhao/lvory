import React, { useState } from 'react';

const useCoreManagement = () => {
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [coreDownloadProgress, setCoreDownloadProgress] = useState(0);
  const [coreDownloadError, setCoreDownloadError] = useState('');
  const [coreDownloadSuccess, setCoreDownloadSuccess] = useState(false);
  
  const handleCoreDownload = () => {
    if (window.electron && window.electron.singbox && window.electron.singbox.downloadCore) {
      setIsDownloadingCore(true);
      setCoreDownloadError('');
      setCoreDownloadSuccess(false);
      
      window.electron.singbox.downloadCore()
        .then(result => {
          setIsDownloadingCore(false);
          if (result.success) {
            setCoreDownloadSuccess(true);
            setTimeout(() => {
              setCoreDownloadSuccess(false);
            }, 3000);
            return result;
          } else {
            setCoreDownloadError(result.error || '下载失败');
            throw new Error(result.error || '下载失败');
          }
        })
        .catch(err => {
          setIsDownloadingCore(false);
          setCoreDownloadError(err.message || '下载过程中发生错误');
          throw err;
        });
    } else {
      setCoreDownloadError('下载功能不可用');
      throw new Error('下载功能不可用');
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