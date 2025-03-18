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
    
    const intervalMs = parseInt(updateInterval) * 60 * 60 * 1000;
    
    updateTimerRef.current = setInterval(() => {
      console.log(`自动更新配置文件: ${fileName} - ${new Date().toLocaleString()}`);
      // 执行下载操作但不显示UI
      downloadProfileSilently(url, fileName);
    }, intervalMs);
    
    console.log(`已设置自动更新定时器，间隔 ${updateInterval} 小时`);
  };
  
  const downloadProfileSilently = (url, customFileName) => {
    if (!url || !customFileName) return;
    
    if (window.electron) {
      window.electron.downloadProfile({
        url: url,
        fileName: customFileName,
        isDefaultConfig: customFileName === 'sing-box.json'
      })
        .then(result => {
          console.log('自动更新结果:', result);
          if (result.success) {
            // 重新获取配置文件数据
            window.electron.getProfileData().then((data) => {
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