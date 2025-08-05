/**
 * 简化的内核下载组件
 * 避免复杂的状态管理和事件处理，使用最基础的方式
 */

import React, { useState, useEffect } from 'react';
import { showMessage } from '../../utils/messageBox';
import DownloadButton from '../common/DownloadButton';

const SimpleCoreDownloader = ({ coreType, onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  // 监听下载进度
  useEffect(() => {
    const handleDownloadProgress = (progressData) => {
      setProgress(progressData.progress);
      setMessage(progressData.message || '');

      if (progressData.progress === 100) {
        setTimeout(() => {
          setIsDownloading(false);
          if (onDownloadComplete) {
            onDownloadComplete();
          }
        }, 1000);
      } else if (progressData.progress === -1) {
        setIsDownloading(false);
        showMessage('下载失败: ' + (progressData.message || '未知错误'), 'error');
      }
    };

    const handleDownloadComplete = (data) => {
      console.log('Simple core download complete:', data);

      if (data.success) {
        setIsDownloading(false);
        setProgress(100);
        setMessage('安装完成');
        showMessage(`${data.coreType} 内核安装完成`, 'success');
        if (onDownloadComplete) {
          onDownloadComplete();
        }
      } else {
        setIsDownloading(false);
        setProgress(0);
        setMessage('');
        showMessage('下载失败: ' + (data.error || '未知错误'), 'error');
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
  }, [onDownloadComplete]);

  /**
   * 简单直接的下载函数
   */
  const handleDownload = async () => {
    if (isDownloading) {
      showMessage('下载正在进行中', 'warning');
      return;
    }

    if (!window.electron?.coreManager?.downloadCore) {
      showMessage('下载功能不可用', 'error');
      return;
    }

    setIsDownloading(true);
    setProgress(0);
    setMessage('准备下载...');

    try {
      console.log('开始下载内核:', coreType);

      // 指定版本下载
      const targetVersions = {
        'sing-box': 'v1.12.0-rc.4',
        'mihomo': 'v1.19.12'
      };

      const version = targetVersions[coreType];
      if (!version) {
        throw new Error(`不支持的内核类型: ${coreType}`);
      }

      console.log(`使用 coreManager.downloadCore 下载 ${coreType} ${version}`);
      setMessage(`正在下载 ${coreType} ${version}...`);

      const result = await window.electron.coreManager.downloadCore(coreType, version);
      console.log('下载结果:', result);

      if (result?.success) {
        // 进度更新通过IPC事件处理，这里只处理最终结果
        showMessage(`${coreType} 内核下载成功`, 'success');
      } else {
        setIsDownloading(false);
        const errorMsg = result?.error || '下载失败';
        setMessage(`下载失败: ${errorMsg}`);
        showMessage(`内核下载失败: ${errorMsg}`, 'error');
      }

    } catch (error) {
      setIsDownloading(false);
      console.error('下载异常:', error);
      setMessage(`下载异常: ${error.message}`);
      showMessage(`下载异常: ${error.message}`, 'error');
    }
  };

  return (
    <div className="simple-core-downloader">
      <DownloadButton
        isDownloading={isDownloading}
        progress={progress}
        message={message}
        onClick={handleDownload}
        variant="primary"
        size="medium"
        showProgress={true}
      >
        下载/更新内核
      </DownloadButton>
    </div>
  );
};

export default SimpleCoreDownloader;
