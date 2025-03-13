import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './assets/css/global.css';
import './assets/css/app.css';

const App = () => {
  // 添加活动项状态
  const [activeItem, setActiveItem] = useState('dashboard');

  // 处理侧边栏菜单点击
  const handleItemClick = (item) => {
    setActiveItem(item);
  };

  // 处理窗口控制按钮的点击事件
  const handleMinimize = () => {
    // 使用Electron的IPC通信来最小化窗口
    if (window.electron) {
      window.electron.minimizeWindow();
    } else {
      // 如果electron对象不可用，尝试直接使用electron的remote模块
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

  return (
    <div className="app-container">
      {/* 添加可拖动区域 */}
      <div className="window-draggable-area"></div>
      
      {/* 添加窗口控制按钮 */}
      <div className="window-controls">
        <button className="control-button minimize" onClick={handleMinimize} title="最小化">—</button>
        <button className="control-button maximize" onClick={handleMaximize} title="最大化">□</button>
        <button className="control-button close" onClick={handleClose} title="关闭">×</button>
      </div>
      
      {/* 顶部控制区域 */}
      <div className="top-controls">
        {/* 顶部为空，只用于拖动和控制按钮 */}
      </div>

      {/* 横线 */}
      <div className="horizontal-line"></div>
      
      {/* 内容区域 */}
      <div className="content-container">
        <Sidebar activeItem={activeItem} onItemClick={handleItemClick} />
        <div className="main-content">
          <Dashboard activeView={activeItem} />
        </div>
      </div>
    </div>
  );
};

export default App; 