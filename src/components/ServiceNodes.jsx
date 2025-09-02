import React, { useState, useEffect } from 'react';
import '../assets/css/servicenodes.css';
import { formatBytes } from '../utils/formatters';
import { testNodeLatency, isKernelRunning } from '../utils/speed-test-utils';

const ServiceNodes = () => {
  const [nodes, setNodes] = useState([]);
  const [ruleSets, setRuleSets] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [apiAddress, setApiAddress] = useState('127.0.0.1:9090');
  const [selectedTab, setSelectedTab] = useState('nodes'); // 'nodes' 或 'rules'
  const [totalTraffic, setTotalTraffic] = useState({}); // 存储节点累计流量数据
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(false); // 是否启用历史数据功能

  useEffect(() => {
    const handleProfileData = (event, data) => {
      if (Array.isArray(data)) {
        setNodes(data);
        setTestResults({});
      }
    };

    const loadSettings = async () => {
      if (window.electron && window.electron.getSettings) {
        try {
          const result = await window.electron.getSettings();
          if (result.success) {
            setApiAddress(result.settings.apiAddress || '127.0.0.1:9090');
            setIsHistoryEnabled(result.settings.keepNodeTrafficHistory || false);
          }
        } catch (error) {
          console.error('获取设置失败:', error);
        }
      }
    };

    const loadRuleSets = async () => {
      if (window.electron && window.electron.getUserConfig) {
        try {
          // 获取当前配置文件
          const configResult = await window.electron.getUserConfig();
          if (configResult.success && configResult.config) {
            // 使用引擎解析配置
            const engine = window.electron.engine || window.electron.profileEngine;
            if (engine && engine.getValueByPath) {
              // 获取route.rule_set数据
              const ruleSetData = engine.getValueByPath(configResult.config, 'route.rule_set');
              if (Array.isArray(ruleSetData)) {
                setRuleSets(ruleSetData);
              }
            } else {
              // 如果没有引擎，尝试通过IPC调用获取
              const ruleSetResult = await window.electron.getRuleSets();
              if (ruleSetResult.success && Array.isArray(ruleSetResult.ruleSets)) {
                setRuleSets(ruleSetResult.ruleSets);
              }
            }
          }
        } catch (error) {
          console.error('获取规则集失败:', error);
        }
      }
    };

    // 加载节点累计流量数据
    const loadTotalTraffic = async () => {
      if (window.electron) {
        try {
          // 检查是否启用历史数据功能
          const historyEnabled = await window.electron.isNodeHistoryEnabled();
          if (historyEnabled && historyEnabled.success && historyEnabled.enabled) {
            const result = await window.electron.getAllNodesTotalTraffic();
            if (result && result.success && result.trafficData) {
              setTotalTraffic(result.trafficData);
            }
          }
        } catch (error) {
          console.error('加载节点累计流量数据失败:', error);
        }
      }
    };

        let removeProfileListener = null;
    
    if (window.electron) {
      removeProfileListener = window.electron.profiles.onData(handleProfileData);
    window.electron.profiles.getData().then((data) => {
        if (data && data.success && Array.isArray(data.profiles)) {
          setNodes(data.profiles);
          setTestResults({});
        } else if (Array.isArray(data)) {
          setNodes(data);
          setTestResults({});
        }
      });
      
      // 加载API地址设置
      loadSettings();
      
      // 加载规则集数据
      loadRuleSets();
      
      // 加载节点累计流量数据
      loadTotalTraffic();
    }

          return () => {
        if (removeProfileListener) {
          removeProfileListener();
        }
      };
  }, []);

  const testNode = async (node) => {
    return await testNodeLatency(apiAddress, node);
  };

  const handleTestAll = async () => {
    // 检查内核是否运行
    try {
      const kernelRunning = await isKernelRunning();
      if (!kernelRunning) {
        console.log('内核未运行，不执行节点测速');
        return;
      }
    } catch (error) {
      console.error('获取内核状态失败:', error);
      return;
    }
    
    setIsTesting(true);
    setTestResults({});
    
    const results = {};
    for (const node of nodes) {
      const nodeKey = node.tag || node.name;
      const delay = await testNode(node);
      results[nodeKey] = delay;
      setTestResults(prev => ({...prev, [nodeKey]: delay}));
    }
    
    setIsTesting(false);
  };

  // 获取规则集类型的颜色
  const getRuleSetTypeColor = (type) => {
    switch (type) {
      case 'remote':
        return '#9254de'; // 紫色
      case 'local':
        return '#52c41a'; // 绿色
      case 'source':
        return '#1890ff'; // 蓝色
      case 'binary':
        return '#fa8c16'; // 橙色
      default:
        return '#8c8c8c'; // 灰色
    }
  };

  const formatTraffic = (bytes) => formatBytes(bytes);

  // 渲染节点卡片
  const renderNodes = () => (
    <div className="nodes-grid">
      {nodes.map((node) => {
        const nodeKey = node.tag || node.name;
        const nodeTraffic = totalTraffic[nodeKey] || { upload: 0, download: 0, total: 0 };
        
        return (
          <div key={nodeKey} className="node-card">
            <div className="node-name">{nodeKey}</div>
            <div className="node-type">{node.type}</div>
            <div className="node-stats">
              <div className="node-delay">
                {testResults[nodeKey] !== undefined ? (
                  testResults[nodeKey] === 'timeout' ? (
                    <span className="timeout">超时</span>
                  ) : (
                    <span>{testResults[nodeKey]}ms</span>
                  )
                ) : (
                  <span>-</span>
                )}
              </div>
              {isHistoryEnabled && (
                <div className="node-traffic">
                  <div className="traffic-item">
                    <span className="traffic-label">↑:</span>
                    <span className="traffic-value">{formatTraffic(nodeTraffic.upload)}</span>
                  </div>
                  <div className="traffic-item">
                    <span className="traffic-label">↓:</span>
                    <span className="traffic-value">{formatTraffic(nodeTraffic.download)}</span>
                  </div>
                  <div className="traffic-item total">
                    <span className="traffic-label">Total:</span>
                    <span className="traffic-value">{formatTraffic(nodeTraffic.total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 渲染规则集卡片
  const renderRuleSets = () => (
    <div className="nodes-grid">
      {ruleSets.length > 0 ? (
        ruleSets.map((ruleSet, index) => (
          <div key={index} className="node-card rule-set-card">
            <div className="rule-tag">
              <span
                className="rule-type-indicator"
                style={{ backgroundColor: getRuleSetTypeColor(ruleSet.format || ruleSet.type) }}
              ></span>
              <span className="rule-name">{ruleSet.tag}</span>
            </div>
            <div className="rule-info">
              <div className="rule-type">{ruleSet.format || ruleSet.type}</div>
              {ruleSet.url && (
                <div className="rule-url" title={ruleSet.url}>
                  {ruleSet.url.length > 40 ? ruleSet.url.substring(0, 37) + '...' : ruleSet.url}
                </div>
              )}
              {ruleSet.update_interval && (
                <div className="rule-update">更新间隔: {ruleSet.update_interval}</div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-rules">
          <p>没有发现规则集</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="service-nodes">
      <div className="nodes-header">
        <div className="tabs">
          <div 
            className={`tab ${selectedTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setSelectedTab('nodes')}
          >
            服务节点
          </div>
          <div 
            className={`tab ${selectedTab === 'rules' ? 'active' : ''}`}
            onClick={() => setSelectedTab('rules')}
          >
            规则集合
          </div>
        </div>
        
        {selectedTab === 'nodes' && (
          <div className="speed-test-icon" onClick={isTesting ? null : handleTestAll}>
            <svg 
              className={isTesting ? "spinning" : ""} 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" 
                fill="currentColor"
              />
              <path 
                d="M16.9 7.1C16.5 6.7 15.8 6.7 15.4 7.1L11 11.5L8.6 9.1C8.2 8.7 7.5 8.7 7.1 9.1C6.7 9.5 6.7 10.2 7.1 10.6L10.3 13.8C10.7 14.2 11.3 14.2 11.7 13.8L16.9 8.6C17.3 8.2 17.3 7.5 16.9 7.1Z" 
                fill="currentColor"
              />
              <path 
                d="M12 6V8" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <path 
                d="M18 12H16" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <path 
                d="M12 18V16" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <path 
                d="M8 12H6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
            {isTesting && <span className="testing-tooltip">测速中...</span>}
          </div>
        )}
      </div>
      
      {selectedTab === 'nodes' ? renderNodes() : renderRuleSets()}
    </div>
  );
};

export default ServiceNodes; 