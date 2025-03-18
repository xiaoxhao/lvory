import React, { useState } from 'react';

const customStyles = {
  eyeIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease'
  }
};

const ControlPanel = ({ 
  isRunning, 
  onTogglePrivate, 
  onSpeedTest, 
  onToggleSingBox,
  privateMode, 
  isTesting,
  isStarting, 
  isStopping,
  isRestarting,
  onOpenProfileModal,
  onRestartSingBox
}) => {
  const [showRestartButton, setShowRestartButton] = useState(false);

  // 渲染眼睛图标
  const renderEyeIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: privateMode ? '#f5f7f9' : 'transparent'
        }}
        onClick={onTogglePrivate}
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
  
  // 修改测速图标函数
  const renderSpeedTestIcon = () => {
    const isDisabled = !isRunning; // 当SingBox未运行时禁用测速按钮
    
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: isTesting ? '#f0f4ff' : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? 'not-allowed' : (isTesting ? 'default' : 'pointer')
        }}
        onClick={isDisabled || isTesting ? null : onSpeedTest}
        title={isDisabled ? "请先启动内核以启用测速功能" : "测试节点速度"}
      >
        <svg 
          className={isTesting ? "lightning-spinning" : ""} 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#505a6b" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        {isTesting && <span style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'nowrap'
        }}>测速中...</span>}
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

  const renderRunStopButton = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '5px',
        height: '100%',
        width: '100%',
        position: 'relative'
      }}>
        <button
          onClick={onToggleSingBox}
          disabled={isStarting || isStopping || isRestarting}
          onMouseEnter={() => {
            if (isRunning && !isStarting && !isStopping && !isRestarting) {
              setShowRestartButton(true);
            }
          }}
          onMouseLeave={(e) => {
            // 检查鼠标是否真的离开了整个按钮区域
            const rect = e.currentTarget.getBoundingClientRect();
            const isInRestartArea = e.clientY >= rect.top && 
                                   e.clientY <= rect.bottom + 20 &&
                                   e.clientX >= rect.left && 
                                   e.clientX <= rect.right;
            if (!isInRestartArea) {
              setShowRestartButton(false);
            }
          }}
          style={{
            backgroundColor: isRunning ? '#e74c3c' : '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 15px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: (isStarting || isStopping || isRestarting) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            width: '85px',  
            height: '32px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          {isStarting ? '启动中...' : 
           isStopping ? '停止中...' : 
           isRestarting ? '重启中...' :
           isRunning ? 'STOP' : 'RUN'}
          
          {(isStarting || isStopping || isRestarting) && (
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
        
        {/* 重启按钮 */}
        {showRestartButton && isRunning && !isStarting && !isStopping && !isRestarting && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestartSingBox();
            }}
            style={{
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 15px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              width: '85px',  
              height: '32px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: 'calc(100% + 5px)',
              zIndex: 3,
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            RESTART
          </button>
        )}
      </div>
    );
  };

  return (
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
          {renderSpeedTestIcon()}
          {renderFolderIcon()}
          <div className="action-separator" style={{ margin: '0 10px' }}></div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="add-customer-btn" onClick={onOpenProfileModal} style={{ padding: '6px 12px', height: '28px' }}>
              <span className="plus-icon"></span>
              <span>PROFILE</span>
            </button>
            <div style={{ marginLeft: '10px' }}>
              {renderRunStopButton()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .lightning-spinning {
          animation: lightning-flash 1.2s ease-in-out infinite;
        }
        
        @keyframes lightning-flash {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;