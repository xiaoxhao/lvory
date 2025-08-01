import React, { useState, useEffect } from 'react';
import { formatTimestamp } from '../../utils/formatters';

const logColors = {
  INFO: '#4CAF50',
  WARN: '#FF9800',
  ERROR: '#F44336',
  DEBUG: '#2196F3',
};

const logIcons = {
  SYSTEM: '',
  SINGBOX: '',
  NETWORK: '',
  CONNECTION: '',
  STATUS: '',
  CONFIG: '',
};



const safeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const LogItem = ({ log, index, coreStatus }) => {
  const [isVisible, setIsVisible] = useState(true);

  // 确保 log 存在，否则使用空对象作为 fallback，以避免在 Hooks 之前进行条件返回
  const currentLog = log || {};
  const level = safeString(currentLog.level || 'INFO').toLowerCase();
  const type = safeString(currentLog.type || 'SYSTEM');
  const message = safeString(currentLog.message || '');

  // 基于内核状态决定日志显示
  useEffect(() => {
    // 如果内核已停止且这是连接相关的日志，则淡化显示
    if (coreStatus && !coreStatus.isRunning && (type === 'NETWORK' || type === 'CONNECTION')) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [coreStatus, type]);

  // 获取日志优先级
  const getLogPriority = () => {
    if (type === 'SINGBOX') return 'high';
    if (type === 'SYSTEM') return 'medium';
    if (type === 'NETWORK' || type === 'CONNECTION') {
      return coreStatus?.isRunning ? 'medium' : 'low';
    }
    return 'medium';
  };

  const priority = getLogPriority();
  const itemClass = `log-item log-${level} log-priority-${priority} ${!isVisible ? 'log-dimmed' : ''}`;

  if (!log) {
    return null;
  }

  return (
    <div className={itemClass}>
      <div className="log-timestamp">{formatTimestamp(currentLog.timestamp, true)}</div>
      <div className="log-level" style={{ color: logColors[currentLog.level] || '#000' }}>
        {currentLog.level || 'INFO'}
      </div>
      <div className="log-type">
        {logIcons[type] || '🔹'} {type}
      </div>
      <div className="log-message">{message}</div>
      {!isVisible && (
        <div className="log-status-indicator" title="内核已停止">
          ⏸️
        </div>
      )}
    </div>
  );
};

export default LogItem; 