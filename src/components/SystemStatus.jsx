import React, { useState, useEffect } from 'react';
import '../assets/css/systemindicator.css';

const SystemStatus = () => {
  
  const [systemStats, setSystemStats] = useState({
    coreVersion: 'N/A',
  });
  const [profileData, setProfileData] = useState([]);
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [coreDownloadProgress, setCoreDownloadProgress] = useState(0);
  const [coreDownloadError, setCoreDownloadError] = useState('');
  const [coreDownloadSuccess, setCoreDownloadSuccess] = useState(false);

  // 初始化数据订阅：监听配置文件变更事件并获取sing-box核心版本信息
  useEffect(() => {
    // 处理配置文件更新事件：当主进程推送新配置时更新组件状态
    const handleProfileData = (event, data) => {
      setProfileData(data || []);
    };

    // 获取sing-box版本
    const fetchCoreVersion = async () => {
      if (window.electron && window.electron.singbox && window.electron.singbox.getVersion) {
        try {
          const result = await window.electron.singbox.getVersion();
          if (result.success) {
            setSystemStats(prev => ({
              ...prev,
              coreVersion: result.version || 'unknown'
            }));
          }
        } catch (error) {
          console.error('获取版本失败:', error);
        }
      }
    };

    if (window.electron) {
      window.electron.onProfileData(handleProfileData);
      
      // 手动请求配置文件数据
      window.electron.getProfileData().then((data) => {
        if (data && data.success && Array.isArray(data.profiles)) {
          setProfileData(data.profiles);
        } else if (Array.isArray(data)) {
          // 兼容可能的直接返回数组的情况
          setProfileData(data);
        } else {
          console.error('获取到的配置文件数据格式不正确:', data);
          setProfileData([]);
        }
      }).catch(err => {
        console.error('获取配置文件数据失败:', err);
        setProfileData([]);
      });
    }

    fetchCoreVersion();

    // 组件卸载时移除事件监听
    return () => {
      if (window.electron && window.electron.removeProfileData) {
        window.electron.removeProfileData(handleProfileData);
      }
    };
  }, []);

  // 处理内核下载
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
            // 更新版本信息
            window.electron.singbox.getVersion().then(versionResult => {
              if (versionResult.success) {
                setSystemStats(prev => ({
                  ...prev,
                  coreVersion: versionResult.version || 'unknown'
                }));
              }
            });
          } else {
            setCoreDownloadError(result.error || '下载失败');
          }
        })
        .catch(error => {
          setIsDownloadingCore(false);
          setCoreDownloadError(error.message || '下载过程中出错');
        });
    }
  };

  // 监听内核下载进度
  useEffect(() => {
    if (window.electron && window.electron.onCoreDownloadProgress) {
      const removeListener = window.electron.onCoreDownloadProgress(progress => {
        setCoreDownloadProgress(progress.progress);
      });
      
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  return (
    <div className="system-status-card">
      <h3>Information</h3>
      
      <div className="status-item">
        <div className="status-label">TotalNodes</div>
        <div className="status-value">{profileData.length} 个</div>
      </div>
    </div>
  );
};

export default SystemStatus;