import React, { useState } from 'react';

const useSpeedTest = (profileData, apiAddress) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});

  const handleSpeedTest = async () => {
    if (!profileData || profileData.length === 0 || isTesting) return;
    
    // 检查内核是否运行
    if (window.electron && window.electron.singbox && window.electron.singbox.getStatus) {
      try {
        const status = await window.electron.singbox.getStatus();
        if (!status.isRunning) {
          console.log('内核未运行，不执行节点测速');
          return;
        }
      } catch (error) {
        console.error('获取内核状态失败:', error);
        return;
      }
    }
    
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
          
          const data = await response.json();
          
          if (!response.ok) {
            if (response.status === 408) {
              return 'timeout';
            }
            if (data && typeof data.delay === 'number') {
              return data.delay;
            }
            console.error(`HTTP错误: ${response.status}`);
            return 'timeout';
          }
          
          return typeof data.delay === 'number' ? data.delay : 'timeout';
        } catch (error) {
          console.error(`测试节点失败:`, error);
          return 'timeout';
        }
      };
      
      if (window.electron && window.electron.testNodes) {
        try {
          const results = await window.electron.testNodes(profileData);
          
          // 确保结果中的每个值都是数值类型
          const processedResults = {};
          for (const [key, value] of Object.entries(results)) {
            processedResults[key] = typeof value === 'number' ? value : 'timeout';
          }
          
          setTestResults(processedResults);
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