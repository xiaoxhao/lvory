import React, { useState, useEffect } from 'react';
import '../../assets/css/dashboard.css';
import Activity from '../Activity';

// 导入拆分出来的组件
import ProfileModal from './ProfileModal';
import ControlPanel from './ControlPanel';
import NodeList from './NodeList';

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
  
  // 添加API地址设置
  const [apiAddress, setApiAddress] = useState('127.0.0.1:9090');
  
  const [systemStats, setSystemStats] = useState({
    startTime: new Date().toLocaleString(),
    coreVersion: 'N/A',
    activeConnections: 0,
    memoryUsage: '0MB'
  });

  // 添加活动选项卡状态
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'activity'
  
  // 使用拆分出来的功能hooks
  const { isTesting, testResults, setTestResults, handleSpeedTest } = useSpeedTest(profileData, apiAddress);
  
  const coreManagement = useCoreManagement();
  
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
            {/* 控制面板组件 */}
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
            />

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

            {/* 配置文件下载弹窗 */}
            <ProfileModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              onDownloadSuccess={handleDownloadSuccess}
            />
          </div>

          <div className="customer-pipeline">
            {/* 节点列表组件 */}
            <NodeList 
              profileData={profileData}
              testResults={testResults}
              privateMode={privateMode}
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
        `}
      </style>
    </div>
  );
};

export default Dashboard;