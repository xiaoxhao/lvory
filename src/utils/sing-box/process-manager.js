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
    this.statusCheckInterval = null; // 状态检查定时器
    this.lastStatusCheck = null; // 最后一次状态检查结果
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
    // 清理定时器
    this.clearAllTimers();
    
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
    this.elevatedProcess = null;
    
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
   * 清理所有定时器
   */
  clearAllTimers() {
    if (this.processCheckInterval) {
      clearInterval(this.processCheckInterval);
      this.processCheckInterval = null;
    }
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    if (this.logFileWatcher) {
      try {
        if (this.elevatedProcess?.logFilePath) {
          fs.unwatchFile(this.elevatedProcess.logFilePath);
        }
        this.logFileWatcher = null;
      } catch (error) {
        logger.warn(`[ProcessManager] 清理日志监控失败: ${error.message}`);
      }
    }
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
        const handler = this.processHandlers.get(pid);
        if (handler) {
          const uptime = Math.floor((Date.now() - handler.startTime.getTime()) / 1000);
          processDetails.push({
            pid,
            type: 'normal',
            uptime: `${uptime}秒`,
            configPath: handler.configPath,
            logFile: handler.logFilePath,
            tunMode: handler.tunMode
          });
        }
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
        logFile: this.elevatedProcess.logFilePath,
        tunMode: true,
        lastStatusCheck: this.lastStatusCheck
      });
    }
    
    return {
      isRunning,
      processCount: this.processHandlers.size + (hasElevatedProcess ? 1 : 0),
      processes: runningPids,
      processDetails: processDetails,
      hasElevatedProcess: hasElevatedProcess,
      lastStatusUpdate: new Date().toISOString()
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
      isMonitoring: true,
      lastHeartbeat: Date.now()
    };
    
    // 启动日志文件监控
    this.startLogFileMonitoring(logFilePath, outputCallback);
    
    // 启动进程存活检查
    this.startProcessAliveCheck(exitCallback);
    
    // 启动状态检查
    this.startStatusCheck();
    
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
      const maxWaitCount = 15; // 增加等待时间
      
      const waitForLogFile = () => {
        waitCount++;
        if (fs.existsSync(logFilePath)) {
          this.watchLogFile(logFilePath, outputCallback);
        } else if (waitCount < maxWaitCount && 
                  (this.elevatedProcess && this.elevatedProcess.isMonitoring || this.getRunningStatus().isRunning)) {
          setTimeout(waitForLogFile, 1000);
        } else if (waitCount >= maxWaitCount) {
          logger.warn(`[ProcessManager] 等待日志文件超时: ${logFilePath}`);
          // 即使日志文件不存在，也继续进行状态检查
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
          // 更新心跳时间
          if (this.elevatedProcess) {
            this.elevatedProcess.lastHeartbeat = Date.now();
          }
          
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
    this.processCheckInterval = setInterval(async () => {
      if (!this.elevatedProcess || !this.elevatedProcess.isMonitoring) {
        return;
      }
      
      try {
        // 执行进程检查
        const isRunning = await this.checkElevatedProcessCallback?.();
        
        if (!isRunning) {
          logger.warn('[ProcessManager] 检测到管理员权限进程已停止');
          this.handleElevatedProcessExit(exitCallback);
          return;
        }
        
        // 检查心跳超时（如果超过30秒没有日志输出，可能有问题）
        const now = Date.now();
        const timeSinceLastHeartbeat = now - (this.elevatedProcess.lastHeartbeat || now);
        
        if (timeSinceLastHeartbeat > 60000) { // 60秒超时
          logger.warn(`[ProcessManager] 管理员权限进程心跳超时: ${timeSinceLastHeartbeat}ms`);
          // 可以选择是否因为心跳超时而终止进程监控
          // this.handleElevatedProcessExit(exitCallback);
        }
        
      } catch (error) {
        logger.error(`[ProcessManager] 进程存活检查失败: ${error.message}`);
      }
    }, 3000); // 缩短检查间隔
    
    logger.info('[ProcessManager] 已启动进程存活检查');
  }

  /**
   * 启动状态检查
   */
  startStatusCheck() {
    this.statusCheckInterval = setInterval(async () => {
      if (!this.elevatedProcess || !this.elevatedProcess.isMonitoring) {
        return;
      }
      
      try {
        const isRunning = await this.checkElevatedProcessCallback?.();
        this.lastStatusCheck = {
          timestamp: new Date().toISOString(),
          isRunning: isRunning,
          processType: 'elevated'
        };
        
        logger.debug(`[ProcessManager] 状态检查: ${isRunning ? '运行中' : '已停止'}`);
      } catch (error) {
        this.lastStatusCheck = {
          timestamp: new Date().toISOString(),
          isRunning: false,
          error: error.message,
          processType: 'elevated'
        };
        logger.error(`[ProcessManager] 状态检查失败: ${error.message}`);
      }
    }, 5000);
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
    
    this.clearAllTimers();
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
      logger.info('[ProcessManager] 开始停止管理员权限进程');
      
      // 首先尝试常规停止方法
      let success = await stopProcessCallback();
      
      if (success) {
        // 等待进程完全停止
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 验证进程是否真的停止了
        let finalCheck = false;
        try {
          finalCheck = await this.checkElevatedProcessCallback?.() || false;
        } catch (e) {
          finalCheck = false;
        }
        
        if (!finalCheck) {
          this.handleElevatedProcessExit(this.elevatedProcess?.exitCallback);
          logger.info('[ProcessManager] 管理员权限进程已成功停止');
          return true;
        } else {
          logger.warn('[ProcessManager] 常规方法停止失败，进程仍在运行');
          success = false;
        }
      }
      
      if (!success) {
        // 如果常规方法失败，尝试优雅停止
        logger.info('[ProcessManager] 尝试优雅停止管理员权限进程');
        const gracefulSuccess = await this.tryGracefulStop();
        
        if (gracefulSuccess) {
          this.handleElevatedProcessExit(this.elevatedProcess?.exitCallback);
          logger.info('[ProcessManager] 优雅停止管理员权限进程成功');
          return true;
        } else {
          logger.warn('[ProcessManager] 优雅停止失败，可能需要用户干预');
          return false;
        }
      }
      
      return success;
    } catch (error) {
      logger.error(`[ProcessManager] 停止管理员权限进程失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 尝试优雅停止进程
   * @returns {Promise<boolean>} 是否成功
   */
  async tryGracefulStop() {
    try {
      // 这里需要依赖外部的平台启动器来执行优雅停止
      if (this.gracefulStopCallback) {
        return await this.gracefulStopCallback();
      } else {
        logger.warn('[ProcessManager] 没有设置优雅停止回调');
        return false;
      }
    } catch (error) {
      logger.error(`[ProcessManager] 优雅停止失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 设置优雅停止回调
   * @param {Function} callback 优雅停止回调函数
   */
  setGracefulStopCallback(callback) {
    this.gracefulStopCallback = callback;
  }

  /**
   * 检查是否有权限停止进程
   * @returns {Promise<Object>} 权限检查结果
   */
  async checkStopPermission() {
    try {
      if (!this.elevatedProcess || !this.elevatedProcess.isMonitoring) {
        return { hasPermission: true, requiresElevation: false };
      }
      
      // 检查当前是否有权限停止管理员权限进程
      const canStop = await this.checkElevatedProcessCallback?.();
      
      if (canStop) {
        // 尝试一个简单的停止测试（不实际停止）
        const testResult = await this.testStopPermission();
        return {
          hasPermission: testResult.success,
          requiresElevation: !testResult.success,
          message: testResult.message
        };
      } else {
        return {
          hasPermission: false,
          requiresElevation: false,
          message: '进程未运行'
        };
      }
    } catch (error) {
      logger.error(`[ProcessManager] 检查停止权限失败: ${error.message}`);
      return {
        hasPermission: false,
        requiresElevation: true,
        message: `权限检查失败: ${error.message}`
      };
    }
  }

  /**
   * 测试停止权限
   * @returns {Promise<Object>} 测试结果
   */
  async testStopPermission() {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      if (process.platform === 'win32') {
        // Windows: 尝试列出进程来测试权限
        await execPromise('tasklist /FI "IMAGENAME eq sing-box.exe" /FO CSV');
        return { success: true, message: '有权限访问进程列表' };
      } else {
        // macOS/Linux: 尝试发送测试信号
        await execPromise('pgrep -f sing-box');
        return { success: true, message: '有权限查看进程' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `权限测试失败: ${error.message}` 
      };
    }
  }

  /**
   * 获取详细的状态信息
   * @returns {Object} 详细状态信息
   */
  getDetailedStatus() {
    const basicStatus = this.getRunningStatus();
    
    return {
      ...basicStatus,
      monitoring: {
        hasLogFileWatcher: !!this.logFileWatcher,
        hasProcessCheck: !!this.processCheckInterval,
        hasStatusCheck: !!this.statusCheckInterval,
        lastStatusCheck: this.lastStatusCheck
      },
      elevatedProcess: this.elevatedProcess ? {
        configPath: this.elevatedProcess.configPath,
        logFilePath: this.elevatedProcess.logFilePath,
        startTime: this.elevatedProcess.startTime?.toISOString(),
        isMonitoring: this.elevatedProcess.isMonitoring,
        lastHeartbeat: this.elevatedProcess.lastHeartbeat ? new Date(this.elevatedProcess.lastHeartbeat).toISOString() : null,
        uptimeMs: this.elevatedProcess.startTime ? Date.now() - this.elevatedProcess.startTime.getTime() : 0
      } : null
    };
  }
}

module.exports = ProcessManager; 