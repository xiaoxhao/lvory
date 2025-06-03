import React, { useState } from 'react';

// 检查内核状态
const checkSingboxStatus = async () => {
  if (!window.electron?.singbox?.getStatus) return true;
  
  try {
    const status = await window.electron.singbox.getStatus();
    return status.isRunning;
  } catch (error) {
    console.error('获取内核状态失败:', error);
    return false;
  }
};

// 测试单个节点
const testNode = async (node, apiAddress) => {
  try {
    const nodeKey = node.tag || node.name || 'unknown';
    console.log(`测试节点: ${nodeKey}`);
    
    const response = await fetch(`http://${apiAddress}/proxies/${encodeURIComponent(nodeKey)}/delay?timeout=5000&url=http://www.gstatic.com/generate_204`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 408) return 'timeout';
      if (typeof data?.delay === 'number') return data.delay;
      console.error(`HTTP错误: ${response.status}`);
      return 'timeout';
    }
    
    return typeof data.delay === 'number' ? data.delay : 'timeout';
  } catch (error) {
    console.error(`测试节点失败:`, error);
    return 'timeout';
  }
};

// 处理测试结果
const processTestResults = (results) => {
  const processedResults = {};
  for (const [key, value] of Object.entries(results)) {
    processedResults[key] = typeof value === 'number' ? value : 'timeout';
  }
  return processedResults;
};

// 手动测试所有节点
const testAllNodes = async (profileData, apiAddress, onProgress) => {
  const results = {};
  for (const node of profileData) {
    const nodeKey = node.tag || node.name || 'unknown';
    const delay = await testNode(node, apiAddress);
    results[nodeKey] = delay;
    if (onProgress) {
      onProgress({ [nodeKey]: delay });
    }
  }
  return results;
};

const useSpeedTest = (profileData, apiAddress) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});

  const handleSpeedTest = async () => {
    if (!profileData?.length || isTesting) return;
    
    const isSingboxRunning = await checkSingboxStatus();
    if (!isSingboxRunning) {
      console.log('内核未运行，不执行节点测速');
      return;
    }
    
    setIsTesting(true);
    setTestResults({});
    
    const onProgress = (partialResults) => {
      setTestResults(prev => ({ ...prev, ...partialResults }));
    };
    
    try {
      if (window.electron?.testNodes) {
        try {
          const results = await window.electron.testNodes(profileData);
          setTestResults(processTestResults(results));
        } catch (error) {
          console.error('测速失败:', error);
          const results = await testAllNodes(profileData, apiAddress, onProgress);
          setTestResults(results);
        }
      } else {
        const results = await testAllNodes(profileData, apiAddress, onProgress);
        setTestResults(results);
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