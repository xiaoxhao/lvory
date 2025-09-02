/**
 * 网络测速工具函数
 */

/**
 * 测试指定代理节点的延迟
 * @param {string} apiAddress - API地址
 * @param {Object} node - 节点对象
 * @param {string} node.tag - 节点标签
 * @param {string} node.name - 节点名称
 * @returns {Promise<number|string>} 延迟时间(ms)或'timeout'
 */
export const testNodeLatency = async (apiAddress, node) => {
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

/**
 * 测试整体网络连接的延迟
 * @returns {Promise<number>} 延迟时间(ms)
 */
export const testNetworkLatency = async () => {
  const startTime = new Date().getTime();
  
  try {
    // 使用fetch API发送请求到Google并测量响应时间
    await fetch('https://www.google.com/generate_204', {
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const endTime = new Date().getTime();
    return endTime - startTime;
  } catch (error) {
    console.error('网络延迟测试失败:', error);
    throw error;
  }
};

/**
 * 检查内核是否正在运行
 * @returns {Promise<boolean>} 内核是否正在运行
 */
export const isKernelRunning = async () => {
  if (window.electron && window.electron.singbox && window.electron.singbox.getStatus) {
    try {
      const status = await window.electron.singbox.getStatus();
      return status.isRunning;
    } catch (error) {
      console.error('获取内核状态失败:', error);
      return false;
    }
  }
  return true; // 如果没有内核状态检查功能，默认返回true
};