import React, { useState, useEffect } from 'react';

const logColors = {
  INFO: '#4CAF50',
  WARN: '#FF9800',
  ERROR: '#F44336',
  DEBUG: '#2196F3',
};

const logIcons = {
  SYSTEM: '🖥️',
  SINGBOX: '📦',
  NETWORK: '🌐',
  CONNECTION: '🔗',
  STATUS: '📊',
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '--:--:--';
  try {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  } catch (e) {
    return timestamp.toString();
  }
};

const safeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const LogItem = ({ log, index, coreStatus }) => {
  if (!log) return null;
  
  const [isVisible, setIsVisible] = useState(true);
  const level = safeString(log.level || 'INFO').toLowerCase();
  const type = safeString(log.type || 'SYSTEM');
  const message = safeString(log.message || '');
  
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
  
  return (
    <div className={itemClass}>
      <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
      <div className="log-level" style={{ color: logColors[log.level] || '#000' }}>
        {log.level || 'INFO'}
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