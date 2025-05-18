import { useState, useEffect } from 'react';
import { showMessage } from '../../utils/messageBox';

const useSingBoxControl = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [coreExists, setCoreExists] = useState(true);
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState('');

  const checkCoreExists = async () => {
    if (window.electron && window.electron.singbox && window.electron.singbox.checkInstalled) {
      try {
        const result = await window.electron.singbox.checkInstalled();
        setCoreExists(result);
        return result;
      } catch (err) {
        console.error('检查内核是否存在失败:', err);
        setCoreExists(false);
        return false;
      }
    } else {
      setCoreExists(false);
      return false;
    }
  };

  useEffect(() => {
    const handleDownloadProgress = (progress) => {
      setDownloadProgress(progress.progress);
      setDownloadMessage(progress.message || '');
      
      if (progress.progress === 100) {
        setTimeout(() => {
          setIsDownloadingCore(false);
          checkCoreExists();
        }, 1000);
      } else if (progress.progress === -1) {
        setIsDownloadingCore(false);
        showMessage('下载失败: ' + (progress.message || '未知错误'));
      }
    };

    if (window.electron && window.electron.onCoreDownloadProgress) {
      window.electron.onCoreDownloadProgress(handleDownloadProgress);
    }

    return () => {
      if (window.electron && window.electron.removeCoreDownloadProgress) {
        window.electron.removeCoreDownloadProgress(handleDownloadProgress);
      }
    };
  }, []);

  useEffect(() => {
    checkCoreExists();
  }, []);

  // 监听代理状态恢复的事件
  useEffect(() => {
    const handleProxyStateRestored = (event, data) => {
      if (data.success) {
        setIsRunning(true);
        console.log('代理状态已恢复，代理正在运行');
      }
    };

    if (window.electron && window.electron.onProxyStateRestored) {
      window.electron.onProxyStateRestored(handleProxyStateRestored);
    }

    return () => {
      if (window.electron && window.electron.removeProxyStateRestored) {
        window.electron.removeProxyStateRestored(handleProxyStateRestored);
      }
    };
  }, []);

  const downloadCore = async () => {
    if (window.electron && window.electron.singbox && window.electron.singbox.downloadCore) {
      setIsDownloadingCore(true);
      setDownloadProgress(0);
      setDownloadMessage('准备下载...');
      
      try {
        const result = await window.electron.singbox.downloadCore();
        if (result && result.success) {
          showMessage('内核下载完成');
          await checkCoreExists();
        } else {
          showMessage('下载失败: ' + (result.error || '未知错误'));
        }
        setIsDownloadingCore(false);
      } catch (err) {
        setIsDownloadingCore(false);
        console.error('下载内核错误:', err);
        showMessage('下载错误: ' + (err.message || '未知错误'));
      }
    } else {
      showMessage('下载功能不可用');
    }
  };

  const toggleSingBox = () => {
    if (!coreExists) {
      downloadCore();
      return;
    }
    
    if (window.electron && window.electron.singbox) {
      if (!isRunning) {
        // 启动 singbox
        setIsStarting(true);
        
        // 检查API是否存在
        if (window.electron.singbox.startCore) {
          // 先获取配置文件路径，然后再启动内核
          const getConfigAndStart = async () => {
            try {
              // 获取配置文件路径
              let configPath = null;
              if (window.electron.getConfigPath) {
                configPath = await window.electron.getConfigPath();
              }
              
              // 使用配置文件路径启动
              const result = await window.electron.singbox.startCore({ configPath });
              
              setIsStarting(false);
              if (result && result.success) {
                setIsRunning(true);
                console.log('Singbox started successfully');
              } else {
                console.error('Failed to start singbox:', result ? result.error : 'Unknown error');
                showMessage('启动失败: ' + (result && result.error ? result.error : '未知错误'));
              }
            } catch (err) {
              setIsStarting(false);
              console.error('Error starting singbox:', err);
              showMessage('启动错误: ' + (err && err.message ? err.message : '未知错误'));
            }
          };
          
          // 执行获取配置和启动的流程
          getConfigAndStart();
        } else {
          setIsStarting(false);
          console.error('startCore API not available');
          showMessage('启动API不可用');
        }
      } else {
        // 停止 singbox
        setIsStopping(true);
        
        // 检查API是否存在
        if (window.electron.singbox.stopCore) {
          window.electron.singbox.stopCore()
            .then(result => {
              setIsStopping(false);
              if (result && result.success) {
                setIsRunning(false);
                console.log('Singbox stopped successfully');
              } else {
                console.error('Failed to stop singbox:', result ? result.error : 'Unknown error');
                showMessage('停止失败: ' + (result && result.error ? result.error : '未知错误'));
              }
            })
            .catch(err => {
              setIsStopping(false);
              console.error('Error stopping singbox:', err);
              showMessage('停止错误: ' + (err && err.message ? err.message : '未知错误'));
            });
        } else {
          setIsStopping(false);
          console.error('stopCore API not available');
          showMessage('停止API不可用');
        }
      }
    } else {
      showMessage('Singbox API 不可用');
    }
  };

  // 重启功能
  const restartSingBox = () => {
    if (window.electron && window.electron.singbox) {
      setIsRestarting(true);
      
      // 停止SingBox
      if (window.electron.singbox.stopCore) {
        window.electron.singbox.stopCore()
          .then(result => {
            if (result && result.success) {
              console.log('Singbox stopped successfully for restart');
              
              // 启动SingBox
              if (window.electron.singbox.startCore) {
                // 获取配置文件路径，然后再启动内核
                const getConfigAndStart = async () => {
                  try {
                    // 获取配置文件路径
                    let configPath = null;
                    if (window.electron.getConfigPath) {
                      configPath = await window.electron.getConfigPath();
                    }
                    
                    // 使用配置文件路径启动
                    const startResult = await window.electron.singbox.startCore({ configPath });
                    
                    setIsRestarting(false);
                    if (startResult && startResult.success) {
                      setIsRunning(true);
                      console.log('Singbox restarted successfully');
                    } else {
                      setIsRunning(false);
                      console.error('Failed to restart singbox:', startResult ? startResult.error : 'Unknown error');
                      showMessage('重启失败: ' + (startResult && startResult.error ? startResult.error : '未知错误'));
                    }
                  } catch (err) {
                    setIsRestarting(false);
                    setIsRunning(false);
                    console.error('Error restarting singbox:', err);
                    showMessage('重启错误: ' + (err && err.message ? err.message : '未知错误'));
                  }
                };
                
                // 执行获取配置和启动的流程
                getConfigAndStart();
              } else {
                setIsRestarting(false);
                console.error('startCore API not available');
                showMessage('启动API不可用');
              }
            } else {
              setIsRestarting(false);
              console.error('Failed to stop singbox for restart:', result ? result.error : 'Unknown error');
              showMessage('重启停止过程失败: ' + (result && result.error ? result.error : '未知错误'));
            }
          })
          .catch(err => {
            setIsRestarting(false);
            console.error('Error stopping singbox for restart:', err);
            showMessage('重启停止过程错误: ' + (err && err.message ? err.message : '未知错误'));
          });
      }
    }
  };

  // 获取SingBox状态
  const fetchSingBoxStatus = async () => {
    if (window.electron && window.electron.singbox && window.electron.singbox.getStatus) {
      try {
        const status = await window.electron.singbox.getStatus();
        if (status && status.success) {
          setIsRunning(status.isRunning);
          return status.isRunning;
        }
      } catch (error) {
        console.error('获取SingBox状态失败:', error);
      }
    }
    return false;
  };

  return {
    isRunning,
    isStarting,
    isStopping,
    isRestarting,
    coreExists,
    isDownloadingCore,
    downloadProgress,
    downloadMessage,
    toggleSingBox,
    restartSingBox,
    fetchSingBoxStatus,
    downloadCore,
    checkCoreExists,
    setIsRunning,
    setIsStarting,
    setIsStopping
  };
};

export default useSingBoxControl;