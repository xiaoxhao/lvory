import React from 'react';
import { useTranslation } from 'react-i18next';

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
      </div>
      <div className="activity-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder={activeTab === 'connections' ? t('activity.searchConnections') : t('activity.searchLogs')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            ) : (
              <>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </>
            )}
          </select>
        </div>
        <div className="activity-actions">
          <label className="autoscroll-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={() => setAutoScroll(!autoScroll)}
            />
            {activeTab === 'connections' ? t('activity.keepOldConnections') : t('activity.autoScrolling')}
          </label>
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
    </div>
  );
};

export default LogHeader; 