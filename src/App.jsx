import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Profiles from './components/Profiles';
import Settings from './components/Settings/Settings';
import { AppProvider } from './context/AppContext';
import { initMessageBox } from './utils/messageBox';
import './i18n'; // 引入i18n初始化文件
import './assets/css/global.css';
import './assets/css/app.css';

const App = () => {
  // 添加活动项状态
  const [activeItem, setActiveItem] = useState('dashboard');
  // 添加配置文件数量状态
  const [profilesCount, setProfilesCount] = useState(0);
  // 检测是否为 macOS 系统
  const [isMacOS, setIsMacOS] = useState(false);
  // 添加窗口可见性状态
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  // 用于存储动画帧请求ID
  const animationFrameRef = useRef(null);
  // 用于存储非必要的定时器
  const timersRef = useRef({});

  // 初始化消息框
  useEffect(() => {
    initMessageBox();
  }, []);
  
  // 检测操作系统类型
  useEffect(() => {
    if (window.electron && window.electron.platform) {
      // 直接从 electron 获取平台信息
      setIsMacOS(window.electron.platform === 'darwin');
    } else {
      // 浏览器环境下的备用检测方法
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsMacOS(/macintosh|mac os x/i.test(userAgent));
    }
  }, []);

  // 监听窗口可见性变化事件
  useEffect(() => {
    if (window.electron && window.electron.onWindowVisibilityChange) {
      const handleVisibilityChange = (state) => {
        setIsWindowVisible(state.isVisible);
        
        if (state.isVisible) {
          // 窗口显示时，恢复正常渲染
          resumeRendering();
        } else {
          // 窗口隐藏时，暂停不必要的渲染
          pauseRendering();
        }
      };
      
      // 注册事件监听
      const unsubscribe = window.electron.onWindowVisibilityChange(handleVisibilityChange);
      
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, []);

  const pauseRendering = () => {
    // 取消所有不必要的requestAnimationFrame
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 暂停所有不必要的定时器
    Object.values(timersRef.current).forEach(timer => {
      if (timer) {
        clearInterval(timer);
      }
    });
    
    // 调整渲染更新频率
    if (document.body) {
      document.body.classList.add('background-throttled');
    }
  };

  // 恢复正常渲染和计算
  const resumeRendering = () => {
    // 恢复必要的UI更新
    if (document.body) {
      document.body.classList.remove('background-throttled');
    }
  };

  // 获取配置文件数量
  useEffect(() => {
    const getProfilesCount = async () => {
      if (window.electron && window.electron.getProfileFiles) {
        try {
          const result = await window.electron.getProfileFiles();
          if (result && result.success && Array.isArray(result.files)) {
            setProfilesCount(result.files.length);
          } else {
            console.error('获取配置文件数据格式不正确:', result);
            setProfilesCount(0);
          }
        } catch (error) {
          console.error('获取配置文件数量失败:', error);
          setProfilesCount(0);
        }
      }
    };

    getProfilesCount();

    // 添加事件监听器以更新配置文件数量
    const updateProfilesCount = () => {
      getProfilesCount();
    };

    if (window.electron && window.electron.onProfilesChanged) {
      window.electron.onProfilesChanged(updateProfilesCount);
    }

    return () => {
      if (window.electron && window.electron.offProfilesChanged) {
        window.electron.offProfilesChanged(updateProfilesCount);
      }
    };
  }, []);

  // 处理侧边栏菜单点击
  const handleItemClick = (item) => {
    setActiveItem(item);
    
    // 如果切换到dashboard，确保使用当前配置文件
    // 由于Dashboard组件不再重新挂载，这段代码可以去掉
    // 或者当真正需要刷新数据时，通过自定义事件通知Dashboard组件
  };

  // 处理窗口控制按钮的点击事件
  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimizeWindow();
    } else {
      try {
        const { remote } = window.require('electron');
        if (remote) {
          remote.getCurrentWindow().minimize();
        }
      } catch (error) {
        console.error('无法最小化窗口:', error);
      }
    }
  };

  const handleMaximize = () => {
    // 使用Electron的IPC通信来最大化/还原窗口
    if (window.electron) {
      window.electron.maximizeWindow();
    } else {
      try {
        const { remote } = window.require('electron');
        if (remote) {
          const currentWindow = remote.getCurrentWindow();
          if (currentWindow.isMaximized()) {
            currentWindow.unmaximize();
          } else {
            currentWindow.maximize();
          }
        }
      } catch (error) {
        console.error('无法最大化/还原窗口:', error);
      }
    }
  };

  const handleClose = () => {
    // 使用Electron的IPC通信来关闭窗口
    if (window.electron) {
      window.electron.closeWindow();
    } else {
      try {
        const { remote } = window.require('electron');
        if (remote) {
          remote.getCurrentWindow().close();
        }
      } catch (error) {
        console.error('无法关闭窗口:', error);
      }
    }
  };

  const isSettingsActive = activeItem === 'settings';

  return (
    <AppProvider>
      <Router basename="/">
        <Routes>
          <Route path="/" element={
            <div className={`app-container ${isMacOS ? 'mac-os' : ''} ${isSettingsActive ? 'settings-active' : ''} ${!isWindowVisible ? 'window-hidden' : ''}`}>
              {/* 添加可拖动区域 */}
              <div className="window-draggable-area"></div>
              
              {/* 添加窗口控制按钮，在 macOS 环境下不显示 */}
              {!isMacOS && (
                <div className="window-controls">
                  <button className="control-button minimize" onClick={handleMinimize} title="最小化">—</button>
                  <button className="control-button maximize" onClick={handleMaximize} title="最大化">□</button>
                  <button className="control-button close" onClick={handleClose} title="关闭">×</button>
                </div>
              )}
              
              {/* 顶部控制区域 */}
              <div className="top-controls">
                {/* 顶部为空，只用于拖动和控制按钮 */}
              </div>

              {/* 横线 */}
              <div className="horizontal-line"></div>
              
              {/* 内容区域 */}
              <div className="content-container">
                <Sidebar 
                  activeItem={activeItem} 
                  onItemClick={handleItemClick} 
                  profilesCount={profilesCount}
                  isMinimized={isSettingsActive}
                />
                <div className="main-content" style={{ position: 'relative' }}>
                  <Dashboard activeView={activeItem} />
                  <div style={{ 
                    display: activeItem === 'profiles' ? 'block' : 'none', 
                    width: '100%', 
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}>
                    {activeItem === 'profiles' && <Profiles />}
                  </div>
                  <div style={{ 
                    display: activeItem === 'settings' ? 'block' : 'none', 
                    width: '100%', 
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}>
                    {activeItem === 'settings' && <Settings />}
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App; 