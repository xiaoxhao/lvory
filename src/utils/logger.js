/**
 * 日志管理工具
 * 用于收集和转发日志到Activity中
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

class Logger {
  constructor() {
    this.enabled = true;
    // 延迟加载 paths 模块，避免循环依赖
    this.logDir = null;
    this.logFile = null;
    this.mainWindow = null;
    
    this.logHistory = [];
    this.maxLogHistory = 1000; // 最大保存的日志条数
    
    // 用于异步批量写入日志的缓冲区
    this.logBuffer = [];
    this.bufferSize = 50; // 缓冲区达到这个大小时写入文件
    this.flushInterval = 2000; // 定时写入间隔 (ms)
    this.isWriting = false; // 写入状态锁
    
    // 延迟初始化日志系统
    setImmediate(() => {
      this.initializeLogSystem();
    });
  }
  
  /**
   * 初始化日志系统
   */
  initializeLogSystem() {
    try {
      const { getLogDir } = require('./paths');
      this.logDir = getLogDir();
      this.logFile = path.join(this.logDir, `log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
      
      this.ensureLogDirectory();
      
      // 设置定时写入
      this.flushTimer = setInterval(() => this.flushLogBuffer(), this.flushInterval);
      
      // 日志系统初始化完成
    } catch (error) {
      console.error('日志系统初始化失败:', error.message);
    }
  }
  
  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    if (!this.logDir) return;
    
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        console.log(`创建日志目录: ${this.logDir}`);
      }
    } catch (error) {
      console.error(`创建日志目录失败: ${error.message}`);
    }
  }
  
  /**
   * 设置主窗口
   * @param {BrowserWindow} window Electron主窗口
   */
  setMainWindow(window) {
    this.mainWindow = window;
    this.info('主窗口已连接到日志系统');
  }
  
  /**
   * 记录日志并发送到Activity
   * @param {String} level 日志级别 (INFO, WARN, ERROR, DEBUG)
   * @param {String} type 日志类型 (SYSTEM, SINGBOX, NETWORK, etc.)
   * @param {String} message 日志消息
   * @param {Object} data 额外数据
   */
  log(level, type, message, data = {}) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      level,
      type,
      timestamp,
      message,
      data
    };

    // 只输出ERROR和WARN级别的日志到控制台
    if (level === 'ERROR' || level === 'WARN') {
      const timeStr = new Date().toLocaleTimeString();
      const prefix = `${timeStr}\n${level}\n🔹 ${type}`;
      console.log(`${prefix}\n${message}`);
      if (Object.keys(data).length > 0) {
        console.log('数据:', data);
      }
    }

    this.addToBuffer(logEntry);
    this.addToHistory(logEntry);
    this.sendToRenderer(logEntry);
  }
  
  /**
   * 添加日志到缓冲区
   * @param {Object} logEntry 日志条目
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // 如果缓冲区已满，立即写入文件
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogBuffer();
    }
  }
  
  /**
   * 将缓冲区中的日志写入文件
   */
  flushLogBuffer() {
    if (this.isWriting || this.logBuffer.length === 0 || !this.logFile) {
      return;
    }
    
    // 设置写入锁，防止并发写入
    this.isWriting = true;
    
    // 复制当前缓冲区并清空
    const currentBuffer = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const logLines = currentBuffer.map(entry => 
        `[${entry.timestamp}] [${entry.level}] [${entry.type}] ${entry.message}\n`
      ).join('');
      
      // 异步写入文件
      fs.appendFile(this.logFile, logLines, (err) => {
        if (err) {
          console.error(`写入日志文件失败: ${err.message}`);
          // 写入失败时，将日志追加回缓冲区前面
          this.logBuffer = [...currentBuffer, ...this.logBuffer];
        }
        this.isWriting = false;
      });
    } catch (error) {
      console.error(`处理日志缓冲区失败: ${error.message}`);
      // 处理失败时，将日志追加回缓冲区前面
      this.logBuffer = [...currentBuffer, ...this.logBuffer];
      this.isWriting = false;
    }
  }
  
  /**
   * 发送日志到渲染进程
   * @param {Object} logEntry 日志条目
   */
  sendToRenderer(logEntry) {
    if (this.mainWindow?.isDestroyed?.() === false) {
      this.mainWindow.webContents.send('activity-log', logEntry);
    }
  }
  
  /**
   * 记录信息日志
   * @param {String} message 日志消息
   * @param {String} type 日志类型
   * @param {Object} data 额外数据
   */
  info(message, type = 'SYSTEM', data = {}) {
    this.log('INFO', type, message, data);
  }
  
  /**
   * 记录警告日志
   * @param {String} message 日志消息
   * @param {String} type 日志类型
   * @param {Object} data 额外数据
   */
  warn(message, type = 'SYSTEM', data = {}) {
    this.log('WARN', type, message, data);
  }
  
  /**
   * 记录错误日志
   * @param {String} message 日志消息
   * @param {String} type 日志类型
   * @param {Object} data 额外数据
   */
  error(message, type = 'SYSTEM', data = {}) {
    this.log('ERROR', type, message, data);
  }
  
  /**
   * 记录调试日志
   * @param {String} message 日志消息
   * @param {String} type 日志类型
   * @param {Object} data 额外数据
   */
  debug(message, type = 'SYSTEM', data = {}) {
    this.log('DEBUG', type, message, data);
  }
  
  /**
   * 记录sing-box日志
   * @param {String} message 日志消息
   * @param {Object} data 额外数据
   */
  singbox(message, data = {}) {
    this.log('INFO', 'SINGBOX', message, data);
  }
  
  /**
   * 记录系统日志
   * @param {String} message 日志消息
   * @param {Object} data 额外数据
   */
  system(message, data = {}) {
    this.log('INFO', 'SYSTEM', message, data);
  }
  
  /**
   * 记录网络日志
   * @param {String} message 日志消息
   * @param {Object} data 额外数据
   */
  network(message, data = {}) {
    this.log('INFO', 'NETWORK', message, data);
  }
  
  /**
   * 添加日志到历史记录
   * @param {Object} logEntry - 日志条目
   */
  addToHistory(logEntry) {
    this.logHistory.push(logEntry);
    
    // 限制历史记录大小
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory.shift();
    }
  }
  
  /**
   * 获取日志历史
   * @returns {Array} 日志历史记录
   */
  getHistory() {
    return this.logHistory;
  }
  
  /**
   * 清除日志历史
   */
  clearHistory() {
    this.logHistory = [];
    return { success: true };
  }
  
  // 输出启动日志
  logStartup() {
    console.log('==================================================');
    console.log('  LVORY 应用程序启动');
    console.log('==================================================');
    console.log('  时间: ' + new Date().toLocaleString());
    console.log('  平台: ' + process.platform);
    console.log('  Node.js: ' + process.version);
    console.log('  Electron: ' + process.versions.electron);
    console.log('==================================================');
    
    // 初始化日志系统
  }
}

// 导出单例
module.exports = new Logger(); 