import { useState, useRef, useEffect } from 'react';

const useProfileUpdate = (setProfileData) => {
  const [updateInterval, setUpdateInterval] = useState('0'); // '0'表示不自动更新
  const updateTimerRef = useRef(null);

  // 设置配置文件更新定时器
  const setupUpdateTimer = (url, fileName) => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }
    
    if (updateInterval === '0') {
      return;
    }
    
    // 计算间隔毫秒数
    let intervalMs;
    if (updateInterval.endsWith('h')) {
      // 小时格式，如 "12h"
      intervalMs = parseInt(updateInterval.replace('h', '')) * 60 * 60 * 1000;
    } else if (updateInterval.endsWith('d')) {
      // 天数格式，如 "7d"
      intervalMs = parseInt(updateInterval.replace('d', '')) * 24 * 60 * 60 * 1000;
    } else {
      // 兼容旧格式（纯数字，按小时计算）
      intervalMs = parseInt(updateInterval) * 60 * 60 * 1000;
    }
    
    updateTimerRef.current = setInterval(() => {
      console.log(`自动更新配置文件: ${fileName} - ${new Date().toLocaleString()}`);
      downloadProfileSilently(url, fileName);
    }, intervalMs);
    
    const displayText = updateInterval.endsWith('h') ? 
      updateInterval.replace('h', '小时') : 
      updateInterval.endsWith('d') ? 
        updateInterval.replace('d', '天') : 
        `${updateInterval}小时`;
    
    console.log(`已设置自动更新定时器，间隔 ${displayText}`);
  };
  
  const downloadProfileSilently = (url, customFileName) => {
    if (!url || !customFileName) return;
    
    if (window.electron) {
      window.electron.profiles.update(customFileName)
        .then(result => {
          console.log('自动更新结果:', result);
          if (result.success) {
            // 重新获取配置文件数据
            window.electron.profiles.getData().then((data) => {
              if (data && data.success && Array.isArray(data.profiles)) {
                setProfileData(data.profiles);
              }
            }).catch(err => {
              console.error('Failed to get profile data:', err);
            });
          } else {
            console.error('自动更新失败:', result.error || result.message);
          }
        })
        .catch(error => {
          console.error('自动更新失败:', error);
        });
    }
  };

  // 处理下载成功后的回调
  const handleDownloadSuccess = (url, fileName, interval) => {
    setUpdateInterval(interval);
    // 设置定时更新（如果有的话）
    if (interval !== '0') {
      setupUpdateTimer(url, fileName);
    }
  };

  // 清除定时器
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, []);

  return {
    updateInterval,
    setUpdateInterval,
    setupUpdateTimer,
    handleDownloadSuccess
  };
};

export default useProfileUpdate;