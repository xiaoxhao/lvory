import { useState } from 'react';
import { showMessage } from '../../utils/messageBox';

const useSingBoxControl = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // 启动或停止 singbox
  const toggleSingBox = () => {
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
    toggleSingBox,
    restartSingBox,
    fetchSingBoxStatus,
    setIsRunning,
    setIsStarting,
    setIsStopping
  };
};

export default useSingBoxControl;