import React, { useState } from 'react';

const useSpeedTest = (profileData, apiAddress) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});

  const handleSpeedTest = async () => {
    if (!profileData || profileData.length === 0 || isTesting) return;
    
    setIsTesting(true);
    setTestResults({});
    
    try {
      // 定义测试节点函数
      const testNode = async (node) => {
        try {
          const nodeKey = node.tag || node.name || 'unknown';
          console.log(`测试节点: ${nodeKey}`);
          
          // 使用RESTful API测试节点延迟
          const response = await fetch(`http://${apiAddress}/proxies/${encodeURIComponent(nodeKey)}/delay?timeout=5000&url=http://www.gstatic.com/generate_204`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            if (response.status === 408) {
              return 'timeout';
            }
            throw new Error(`HTTP错误: ${response.status}`);
          }
          
          const data = await response.json();
          return data.delay;
        } catch (error) {
          console.error(`测试节点失败:`, error);
          return 'timeout';
        }
      };
      
      if (window.electron && window.electron.testNodes) {
        try {
          const results = await window.electron.testNodes(profileData);
          setTestResults(results);
        } catch (error) {
          console.error('测速失败:', error);
          
          // 如果API调用失败，退回到手动测试每个节点
          for (const node of profileData) {
            const nodeKey = node.tag || node.name || 'unknown';
            const delay = await testNode(node);
            setTestResults(prev => ({...prev, [nodeKey]: delay}));
          }
        }
      } else {
        // 没有API接口，则手动测试每个节点
        for (const node of profileData) {
          const nodeKey = node.tag || node.name || 'unknown';
          const delay = await testNode(node);
          setTestResults(prev => ({...prev, [nodeKey]: delay}));
        }
      }
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isTesting,
    testResults,
    setTestResults,
    handleSpeedTest
  };
};

export default useSpeedTest;