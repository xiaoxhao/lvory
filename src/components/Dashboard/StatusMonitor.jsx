import { useEffect } from 'react';

const useStatusMonitor = (singBoxControl, setSystemStats, setProfileData, setNodeTypeStats, setTestResults) => {
  const { 
    setIsRunning, 
    setIsStarting, 
    setIsStopping, 
    fetchSingBoxStatus 
  } = singBoxControl;

  // 监听SingBox状态
  useEffect(() => {
    // 初始获取状态
    fetchSingBoxStatus();
    
    // 定期检查状态
    const statusInterval = setInterval(fetchSingBoxStatus, 5000);
    
    // 监听SingBox退出事件
    const handleSingBoxExit = () => {
      console.log('SingBox进程已退出');
      setIsRunning(false);
      setIsStarting(false);
      setIsStopping(false);
    };
    
    // 监听从托盘菜单发送的状态更新
    const handleStatusUpdate = (status) => {
      console.log('收到状态更新:', status);
      if (status && typeof status.isRunning !== 'undefined') {
        setIsRunning(status.isRunning);
        setIsStarting(false);
        setIsStopping(false);
      }
    };
    
    // 添加退出事件监听
    let removeExitListener = null;
    if (window.electron && window.electron.singbox && window.electron.singbox.onExit) {
      removeExitListener = window.electron.singbox.onExit(handleSingBoxExit);
    }
    
    // 添加状态更新监听
    let removeStatusListener = null;
    if (window.electron && window.electron.onStatusUpdate) {
      removeStatusListener = window.electron.onStatusUpdate(handleStatusUpdate);
    }
    
    // 组件卸载时清理
    return () => {
      clearInterval(statusInterval);
      
      if (removeExitListener) removeExitListener();
      if (removeStatusListener) removeStatusListener();
    };
  }, [fetchSingBoxStatus, setIsRunning, setIsStarting, setIsStopping]);

  // 监听配置文件数据
  useEffect(() => {
    const handleProfileData = (event, data) => {
      console.log('Received profile data:', data);
      
      // 判断是否是新的返回格式，处理profileData提取
      const processedData = Array.isArray(data) ? data : 
                         (data && data.success && Array.isArray(data.profiles)) ? data.profiles : [];
      
      // 当配置文件变化时清空测速结果
      setTestResults({});
      setProfileData(processedData);
      
      // 计算各类型节点数量
      if (processedData.length > 0) {
        const stats = { ss: 0, vm: 0, tr: 0, dir: 0, other: 0 };
        
        processedData.forEach(node => {
          const type = node.type ? node.type.toLowerCase() : '';
          
          if (type.includes('shadowsocks')) {
            stats.ss++;
          } else if (type.includes('vmess')) {
            stats.vm++;
          } else if (type.includes('trojan')) {
            stats.tr++;
          } else if (type.includes('direct')) {
            stats.dir++;
          } else {
            stats.other++;
          }
        });
        
        setNodeTypeStats(stats);
      }
    };

    // 添加事件监听
    let removeProfileListener = null;
    
    if (window.electron) {
      removeProfileListener = window.electron.profiles.onData(handleProfileData);
      
      // 手动请求配置文件数据
      window.electron.profiles.getData().then((data) => {
        console.log('Fetched profile data:', data);
        // 判断是否是新的返回格式，处理profileData提取
        if (data && data.success && Array.isArray(data.profiles)) {
          // 清空测速结果
          setTestResults({});
          setProfileData(data.profiles);
          
          // 计算各类型节点数量
          if (data.profiles.length > 0) {
            const stats = { ss: 0, vm: 0, tr: 0, dir: 0, other: 0 };
            
            data.profiles.forEach(node => {
              const type = node.type ? node.type.toLowerCase() : '';
              
              if (type.includes('shadowsocks')) {
                stats.ss++;
              } else if (type.includes('vmess')) {
                stats.vm++;
              } else if (type.includes('trojan')) {
                stats.tr++;
              } else if (type.includes('direct')) {
                stats.dir++;
              } else {
                stats.other++;
              }
            });
            
            setNodeTypeStats(stats);
          }
        } else {
          console.error('获取到的配置文件数据格式不正确:', data);
          setProfileData([]);
        }
      }).catch(err => {
        console.error('Failed to get profile data:', err);
        setProfileData([]);
      });
    }

    // 组件卸载时移除事件监听
    return () => {
      if (removeProfileListener) {
        removeProfileListener();
      }
    };
  }, [setProfileData, setNodeTypeStats, setTestResults]);

  // 监听下载完成事件
  useEffect(() => {
    const handleDownloadComplete = (event, data) => {
      console.log('Download complete event:', data);
      
      if (data.success) {
        // 重新获取配置数据
        if (window.electron) {
          window.electron.profiles.getData().then((data) => {
            if (data && data.success && Array.isArray(data.profiles)) {
              setProfileData(data.profiles);
            }
          }).catch(err => {
            console.error('Failed to get profile data:', err);
          });
        }
      }
    };

    // 添加事件监听
    let removeDownloadListener = null;
    
    if (window.electron) {
      removeDownloadListener = window.electron.download.onComplete(handleDownloadComplete);
    }

    // 组件卸载时移除事件监听
    return () => {
      if (removeDownloadListener) {
        removeDownloadListener();
      }
    };
  }, [setProfileData]);

  // 监听内核版本更新
  useEffect(() => {
    console.log('设置版本更新监听器');
    // 检查window.electron是否存在
    if (window.electron && window.electron.singbox && window.electron.singbox.onVersionUpdate) {
      // 监听版本更新
      console.log('注册onVersionUpdate监听器');
      const removeListener = window.electron.singbox.onVersionUpdate(data => {
        console.log('收到版本更新事件:', data);
        setSystemStats(prev => ({
          ...prev,
          coreVersion: data.version || 'unknown',
          coreFullInfo: data.fullOutput || ''
        }));
      });
      
      if (window.electron.singbox && window.electron.singbox.getVersion) {
        window.electron.singbox.getVersion()
          .then(result => {
            console.log('获取版本结果:', result);
            if (result.success) {
              setSystemStats(prev => ({
                ...prev,
                coreVersion: result.version || 'unknown',
                coreFullInfo: result.fullOutput || ''
              }));
            }
          })
          .catch(err => {
            console.error('获取版本失败:', err);
          });
      }
      
      // 组件卸载时移除监听器
      return () => {
        console.log('移除版本更新监听器');
        if (removeListener) removeListener();
      };
    } else {
      console.warn('electron.singbox.onVersionUpdate不可用');
    }
  }, [setSystemStats]);

  return null;
};

export default useStatusMonitor;