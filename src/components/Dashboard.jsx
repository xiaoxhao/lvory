import React, { useState, useEffect, useRef } from 'react';
import '../assets/css/dashboard.css';
import CustomerCard from './CustomerCard';
import Modal from './Modal';
import Activity from './Activity';

// 自定义样式
const customStyles = {
  barValue: {
    position: 'absolute',
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    color: '#505a6b',
    fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  bar: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    margin: '0 6px'
  },
  lineChart: {
    width: '100%',
    height: '140px',
    position: 'relative',
    marginTop: '10px'
  },
  lineChartGrid: {
    width: '100%',
    height: '140px',
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderBottom: '1px solid #e6e8eb',
    borderLeft: '1px solid #e6e8eb',
    zIndex: 1
  },
  gridLine: {
    width: '100%',
    height: '1px',
    backgroundColor: '#f0f2f5'
  },
  lineChartXAxis: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '8px'
  },
  lineChartXLabel: {
    fontSize: '10px',
    color: '#8896ab'
  },
  lineChartYAxis: {
    position: 'absolute',
    top: 0,
    left: '-25px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  lineChartYLabel: {
    fontSize: '10px',
    color: '#8896ab',
    marginBottom: '-5px'
  },
  lineChartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2
  },
  eyeIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.2s ease'
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    margin: '0',
    fontSize: '12px'
  },
  statusLabel: {
    color: '#8896ab',
    marginBottom: '0'
  },
  statusValue: {
    color: '#2e3b52',
    fontWeight: '400'
  }
};

const Dashboard = ({ activeView = 'dashboard' }) => {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(''); // 'success', 'error', 或 ''
  const [errorDetails, setErrorDetails] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [profileData, setProfileData] = useState([]);
  const [nodeTypeStats, setNodeTypeStats] = useState({ ss: 0, vm: 0, tr: 0, dir: 0, other: 0 });
  const [privateMode, setPrivateMode] = useState(false);
  // 新增更新周期和默认配置选项
  const [updateInterval, setUpdateInterval] = useState('0'); // '0'表示不自动更新
  const [isDefaultConfig, setIsDefaultConfig] = useState(false);
  // 添加更新定时器引用
  const updateTimerRef = useRef(null);
  
  const [systemStats, setSystemStats] = useState({
    startTime: new Date().toLocaleString(),
    coreVersion: 'N/A',
    activeConnections: 0,
    memoryUsage: '0MB'
  });
  
  // 添加singbox运行状态
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
  // 添加下载内核相关状态
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [coreDownloadProgress, setCoreDownloadProgress] = useState(0);
  const [coreDownloadError, setCoreDownloadError] = useState('');
  const [coreDownloadSuccess, setCoreDownloadSuccess] = useState(false);

  // 添加活动选项卡状态
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'activity'

  // 定义 handleCoreDownload 函数，之前定义的函数应该在组件外部或在组件内部被遗漏
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
            setSystemStats(prev => ({
              ...prev,
              coreVersion: result.version || 'unknown',
              coreFullInfo: result.fullOutput || ''
            }));
            // 3秒后清除成功消息
            setTimeout(() => {
              setCoreDownloadSuccess(false);
            }, 3000);
          } else {
            setCoreDownloadError(result.error || '下载失败');
          }
        })
        .catch(err => {
          setIsDownloadingCore(false);
          setCoreDownloadError(err.message || '下载过程中发生错误');
        });
    } else {
      setCoreDownloadError('下载功能不可用');
    }
  };

  // 重置所有交互状态，包括下载配置、错误提示和自动更新定时器
  const resetState = () => {
    setUrl('');
    setFileName('');
    setIsDownloading(false);
    setDownloadStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);
    setUpdateInterval('0');
    setIsDefaultConfig(false);
    
    // 清除可能存在的更新定时器
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  // 处理关闭模态框
  const handleCloseModal = () => {
    if (!isDownloading) {
      setIsModalOpen(false);
      resetState();
    }
  };

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
                alert('启动失败: ' + (result && result.error ? result.error : '未知错误'));
              }
            } catch (err) {
              setIsStarting(false);
              console.error('Error starting singbox:', err);
              alert('启动错误: ' + (err && err.message ? err.message : '未知错误'));
            }
          };
          
          // 执行获取配置和启动的流程
          getConfigAndStart();
        } else {
          setIsStarting(false);
          console.error('startCore API not available');
          alert('启动API不可用');
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
                alert('停止失败: ' + (result && result.error ? result.error : '未知错误'));
              }
            })
            .catch(err => {
              setIsStopping(false);
              console.error('Error stopping singbox:', err);
              alert('停止错误: ' + (err && err.message ? err.message : '未知错误'));
            });
        } else {
          setIsStopping(false);
          console.error('stopCore API not available');
          alert('停止API不可用');
        }
      }
    } else {
      alert('Singbox API 不可用');
    }
  };

  // 监听配置文件数据
  useEffect(() => {
    const handleProfileData = (event, data) => {
      console.log('Received profile data:', data);
      
      // 判断是否是新的返回格式，处理profileData提取
      const processedData = Array.isArray(data) ? data : 
                         (data && data.success && Array.isArray(data.profiles)) ? data.profiles : [];
      
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
    if (window.electron) {
      window.electron.onProfileData(handleProfileData);
      
      // 手动请求配置文件数据
      window.electron.getProfileData().then((data) => {
        console.log('Fetched profile data:', data);
        // 判断是否是新的返回格式，处理profileData提取
        if (data && data.success && Array.isArray(data.profiles)) {
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
        } else if (Array.isArray(data)) {
          // 兼容旧格式
          setProfileData(data);
          
          // 计算各类型节点数量
          if (data.length > 0) {
            const stats = { ss: 0, vm: 0, tr: 0, dir: 0, other: 0 };
            
            data.forEach(node => {
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

    // 组件卸载时移除事件监听和定时器
    return () => {
      if (window.electron && window.electron.removeProfileData) {
        window.electron.removeProfileData(handleProfileData);
      }
    };
  }, []);
  
  // 初始获取SingBox状态
  useEffect(() => {
    const fetchSingBoxStatus = async () => {
      if (window.electron && window.electron.singbox && window.electron.singbox.getStatus) {
        try {
          const status = await window.electron.singbox.getStatus();
          if (status && status.success) {
            setIsRunning(status.isRunning);
            console.log('初始SingBox状态:', status.isRunning ? '运行中' : '已停止');
          }
        } catch (error) {
          console.error('获取SingBox状态失败:', error);
        }
      }
    };
    
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
    
    if (window.electron && window.electron.singbox && window.electron.singbox.onExit) {
      window.electron.singbox.onExit(handleSingBoxExit);
    }
    
    // 添加状态更新监听
    if (window.electron && window.electron.onStatusUpdate) {
      window.electron.onStatusUpdate(handleStatusUpdate);
    }
    
    // 组件卸载时清理
    return () => {
      clearInterval(statusInterval);
      
      if (window.electron && window.electron.singbox && window.electron.singbox.onExit) {
        // 移除退出事件监听
        const removeExitListener = window.electron.singbox.onExit(() => {});
        if (removeExitListener) removeExitListener();
      }
      
      // 移除状态更新监听
      if (window.electron && window.electron.onStatusUpdate) {
        const removeStatusListener = window.electron.onStatusUpdate(() => {});
        if (removeStatusListener) removeStatusListener();
      }
    };
  }, []);

  // 监听下载完成事件
  useEffect(() => {
    const handleDownloadComplete = (event, data) => {
      console.log('Download complete event:', data);
      
      if (data.success) {
        setDownloadStatus('success');
        // 3秒后关闭弹窗
        setTimeout(() => {
          setIsModalOpen(false);
          resetState();
          
          // 重新获取配置文件数据
          if (window.electron) {
            window.electron.getProfileData().then((data) => {
              if (data && data.length > 0) {
                setProfileData(data);
              }
            }).catch(err => {
              console.error('Failed to get profile data:', err);
            });
          }
        }, 3000);
      } else {
        setDownloadStatus('error');
        setIsDownloading(false);
        setErrorDetails(data.message || data.error || 'Unknown error occurred');
      }
    };

    // 添加事件监听
    if (window.electron) {
      window.electron.onDownloadComplete(handleDownloadComplete);
    }

    // 组件卸载时移除事件监听
    return () => {
      if (window.electron && window.electron.removeDownloadComplete) {
        window.electron.removeDownloadComplete(handleDownloadComplete);
      }
    };
  }, []);

  // 添加useEffect钩子，用于监听内核下载进度
  useEffect(() => {
    // 检查window.electron是否存在
    if (window.electron && window.electron.onCoreDownloadProgress) {
      // 监听下载进度
      const removeListener = window.electron.onCoreDownloadProgress(progress => {
        setCoreDownloadProgress(progress.progress);
      });
      
      // 组件卸载时移除监听器
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  // 添加useEffect钩子，用于监听内核版本更新
  useEffect(() => {
    console.log('设置版本更新监听器');
    // 检查window.electron是否存在
    if (window.electron && window.electron.onCoreVersionUpdate) {
      // 监听版本更新
      console.log('注册onCoreVersionUpdate监听器');
      const removeListener = window.electron.onCoreVersionUpdate(data => {
        console.log('收到版本更新事件:', data);
        setSystemStats(prev => ({
          ...prev,
          coreVersion: data.version || 'unknown',
          coreFullInfo: data.fullOutput || ''
        }));
      });
      
      // 主动请求版本信息
      if (window.electron.singbox && window.electron.singbox.getVersion) {
        console.log('主动请求sing-box版本');
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
      console.warn('electron.onCoreVersionUpdate不可用');
    }
  }, []);

  // 设置配置文件更新定时器
  const setupUpdateTimer = (url, fileName) => {
    // 清除已存在的定时器
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }
    
    // 如果选择了不自动更新，则不设置定时器
    if (updateInterval === '0') {
      return;
    }
    
    // 转换为毫秒
    const intervalMs = parseInt(updateInterval) * 60 * 60 * 1000;
    
    // 设置新的定时器
    updateTimerRef.current = setInterval(() => {
      console.log(`自动更新配置文件: ${fileName} - ${new Date().toLocaleString()}`);
      // 执行下载操作但不显示UI
      downloadProfileSilently(url, fileName);
    }, intervalMs);
    
    console.log(`已设置自动更新定时器，间隔 ${updateInterval} 小时`);
  };
  
  // 无提示下载配置文件（用于自动更新）
  const downloadProfileSilently = (url, customFileName) => {
    if (!url || !customFileName) return;
    
    if (window.electron) {
      window.electron.downloadProfile({
        url: url,
        fileName: customFileName,
        isDefaultConfig: isDefaultConfig
      })
        .then(result => {
          console.log('自动更新结果:', result);
          if (result.success) {
            // 重新获取配置文件数据
            window.electron.getProfileData().then((data) => {
              if (data && data.length > 0) {
                setProfileData(data);
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

  // 处理下载配置文件
  const handleDownloadProfiles = () => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    // 验证URL格式
    try {
      new URL(url); // 简单验证URL格式
    } catch (e) {
      setDownloadStatus('error');
      setErrorDetails('Invalid URL format. Please enter a valid URL, including http:// or https://');
      return;
    }
    
    setIsDownloading(true);
    setDownloadStatus('');
    setErrorDetails('');
    setShowErrorDetails(false);
    
    // 获取用户指定的文件名或使用从URL提取的文件名
    let customFileName = fileName.trim() || url.substring(url.lastIndexOf('/') + 1) || 'profile.config';
    
    // 如果设置为默认配置，则重命名为sing-box.json
    if (isDefaultConfig) {
      customFileName = 'sing-box.json';
    }
    
    // 调用Electron的IPC通信来下载文件
    if (window.electron) {
      window.electron.downloadProfile({
        url: url,
        fileName: customFileName,
        isDefaultConfig: isDefaultConfig
      })
        .then(result => {
          console.log('Download result:', result);
          if (result.success) {
            setDownloadStatus('success');
            
            // 设置定时更新（如果有的话）
            if (updateInterval !== '0') {
              setupUpdateTimer(url, customFileName);
            }
            
            // 3秒后关闭弹窗
            setTimeout(() => {
              setIsModalOpen(false);
              resetState();
              
              // 重新获取配置文件数据
              window.electron.getProfileData().then((data) => {
                if (data && data.length > 0) {
                  setProfileData(data);
                }
              }).catch(err => {
                console.error('Failed to get profile data:', err);
              });
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
      try {
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
            // 3秒后关闭弹窗
            setTimeout(() => {
              setIsModalOpen(false);
              resetState();
            }, 3000);
          })
          .catch(error => {
            console.error('Download failed:', error);
            setDownloadStatus('error');
            setIsDownloading(false);
            setErrorDetails(error.message || 'Network request failed');
          });
      } catch (error) {
        console.error('Unable to download file:', error);
        setDownloadStatus('error');
        setIsDownloading(false);
        setErrorDetails(error.message || 'Browser download functionality not available');
      }
    }
  };

  // 切换错误详情的显示状态
  const toggleErrorDetails = () => {
    setShowErrorDetails(!showErrorDetails);
  };

  // 切换隐私模式
  const togglePrivateMode = () => {
    setPrivateMode(!privateMode);
  };

  // 渲染下载进度或状态UI
  const renderDownloadStatusUI = () => {
    if (isDownloading && !downloadStatus) {
      return (
        <div className="download-progress">
          <div className="progress-bar loading"></div>
          <p className="status-text">Downloading profile...</p>
        </div>
      );
    } else if (downloadStatus === 'success') {
      return (
        <div className="download-progress">
          <div className="progress-bar success"></div>
          <p className="status-text">Profile successfully downloaded!</p>
          {isDefaultConfig && (
            <p className="status-text">已设置为默认配置文件 (sing-box.json)</p>
          )}
          {updateInterval !== '0' && (
            <p className="status-text update-schedule">
              自动更新已设置为每 {updateInterval} 小时一次
            </p>
          )}
          <p className="status-text" style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            窗口将在3秒后自动关闭
          </p>
        </div>
      );
    } else if (downloadStatus === 'error') {
      return (
        <div className="download-progress">
          <div className="progress-bar error"></div>
          <p className="status-text">Download failed. Please try again.</p>
          <div className="error-details-container">
            <button 
              className="error-details-toggle" 
              onClick={toggleErrorDetails}
            >
              {showErrorDetails ? 'Hide Error Details' : 'Show Error Details'}
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
              Try Again
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <>
          <div className="url-input-container">
            <label htmlFor="profile-url">Enter URL to download profile:</label>
            <input
              id="profile-url"
              type="text"
              className="url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/profile.config"
            />
          </div>
          <div className="url-input-container">
            <label htmlFor="profile-name">Custom filename (optional):</label>
            <input
              id="profile-name"
              type="text"
              className="url-input"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="my_profile.config"
              disabled={isDefaultConfig}
            />
          </div>
          <div className="url-input-container update-interval">
            <label htmlFor="update-interval">自动更新间隔 (小时):</label>
            <select
              id="update-interval"
              className="url-input"
              value={updateInterval}
              onChange={(e) => setUpdateInterval(e.target.value)}
            >
              <option value="0">不自动更新</option>
              <option value="1">1小时</option>
              <option value="3">3小时</option>
              <option value="6">6小时</option>
              <option value="12">12小时</option>
              <option value="24">24小时</option>
            </select>
          </div>
          <div className="url-input-container is-default-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isDefaultConfig}
                onChange={(e) => {
                  setIsDefaultConfig(e.target.checked);
                  if (e.target.checked) {
                    setFileName('sing-box.json');
                  }
                }}
              />
              <span>设为默认配置文件 (sing-box.json)</span>
            </label>
          </div>
        </>
      );
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

  // 渲染系统状态栏
  const renderSystemStats = () => {
    return (
      <div style={{
        padding: '15px 25px 15px 25px', // 增加内边距
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        height: 'auto', // 自适应高度
        gap: '10px', // 增加行间距
        marginTop: '0px',
        background: 'transparent',
        borderRadius: '8px', // 添加圆角
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', // 添加轻微阴影
        border: '1px solid #f0f2f5', // 添加边框
        width: '100%' // 确保宽度为100%
      }}>
        <div style={{...customStyles.statusItem, marginBottom: '5px'}}>
          <div style={{...customStyles.statusLabel, fontSize: '13px', color: '#666', marginBottom: '3px'}}>程序启动时间</div>
          <div style={{...customStyles.statusValue, fontSize: '14px', fontWeight: '500'}}>{systemStats.startTime}</div>
        </div>
        
        <div style={{...customStyles.statusItem, marginBottom: '5px'}}>
          <div style={{...customStyles.statusLabel, fontSize: '13px', color: '#666', marginBottom: '3px'}}>内核版本</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{...customStyles.statusValue, fontSize: '14px', fontWeight: '500'}}>
              {systemStats.coreVersion === 'N/A' ? (
                <span>未安装</span>
              ) : (
                systemStats.coreVersion
              )}
            </div>
            {systemStats.coreVersion === 'N/A' && !isDownloadingCore && (
              <button 
                onClick={handleCoreDownload}
                style={{
                  backgroundColor: '#50b2d0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '24px',
                  minWidth: '70px'
                }}
              >
                下载内核
              </button>
            )}
            {isDownloadingCore && (
              <button 
                disabled={true}
                style={{
                  backgroundColor: '#e0e0e0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '24px',
                  minWidth: '70px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{width: '100%', textAlign: 'center'}}>{coreDownloadProgress}%</div>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  width: `${coreDownloadProgress}%`,
                  backgroundColor: '#ffffff',
                  transition: 'width 0.3s ease'
                }}></div>
              </button>
            )}
          </div>
          {coreDownloadError && (
            <div style={{color: 'red', fontSize: '12px', marginTop: '3px'}}>{coreDownloadError}</div>
          )}
          {coreDownloadSuccess && (
            <div style={{color: 'green', fontSize: '12px', marginTop: '3px'}}>下载成功</div>
          )}
        </div>
        
        <div style={{...customStyles.statusItem, marginBottom: '0px'}}>
          <div style={{...customStyles.statusLabel, fontSize: '13px', color: '#666', marginBottom: '3px'}}>总节点数</div>
          <div style={{...customStyles.statusValue, fontSize: '14px', fontWeight: '500'}}>{profileData && profileData.length || 0} 个</div>
        </div>
      </div>
    );
  };

  // 渲染眼睛图标
  const renderEyeIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: privateMode ? '#f5f7f9' : 'transparent'
        }}
        onClick={togglePrivateMode}
        title={privateMode ? "点击显示敏感信息" : "点击隐藏敏感信息"}
      >
        {privateMode ? (
          // 闭眼图标
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          // 睁眼图标
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </div>
    );
  };
  
  // 渲染目录图标
  const renderFolderIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: 'transparent'
        }}
        onClick={() => {
          if (window.electron && window.electron.openConfigDir) {
            window.electron.openConfigDir()
              .catch(err => console.error('打开配置目录失败:', err));
          }
        }}
        title="打开配置文件所在目录"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
    );
  };

  // 渲染运行/停止按钮
  const renderRunStopButton = () => {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '5px',
        height: '100%',
        width: '100%'
      }}>
        <button
          onClick={toggleSingBox}
          disabled={isStarting || isStopping}
          style={{
            backgroundColor: isRunning ? '#e74c3c' : '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 15px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: (isStarting || isStopping) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            width: '85px',  // 缩小尺寸
            height: '32px', // 缩小尺寸
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isStarting ? '启动中...' : 
           isStopping ? '停止中...' : 
           isRunning ? 'STOP' : 'RUN'}
          
          {(isStarting || isStopping) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'loading-shimmer 1.5s infinite',
            }}></div>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {activeView === 'dashboard' ? (
        <>
          <div className="stats-overview" style={{
            height: 'calc(100vh / 3)', // 强制高度为视口高度的1/3
            minHeight: 'calc(100vh / 3)', // 最小高度也是1/3
            maxHeight: 'calc(100vh / 3)', // 最大高度也是1/3
            overflow: 'hidden', // 防止内容溢出
            boxSizing: 'border-box', // 确保padding不会增加高度
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="header" style={{
              background: 'transparent',
              padding: '10px 20px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <div className="search-bar">
                <span className="search-icon"></span>
                <input type="text" placeholder="Search settings..." />
              </div>
              <div className="header-actions" style={{ background: 'transparent', boxShadow: 'none' }}>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                  {renderEyeIcon()}
                  {renderFolderIcon()}
                  <div className="action-separator" style={{ margin: '0 10px' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="add-customer-btn" onClick={() => {
                      setIsModalOpen(true);
                      resetState();
                    }} style={{ padding: '6px 12px', height: '28px' }}>
                      <span className="plus-icon"></span>
                      <span>PROFILE</span>
                    </button>
                    <div style={{ marginLeft: '10px' }}>
                      {renderRunStopButton()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 托盘提示 */}
            <div style={{ 
              padding: '8px 15px', 
              background: '#f9f9f9', 
              borderRadius: '4px', 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontStyle: 'italic' }}>
                提示: 点击最小化按钮可将应用缩小到系统托盘，托盘菜单提供快速 RUN/STOP 功能
              </span>
            </div>

            {/* 弹窗组件 */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add Profile">
              {renderDownloadStatusUI()}
              {(!isDownloading && downloadStatus === '' && !errorDetails) && (
                <div className="modal-actions">
                  <button 
                    className="cancel-button" 
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="download-button" 
                    onClick={handleDownloadProfiles}
                  >
                    Download
                  </button>
                </div>
              )}
            </Modal>
          </div>

          <div className="customer-pipeline">
            <div className="pipeline-stage">
              <div className="stage-header">
                <h3 style={{ fontSize: '20px', fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>Service Nodes</h3>
                <div className="count">{profileData && profileData.length || 0} <span className="up-arrow-icon"></span></div>
              </div>
              <div className="customer-cards">
                {profileData && profileData.length > 0 ? (
                  <div className="profile-tags-container" style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    padding: '10px 0',
                    width: '100%'
                  }}>
                    {profileData.map((profile, index) => (
                      <div key={index} className="profile-tag-card" style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d9dde3', 
                        borderRadius: '6px', 
                        padding: '12px', 
                        width: 'calc(25% - 12px)',
                        margin: '0 0 8px 0',
                        display: 'flex', 
                        flexDirection: 'column', 
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#b3b7bd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d9dde3';
                      }}
                      >
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '14px', 
                          marginBottom: '6px', 
                          color: '#2e3b52',
                          fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                        }}>
                          {privateMode ? '********' : (profile.tag || 'Unknown')}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#505a6b',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{ 
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: profile.type === 'direct' ? '#47c9a2' : 
                                             profile.type === 'shadowsocks' ? '#f7b731' : 
                                             profile.type === 'vmess' ? '#7166f9' : 
                                             profile.type === 'trojan' ? '#ff5e62' : '#abb3c0',
                            marginRight: '6px'
                          }}></span>
                          {profile.type || 'Unknown'}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#505a6b',
                          marginTop: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {privateMode ? '********' : (profile.server || 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#8896ab', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                    No service nodes found. Please click "+ Profiles" to add configuration file.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : activeView === 'activity' ? (
        <div className="activity-view" style={{ width: '100%', padding: '0' }}>
          <Activity />
        </div>
      ) : null}
      
      {/* 添加CSS动画 */}
      <style>
        {`
          @keyframes loading-shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          .activity-view {
            height: 100%;
            padding: 20px;
            overflow: auto;
          }
          
          .modal-content {
            max-height: 80vh;
            overflow-y: auto;
          }
          
          .status-text {
            margin: 8px 0;
            font-size: 14px;
            text-align: center;
            word-break: break-word;
          }
          
          .update-schedule {
            font-size: 12px;
            color: #57a45d;
            margin-top: 5px;
          }
          
          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }
          
          .checkbox-label input {
            width: 16px;
            height: 16px;
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;