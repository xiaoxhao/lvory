import React, { useState, useEffect } from 'react';
import '../assets/css/servicenodes.css';

const ServiceNodes = () => {
  const [nodes, setNodes] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [apiAddress, setApiAddress] = useState('127.0.0.1:9090');

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
          }
        } catch (error) {
          console.error('获取设置失败:', error);
        }
      }
    };

    if (window.electron) {
      window.electron.onProfileData(handleProfileData);
      window.electron.getProfileData().then((data) => {
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
    }

    return () => {
      if (window.electron && window.electron.removeProfileData) {
        window.electron.removeProfileData(handleProfileData);
      }
    };
  }, []);

  const testNode = async (node) => {
    try {
      const response = await fetch(`http://${apiAddress}/proxies/${encodeURIComponent(node.tag || node.name)}/delay?timeout=5000&url=http://www.gstatic.com/generate_204`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return data.delay;
    } catch (error) {
      console.error(`测试节点 ${node.tag || node.name} 失败:`, error);
      return 'timeout';
    }
  };

  const handleTestAll = async () => {
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

  return (
    <div className="service-nodes">
      <div className="nodes-header">
        <h3>服务节点</h3>
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
      </div>
      
      <div className="nodes-grid">
        {nodes.map((node) => {
          const nodeKey = node.tag || node.name;
          return (
            <div key={nodeKey} className="node-card">
              <div className="node-name">{nodeKey}</div>
              <div className="node-type">{node.type}</div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceNodes; 