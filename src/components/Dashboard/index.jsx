import React, { useState, useEffect } from 'react';
import '../../assets/css/dashboard.css';
import Activity from '../Activity';

// 导入拆分出来的组件
import ProfileModal from './ProfileModal';
import ControlPanel from './ControlPanel';
import NodeList from './NodeList';
import StatsOverview from './StatsOverview';

// 导入拆分出来的功能模块
import useSpeedTest from './SpeedTest';
import useCoreManagement from './CoreManagement';
import useSingBoxControl from './SingBoxControl';
import useStatusMonitor from './StatusMonitor';
import useProfileUpdate from './hooks/useProfileUpdate';

const Dashboard = ({ activeView = 'dashboard', onSwitchToActivity }) => {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileData, setProfileData] = useState([]);
  const [nodeTypeStats, setNodeTypeStats] = useState({ ss: 0, vm: 0, tr: 0, dir: 0, other: 0 });
  const [privateMode, setPrivateMode] = useState(false);
  
  // 添加扩展视图状态
  const [isExpandedView, setIsExpandedView] = useState(false);
  
  // 添加API地址设置
  const [apiAddress, setApiAddress] = useState('127.0.0.1:9090');
  
  const [systemStats, setSystemStats] = useState({
    startTime: new Date().toLocaleString(),
    coreVersion: 'N/A',
    activeConnections: 0,
    memoryUsage: '0MB'
  });

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'activity'
  const { isTesting, testResults, setTestResults, handleSpeedTest } = useSpeedTest(profileData, apiAddress);
  
  const coreManagement = useCoreManagement()
  const singBoxControl = useSingBoxControl();
  const { 
    isRunning, 
    isStarting, 
    isStopping, 
    isRestarting, 
    toggleSingBox, 
    restartSingBox,
    coreExists,
    isDownloadingCore,
    downloadProgress,
    downloadMessage
  } = singBoxControl;
  
  const { handleDownloadSuccess } = useProfileUpdate(setProfileData);
  
  // 监听状态变化
  useStatusMonitor(
    singBoxControl, 
    setSystemStats, 
    setProfileData, 
    setNodeTypeStats, 
    setTestResults
  );

  // 获取API地址设置
  useEffect(() => {
    if (window.electron && window.electron.getSettings) {
      window.electron.getSettings().then(result => {
        if (result && result.success) {
          setApiAddress(result.settings.apiAddress || '127.0.0.1:9090');
        }
      }).catch(err => {
        console.error('获取API地址设置失败:', err);
      });
    }
  }, []);

  // 添加数据更新的事件监听器
  useEffect(() => {
    // 定义更新数据的函数
    const updateProfileData = () => {
      if (window.electron) {
        window.electron.getProfileData().then((data) => {
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
          }
        }).catch(err => {
          console.error('更新配置文件数据失败:', err);
        });
      }
    };

    // 当activeView切换到dashboard时更新数据
    if (activeView === 'dashboard') {
      updateProfileData();
    }

    // 设置定期更新
    const updateInterval = setInterval(() => {
      if (activeView === 'dashboard') {
        updateProfileData();
      }
    }, 30000); // 每30秒更新一次数据，可以根据需要调整

    return () => {
      clearInterval(updateInterval);
    };
  }, [activeView]); // 当activeView变化时重新设置

  const togglePrivateMode = () => {
    setPrivateMode(!privateMode);
  };

  // 添加切换扩展视图的函数
  const toggleExpandedView = () => {
    setIsExpandedView(!isExpandedView);
  };

  return (
    <div className="dashboard" style={{ display: activeView === 'dashboard' || activeView === 'activity' ? 'block' : 'none' }}>
      <div className="dashboard-content">
        {/* Dashboard视图内容 */}
        <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
          {/* 只有在非扩展视图时显示状态概览 */}
          {!isExpandedView && (
            <div className="stats-overview" style={{
              maxHeight: 'calc(100vh / 3)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '0px'
            }}>
              <ControlPanel 
                isRunning={isRunning}
                onTogglePrivate={togglePrivateMode}
                onSpeedTest={handleSpeedTest}
                onToggleSingBox={toggleSingBox}
                privateMode={privateMode}
                isTesting={isTesting}
                isStarting={isStarting}
                isStopping={isStopping}
                isRestarting={isRestarting}
                onOpenProfileModal={() => setIsModalOpen(true)}
                onRestartSingBox={restartSingBox}
                coreExists={coreExists}
                isDownloadingCore={isDownloadingCore}
                downloadProgress={downloadProgress}
                downloadMessage={downloadMessage}
                onSwitchToActivity={onSwitchToActivity}
                style={{ padding: '5px 0' }}
              />
              
              <div style={{ 
                flex: 1,
                width: '100%',
                overflow: 'hidden',
                marginTop: '-5px',
                backgroundColor: 'transparent',
                minHeight: '160px'
              }}>
                <StatsOverview apiAddress={apiAddress} />
              </div>

              <ProfileModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onDownloadSuccess={handleDownloadSuccess}
              />
            </div>
          )}

          <div className="node-list-container" style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative'
          }}>
            <NodeList 
              profileData={profileData}
              testResults={testResults}
              privateMode={privateMode}
              isExpandedView={isExpandedView}
              onToggleExpandedView={toggleExpandedView}
            />
          </div>
        </div>

        {/* Activity视图内容 */}
        <div className="activity-view" style={{ 
          width: '100%', 
          padding: '0',
          display: activeView === 'activity' ? 'block' : 'none' 
        }}>
          <Activity isKernelRunning={isRunning} isActivityView={activeView === 'activity'} />
        </div>
      </div>

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

          .spinning {
            animation: spin 1.5s linear infinite;
          }
          
          .lightning-spinning {
            animation: lightning-flash 1.2s ease-in-out infinite;
          }
          
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
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

          .activity-view {
            height: 100%;
            padding: 20px;
            overflow: auto;
          }
          
          .modal-content {
            max-height: 80vh;
            overflow-y: auto;
          }
          
          .success-state .modal-content {
            background-color: #f8fafc;
          }
          
          .success-state .close-button {
            display: block !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          .node-list-container {
            transition: height 0.3s ease;
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;