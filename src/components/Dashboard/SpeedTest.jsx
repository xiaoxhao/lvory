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

// 获取并发数量设置
const getConcurrentCount = async () => {
  try {
    if (window.electron?.userConfig?.get) {
      const result = await window.electron.userConfig.get();
      if (result?.success && result?.config?.settings) {
        const count = result.config.settings.concurrent_speed_test_count;
        // 确保数值在合理范围内，添加性能保护
        if (typeof count === 'number' && count >= 1 && count <= 10) {
          // 额外的性能保护：如果节点数量很少，限制并发数
          return count;
        }
      }
    }
  } catch (error) {
    console.error('读取并发数量设置失败，使用默认值:', error);
  }
  // 默认值
  return 5;
};

const getOptimalConcurrency = async (nodeCount) => {
  const configuredCount = await getConcurrentCount();

  if (nodeCount < configuredCount) {
    console.log(`节点数量(${nodeCount})少于配置的并发数(${configuredCount})，调整为${nodeCount}`);
    return nodeCount;
  }

  if (nodeCount > 50 && configuredCount > 8) {
    console.log(`节点数量较多(${nodeCount})，限制并发数为8以保护性能`);
    return 8;
  }

  return configuredCount;
};

// 并发控制函数 - 限制最大并发数
const runConcurrentTasks = async (tasks, maxConcurrency = 5) => {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
};



// 并发测试所有节点
const testAllNodesConcurrent = async (profileData, apiAddress, onProgress, onLoadingChange) => {
  const results = {};

  const maxConcurrency = await getOptimalConcurrency(profileData.length);
  console.log(`节点数量: ${profileData.length}, 使用并发数量: ${maxConcurrency}`);

  const loadingStates = {};
  profileData.forEach(node => {
    const nodeKey = node.tag || node.name || 'unknown';
    loadingStates[nodeKey] = true;
  });
  onLoadingChange(loadingStates);

  const testTasks = profileData.map(node => {
    return async () => {
      const nodeKey = node.tag || node.name || 'unknown';
      try {
        const delay = await testNode(node, apiAddress);
        results[nodeKey] = delay;

        if (onProgress) {
          onProgress({ [nodeKey]: delay });
        }
        if (onLoadingChange) {
          onLoadingChange(prev => ({ ...prev, [nodeKey]: false }));
        }

        return { nodeKey, delay };
      } catch (error) {
        console.error(`测试节点 ${nodeKey} 失败:`, error);
        results[nodeKey] = 'timeout';

        if (onProgress) {
          onProgress({ [nodeKey]: 'timeout' });
        }
        if (onLoadingChange) {
          onLoadingChange(prev => ({ ...prev, [nodeKey]: false }));
        }

        return { nodeKey, delay: 'timeout' };
      }
    };
  });

  // 并发执行测试任务，使用动态获取的并发数量
  await runConcurrentTasks(testTasks, maxConcurrency);

  return results;
};



const useSpeedTest = (profileData, apiAddress) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  const handleSpeedTest = async () => {
    if (!profileData?.length || isTesting) return;

    const isSingboxRunning = await checkSingboxStatus();
    if (!isSingboxRunning) {
      console.log('内核未运行，不执行节点测速');
      return;
    }

    setIsTesting(true);
    setTestResults({});
    setLoadingStates({});

    const onProgress = (partialResults) => {
      setTestResults(prev => ({ ...prev, ...partialResults }));
    };

    const onLoadingChange = (loadingUpdate) => {
      if (typeof loadingUpdate === 'function') {
        setLoadingStates(loadingUpdate);
      } else {
        setLoadingStates(prev => ({ ...prev, ...loadingUpdate }));
      }
    };

    try {
      const results = await testAllNodesConcurrent(profileData, apiAddress, onProgress, onLoadingChange);
      setTestResults(results);
    } catch (error) {
      console.error('并发测速失败:', error);
      // 清除所有加载状态
      setLoadingStates({});
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isTesting,
    testResults,
    loadingStates,
    setTestResults,
    handleSpeedTest
  };
};

export default useSpeedTest;