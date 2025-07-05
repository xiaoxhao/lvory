import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { showMessage } from '../../utils/messageBox';
import '../../assets/css/profile-modal.css';

const ProfileModal = ({ isOpen, onClose, onDownloadSuccess }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('download'); // 'download' 或 'local'
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState(''); // 'success', 'error', 或 ''
  const [errorDetails, setErrorDetails] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [updateInterval, setUpdateInterval] = useState('0'); // '0'表示不自动更新
  const [protocolType, setProtocolType] = useState('singbox'); // 'singbox' 或 'lvory'
  const fileInputRef = useRef(null);

  // 重置所有交互状态
  const resetState = () => {
    setMode('download');
    setUrl('');
    setFileName('');
    setSelectedFile(null);
    setIsProcessing(false);
    setProcessStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);
    setUpdateInterval('0');
    setProtocolType('singbox');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理关闭模态框
  const handleCloseModal = () => {
    if (!isProcessing || processStatus === 'success') {
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

  // 处理本地文件选择
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.json') && !fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      showMessage(t('profileModal.invalidFileType'));
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  };

  // 处理本地文件载入
  const handleLoadLocalFile = async () => {
    if (!selectedFile) {
      showMessage(t('profileModal.pleaseSelectFile'));
      return;
    }

    setIsProcessing(true);
    setProcessStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);

    try {
      const fileContent = await selectedFile.text();

      if (window.electron && window.electron.invoke) {
        const result = await window.electron.invoke('loadLocalProfile', {
          fileName: selectedFile.name,
          content: fileContent,
          protocol: protocolType
        });

        if (result.success) {
          setProcessStatus('success');
          setIsProcessing(false);
          
          if (onDownloadSuccess) {
            onDownloadSuccess('', selectedFile.name, '0', protocolType);
          }
          
          setTimeout(() => {
            onClose();
            resetState();
          }, 3000);
        } else {
          setProcessStatus('error');
          setIsProcessing(false);
          setErrorDetails(result.error || 'Unknown error occurred');
        }
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      console.error('Load local file failed:', error);
      setProcessStatus('error');
      setIsProcessing(false);
      setErrorDetails(error.message || 'Unknown error occurred');
    }
  };

  // 处理下载配置文件
  const handleDownloadProfiles = () => {
    if (!url) {
      showMessage(t('profileModal.pleaseEnterUrl'));
      return;
    }

    try {
      new URL(url);
    } catch (e) {
      setProcessStatus('error');
      setErrorDetails(t('profileModal.invalidUrlFormat'));
      return;
    }
    
    setIsProcessing(true);
    setProcessStatus('');
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
            setProcessStatus('success');
            setIsProcessing(false);
            
            if (onDownloadSuccess) {
              onDownloadSuccess(url, customFileName, updateInterval, protocolType);
            }
            
            setTimeout(() => {
              onClose();
              resetState();
            }, 3000);
          } else {
            setProcessStatus('error');
            setIsProcessing(false);
            setErrorDetails(result.message || result.error || 'Unknown error occurred');
          }
        })
        .catch(error => {
          console.error('Download failed:', error);
          setProcessStatus('error');
          setIsProcessing(false);
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
          
          setProcessStatus('success');
          setIsProcessing(false);
          
          if (onDownloadSuccess) {
            onDownloadSuccess(url, customFileName, updateInterval, protocolType);
          }
          
          setTimeout(() => {
            onClose();
            resetState();
          }, 3000);
        })
        .catch(error => {
          console.error('Download failed:', error);
          setProcessStatus('error');
          setIsProcessing(false);
          setErrorDetails(error.message || 'Network request failed');
        });
    }
  };

  // 渲染模态框内容
  const renderModalContent = () => {
    if (isProcessing && !processStatus) {
      return (
        <div className="profile-modal-content">
          <div className="download-progress">
            <div className="progress-bar loading"></div>
            <p className="status-text">
              {mode === 'download' ? t('profileModal.downloading') : t('profileModal.loadingFile')}
            </p>
          </div>
        </div>
      );
    }
    
    if (processStatus === 'success') {
      return (
        <div className="profile-modal-content">
          <div className="download-success">
            <h3 className="success-title">
              {mode === 'download' ? t('profileModal.downloadSuccess') : t('profileModal.loadSuccess')}
            </h3>
            <p className="success-filename">
              {fileName || (mode === 'download' ? url.substring(url.lastIndexOf('/') + 1) : '')}
            </p>
            {mode === 'download' && updateInterval !== '0' && (
              <p className="success-update">
                {t('profileModal.autoUpdateSet', { interval: getIntervalDisplayText(updateInterval) })}
              </p>
            )}
          </div>
        </div>
      );
    }
    
    if (processStatus === 'error') {
      return (
        <div className="profile-modal-content">
          <div className="download-error">
            <h3 className="error-title">
              {mode === 'download' ? t('profileModal.downloadFailed') : t('profileModal.loadFailed')}
            </h3>
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

    return (
      <div className="profile-modal-content">
        {/* 模式选择 */}
        <div className="mode-selection">
          <div className="mode-tabs">
            <button 
              className={`mode-tab ${mode === 'download' ? 'active' : ''}`}
              onClick={() => setMode('download')}
            >
              {t('profileModal.downloadMode')}
            </button>
            <button 
              className={`mode-tab ${mode === 'local' ? 'active' : ''}`}
              onClick={() => setMode('local')}
            >
              {t('profileModal.localMode')}
            </button>
          </div>
        </div>

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

        {mode === 'download' ? (
          <>
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
          </>
        ) : (
          <>
            <div className="url-input-container">
              <label htmlFor="file-select">{t('profileModal.selectFile')}</label>
              <div className="file-input-wrapper">
                <input
                  ref={fileInputRef}
                  id="file-select"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileSelect}
                  className="hidden-file-input"
                />
                <button 
                  type="button"
                  className="file-select-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? selectedFile.name : t('profileModal.chooseFile')}
                </button>
              </div>
            </div>
          </>
        )}
        
        {mode === 'download' && (
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
        )}

        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={handleCloseModal}
          >
            {t('profileModal.cancel')}
          </button>
          {mode === 'download' ? (
            <button 
              className="download-button" 
              onClick={handleDownloadProfiles}
              disabled={!url.trim()}
            >
              {t('profileModal.download')}
            </button>
          ) : (
            <button 
              className="download-button" 
              onClick={handleLoadLocalFile}
              disabled={!selectedFile}
            >
              {t('profileModal.loadFile')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const getModalTitle = () => {
    if (processStatus === 'success') {
      return t('profileModal.successTitle');
    }
    return mode === 'download' ? t('profileModal.downloadTitle') : t('profileModal.loadTitle');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCloseModal} 
      title={getModalTitle()}
      className={`profile-modal ${processStatus === 'success' ? 'success-state' : ''}`}
    >
      {renderModalContent()}
    </Modal>
  );
};

export default ProfileModal;
