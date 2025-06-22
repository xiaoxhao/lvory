import React, { useState, useEffect, useRef, useCallback } from 'react';
import LogItem from './Activity/LogItem';
import ConnectionLogItem from './Activity/ConnectionLogItem';
import ConnectionHeader from './Activity/ConnectionHeader';
import LogHeader from './Activity/LogHeader';
import '../assets/css/activity.css';

const Activity = ({ isKernelRunning = false, isActivityView = false }) => {
  const [logs, setLogs] = useState([]);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const [currentConnections, setCurrentConnections] = useState(new Map()); // 当前连接状态
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('logs');
  
  // 添加延迟停止连接监听的状态
  const [connectionMonitorActive, setConnectionMonitorActive] = useState(false);
  const connectionStopTimeoutRef = useRef(null);
  
  const logContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(false); // 连接状态默认不保留历史
  const [loading, setLoading] = useState(false);
  const [pageSize] = useState(200);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // 判断是否应该监听连接活动的函数
  const shouldMonitorConnections = useCallback(() => {
    return isKernelRunning && connectionMonitorActive && activeTab === 'connections';
  }, [isKernelRunning, connectionMonitorActive, activeTab]);

  // 当切换到Activity视图且内核运行时，自动切换到connections标签
  useEffect(() => {
    if (isActivityView && isKernelRunning) {
      setActiveTab('connections');
    }
  }, [isActivityView, isKernelRunning]);

  // 当不满足监听条件时，清理连接状态
  useEffect(() => {
    if (!shouldMonitorConnections()) {
      setCurrentConnections(new Map());
      setConnectionLogs([]);
    }
  }, [shouldMonitorConnections]);

  // 处理连接标签页的激活和停用
  useEffect(() => {
    if (isActivityView && activeTab === 'connections') {
      // 立即激活连接监听
      setConnectionMonitorActive(true);
      // 清除任何现有的停止定时器
      if (connectionStopTimeoutRef.current) {
        clearTimeout(connectionStopTimeoutRef.current);
        connectionStopTimeoutRef.current = null;
      }
      
      // 立即启动后端连接监听
      if (isKernelRunning) {
        window.electron.logs.startConnectionMonitoring().then(success => {
          if (success) {
            console.log('后端连接监听已启动');
            // 清空当前连接状态以确保显示最新数据
            setCurrentConnections(new Map());
            setConnectionLogs([]);
          } else {
            console.warn('后端连接监听启动失败');
          }
        }).catch(error => {
          console.error('启动后端连接监听时出错:', error);
        });
      }
    } else if (activeTab !== 'connections' || !isActivityView) {
      // 设置10秒延迟停止
      if (connectionStopTimeoutRef.current) {
        clearTimeout(connectionStopTimeoutRef.current);
      }
      connectionStopTimeoutRef.current = setTimeout(() => {
        setConnectionMonitorActive(false);
        console.log('连接监听已在10秒后自动停止');
        
        // 停止后端连接监听
        window.electron.logs.stopConnectionMonitoring().then(() => {
          console.log('后端连接监听已停止');
        }).catch(error => {
          console.error('停止后端连接监听时出错:', error);
        });
      }, 10000);
    }

    // 清理函数
    return () => {
      if (connectionStopTimeoutRef.current) {
        clearTimeout(connectionStopTimeoutRef.current);
        connectionStopTimeoutRef.current = null;
      }
      // 组件卸载时确保停止后端监听
      if (connectionMonitorActive) {
        window.electron.logs.stopConnectionMonitoring().catch(error => {
          console.error('组件卸载时停止后端连接监听出错:', error);
        });
      }
    };
  }, [isActivityView, activeTab, isKernelRunning, connectionMonitorActive]);

  // 重试连接监听的函数
  const retryConnectionMonitoring = useCallback(async () => {
    if (!shouldMonitorConnections() || isRetrying) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // 尝试重新获取连接历史
      const history = await window.electron.logs.getConnectionLogHistory();
      if (history?.length) {
        setConnectionLogs(history.slice(-pageSize));
      }
      
      // 清空当前连接状态以重新开始监听
      setCurrentConnections(new Map());
      
      console.log(`连接监听重试成功 (第${retryCount + 1}次)`);
    } catch (error) {
      console.error(`连接监听重试失败 (第${retryCount + 1}次):`, error);
    } finally {
      setIsRetrying(false);
    }
  }, [shouldMonitorConnections, isRetrying, retryCount, pageSize]);

  // 当条件满足时重置重试计数
  useEffect(() => {
    if (shouldMonitorConnections()) {
      setRetryCount(0);
    }
  }, [shouldMonitorConnections]);

  const applyFilters = useCallback((logsToFilter, isConnection = false) => {
    if (!logsToFilter.length) return [];
    
    return logsToFilter.filter((log) => {
      if (!log) return false;
      
      if (filter !== 'all') {
        if (isConnection) {
          // 连接日志按方向过滤
          if (log.direction !== filter) return false;
        } else {
          if (log.type !== filter) return false;
        }
      }

      if (searchTerm) {
        const searchContent = isConnection ? 
          (log.payload || log.address || '') : 
          (log.message || '');
        
        if (typeof searchContent === 'string') {
          return searchContent.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return false;
        }
      }

      return true;
    });
  }, [filter, searchTerm]);

  useEffect(() => {
    if (activeTab === 'logs') {
      const filteredLogs = applyFilters(logs, false);
      setVisibleLogs(filteredLogs.slice(-pageSize));
    } else {
      // 连接状态页面显示当前连接或历史连接
      const displayLogs = autoScroll ? connectionLogs : Array.from(currentConnections.values());
      const filteredLogs = applyFilters(displayLogs, true);
      setVisibleLogs(filteredLogs);
    }
  }, [logs, connectionLogs, currentConnections, filter, searchTerm, pageSize, applyFilters, activeTab, autoScroll]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        if (activeTab === 'logs') {
          const history = await window.electron.logs.getHistory();
          if (history?.length) {
            setLogs(history.slice(-pageSize));
          }
        } else if (shouldMonitorConnections()) {
          // 只有在内核运行且处于连接状态标签时才获取连接日志
          // 以避免不需要的性能开销
          const history = await window.electron.logs.getConnectionHistory();
          if (history?.length) {
            setConnectionLogs(history.slice(-pageSize));
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('获取日志历史失败:', error);
        setLoading(false);
      }
    };

    fetchLogs();

    let newLogs = [];
    let updateTimer = null;

    const processNewLogs = () => {
      if (newLogs.length > 0) {
        if (activeTab === 'logs') {
          setLogs(prevLogs => {
            const combinedLogs = [...prevLogs, ...newLogs];
            return combinedLogs.length > pageSize * 2 
              ? combinedLogs.slice(-pageSize * 2) 
              : combinedLogs;
          });
        } else {
          setConnectionLogs(prevLogs => {
            const combinedLogs = [...prevLogs, ...newLogs];
            return combinedLogs.length > pageSize * 2 
              ? combinedLogs.slice(-pageSize * 2) 
              : combinedLogs;
          });
        }
        newLogs = [];
        
        if (autoScroll) {
          scrollToBottom();
        }
      }
    };
    
    const onNewLog = (log) => {
      newLogs.push(log);
      if (!updateTimer) {
        updateTimer = setTimeout(() => {
          processNewLogs();
          updateTimer = null;
        }, 300);
      }
    };

    const onNewConnectionLog = (connectionLog) => {
      // 只有在应该监听连接时才处理连接日志
      if (!shouldMonitorConnections()) {
        return;
      }
      
      // 为连接日志生成唯一标识符
      const connectionKey = `${connectionLog.sessionId}-${connectionLog.direction}-${connectionLog.address}`;
      
      if (autoScroll) {
        // 保留历史模式：添加到连接日志历史
        setConnectionLogs(prevLogs => {
          const combinedLogs = [...prevLogs, connectionLog];
          return combinedLogs.length > pageSize * 2 
            ? combinedLogs.slice(-pageSize * 2) 
            : combinedLogs;
        });
      } else {
        // 实时状态模式：更新当前连接状态
        setCurrentConnections(prevConnections => {
          const newConnections = new Map(prevConnections);
          newConnections.set(connectionKey, {
            ...connectionLog,
            lastUpdate: Date.now()
          });
          
          // 限制显示的连接数量，移除最旧的连接
          if (newConnections.size > 100) {
            const oldestKey = Array.from(newConnections.entries())
              .sort(([,a], [,b]) => a.lastUpdate - b.lastUpdate)[0][0];
            newConnections.delete(oldestKey);
          }
          
          return newConnections;
        });
      }
    };
    
    const unsubscribe = window.electron.logs.onMessage(onNewLog);
    const unsubscribeActivity = window.electron.logs.onActivity(onNewLog);
    const unsubscribeConnection = window.electron.logs.onConnection(onNewConnectionLog);
    
    // 监听连接状态重置事件
    const unsubscribeReset = window.electron.ipcRenderer?.on('connection-log-reset', () => {
      console.log('收到连接状态重置信号，清空前端连接数据');
      setCurrentConnections(new Map());
      setConnectionLogs([]);
    });

    return () => {
      if (updateTimer) {
        clearTimeout(updateTimer);
      }
      unsubscribe?.();
      unsubscribeActivity?.();
      unsubscribeConnection?.();
      unsubscribeReset?.();
    };
  }, [autoScroll, pageSize, activeTab, shouldMonitorConnections]);

  const scrollToBottom = () => {
    if (logContainerRef.current && autoScroll) {
      setTimeout(() => {
        logContainerRef.current?.scrollTo({
          top: logContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 0);
    }
  };

  const handleScroll = useCallback(() => {
    if (!logContainerRef.current || loading) return;
    
    const { scrollTop } = logContainerRef.current;
    
    if (scrollTop < 50) {
      const loadMoreLogs = async () => {
        try {
          setLoading(true);
          
          if (activeTab === 'logs') {
            const history = await window.electron.logs.getHistory();
            
            if (history?.length > logs.length) {
              const startIndex = Math.max(0, history.length - logs.length - pageSize);
              const endIndex = history.length - logs.length;
              
              if (endIndex > startIndex) {
                setLogs(prevLogs => [...history.slice(startIndex, endIndex), ...prevLogs]);
              }
            }
          } else {
            const history = await window.electron.logs.getConnectionHistory();
            
            if (history?.length > connectionLogs.length) {
              const startIndex = Math.max(0, history.length - connectionLogs.length - pageSize);
              const endIndex = history.length - connectionLogs.length;
              
              if (endIndex > startIndex) {
                setConnectionLogs(prevLogs => [...history.slice(startIndex, endIndex), ...prevLogs]);
              }
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
  }, [loading, logs.length, connectionLogs.length, pageSize, activeTab]);

  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleClearLogs = async () => {
    try {
      // 只处理日志清除，移除连接相关清除逻辑
      await window.electron.logs.clear();
      setLogs([]);
      setVisibleLogs([]);
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  };

  return (
    <div className="activity-container">
      <LogHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filter={filter}
        setFilter={setFilter}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        onClear={handleClearLogs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRetry={retryConnectionMonitoring}
        isRetrying={isRetrying}
        shouldShowRetry={shouldMonitorConnections()}
      />
      <div className="log-container" ref={logContainerRef}>
        {activeTab === 'connections' && <ConnectionHeader />}
        {loading && <div className="loading-logs">加载日志中...</div>}
        {visibleLogs.length === 0 && !loading ? (
          <div className="no-logs">
            {activeTab === 'connections' ? 'No active connections' : 'No log recording'}
          </div>
        ) : (
          visibleLogs.map((log, index) => (
            activeTab === 'logs' ?
              <LogItem key={`${log?.timestamp}-${index}`} log={log} index={index} /> :
              <ConnectionLogItem key={`${log?.timestamp || log?.lastUpdate}-${index}`} log={log} index={index} />
          ))
        )}
      </div>
    </div>
  );
};

export default Activity; 