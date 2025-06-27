/**
 * SingBox 进程管理模块
 * 负责管理进程生命周期、日志监控和进程清理
 */
const fs = require('fs');
const logger = require('../logger');

class ProcessManager {
  constructor() {
    this.processHandlers = new Map(); // 存储运行中的进程及其处理程序
    this.process = null; // 存储当前运行的进程
    this.elevatedProcess = null;
    this.logFileWatcher = null;
    this.processCheckInterval = null;
  }

  /**
   * 添加进程处理器
   * @param {Number} pid 进程ID
   * @param {Object} handler 进程处理器
   */
  addProcessHandler(pid, handler) {
    this.processHandlers.set(pid, {
      childProcess: handler.childProcess,
      configPath: handler.configPath,
      startTime: new Date(),
      outputCallbacks: handler.outputCallback ? [handler.outputCallback] : [],
      exitCallbacks: handler.exitCallback ? [handler.exitCallback] : [],
      tunMode: handler.tunMode || false,
      logFilePath: handler.logFilePath
    });
    
    this.process = {
      childProcess: handler.childProcess,
      pid: pid,
      configPath: handler.configPath,
      tunMode: handler.tunMode || false,
      logFilePath: handler.logFilePath
    };
    
    logger.info(`[ProcessManager] 添加进程处理器: PID ${pid}`);
  }

  /**
   * 移除进程处理器
   * @param {Number} pid 进程ID
   */
  removeProcessHandler(pid) {
    if (this.processHandlers.has(pid)) {
      this.processHandlers.delete(pid);
      logger.info(`[ProcessManager] 移除进程处理器: PID ${pid}`);
    }
    
    if (this.process && this.process.pid === pid) {
      this.process = null;
    }
  }

  /**
   * 清理所有进程
   */
  cleanupAllProcesses() {
    for (const [pid, handler] of this.processHandlers.entries()) {
      try {
        if (handler.childProcess) {
          handler.childProcess.kill();
        }
      } catch (e) {
        logger.error(`[ProcessManager] 终止进程 ${pid} 失败: ${e.message}`);
      }
    }
    
    this.processHandlers.clear();
    this.process = null;
    
    logger.info('[ProcessManager] 已清理所有进程');
  }

  /**
   * 清理当前进程
   */
  cleanupProcess() {
    if (this.process) {
      try {
        this.process.childProcess.kill();
      } catch (e) {
        logger.error(`[ProcessManager] 尝试终止进程失败: ${e.message}`);
      }
    }
    
    if (this.process && this.process.pid && this.processHandlers.has(this.process.pid)) {
      this.processHandlers.delete(this.process.pid);
    }
    
    this.process = null;
    
    logger.info('[ProcessManager] 进程状态已清理');
  }

  /**
   * 获取运行状态
   * @returns {Object} 运行状态信息
   */
  getRunningStatus() {
    const hasNormalProcess = this.processHandlers.size > 0;
    const hasElevatedProcess = this.elevatedProcess && this.elevatedProcess.isMonitoring;
    const isRunning = hasNormalProcess || hasElevatedProcess;
    
    const runningPids = Array.from(this.processHandlers.keys());
    
    let processDetails = [];
    
    if (hasNormalProcess) {
      for (const pid of runningPids) {
        processDetails.push({
          pid,
          type: 'normal',
          uptime: this.processHandlers.has(pid) ? '运行中' : '未知'
        });
      }
    }
    
    if (hasElevatedProcess) {
      const uptime = this.elevatedProcess.startTime 
        ? Math.floor((Date.now() - this.elevatedProcess.startTime.getTime()) / 1000) + '秒'
        : '未知';
      
      processDetails.push({
        pid: 'elevated',
        type: 'elevated',
        uptime: uptime,
        configPath: this.elevatedProcess.configPath,
        logFile: this.elevatedProcess.logFilePath
      });
    }
    
    return {
      isRunning,
      processCount: this.processHandlers.size + (hasElevatedProcess ? 1 : 0),
      processes: runningPids,
      processDetails: processDetails,
      hasElevatedProcess: hasElevatedProcess
    };
  }

  /**
   * 启动管理员权限进程监控
   * @param {string} configPath 配置文件路径
   * @param {string} logFilePath 日志文件路径
   * @param {Function} outputCallback 输出回调
   * @param {Function} exitCallback 退出回调
   */
  startElevatedProcessMonitoring(configPath, logFilePath, outputCallback, exitCallback) {
    this.elevatedProcess = {
      configPath: configPath,
      logFilePath: logFilePath,
      startTime: new Date(),
      outputCallback: outputCallback,
      exitCallback: exitCallback,
      isMonitoring: true
    };
    
    this.startLogFileMonitoring(logFilePath, outputCallback);
    this.startProcessAliveCheck(exitCallback);
    
    logger.info(`[ProcessManager] 已启动管理员权限进程监控，日志文件: ${logFilePath}`);
  }

  /**
   * 启动日志文件监控
   * @param {string} logFilePath 日志文件路径
   * @param {Function} outputCallback 输出回调
   */
  startLogFileMonitoring(logFilePath, outputCallback) {
    if (!fs.existsSync(logFilePath)) {
      let waitCount = 0;
      const maxWaitCount = 10;
      
      const waitForLogFile = () => {
        waitCount++;
        if (fs.existsSync(logFilePath)) {
          this.watchLogFile(logFilePath, outputCallback);
        } else if (waitCount < maxWaitCount && 
                  (this.elevatedProcess && this.elevatedProcess.isMonitoring || this.getRunningStatus().isRunning)) {
          setTimeout(waitForLogFile, 1000);
        } else if (waitCount >= maxWaitCount) {
          logger.warn(`[ProcessManager] 等待日志文件超时: ${logFilePath}`);
          if (this.elevatedProcess && this.elevatedProcess.isMonitoring) {
            this.startProcessAliveCheck(this.elevatedProcess.exitCallback);
          }
        }
      };
      setTimeout(waitForLogFile, 500);
    } else {
      this.watchLogFile(logFilePath, outputCallback);
    }
  }

  /**
   * 监控日志文件变化
   * @param {string} logFilePath 日志文件路径
   * @param {Function} outputCallback 输出回调
   */
  watchLogFile(logFilePath, outputCallback) {
    try {
      const { createReadStream } = require('fs');
      let lastPosition = 0;
      
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        lastPosition = stats.size;
      }
      
      this.logFileWatcher = fs.watchFile(logFilePath, { interval: 1000 }, (curr, prev) => {
        if (curr.size > lastPosition) {
          const stream = createReadStream(logFilePath, {
            start: lastPosition,
            end: curr.size - 1
          });
          
          let newContent = '';
          stream.on('data', (chunk) => {
            newContent += chunk.toString();
          });
          
          stream.on('end', () => {
            if (newContent.trim()) {
              const lines = newContent.trim().split('\n');
              lines.forEach(line => {
                if (line.trim()) {
                  logger.singbox(line);
                  
                  if (outputCallback && typeof outputCallback === 'function') {
                    outputCallback(line + '\n');
                  }
                }
              });
            }
            lastPosition = curr.size;
          });
          
          stream.on('error', (err) => {
            logger.error(`[ProcessManager] 读取日志文件失败: ${err.message}`);
          });
        }
      });
      
      logger.info(`[ProcessManager] 已启动日志文件监控: ${logFilePath}`);
    } catch (error) {
      logger.error(`[ProcessManager] 启动日志文件监控失败: ${error.message}`);
    }
  }

  /**
   * 启动进程存活检查
   * @param {Function} exitCallback 退出回调
   */
  startProcessAliveCheck(exitCallback) {
    // 这里需要依赖 PlatformLauncher 来检查进程
    // 暂时保留接口，具体实现在主模块中处理
    this.processCheckInterval = setInterval(() => {
      if (!this.elevatedProcess || !this.elevatedProcess.isMonitoring) {
        return;
      }
      
      // 这个方法需要在主模块中实现具体的进程检查逻辑
      this.checkElevatedProcessCallback && this.checkElevatedProcessCallback(exitCallback);
    }, 5000);
    
    logger.info('[ProcessManager] 已启动进程存活检查');
  }

  /**
   * 设置管理员权限进程检查回调
   * @param {Function} callback 检查回调函数
   */
  setElevatedProcessCheckCallback(callback) {
    this.checkElevatedProcessCallback = callback;
  }

  /**
   * 处理管理员权限进程退出
   * @param {Function} exitCallback 退出回调
   */
  handleElevatedProcessExit(exitCallback) {
    if (this.elevatedProcess) {
      this.elevatedProcess.isMonitoring = false;
    }
    
    if (this.logFileWatcher) {
      fs.unwatchFile(this.elevatedProcess?.logFilePath);
      this.logFileWatcher = null;
    }
    
    if (this.processCheckInterval) {
      clearInterval(this.processCheckInterval);
      this.processCheckInterval = null;
    }
    
    this.cleanupProcess();
    
    if (exitCallback && typeof exitCallback === 'function') {
      exitCallback(0);
    }
    
    logger.info('[ProcessManager] 管理员权限进程监控已清理');
  }

  /**
   * 停止管理员权限进程
   * @param {Function} stopProcessCallback 停止进程的回调函数
   * @returns {Promise<boolean>} 是否成功停止
   */
  async stopElevatedProcess(stopProcessCallback) {
    if (!stopProcessCallback) {
      logger.error('[ProcessManager] 缺少停止进程的回调函数');
      return false;
    }
    
    try {
      const success = await stopProcessCallback();
      
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.handleElevatedProcessExit(this.elevatedProcess?.exitCallback);
      }
      
      return success;
    } catch (error) {
      logger.error(`[ProcessManager] 停止管理员权限进程失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = ProcessManager; 