/**
 * sing-box 主控制器
 * 整合各个子模块，提供统一的接口
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const systemProxy = require('./system-proxy');
const logger = require('./logger');
const { getAppDataDir, getBinDir } = require('./paths');
const eventBus = require('./event-bus');

// 导入子模块
const StateManager = require('./sing-box/state-manager');
const ConfigParser = require('./sing-box/config-parser');
const PlatformLauncher = require('./sing-box/platform-launcher');
const ProcessManager = require('./sing-box/process-manager');

class SingBox {
  constructor() {
    this.binPath = '';
    this.appDataDir = '';
    this.initialized = false;
    this.outputCallback = null;
    this.exitCallback = null;
    this.statusCallback = null;
    this.mainWindow = null;
    
    // 初始化子模块
    this.stateManager = new StateManager();
    this.configParser = new ConfigParser();
    this.platformLauncher = new PlatformLauncher();
    this.processManager = new ProcessManager();
    
    // 设置默认代理配置
    this.proxyConfig = {
      host: '127.0.0.1',
      port: 7890,
      enableSystemProxy: true
    };
    
    // 设置进程管理器的回调
    this.processManager.setElevatedProcessCheckCallback(this.checkElevatedProcessRunning.bind(this));
    this.processManager.setGracefulStopCallback(this.gracefulStopProcess.bind(this));
    
    // 监听连接重试失败事件
    eventBus.onStateChange('connection-retry-failed', () => {
      this.recordConnectionRetry();
    });
  }

  /**
   * 初始化sing-box模块
   * @param {Object} options 初始化选项
   * @returns {Boolean} 是否已安装
   */
  init(options = {}) {
    if (this.initialized) return this.checkInstalled();
    
    this.appDataDir = getAppDataDir();
    const binDir = getBinDir();
    
    if (process.platform === 'win32') {
      this.binPath = path.join(binDir, 'sing-box.exe');
    } else {
      this.binPath = path.join(binDir, 'sing-box');
    }
    
    if (options.proxyConfig) {
      this.setProxyConfig(options.proxyConfig);
    }
    
    logger.info(`[SingBox] 初始化，可执行文件路径: ${this.binPath}`);
    this.initialized = true;
    
    return this.checkInstalled();
  }

  /**
   * 设置代理配置
   * @param {Object} config 代理配置
   */
  setProxyConfig(config) {
    if (config) {
      this.proxyConfig = { ...this.proxyConfig, ...config };
    }
  }

  /**
   * 检查sing-box是否已安装
   * @returns {Boolean} 是否已安装
   */
  checkInstalled() {
    try {
      const exists = fs.existsSync(this.binPath);
      logger.info(`[SingBox] 检查安装状态: ${exists ? '已安装' : '未安装'}`);
      return exists;
    } catch (error) {
      logger.error(`[SingBox] 检查安装状态失败: ${error.message}`);
      return false;
    }
  }

  // 状态管理方法代理
  addStateListener(listener) {
    return this.stateManager.addStateListener(listener);
  }

  removeStateListener(listener) {
    return this.stateManager.removeStateListener(listener);
  }

  getGlobalState() {
    return this.stateManager.getGlobalState();
  }

  resetConnectionMonitor() {
    const result = this.stateManager.resetConnectionMonitor();
    eventBus.emitStateChange('connection-monitor-reset');
    return result;
  }

  enableConnectionMonitor() {
    const result = this.stateManager.enableConnectionMonitor();
    eventBus.emitStateChange('connection-monitor-enabled');
    return result;
  }

  disableConnectionMonitor() {
    const result = this.stateManager.disableConnectionMonitor();
    eventBus.emitStateChange('connection-monitor-disabled');
    return result;
  }

  recordConnectionRetry() {
    const result = this.stateManager.recordConnectionRetry();
    eventBus.emitStateChange('connection-retry-recorded');
    return result;
  }

  // 配置解析方法代理
  parseConfigFile(configPath) {
    return this.configParser.parseConfigFile(configPath);
  }

  /**
   * 获取sing-box版本信息
   * @returns {Promise<Object>} 版本信息
   */
  async getVersion() {
    if (!this.checkInstalled()) {
      return { success: false, error: 'sing-box未安装' };
    }
    
    try {
      logger.info('[SingBox] 开始获取版本信息');
      const result = await this.execute(['version']);
      
      if (result.success) {
        const versionMatch = result.stdout.match(/sing-box version ([0-9]+\.[0-9]+\.[0-9]+)/i);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        logger.info(`[SingBox] 成功获取版本: ${version}`);
        return { 
          success: true, 
          version, 
          fullOutput: result.stdout.trim() 
        };
      } else {
        logger.error(`[SingBox] 获取版本失败: ${result.stderr}`);
        return { 
          success: false, 
          error: result.stderr || '执行版本命令失败',
          exitCode: result.code 
        };
      }
    } catch (error) {
      logger.error(`[SingBox] 获取版本时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查配置文件
   * @param {String} configPath 配置文件路径
   * @returns {Promise<Object>} 检查结果
   */
  async checkConfig(configPath) {
    if (!this.checkInstalled()) {
      return { success: false, error: 'sing-box未安装' };
    }
    
    try {
      logger.info(`[SingBox] 检查配置: ${configPath}`);
      return await this.execute(['check', '-c', configPath]);
    } catch (error) {
      logger.error(`[SingBox] 检查配置时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 格式化配置文件
   * @param {String} configPath 配置文件路径
   * @returns {Promise<Object>} 格式化结果
   */
  async formatConfig(configPath) {
    if (!this.checkInstalled()) {
      return { success: false, error: 'sing-box未安装' };
    }
    
    try {
      logger.info(`[SingBox] 格式化配置: ${configPath}`);
      return await this.execute(['format', '-c', configPath]);
    } catch (error) {
      logger.error(`[SingBox] 格式化配置时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 运行sing-box核心
   * @param {String} configPath 配置文件路径
   * @param {Function} outputCallback 输出回调
   * @param {Function} exitCallback 退出回调
   * @param {Boolean} tunMode 是否启用TUN模式
   * @returns {Promise<Object>} 运行结果
   */
  async run(configPath, outputCallback, exitCallback, tunMode = false) {
    try {
      logger.info(`[SingBox] 运行sing-box核心，配置文件: ${configPath}${tunMode ? ' (TUN模式)' : ''}`);
      
      if (!this.checkInstalled()) {
        const errorMsg = 'sing-box核心尚未安装，请先安装核心';
        logger.error(`[SingBox] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
      
      if (!fs.existsSync(configPath)) {
        const errorMsg = `配置文件不存在: ${configPath}`;
        logger.error(`[SingBox] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
      
      // 代理端口由上层统一管理，这里不再重复解析
      logger.info(`[SingBox] 使用代理端口: ${this.proxyConfig.port}`);
      
      // 构建启动参数
      const args = ['run', '-c', configPath];
      logger.info(`[SingBox] 执行命令: ${this.binPath} ${args.join(' ')}`);
      
      // 使用平台启动器启动进程
      const startResult = await this.platformLauncher.start(this.binPath, args, {
        tunMode,
        workingDir: this.appDataDir
      });
      
      // 处理 Windows TUN 模式的特殊返回
      if (tunMode && process.platform === 'win32') {
        if (startResult.success) {
          this.processManager.startElevatedProcessMonitoring(
            configPath, 
            startResult.logFile, 
            outputCallback, 
            exitCallback
          );
        }
        return startResult;
      }
      
      // 处理普通进程
      const child = startResult;
      const pid = child.pid;
      
      this.processManager.addProcessHandler(pid, {
        childProcess: child,
        configPath: configPath,
        outputCallback: outputCallback,
        exitCallback: exitCallback,
        tunMode: tunMode,
        logFilePath: this.platformLauncher.getTempLogPath()
      });
      
      this.setupProcessHandlers(child, outputCallback, exitCallback);
      
      return {
        success: true,
        pid: pid,
        logFile: this.processManager.process?.logFilePath
      };
    } catch (error) {
      const errorMsg = `启动sing-box核心失败: ${error.message}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 解析sing-box日志级别
   * @param {String} logLine 日志行
   * @returns {String} 日志级别
   */
  parseLogLevel(logLine) {    
    // 移除ANSI颜色代码
    const cleanLine = logLine.replace(/\x1b\[[0-9;]*m/g, '');
    
    // 匹配日志级别
    if (cleanLine.includes('FATAL') || cleanLine.includes('PANIC')) {
      return 'FATAL';
    } else if (cleanLine.includes('ERROR')) {
      return 'ERROR';
    } else if (cleanLine.includes('WARN')) {
      return 'WARN';
    } else if (cleanLine.includes('INFO')) {
      return 'INFO';
    } else if (cleanLine.includes('DEBUG')) {
      return 'DEBUG';
    } else if (cleanLine.includes('TRACE')) {
      return 'TRACE';
    }
    
    // 如果无法识别日志级别，但包含常见的错误关键词，则认为是错误
    const errorKeywords = ['error', 'failed', 'failure', 'exception', 'fatal'];
    const lowerLine = cleanLine.toLowerCase();
    for (const keyword of errorKeywords) {
      if (lowerLine.includes(keyword)) {
        return 'ERROR';
      }
    }
    
    // 默认返回INFO级别
    return 'INFO';
  }

  /**
   * 设置进程事件处理器
   * @param {Object} child 子进程
   * @param {Function} outputCallback 输出回调
   * @param {Function} exitCallback 退出回调
   */
  setupProcessHandlers(child, outputCallback, exitCallback) {
    let startupErrorBuffer = '';
    let startupOutputBuffer = '';
    let startupPhase = true;
    
    // 监听标准输出
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const output = data.toString();
        logger.singbox(output.trim());
        
        if (startupPhase) {
          startupOutputBuffer += output;
        }
        
        if (outputCallback && typeof outputCallback === 'function') {
          outputCallback(output);
        }
      });
    }
    
    // 监听标准错误输出
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const output = data.toString();
        const trimmedOutput = output.trim();
        
        const logLevel = this.parseLogLevel(trimmedOutput);
        
        // 根据日志级别决定如何记录
        if (logLevel === 'ERROR' || logLevel === 'FATAL' || logLevel === 'PANIC') {
          logger.error(`[SingBox] ${trimmedOutput}`);
          
          if (startupPhase) {
            startupErrorBuffer += output;
          }
          
          if (outputCallback && typeof outputCallback === 'function') {
            outputCallback(`[ERROR] ${output}`);
          }
        } else if (logLevel === 'WARN') {
          logger.warn(`[SingBox] ${trimmedOutput}`);
          
          if (outputCallback && typeof outputCallback === 'function') {
            outputCallback(`[WARN] ${output}`);
          }
        } else {
          // INFO, DEBUG, TRACE 或无法识别的日志级别
          logger.singbox(trimmedOutput);
          
          if (outputCallback && typeof outputCallback === 'function') {
            outputCallback(output);
          }
        }
      });
    }
    
    // 设置启动阶段超时
    const startupTimeout = setTimeout(() => {
      startupPhase = false;
      if (startupErrorBuffer.trim()) {
        logger.error(`[SingBox] 启动阶段检测到错误: ${startupErrorBuffer.trim()}`);
      }
      if (startupOutputBuffer.trim()) {
        logger.info(`[SingBox] 启动阶段输出: ${startupOutputBuffer.trim()}`);
      }
    }, 3000);
    
    child.on('exit', (code) => {
      clearTimeout(startupTimeout);
      logger.info(`sing-box进程已退出，退出码: ${code}`);
      
      if (startupPhase && startupErrorBuffer.trim()) {
        logger.error(`[SingBox] 启动失败，错误信息: ${startupErrorBuffer.trim()}`);
        this.stateManager.updateGlobalState({
          lastError: `启动失败: ${startupErrorBuffer.trim()}`
        });
      }
      
      this.processManager.cleanupProcess();
      if (exitCallback && typeof exitCallback === 'function') {
        exitCallback(code, startupPhase && startupErrorBuffer.trim() ? startupErrorBuffer.trim() : null);
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(startupTimeout);
      logger.error(`sing-box进程出错: ${error.message}`);
      this.processManager.cleanupProcess();
      if (exitCallback && typeof exitCallback === 'function') {
        exitCallback(-1, error.message);
      }
    });
  }

  /**
   * 检查管理员权限进程是否运行中
   * @returns {Promise<boolean>} 是否运行中
   */
  async checkElevatedProcessRunning() {
    try {
      return await this.platformLauncher.checkProcessRunning();
    } catch (error) {
      logger.error(`[SingBox] 检查管理员权限进程状态失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 优雅停止进程
   * @returns {Promise<boolean>} 是否成功停止
   */
  async gracefulStopProcess() {
    try {
      return await this.platformLauncher.gracefulStop();
    } catch (error) {
      logger.error(`[SingBox] 优雅停止进程失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查停止进程的权限
   * @returns {Promise<Object>} 权限检查结果
   */
  async checkStopPermission() {
    try {
      return await this.processManager.checkStopPermission();
    } catch (error) {
      logger.error(`[SingBox] 检查停止权限失败: ${error.message}`);
      return {
        hasPermission: false,
        requiresElevation: true,
        message: `权限检查失败: ${error.message}`
      };
    }
  }

  /**
   * 启动内核服务
   * @param {Object} options 启动选项
   * @returns {Promise<Object>} 启动结果
   */
  async startCore(options = {}) {
    try {
      if (this.processManager.processHandlers.size > 0) {
        logger.info('[SingBox] 启动前停止现有进程');
        await this.stopCore();
      }
      
      const configPath = options.configPath;
      if (!configPath) {
        this.stateManager.updateGlobalState({ 
          lastError: '没有指定配置文件',
          isRunning: false 
        });
        return { success: false, error: '没有指定配置文件' };
      }
      
      if (!fs.existsSync(configPath)) {
        const error = `配置文件不存在: ${configPath}`;
        this.stateManager.updateGlobalState({ 
          lastError: error,
          isRunning: false 
        });
        return { success: false, error };
      }
      
      // 使用传入的代理配置
      if (options.proxyConfig) {
        this.proxyConfig = { ...this.proxyConfig, ...options.proxyConfig };
        logger.info(`[SingBox] 使用代理配置: ${JSON.stringify(this.proxyConfig)}`);
      }
      
      logger.info(`[SingBox] 启动sing-box，配置文件: ${configPath}, 代理端口: ${this.proxyConfig.port}`);
      
      this.stateManager.updateGlobalState({
        isRunning: false,
        isInitialized: true,
        lastError: null,
        startTime: Date.now()
      });
      
      const outputCallback = (data) => {
        if (this.outputCallback) this.outputCallback(data);
      };
      
      const exitCallback = (code, error) => {
        logger.info(`[SingBox] 进程退出，退出码: ${code}${error ? ', 错误: ' + error : ''}`);
        
        let finalError = error;
        if (!finalError && code !== 0) {
          finalError = this.stateManager.getGlobalState().lastError || `进程异常退出，退出码: ${code}`;
        }
        
        this.stateManager.updateGlobalState({
          isRunning: false,
          lastError: finalError
        });
        
        this.processManager.processHandlers.clear();
        this.processManager.process = null;
        
        this.stateManager.notifyStateListeners({
          type: 'core-stopped',
          exitCode: code,
          error: finalError,
          message: '内核服务已停止'
        });
        
        // 通过事件总线发送状态变化
        eventBus.emitStateChange('core-stopped', {
          exitCode: code,
          error: finalError
        });
        
        this.disableSystemProxy().catch(err => {
          logger.error('[SingBox] 禁用系统代理失败:', err);
        });
        
        this.disableConnectionMonitor();
        this.triggerStatusCallback(false);
        
        if (this.exitCallback) this.exitCallback({ code, error: finalError });
      };
      
      const result = await this.run(configPath, outputCallback, exitCallback, options.tunMode);
      
      if (result.success) {
        logger.info('[SingBox] 启动成功');
        
        if (this.processManager.process) {
          this.processManager.process.configPath = configPath;
        }
        
        this.stateManager.updateGlobalState({
          isRunning: true,
          lastError: null
        });
        
        this.stateManager.notifyStateListeners({
          type: 'core-started',
          configPath: configPath,
          proxyPort: this.proxyConfig.port,
          message: '内核服务已启动'
        });
        
        // 通过事件总线发送状态变化
        eventBus.emitStateChange('core-started', {
          configPath: configPath,
          proxyPort: this.proxyConfig.port
        });
        
        if (this.proxyConfig.enableSystemProxy) {
          logger.info(`[SingBox] 正在设置系统代理: ${this.proxyConfig.host}:${this.proxyConfig.port}`);
          await this.enableSystemProxy();
        } else {
          logger.info('[SingBox] 未启用系统代理');
        }
        
        // 延迟触发状态回调，确保进程真正稳定运行
        setTimeout(() => {
          if (this.isRunning()) {
            logger.info('[SingBox] 进程确认稳定运行，触发状态回调');
            this.triggerStatusCallback(true);
          } else {
            logger.warn('[SingBox] 进程启动后检查发现未运行');
          }
        }, 2000);
      } else {
        this.stateManager.updateGlobalState({
          isRunning: false,
          lastError: result.error || '启动失败'
        });
        
        this.stateManager.notifyStateListeners({
          type: 'core-start-failed',
          error: result.error,
          message: '内核服务启动失败'
        });
      }
      
      return result;
    } catch (error) {
      const errorMsg = `启动sing-box核心服务失败: ${error.message}`;
      logger.error(errorMsg);
      
      this.stateManager.updateGlobalState({
        isRunning: false,
        lastError: errorMsg
      });
      
      this.stateManager.notifyStateListeners({
        type: 'core-start-error',
        error: errorMsg,
        message: '启动过程中发生异常'
      });
      
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 停止内核服务
   * @returns {Promise<Boolean>} 成功返回true，失败返回false
   */
  async stopCore() {
    try {
      logger.info('[SingBox] 开始停止内核服务');
      
      this.stateManager.notifyStateListeners({
        type: 'core-stopping',
        message: '正在停止内核服务'
      });
      
      // 通过事件总线发送状态变化
      eventBus.emitStateChange('core-stopping');
      
      this.disableConnectionMonitor();
      
      try {
        await this.stateManager.saveState();
        logger.info('[SingBox] 已保存停止状态');
      } catch (err) {
        logger.error('[SingBox] 保存停止状态失败:', err);
      }
      
      if (this.proxyConfig.enableSystemProxy) {
        logger.info('[SingBox] 禁用系统代理');
        await this.disableSystemProxy();
      }
      
      if (this.processManager.elevatedProcess && this.processManager.elevatedProcess.isMonitoring) {
        logger.info('[SingBox] 检测到管理员权限进程，检查停止权限');
        
        // 首先检查权限
        const permissionCheck = await this.checkStopPermission();
        
        if (!permissionCheck.hasPermission && permissionCheck.requiresElevation) {
          logger.warn('[SingBox] 停止管理员权限进程需要提升权限');
          
          // 通知状态监听器权限不足
          this.stateManager.notifyStateListeners({
            type: 'stop-permission-required',
            message: '停止内核需要管理员权限',
            details: permissionCheck.message
          });
        }
        
        const elevatedStopped = await this.processManager.stopElevatedProcess(
          () => this.platformLauncher.stopProcess()
        );
        
        if (!elevatedStopped) {
          logger.warn('[SingBox] 停止管理员权限进程失败，可能需要手动干预');
          
          // 通知用户可能需要手动停止
          this.stateManager.notifyStateListeners({
            type: 'stop-manual-required',
            message: '自动停止失败，请手动停止内核进程或重启应用',
            permission: permissionCheck
          });
        }
      }
      
      this.processManager.cleanupAllProcesses();
      
      this.stateManager.updateGlobalState({
        isRunning: false,
        lastError: null
      });
      
      this.stateManager.notifyStateListeners({
        type: 'core-stopped',
        exitCode: 0,
        message: '内核服务已完全停止'
      });
      
      this.triggerStatusCallback(false);
      
      return { success: true, message: '已停止所有sing-box进程' };
    } catch (error) {
      logger.error('[SingBox] 停止进程失败:', error);
      
      this.stateManager.updateGlobalState({
        lastError: error.message
      });
      
      this.stateManager.notifyStateListeners({
        type: 'core-stop-error',
        error: error.message,
        message: '停止内核服务时发生错误'
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 启用系统代理
   * @returns {Promise<Boolean>} 是否成功
   */
  async enableSystemProxy() {
    try {
      const { host, port } = this.proxyConfig;
      logger.info(`[SingBox] 启用系统代理: ${host}:${port}`);
      
      const result = await systemProxy.setGlobalProxy({ host, port });
      if (result) {
        logger.info('[SingBox] 系统代理已启用');
      } else {
        logger.error('[SingBox] 系统代理启用失败');
      }
      
      return result;
    } catch (error) {
      logger.error(`[SingBox] 启用系统代理时发生异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 禁用系统代理
   * @returns {Promise<Boolean>} 是否成功
   */
  async disableSystemProxy() {
    try {
      logger.info('[SingBox] 禁用系统代理');
      
      const result = await systemProxy.removeGlobalProxy();
      if (result) {
        logger.info('[SingBox] 系统代理已禁用');
      } else {
        logger.error('[SingBox] 系统代理禁用失败');
      }
      
      return result;
    } catch (error) {
      logger.error(`[SingBox] 禁用系统代理时发生异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查sing-box是否正在运行
   * @returns {Boolean} 是否正在运行
   */
  isRunning() {
    return this.processManager.getRunningStatus().isRunning;
  }

  /**
   * 获取内核运行状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    try {
      const status = this.processManager.getRunningStatus();
      return {
        success: true,
        ...status,
        lastCheckedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`[SingBox] 获取状态时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取详细的内核运行状态（包括监控信息）
   * @returns {Object} 详细状态信息
   */
  getDetailedStatus() {
    try {
      const detailedStatus = this.processManager.getDetailedStatus();
      return {
        success: true,
        ...detailedStatus,
        lastCheckedAt: new Date().toISOString(),
        proxyConfig: this.proxyConfig,
        globalState: this.stateManager.getGlobalState()
      };
    } catch (error) {
      logger.error(`[SingBox] 获取详细状态时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 设置状态变化回调
   * @param {Function} callback 状态变化回调
   */
  setStatusCallback(callback) {
    this.statusCallback = callback;
  }

  /**
   * 触发状态变化回调
   * @param {Boolean} isRunning 是否正在运行
   */
  triggerStatusCallback(isRunning) {
    logger.info(`[SingBox] 触发状态回调: isRunning=${isRunning}, 回调函数存在: ${!!this.statusCallback}`);
    if (this.statusCallback && typeof this.statusCallback === 'function') {
      try {
        this.statusCallback(isRunning);
        logger.info(`[SingBox] 状态回调执行成功`);
      } catch (error) {
        logger.error(`[SingBox] 状态回调执行失败: ${error.message}`);
      }
    } else {
      logger.warn(`[SingBox] 状态回调未设置或不是函数`);
    }
  }

  /**
   * 设置输出回调
   * @param {Function} callback 回调函数
   */
  setOutputCallback(callback) {
    this.outputCallback = callback;
  }

  /**
   * 设置退出回调
   * @param {Function} callback 回调函数
   */
  setExitCallback(callback) {
    this.exitCallback = callback;
  }

  /**
   * 设置主窗口
   * @param {BrowserWindow} window Electron的主窗口对象
   */
  setMainWindow(window) {
    this.mainWindow = window;
    logger.info('SingBox模块已连接到主窗口');
  }

  /**
   * 执行sing-box命令
   * @param {Array} args 命令参数
   * @param {Number} timeout 超时时间(毫秒)
   * @returns {Promise<Object>} 执行结果
   */
  execute(args, timeout = 10000) {
    return new Promise((resolve, reject) => {
      logger.info(`[SingBox] 执行命令: ${this.binPath} ${args.join(' ')}`);
      
      try {
        const childProcess = spawn(this.binPath, args, {
          cwd: path.dirname(this.binPath),
          windowsHide: true
        });
        
        let stdout = '';
        let stderr = '';
        let timeoutId = null;
        
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            try {
              childProcess.kill();
            } catch (e) {}
            reject(new Error(`命令执行超时(${timeout}ms)`));
          }, timeout);
        }
        
        childProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
        });
        
        childProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
        });
        
        childProcess.on('error', (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        });
        
        childProcess.on('close', (code) => {
          if (timeoutId) clearTimeout(timeoutId);
          
          if (code === 0) {
            resolve({ success: true, stdout, stderr, code });
          } else {
            resolve({ success: false, code, stdout, stderr });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 状态持久化方法
  async saveState() {
    const additionalState = {
      isRunning: this.isRunning(),
      configPath: this.processManager.process?.configPath,
      proxyConfig: this.proxyConfig
    };
    return await this.stateManager.saveState(additionalState);
  }

  async loadState() {
    return await this.stateManager.loadState();
  }

  /**
   * 下载内核
   * @returns {Promise<Object>} 下载结果
   */
  async downloadCore() {
    try {
      const coreDownloader = require('../main/core-downloader');
      const utils = require('../main/ipc-handlers/utils');
      const mainWindow = utils.getMainWindow();

      logger.info('[SingBox] 开始下载内核');
      const result = await coreDownloader.downloadCore(mainWindow);

      if (result.success) {
        logger.info('[SingBox] 内核下载成功');
      } else {
        logger.error('[SingBox] 内核下载失败:', result.error);
      }

      return result;
    } catch (error) {
      logger.error('[SingBox] 下载内核时发生异常:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SingBox(); 