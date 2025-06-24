import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { showMessage } from '../../utils/messageBox';
import '../../assets/css/profile-modal.css';

const ProfileModal = ({ isOpen, onClose, onDownloadSuccess }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(''); // 'success', 'error', 或 ''
  const [errorDetails, setErrorDetails] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [updateInterval, setUpdateInterval] = useState('0'); // '0'表示不自动更新
  const [protocolType, setProtocolType] = useState('singbox'); // 'singbox' 或 'lvory'

  // 重置所有交互状态
  const resetState = () => {
    setUrl('');
    setFileName('');
    setIsDownloading(false);
    setDownloadStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);
    setUpdateInterval('0');
    setProtocolType('singbox');
  };

  // 处理关闭模态框
  const handleCloseModal = () => {
    // 当下载状态为成功时也允许关闭窗口
    if (!isDownloading || downloadStatus === 'success') {
      onClose();
      resetState();
    }
  };

  // 切换错误详情的显示状态
  const toggleErrorDetails = () => {
    setShowErrorDetails(!showErrorDetails);
  };

  // 获取时间间隔显示文本
  const getIntervalDisplayText = (interval) => {
    if (interval.endsWith('h')) {
      return interval.replace('h', ` ${t('profileModal.hours')}`);
    } else if (interval.endsWith('d')) {
      return interval.replace('d', ` ${t('profileModal.days')}`);
    }
    return interval;
  };

  // 处理下载配置文件
  const handleDownloadProfiles = () => {
    if (!url) {
      showMessage(t('profileModal.pleaseEnterUrl'));
      return;
    }

    // 验证URL格式
    try {
      new URL(url); // 简单验证URL格式
    } catch (e) {
      setDownloadStatus('error');
      setErrorDetails(t('profileModal.invalidUrlFormat'));
      return;
    }
    
    setIsDownloading(true);
    setDownloadStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);
    
    // 获取用户指定的文件名或使用从URL提取的文件名
    let customFileName = fileName.trim() || url.substring(url.lastIndexOf('/') + 1) || 'profile.config';
    
    // 根据协议类型调整文件名和扩展名
    if (protocolType === 'lvory') {
      // Lvory 协议使用 .yaml 扩展名
      if (!customFileName.endsWith('.yaml') && !customFileName.endsWith('.yml')) {
        customFileName = customFileName.replace(/\.[^/.]+$/, '') + '.yaml';
      }
    } else {
      // SingBox 协议使用 .json 扩展名
      if (!customFileName.endsWith('.json')) {
        customFileName = customFileName.replace(/\.[^/.]+$/, '') + '.json';
      }
    }

    
    // 调用Electron的IPC通信来下载文件
    if (window.electron) {
      window.electron.download.profile({
        url: url,
        fileName: customFileName,
        protocolType: protocolType,
        updateInterval: updateInterval
      })
        .then(result => {
          console.log('Download result:', result);
          if (result.success) {
            setDownloadStatus('success');
            setIsDownloading(false);
            
            // 下载成功后回调
            if (onDownloadSuccess) {
              onDownloadSuccess(url, customFileName, updateInterval);
            }
            
            setTimeout(() => {
              onClose();
              resetState();
            }, 3000);
          } else {
            setDownloadStatus('error');
            setIsDownloading(false);
            setErrorDetails(result.message || result.error || 'Unknown error occurred');
          }
        })
        .catch(error => {
          console.error('Download failed:', error);
          setDownloadStatus('error');
          setIsDownloading(false);
          setErrorDetails(error.message || 'Unknown error occurred');
        });
    } else {
      // 尝试使用浏览器的fetch API下载
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // 创建下载链接
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = customFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          setDownloadStatus('success');
          setIsDownloading(false);
          
          // 下载成功后回调
          if (onDownloadSuccess) {
            onDownloadSuccess(url, customFileName, updateInterval);
          }
          
          // 3秒后关闭弹窗
          setTimeout(() => {
            onClose();
            resetState();
          }, 3000);
        })
        .catch(error => {
          console.error('Download failed:', error);
          setDownloadStatus('error');
          setIsDownloading(false);
          setErrorDetails(error.message || 'Network request failed');
        });
    }
  };

  // 渲染模态框内容
  const renderModalContent = () => {
    // 下载中状态
    if (isDownloading && !downloadStatus) {
      return (
        <div className="profile-modal-content">
          <div className="download-progress">
            <div className="progress-bar loading"></div>
            <p className="status-text">{t('profileModal.downloading')}</p>
          </div>
        </div>
      );
    }
    
    // 下载成功状态
    if (downloadStatus === 'success') {
      return (
        <div className="profile-modal-content">
          <div className="download-success">
            <h3 className="success-title">{t('profileModal.downloadSuccess')}</h3>
            <p className="success-filename">
              {fileName || url.substring(url.lastIndexOf('/') + 1)}
            </p>
            {updateInterval !== '0' && (
              <p className="success-update">
                {t('profileModal.autoUpdateSet', { interval: getIntervalDisplayText(updateInterval) })}
              </p>
            )}
          </div>
        </div>
      );
    }
    
    // 下载错误状态
    if (downloadStatus === 'error') {
      return (
        <div className="profile-modal-content">
          <div className="download-error">
            <h3 className="error-title">{t('profileModal.downloadFailed')}</h3>
            <div className="error-details-container">
              <button 
                className="error-details-toggle" 
                onClick={toggleErrorDetails}
              >
                {showErrorDetails ? t('profileModal.hideErrorDetails') : t('profileModal.showErrorDetails')}
              </button>
              {showErrorDetails && (
                <div className="error-details">
                  <p>{errorDetails}</p>
                </div>
              )}
            </div>
            <div className="modal-actions error-actions">
              <button 
                className="try-again-button" 
                onClick={resetState}
              >
                {t('profileModal.tryAgain')}
              </button>
              <button 
                className="cancel-button" 
                onClick={handleCloseModal}
              >
                {t('profileModal.cancel')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 默认输入状态
    return (
      <div className="profile-modal-content">
        {/* 协议类型选择 */}
        <div className="protocol-selection">
          <label className="protocol-selection-label">{t('profileModal.protocolSelection')}</label>
          <div className="protocol-options">
            <div className="protocol-option">
              <input
                type="radio"
                id="singbox-protocol"
                name="protocol"
                value="singbox"
                checked={protocolType === 'singbox'}
                onChange={(e) => setProtocolType(e.target.value)}
              />
              <label htmlFor="singbox-protocol" className="protocol-option-label">
                <div className="protocol-option-title">{t('profileModal.singboxProtocol')}</div>
                <div className="protocol-option-description">
                  {t('profileModal.singboxDescription')}
                </div>
              </label>
            </div>
            <div className="protocol-option">
              <input
                type="radio"
                id="lvory-protocol"
                name="protocol"
                value="lvory"
                checked={protocolType === 'lvory'}
                onChange={(e) => setProtocolType(e.target.value)}
              />
              <label htmlFor="lvory-protocol" className="protocol-option-label">
                <div className="protocol-option-title">{t('profileModal.lvoryProtocol')}</div>
                <div className="protocol-option-description">
                  {t('profileModal.lvoryDescription')}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="url-input-container">
          <label htmlFor="profile-url">{t('profileModal.enterUrl')}</label>
          <input
            id="profile-url"
            type="text"
            className="url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('profileModal.urlPlaceholder')}
          />
        </div>
        
        <div className="url-input-container">
          <label htmlFor="profile-name">{t('profileModal.customFileName')}</label>
          <input
            id="profile-name"
            type="text"
            className="url-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={t('profileModal.fileNamePlaceholder')}
          />
        </div>
        
        <div className="url-input-container update-interval">
          <label htmlFor="update-interval">{t('profileModal.autoUpdateInterval')}</label>
          <select
            id="update-interval"
            className="url-input"
            value={updateInterval}
            onChange={(e) => setUpdateInterval(e.target.value)}
          >
            <option value="0">{t('profileModal.noAutoUpdate')}</option>
            <option value="12h">{t('profileModal.interval12h')}</option>
            <option value="24h">{t('profileModal.interval24h')}</option>
            <option value="72h">{t('profileModal.interval72h')}</option>
            <option value="7d">{t('profileModal.interval7d')}</option>
            <option value="21d">{t('profileModal.interval21d')}</option>
          </select>
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={handleCloseModal}
          >
            {t('profileModal.cancel')}
          </button>
          <button 
            className="download-button" 
            onClick={handleDownloadProfiles}
            disabled={!url.trim()}
          >
            {t('profileModal.download')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCloseModal} 
      title={downloadStatus === 'success' ? t('profileModal.successTitle') : t('profileModal.title')}
      className={`profile-modal ${downloadStatus === 'success' ? 'success-state' : ''}`}
    >
      {renderModalContent()}
    </Modal>
  );
};

export default ProfileModal;
