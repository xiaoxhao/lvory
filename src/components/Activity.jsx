import React, { useState, useEffect, useRef } from 'react';
import '../assets/css/activity.css';

const Activity = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // 日志类型的颜色映射
  const logColors = {
    INFO: '#4CAF50',    // 绿色
    WARN: '#FF9800',    // 橙色
    ERROR: '#F44336',   // 红色
  };

  // 日志类型图标映射
  const logIcons = {
    SYSTEM: '🖥️',
    SINGBOX: '📦',
    NETWORK: '🌐',
  };

  // 组件加载时获取历史日志
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const history = await window.electron.logs.getLogHistory();
        setLogs(history || []);
        scrollToBottom();
      } catch (error) {
        console.error('获取日志历史失败:', error);
      }
    };

    fetchLogs();

    // 订阅日志更新
    const unsubscribe = window.electron.logs.onLogMessage((log) => {
      setLogs((prevLogs) => [...prevLogs, log]);
      if (autoScroll) {
        scrollToBottom();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [autoScroll]);

  // 滚动到底部
  const scrollToBottom = () => {
    if (logContainerRef.current && autoScroll) {
      setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  // 清除日志
  const handleClearLogs = async () => {
    try {
      await window.electron.logs.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!log) return false;
    
    // 应用类型过滤
    if (filter !== 'all' && log.type !== filter) {
      return false;
    }

    // 应用搜索过滤 - 确保message存在
    if (searchTerm && log.message && typeof log.message === 'string') {
      return log.message.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (searchTerm) {
      return false;
    }

    return true;
  });

  // 格式化时间戳
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

  // 安全获取日志属性
  const safeString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  return (
    <div className="activity-container">
      <div className="activity-header">
        <h2>活动日志</h2>
        <div className="activity-controls">
          <div className="search-filter">
            <input
              type="text"
              placeholder="搜索日志..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">全部类型</option>
              <option value="SYSTEM">系统</option>
              <option value="SINGBOX">SingBox</option>
              <option value="NETWORK">网络</option>
            </select>
          </div>
          <div className="activity-actions">
            <label className="autoscroll-label">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={() => setAutoScroll(!autoScroll)}
              />
              自动滚动
            </label>
            <button onClick={handleClearLogs} className="clear-button">
              清除日志
            </button>
          </div>
        </div>
      </div>
      <div className="log-container" ref={logContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="no-logs">没有日志记录</div>
        ) : (
          filteredLogs.map((log, index) => {
            // 确保log存在且包含必要的属性
            if (!log) return null;
            
            const level = safeString(log.level || 'INFO').toLowerCase();
            const type = safeString(log.type || 'SYSTEM');
            const message = safeString(log.message || '');
            
            return (
              <div key={index} className={`log-item log-${level}`}>
                <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
                <div className="log-level" style={{ color: logColors[log.level] || '#000' }}>
                  {log.level || 'INFO'}
                </div>
                <div className="log-type">
                  {logIcons[type] || '🔹'} {type}
                </div>
                <div className="log-message">{message}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Activity; 