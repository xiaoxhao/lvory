const fetch = require('node-fetch');
const logger = require('../../utils/logger');
const nodeHistoryManager = require('./node-history-manager');
const settingsManager = require('../settings-manager');

class NodeConnectionMonitor {
  constructor() {
    this.isRunning = false;
    this.monitorInterval = null;
    this.apiAddress = '127.0.0.1:9090';
    this.nodeTrafficData = new Map(); // 用于跟踪节点流量变化
  }

  // 设置API地址
  setApiAddress(address) {
    if (address && address !== this.apiAddress) {
      this.apiAddress = address;
      logger.info(`节点监控API地址已更新为: ${address}`);
      
      // 如果监控已在运行，重启它以使用新地址
      if (this.isRunning) {
        this.stopMonitoring();
        this.startMonitoring();
      }
    }
  }

  // 开始监控节点连接
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 每30秒获取一次连接数据
    this.monitorInterval = setInterval(() => {
      this.fetchNodeConnections();
    }, 30000);
    
    // 立即执行一次
    this.fetchNodeConnections();
    
    logger.info('节点连接监控已启动');
  }

  // 停止监控
  stopMonitoring() {
    if (!this.isRunning) return;
    
    clearInterval(this.monitorInterval);
    this.monitorInterval = null;
    this.isRunning = false;
    
    logger.info('节点连接监控已停止');
  }

  // 获取节点连接数据
  async fetchNodeConnections() {
    try {
      // 检查是否启用节点历史数据功能
      const settings = settingsManager.getSettings();
      if (!settings.keepNodeTrafficHistory) {
        return;
      }
      
      const response = await fetch(`http://${this.apiAddress}/connections`);
      const data = await response.json();
      
      if (data && Array.isArray(data.connections)) {
        // 创建节点流量映射 (outbound -> 流量数据)
        const nodeTraffic = new Map();
        
        // 处理连接数据
        data.connections.forEach(conn => {
          const outbound = conn.chains ? conn.chains[conn.chains.length - 1] : 'direct';
          
          // 跳过非出站节点流量
          if (!outbound || outbound === 'direct') return;
          
          // 汇总节点流量
          if (nodeTraffic.has(outbound)) {
            const current = nodeTraffic.get(outbound);
            current.upload += conn.upload || 0;
            current.download += conn.download || 0;
            current.total = current.upload + current.download;
          } else {
            nodeTraffic.set(outbound, {
              upload: conn.upload || 0,
              download: conn.download || 0,
              total: (conn.upload || 0) + (conn.download || 0)
            });
          }
        });
        
        // 更新到历史数据管理器
        for (const [nodeTag, trafficData] of nodeTraffic.entries()) {
          // 只保存有流量变化的节点数据
          const previousData = this.nodeTrafficData.get(nodeTag) || { upload: 0, download: 0, total: 0 };
          
          const uploadDiff = trafficData.upload - previousData.upload;
          const downloadDiff = trafficData.download - previousData.download;
          
          if (uploadDiff > 0 || downloadDiff > 0) {
            // 保存流量增量
            nodeHistoryManager.updateNodeTraffic(nodeTag, {
              upload: uploadDiff,
              download: downloadDiff
            });
            
            // 更新内部跟踪数据
            this.nodeTrafficData.set(nodeTag, trafficData);
          }
        }
      }
    } catch (error) {
      logger.error('获取节点连接数据失败:', error);
    }
  }

  // 重置流量计数器
  resetTrafficCounters() {
    this.nodeTrafficData.clear();
    logger.info('节点流量计数器已重置');
  }
}

// 创建单例实例
const nodeConnectionMonitor = new NodeConnectionMonitor();
module.exports = nodeConnectionMonitor; 