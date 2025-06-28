import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageBox from '../MessageBox';
import '../../assets/css/activity-icons.css';

const LogHeader = ({ 
  searchTerm, 
  setSearchTerm, 
  filter, 
  setFilter, 
  autoScroll, 
  setAutoScroll, 
  onClear,
  activeTab,
  setActiveTab,
  onRetry,
  isRetrying,
  shouldShowRetry = false
}) => {
  const { t } = useTranslation();
  const [showConnectionTip, setShowConnectionTip] = useState(false);

  const handleInfoClick = () => {
    setShowConnectionTip(true);
  };

  return (
    <div className="activity-header">
      <div className="activity-tabs">
        <button 
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          {t('activity.realTimeLogs')}
        </button>
        <button 
          className={`tab-button ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          {t('activity.connectionStatus')}
        </button>
        <button 
          className={`tab-button ${activeTab === 'singbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('singbox')}
        >
          SingBox 日志
        </button>
      </div>
      <div className="activity-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder={
              activeTab === 'connections' 
                ? t('activity.searchConnections') 
                : activeTab === 'singbox'
                  ? '搜索 SingBox 日志...'
                  : t('activity.searchLogs')
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {activeTab !== 'singbox' && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">ALL</option>
              {activeTab === 'logs' ? (
                <>
                  <option value="SYSTEM">System</option>
                  <option value="SINGBOX">SingBox</option>
                  <option value="NETWORK">Network</option>
                </>
              ) : activeTab === 'connections' ? (
                <>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </>
              ) : null}
            </select>
          )}
        </div>
        <div className="activity-actions">
          <div 
            className={`icon-button ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={activeTab === 'connections' ? t('activity.keepOldConnections') : t('activity.autoScrolling')}
          >
            {activeTab === 'connections' ? (
              <div className="icon-ghost"></div>
            ) : (
              // 自动滚动图标
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14l5-5 5 5z"/>
              </svg>
            )}
          </div>
          
          {activeTab === 'connections' && (
            <div 
              className="icon-button info-button"
              onClick={handleInfoClick}
              title={t('activity.connectionHelp')}
            >
              <div className="icon-confusion"></div>
            </div>
          )}
          
          {shouldShowRetry && activeTab === 'connections' && (
            <button 
              onClick={onRetry} 
              className="retry-button-flat"
              disabled={isRetrying}
              title={isRetrying ? t('activity.retrying') : t('activity.retryConnection')}
            >
              {isRetrying ? t('activity.retrying') : t('activity.retryConnection')}
            </button>
          )}
          {activeTab === 'logs' && (
            <button onClick={onClear} className="clear-button">
              {t('activity.clearLogs')}
            </button>
          )}
        </div>
      </div>
      
      {/* 连接监控提示弹窗 */}
      {showConnectionTip && (
        <MessageBox
          isOpen={true}
          onClose={() => setShowConnectionTip(false)}
          message={
            <div>
              <h3 style={{ margin: '0 0 15px 0', color: '#24292e' }}>连接监控说明</h3>
              <p><strong>连接监控功能说明：</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>只能捕获经过 sing-box 内核代理的网络连接</li>
                <li>直连网络流量不会在此处显示</li>
                <li>监控数据实时更新，显示当前活跃连接</li>
                <li>可切换"保留历史"模式查看连接历史记录</li>
              </ul>
              <p><strong>使用提示：</strong></p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>确保代理模式已启用且应用流量经过代理</li>
                <li>刷新页面可重新启动连接监控</li>
                <li>使用搜索和过滤功能快速定位特定连接</li>
              </ul>
            </div>
          }
        />
      )}
    </div>
  );
};

export default LogHeader; 