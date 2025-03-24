const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('../../utils/logger');
const { getAppDataDir } = require('../../utils/paths');

class NodeHistoryManager {
  constructor() {
    this.historyData = {}; // 内存中的历史数据缓存
    this.totalTrafficData = {}; // 节点累计流量数据
    this.storageDir = path.join(getAppDataDir(), 'node_history');
    this.totalTrafficPath = path.join(getAppDataDir(), 'node_total_traffic.json');
    this.isEnabled = false; // 是否启用历史数据存储
    this.dataRetentionDays = 30; // 数据保留天数，默认30天
    
    // 确保存储目录存在
    this.ensureStorageDirectory();
    
    // 加载累计流量数据
    this.loadTotalTrafficData();
  }

  // 确保存储目录存在
  ensureStorageDirectory() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
        logger.info('节点历史数据存储目录已创建');
      }
    } catch (error) {
      logger.error('创建节点历史数据存储目录失败:', error);
    }
  }

  // 设置是否启用历史数据存储
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`节点历史数据存储已${enabled ? '启用' : '禁用'}`);
    return { success: true };
  }

  // 获取是否启用历史数据存储
  isHistoryEnabled() {
    return this.isEnabled;
  }

  // 更新节点流量数据
  updateNodeTraffic(nodeTag, trafficData) {
    if (!this.isEnabled) return;

    try {
      // 获取当前日期作为键
      const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD
      
      // 初始化节点数据结构
      if (!this.historyData[nodeTag]) {
        this.historyData[nodeTag] = {};
      }
      
      // 初始化当天的数据
      if (!this.historyData[nodeTag][today]) {
        this.historyData[nodeTag][today] = {
          upload: 0,
          download: 0,
          total: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // 更新流量数据
      const nodeData = this.historyData[nodeTag][today];
      nodeData.upload += trafficData.upload || 0;
      nodeData.download += trafficData.download || 0;
      nodeData.total = nodeData.upload + nodeData.download;
      nodeData.lastUpdated = new Date().toISOString();
      
      // 更新累计流量数据
      if (!this.totalTrafficData[nodeTag]) {
        this.totalTrafficData[nodeTag] = {
          upload: 0,
          download: 0,
          total: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // 更新累计流量
      this.totalTrafficData[nodeTag].upload += trafficData.upload || 0;
      this.totalTrafficData[nodeTag].download += trafficData.download || 0;
      this.totalTrafficData[nodeTag].total = this.totalTrafficData[nodeTag].upload + this.totalTrafficData[nodeTag].download;
      this.totalTrafficData[nodeTag].lastUpdated = new Date().toISOString();
      
      // 定期保存到磁盘
      this.saveHistoryData();
      this.saveTotalTrafficData();
    } catch (error) {
      logger.error('更新节点流量历史数据失败:', error);
    }
  }

  // 获取指定节点的历史数据
  getNodeHistory(nodeTag) {
    try {
      // 尝试从内存缓存获取
      if (this.historyData[nodeTag]) {
        return { success: true, history: this.historyData[nodeTag] };
      }
      
      // 尝试从磁盘加载
      const filePath = path.join(this.storageDir, `${nodeTag}.json`);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const nodeHistory = JSON.parse(fileData);
        
        // 更新内存缓存
        this.historyData[nodeTag] = nodeHistory;
        
        return { success: true, history: nodeHistory };
      }
      
      return { success: false, message: 'No history data found for this node' };
    } catch (error) {
      logger.error('获取节点历史数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 保存历史数据到磁盘
  saveHistoryData() {
    try {
      // 确保存储目录存在
      this.ensureStorageDirectory();
      
      // 遍历所有节点数据并保存
      Object.keys(this.historyData).forEach(nodeTag => {
        const filePath = path.join(this.storageDir, `${nodeTag}.json`);
        fs.writeFileSync(filePath, JSON.stringify(this.historyData[nodeTag], null, 2));
      });
      
      logger.debug('节点历史数据已保存到磁盘');
    } catch (error) {
      logger.error('保存节点历史数据到磁盘失败:', error);
    }
  }

  // 清理过期数据
  cleanupExpiredData() {
    if (!this.isEnabled) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      
      let cleanupCount = 0;
      
      // 遍历所有节点数据
      Object.keys(this.historyData).forEach(nodeTag => {
        const nodeData = this.historyData[nodeTag];
        
        // 删除早于保留期限的数据
        Object.keys(nodeData).forEach(dateStr => {
          if (dateStr < cutoffDateStr) {
            delete nodeData[dateStr];
            cleanupCount++;
          }
        });
      });
      
      if (cleanupCount > 0) {
        logger.info(`已清理 ${cleanupCount} 条过期节点历史数据`);
        this.saveHistoryData();
      }
    } catch (error) {
      logger.error('清理过期节点历史数据失败:', error);
    }
  }

  // 加载所有节点历史数据
  loadAllHistoryData() {
    try {
      // 确保存储目录存在
      this.ensureStorageDirectory();
      
      // 读取目录中的所有文件
      const files = fs.readdirSync(this.storageDir);
      
      // 遍历所有JSON文件
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const nodeTag = path.basename(file, '.json');
          const filePath = path.join(this.storageDir, file);
          
          try {
            const fileData = fs.readFileSync(filePath, 'utf8');
            this.historyData[nodeTag] = JSON.parse(fileData);
          } catch (readError) {
            logger.error(`读取节点历史数据文件失败 ${file}:`, readError);
          }
        }
      });
      
      logger.info(`已加载 ${Object.keys(this.historyData).length} 个节点的历史数据`);
      
      // 清理过期数据
      this.cleanupExpiredData();
      
      // 加载累计流量数据
      this.loadTotalTrafficData();
      
      return { success: true };
    } catch (error) {
      logger.error('加载所有节点历史数据失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 获取节点累计流量
  getTotalTraffic(nodeTag) {
    try {
      if (this.totalTrafficData[nodeTag]) {
        return { success: true, traffic: this.totalTrafficData[nodeTag] };
      }
      
      return { success: false, message: 'No total traffic data found for this node' };
    } catch (error) {
      logger.error('获取节点累计流量失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 获取所有节点累计流量
  getAllTotalTraffic() {
    return { success: true, trafficData: this.totalTrafficData };
  }
  
  // 重置节点累计流量
  resetTotalTraffic(nodeTag) {
    try {
      if (nodeTag) {
        // 重置指定节点的累计流量
        if (this.totalTrafficData[nodeTag]) {
          this.totalTrafficData[nodeTag] = {
            upload: 0,
            download: 0,
            total: 0,
            lastUpdated: new Date().toISOString()
          };
        }
      } else {
        // 重置所有节点的累计流量
        this.totalTrafficData = {};
      }
      
      // 保存到文件
      this.saveTotalTrafficData();
      
      return { success: true };
    } catch (error) {
      logger.error('重置节点累计流量失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 加载累计流量数据
  loadTotalTrafficData() {
    try {
      if (fs.existsSync(this.totalTrafficPath)) {
        const data = fs.readFileSync(this.totalTrafficPath, 'utf8');
        this.totalTrafficData = JSON.parse(data);
        logger.info(`已加载 ${Object.keys(this.totalTrafficData).length} 个节点的累计流量数据`);
      } else {
        this.totalTrafficData = {};
      }
    } catch (error) {
      logger.error('加载累计流量数据失败:', error);
      this.totalTrafficData = {};
    }
  }
  
  // 保存累计流量数据
  saveTotalTrafficData() {
    try {
      fs.writeFileSync(this.totalTrafficPath, JSON.stringify(this.totalTrafficData, null, 2));
      logger.debug('节点累计流量数据已保存到磁盘');
    } catch (error) {
      logger.error('保存节点累计流量数据失败:', error);
    }
  }
}

// 创建单例实例
const nodeHistoryManager = new NodeHistoryManager();
module.exports = nodeHistoryManager; 