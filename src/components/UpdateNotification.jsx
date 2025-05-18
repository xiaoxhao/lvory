import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#ffffff',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    padding: '16px',
    width: '280px',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    margin: '0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '16px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionInfo: {
    fontSize: '13px',
    color: '#4b5563',
    margin: '0',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  currentVersion: {
    fontWeight: '600',
  },
  newVersion: {
    fontWeight: '700',
    color: '#10b981',
  },
  arrow: {
    margin: '0 4px',
    color: '#9ca3af',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  primaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButtonHover: {
    backgroundColor: '#e5e7eb',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  secondaryButtonHover: {
    backgroundColor: '#f9fafb',
    color: '#4b5563',
  },
  skipVersionButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '12px',
    padding: '4px 8px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  skipVersionButtonHover: {
    color: '#6b7280',
  },
  '@keyframes slideIn': {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
};

const UpdateNotification = ({ onClose }) => {
  const { t } = useTranslation();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
  const [isSkipHovered, setIsSkipHovered] = useState(false);
  const [showSkipOptions, setShowSkipOptions] = useState(false);

  useEffect(() => {
    // 添加CSS动画
    const styleSheet = document.createElement('style');
    styleSheet.id = 'update-notification-styles';
    styleSheet.textContent = `
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      const styleElement = document.getElementById('update-notification-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (window.electron && window.electron.checkForUpdates) {
        try {
          const result = await window.electron.checkForUpdates();
          console.log('Update check result:', result);
          if (result && result.success) {
            if (result.hasUpdate || result.updateType === 'development') {
              // 检查是否跳过此版本
              if (result.hasUpdate) {
                try {
                  const skipVersion = localStorage.getItem('skipVersion');
                  if (skipVersion === result.latestVersion) {
                    console.log('用户已选择跳过此版本:', skipVersion);
                    return;
                  }
                } catch (error) {
                  console.error('读取跳过版本信息失败:', error);
                }
              }
              
              setUpdateInfo(result);
            }
          }
        } catch (error) {
          console.error('检查更新失败:', error);
        }
      }
    };

    checkForUpdates();
  }, []);

  if (!updateInfo) {
    return null;
  }

  const handleAction = () => {
    // 根据更新类型处理
    if (updateInfo.updateType === 'development') {
      if (onClose) onClose();
    } else {
      openReleaseUrl();
    }
  };

  const openReleaseUrl = () => {
    if (window.electron && window.electron.openExternal && updateInfo.releaseUrl) {
      window.electron.openExternal(updateInfo.releaseUrl);
    } else {
      window.open(updateInfo.releaseUrl || 'https://github.com/sxueck/lvory/releases', '_blank');
    }
    if (onClose) onClose();
  };

  const handleLater = () => {
    setShowSkipOptions(!showSkipOptions);
  };

  const handleSkipVersion = () => {
    // 实现跳过该版本的逻辑
    // 可以将当前版本号存储到本地存储中
    const skipVersion = updateInfo.latestVersion;
    try {
      localStorage.setItem('skipVersion', skipVersion);
      if (onClose) onClose();
    } catch (error) {
      console.error('保存跳过版本信息失败:', error);
    }
  };

  const handleRemindLater = () => {
    // 实现下次再提醒的逻辑
    if (onClose) onClose();
  };

  // 根据更新类型确定要显示的内容
  const getTitleAndContent = () => {
    if (updateInfo.updateType === 'development') {
      return {
        title: t('update.developmentBuild'),
        actionText: t('update.gotIt')
      };
    } else {
      return {
        title: t('update.newVersionAvailable'),
        actionText: t('update.viewUpdate')
      };
    }
  };

  const { title, actionText } = getTitleAndContent();

  return (
    <div style={styles.container}>
      <div style={styles.heading}>
        <h3 style={styles.title}>
          <span style={styles.statusDot}></span>
          {title}
        </h3>
        <button style={styles.closeButton} onClick={onClose}>×</button>
      </div>
      
      {updateInfo.updateType !== 'development' ? (
        <p style={styles.versionInfo}>
          <span style={styles.currentVersion}>{updateInfo.currentVersion}</span>
          <span style={styles.arrow}>→</span>
          <span style={styles.newVersion}>{updateInfo.latestVersion}</span>
        </p>
      ) : (
        <p style={styles.versionInfo}>
          {`${t('update.version')}: ${updateInfo.currentVersion} (${t('update.development')})`}
        </p>
      )}
      
      {!showSkipOptions ? (
        <div style={styles.actions}>
          <button 
            style={{
              ...styles.secondaryButton,
              ...(isSecondaryHovered ? styles.secondaryButtonHover : {})
            }} 
            onClick={handleLater}
            onMouseEnter={() => setIsSecondaryHovered(true)}
            onMouseLeave={() => setIsSecondaryHovered(false)}
          >
            {t('update.later')}
          </button>
          <button 
            style={{
              ...styles.primaryButton,
              ...(isPrimaryHovered ? styles.primaryButtonHover : {})
            }} 
            onClick={handleAction}
            onMouseEnter={() => setIsPrimaryHovered(true)}
            onMouseLeave={() => setIsPrimaryHovered(false)}
          >
            {actionText}
          </button>
        </div>
      ) : (
        <div style={styles.actions}>
          <button 
            style={{
              ...styles.skipVersionButton,
              ...(isSkipHovered ? styles.skipVersionButtonHover : {})
            }}
            onClick={handleSkipVersion}
            onMouseEnter={() => setIsSkipHovered(true)}
            onMouseLeave={() => setIsSkipHovered(false)}
          >
            {t('update.skipVersion')}
          </button>
          <button 
            style={{
              ...styles.secondaryButton,
              ...(isSecondaryHovered ? styles.secondaryButtonHover : {})
            }} 
            onClick={handleRemindLater}
            onMouseEnter={() => setIsSecondaryHovered(true)}
            onMouseLeave={() => setIsSecondaryHovered(false)}
          >
            {t('update.remindLater')}
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotification; 