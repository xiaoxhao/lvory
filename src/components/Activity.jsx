import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../assets/css/activity.css';

const Activity = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pageSize] = useState(200); // 每页显示的日志数量
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // 应用过滤和搜索条件
  const applyFilters = useCallback(() => {
    if (!logs.length) return [];
    
    const filtered = logs.filter((log) => {
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

    return filtered;
  }, [logs, filter, searchTerm]);

  // 更新可见日志
  useEffect(() => {
    const filteredLogs = applyFilters();
    // 只显示最新的pageSize条日志
    setVisibleLogs(filteredLogs.slice(-pageSize));
  }, [logs, filter, searchTerm, pageSize, applyFilters]);

  // 组件加载时获取历史日志
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const history = await window.electron.logs.getLogHistory();
        
        // 只加载最新的一批日志
        if (history && history.length) {
          const recentLogs = history.slice(-pageSize);
          setLogs(recentLogs);
        }
        
        setIsInitialLoad(false);
        setLoading(false);
        if (autoScroll) {
          scrollToBottom();
        }
      } catch (error) {
        console.error('获取日志历史失败:', error);
        setLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchLogs();

    // 订阅日志更新 - 使用批量更新减少渲染次数
    let newLogs = [];
    let updateTimer = null;

    const processNewLogs = () => {
      if (newLogs.length > 0) {
        setLogs(prevLogs => {
          // 保持日志数量在合理范围内
          const combinedLogs = [...prevLogs, ...newLogs];
          const trimmedLogs = combinedLogs.length > pageSize * 2 
            ? combinedLogs.slice(-pageSize * 2) 
            : combinedLogs;
          return trimmedLogs;
        });
        newLogs = [];
        
        if (autoScroll) {
          scrollToBottom();
        }
      }
    };
    
    const onNewLog = (log) => {
      newLogs.push(log);
      
      // 批量更新，降低渲染频率
      if (!updateTimer) {
        updateTimer = setTimeout(() => {
          processNewLogs();
          updateTimer = null;
        }, 300);
      }
    };
    
    const unsubscribe = window.electron.logs.onLogMessage(onNewLog);
    const unsubscribeActivity = window.electron.logs.onActivityLog(onNewLog);

    return () => {
      if (updateTimer) {
        clearTimeout(updateTimer);
      }
      if (unsubscribe) unsubscribe();
      if (unsubscribeActivity) unsubscribeActivity();
    };
  }, [autoScroll, pageSize]);

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

  // 滚动事件处理 - 加载更多历史日志
  const handleScroll = useCallback(() => {
    if (!logContainerRef.current || loading || isInitialLoad) return;
    
    const { scrollTop } = logContainerRef.current;
    
    // 当滚动到顶部附近时，加载更多历史日志
    if (scrollTop < 50) {
      const loadMoreLogs = async () => {
        try {
          setLoading(true);
          const history = await window.electron.logs.getLogHistory();
          
          if (history && history.length > logs.length) {
            // 计算要加载的新日志范围
            const startIndex = Math.max(0, history.length - logs.length - pageSize);
            const endIndex = history.length - logs.length;
            
            if (endIndex > startIndex) {
              const olderLogs = history.slice(startIndex, endIndex);
              setLogs(prevLogs => [...olderLogs, ...prevLogs]);
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error('加载更多日志失败:', error);
          setLoading(false);
        }
      };
      
      loadMoreLogs();
    }
  }, [loading, logs.length, pageSize, isInitialLoad]);

  // 添加滚动事件监听
  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // 清除日志
  const handleClearLogs = async () => {
    try {
      await window.electron.logs.clearLogs();
      setLogs([]);
      setVisibleLogs([]);
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  };

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
        <h2>Logging</h2>
        <div className="activity-controls">
          <div className="search-filter">
            <input
              type="text"
              placeholder="search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">ALL</option>
              <option value="SYSTEM">System</option>
              <option value="SINGBOX">SingBox</option>
              <option value="NETWORK">Network</option>
            </select>
          </div>
          <div className="activity-actions">
            <label className="autoscroll-label">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={() => setAutoScroll(!autoScroll)}
              />
              Auto-Scrolling
            </label>
            <button onClick={handleClearLogs} className="clear-button">
              Clear Logs
            </button>
          </div>
        </div>
      </div>
      <div className="log-container" ref={logContainerRef}>
        {loading && <div className="loading-logs">加载日志中...</div>}
        {visibleLogs.length === 0 && !loading ? (
          <div className="no-logs">no log recording</div>
        ) : (
          visibleLogs.map((log, index) => {
            // 确保log存在且包含必要的属性
            if (!log) return null;
            
            const level = safeString(log.level || 'INFO').toLowerCase();
            const type = safeString(log.type || 'SYSTEM');
            const message = safeString(log.message || '');
            
            return (
              <div key={`${log.timestamp}-${index}`} className={`log-item log-${level}`}>
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