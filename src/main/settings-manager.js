const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getAppDataDir, generateDefaultLogPath } = require('../utils/paths');
const nodeHistoryManager = require('./data-managers/node-history-manager');
const ConfigParser = require('../utils/sing-box/config-parser');

class SettingsManager {
  constructor() {
    this.settings = {
      proxyPort: '7890',
      apiAddress: '127.0.0.1:9090',
      allowLan: false,

      autoStart: false,
      checkUpdateOnBoot: true,
      tunMode: false,
      
      // 日志设置
      logLevel: 'info',
      logOutput: '',
      logDisabled: false,
      logTimestamp: true,
      
      // Nodes 相关设置
      nodeAdvancedMonitoring: false,
      nodeExitStatusMonitoring: false,
      nodeExitIPPurity: false,
      keepNodeTrafficHistory: false,
      
      // 多云互联设置
      cloudInterconnection: false,
      backendAddress: '',
      
      // 高级设置
      kernelWatchdog: true,
      logRotationPeriod: 7,
      language: 'zh_CN'
    };
    
    this.configParser = new ConfigParser();
    this.cachedDefaultLogPath = null;
  }

  // 加载设置
  async loadSettings() {
    try {
      const appDataDir = getAppDataDir();
      const settingsPath = path.join(appDataDir, 'settings.json');
      
      if (!fs.existsSync(settingsPath)) {
        return this.settings;
      }
      
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const savedSettings = JSON.parse(settingsData);
      
      // 合并保存的设置和默认设置
      this.settings = {
        ...this.settings,
        ...savedSettings
      };
      
      // 同步开机自启动状态
      await this.syncAutoLaunch();
      
      // 同步节点历史数据设置
      nodeHistoryManager.setEnabled(this.settings.keepNodeTrafficHistory);
      
      logger.info('设置已加载');
      return this.settings;
    } catch (error) {
      logger.error('加载设置失败:', error);
      return this.settings;
    }
  }

  // 保存设置
  async saveSettings(settings) {
    try {
      const appDataDir = getAppDataDir();
      const settingsPath = path.join(appDataDir, 'settings.json');
      
      // 更新内存中的设置
      this.settings = {
        ...this.settings,
        ...settings
      };
      
      // 保存到文件
      fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
      
      // 如果设置中包含autoStart，同步开机自启动状态
      if ('autoStart' in settings) {
        await this.setAutoLaunch(settings.autoStart);
      }
      
      // 如果设置中包含keepNodeTrafficHistory，更新节点历史数据管理器的设置
      if ('keepNodeTrafficHistory' in settings) {
        nodeHistoryManager.setEnabled(settings.keepNodeTrafficHistory);
      }
      
      logger.info('设置已保存');
      return { success: true };
    } catch (error) {
      logger.error('保存设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取当前设置
  getSettings() {
    return this.settings;
  }

  /**
   * 从配置文件读取代理端口并更新设置
   * @param {String} configPath 配置文件路径
   * @returns {Number} 代理端口
   */
  updateProxyPortFromConfig(configPath) {
    try {
      if (!configPath || !fs.existsSync(configPath)) {
        logger.warn(`配置文件不存在，使用默认代理端口: ${this.settings.proxyPort}`);
        return parseInt(this.settings.proxyPort);
      }
      
      const configInfo = this.configParser.parseConfigFile(configPath);
      if (configInfo && configInfo.port) {
        const newPort = configInfo.port.toString();
        if (this.settings.proxyPort !== newPort) {
          logger.info(`从配置文件更新代理端口: ${this.settings.proxyPort} -> ${newPort}`);
          this.settings.proxyPort = newPort;
        }
        return configInfo.port;
      } else {
        logger.warn(`无法从配置文件解析代理端口，使用默认端口: ${this.settings.proxyPort}`);
        return parseInt(this.settings.proxyPort);
      }
    } catch (error) {
      logger.error(`从配置文件读取代理端口失败: ${error.message}`);
      return parseInt(this.settings.proxyPort);
    }
  }

  /**
   * 获取统一的代理配置对象
   * @param {String} configPath 配置文件路径（可选）
   * @returns {Object} 代理配置对象
   */
  getProxyConfig(configPath = null) {
    const port = configPath ? this.updateProxyPortFromConfig(configPath) : parseInt(this.settings.proxyPort);
    
    return {
      host: '127.0.0.1',
      port: port,
      enableSystemProxy: true
    };
  }

  /**
   * 获取或生成日志文件路径
   * @returns {String} 日志文件路径
   */
  getLogPath() {
    let logPath;
    
    if (!this.settings.logOutput || this.settings.logOutput.trim() === '') {
      // 如果用户没有指定日志路径，检查是否已有默认路径
      if (!this.cachedDefaultLogPath) {
        // 生成并缓存默认路径
        this.cachedDefaultLogPath = generateDefaultLogPath();
      }
      logPath = this.cachedDefaultLogPath;
    } else {
      logPath = this.settings.logOutput;
    }
    
    // 确保日志文件的目录存在
    try {
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (dirError) {
      logger.error(`设置管理器创建日志目录失败: ${dirError.message}`);
    }
    
    return logPath;
  }

  // 设置开机自启动
  async setAutoLaunch(enable) {
    try {
      if (enable) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: app.getPath('exe'),
          args: []
        });
      } else {
        app.setLoginItemSettings({
          openAtLogin: false
        });
      }
      
      // 更新内存中的设置
      this.settings.autoStart = enable;
      
      logger.info(`开机自启动已${enable ? '启用' : '禁用'}`);
      return { success: true };
    } catch (error) {
      logger.error('设置开机自启动失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取开机自启动状态
  async getAutoLaunch() {
    try {
      const loginSettings = app.getLoginItemSettings();
      return { success: true, enabled: loginSettings.openAtLogin };
    } catch (error) {
      logger.error('获取开机自启动状态失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 同步开机自启动状态
  async syncAutoLaunch() {
    try {
      const loginSettings = app.getLoginItemSettings();
      const { openAtLogin } = loginSettings;
      this.settings.autoStart = openAtLogin;
      logger.info(`同步开机自启动状态: ${openAtLogin ? '已启用' : '未启用'}`);
    } catch (error) {
      logger.error('同步开机自启动状态失败:', error);
    }
  }
}

// 创建单例实例
const settingsManager = new SettingsManager();
module.exports = settingsManager; 