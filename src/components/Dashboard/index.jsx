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

const Dashboard = ({ activeView = 'dashboard' }) => {
  
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
    restartSingBox 
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

  const togglePrivateMode = () => {
    setPrivateMode(!privateMode);
  };

  // 添加切换扩展视图的函数
  const toggleExpandedView = () => {
    setIsExpandedView(!isExpandedView);
  };

  return (
    <div className="dashboard">
      {activeView === 'dashboard' ? (
        <>
          {/* 只有在非扩展视图时显示状态概览 */}
          {!isExpandedView && (
            <div className="stats-overview" style={{
              height: 'calc(100vh / 3)', 
              minHeight: '200px',
              maxHeight: 'none',
              overflow: 'hidden',
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
                style={{ padding: '5px 0' }}
              />
              
              <div style={{ 
                flex: 1,
                width: '100%',
                overflow: 'hidden',
                marginTop: '-25px',
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
            height: isExpandedView ? 'calc(100vh - 20px)' : 'calc(100vh - calc(100vh / 3) - 20px)',
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