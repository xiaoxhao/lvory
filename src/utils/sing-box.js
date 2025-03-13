/**
 * sing-box 执行工具模块
 * 封装所有与sing-box内核相关的操作
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const systemProxy = require('./system-proxy');
const logger = require('./logger');

class SingBox {
  constructor() {
    this.binPath = '';
    this.initialized = false;
    this.processHandlers = new Map(); // 存储运行中的进程及其处理程序
    this.outputCallback = null;
    this.exitCallback = null;
    this.proxyConfig = {
      host: '127.0.0.1',
      port: 7890,
      enableSystemProxy: true
    };
  }

  /**
   * 初始化sing-box模块
   * @param {Object} options 初始化选项
   * @returns {Boolean} 是否已安装
   */
  init(options = {}) {
    if (this.initialized) return this.checkInstalled();
    
    const appPath = app ? app.getAppPath() : options.appPath || '';
    this.binPath = path.join(appPath, 'bin', 'sing-box.exe');
    
    // 合并代理配置
    if (options.proxyConfig) {
      this.proxyConfig = { ...this.proxyConfig, ...options.proxyConfig };
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

  /**
   * 解析配置文件并提取代理端口
   * @param {String} configPath 配置文件路径
   * @returns {Object} 解析结果，包含端口信息
   */
  parseConfigFile(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        logger.error(`[SingBox] 配置文件不存在: ${configPath}`);
        return null;
      }

      // 读取配置文件
      const configContent = fs.readFileSync(configPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContent);
      } catch (e) {
        logger.error(`[SingBox] 解析配置文件失败: ${e.message}`);
        return null;
      }

      // 提取代理端口信息
      const result = {
        port: this.proxyConfig.port // 默认端口
      };

      // 查找HTTP/SOCKS入站
      if (config.inbounds && Array.isArray(config.inbounds)) {
        logger.info(`[SingBox] 配置文件包含 ${config.inbounds.length} 个入站配置`);
        
        for (const inbound of config.inbounds) {
          logger.info(`[SingBox] 检查入站: 类型=${inbound.type}, 端口=${inbound.listen_port}`);
          
          // 优先查找http入站端口
          if (inbound.type === 'http' || inbound.type === 'mixed') {
            if (inbound.listen_port) {
              result.port = inbound.listen_port;
              logger.info(`[SingBox] 从配置文件解析到HTTP代理端口: ${result.port}`);
              break;
            }
          }
        }

        // 如果没有找到http入站，尝试查找socks入站
        if (result.port === this.proxyConfig.port) {
          for (const inbound of config.inbounds) {
            if (inbound.type === 'socks' || inbound.type === 'mixed') {
              if (inbound.listen_port) {
                result.port = inbound.listen_port;
                logger.info(`[SingBox] 从配置文件解析到SOCKS代理端口: ${result.port}`);
                break;
              }
            }
          }
        }
      } else {
        logger.warn(`[SingBox] 配置文件中没有找到入站配置`);
      }

      return result;
    } catch (error) {
      logger.error(`[SingBox] 解析配置文件出错: ${error.message}`);
      return null;
    }
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
   * 运行sing-box服务
   * @param {String} configPath 配置文件路径
   * @param {Function} outputCallback 输出回调函数
   * @param {Function} exitCallback 退出回调函数
   * @returns {Promise<Object>} 运行结果
   */
  async run(configPath, outputCallback, exitCallback) {
    try {
      logger.info(`运行sing-box核心，配置文件: ${configPath}`);
      
      if (!this.checkInstalled()) {
        const errorMsg = 'sing-box核心尚未安装，请先安装核心';
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // 检查配置文件是否存在
      if (!fs.existsSync(configPath)) {
        const errorMsg = `配置文件不存在: ${configPath}`;
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // 解析配置文件并更新代理端口
      const configInfo = this.parseConfigFile(configPath);
      if (configInfo && configInfo.port) {
        logger.info(`从配置文件解析到代理端口: ${configInfo.port}`);
        this.proxyConfig.port = configInfo.port;
      } else {
        logger.warn(`未能从配置文件解析到代理端口，使用默认端口: ${this.proxyConfig.port}`);
      }
      
      // 创建命令行参数
      const args = ['run', '--config', configPath, '--disable-color'];
      logger.info(`执行命令: ${this.binPath} ${args.join(' ')}`);
      
      // 启动进程
      this.process = spawn(this.binPath, args);
      this.pid = this.process.pid;
      this.configPath = configPath;
      
      // 确保将进程添加到processHandlers
      if (this.pid) {
        this.processHandlers.set(this.pid, this.process);
        logger.info(`sing-box进程已添加到处理器列表，PID: ${this.pid}`);
      }
      
      logger.info(`sing-box进程已启动，PID: ${this.pid}`);
      
      // 添加输出处理
      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        // 通过日志系统记录SingBox输出
        logger.singbox(output);
        // 回调函数传递输出
        if (outputCallback && typeof outputCallback === 'function') {
          outputCallback(output);
        }
      });
      
      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        // 分析输出内容来决定日志类型
        // sing-box的大多数输出都以时间戳+INFO开头，即使从stderr输出
        if (output.includes('ERROR') || output.includes('error') || output.includes('Error')) {
          // 真正的错误日志
          logger.error(`SingBox错误: ${output}`);
        } else {
          // 普通日志
          logger.singbox(output);
        }
        
        // 回调函数传递输出
        if (outputCallback && typeof outputCallback === 'function') {
          outputCallback(output);
        }
      });
      
      // 添加退出处理
      this.process.on('exit', (code) => {
        const exitInfo = `sing-box进程已退出，退出码: ${code}`;
        logger.info(exitInfo);
        
        // 清理状态
        this.cleanupProcess();
        
        // 回调函数传递退出事件
        if (exitCallback && typeof exitCallback === 'function') {
          exitCallback(code);
        }
      });
      
      this.process.on('error', (error) => {
        const errorMsg = `sing-box进程出错: ${error.message}`;
        logger.error(errorMsg);
        
        // 清理状态
        this.cleanupProcess();
        
        // 回调函数传递错误事件
        if (exitCallback && typeof exitCallback === 'function') {
          exitCallback(-1, error.message);
        }
      });
      
      return {
        success: true,
        pid: this.pid
      };
    } catch (error) {
      const errorMsg = `启动sing-box核心失败: ${error.message}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 停止运行的sing-box服务
   * @param {Number} pid 进程ID，如果不提供则停止所有进程
   * @returns {Object} 停止结果
   */
  stop(pid) {
    try {
      if (pid && this.processHandlers.has(pid)) {
        // 停止指定进程
        const process = this.processHandlers.get(pid);
        process.kill();
        this.processHandlers.delete(pid);
        logger.info(`[SingBox] 已停止进程: ${pid}`);
        return { success: true };
      } else if (!pid) {
        // 停止所有进程
        let count = 0;
        for (const [pid, process] of this.processHandlers.entries()) {
          try {
            process.kill();
            this.processHandlers.delete(pid);
            count++;
          } catch (e) {
            logger.error(`[SingBox] 停止进程 ${pid} 失败: ${e.message}`);
          }
        }
        logger.info(`[SingBox] 已停止 ${count} 个进程`);
        return { success: true, count };
      }
      
      return { success: false, error: '没有找到指定的进程' };
    } catch (error) {
      logger.error(`[SingBox] 停止服务时发生异常: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 启动内核服务
   * @param {Object} options 启动选项
   * @param {string} options.configPath 配置文件路径
   * @param {Object} options.proxyConfig 代理配置
   * @param {boolean} options.enableSystemProxy 是否启用系统代理
   * @returns {Promise<Object>} 启动结果
   */
  async startCore(options = {}) {
    try {
      logger.info('启动sing-box核心服务');
      
      // 检查是否安装
      if (!this.checkInstalled()) {
        const errorMsg = 'sing-box未安装，请先安装核心';
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // 解析选项
      const { configPath, proxyConfig, enableSystemProxy = false } = options;
      
      // 检查配置文件
      if (!configPath || !fs.existsSync(configPath)) {
        const errorMsg = `配置文件不存在: ${configPath || '未指定'}`;
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // 停止可能正在运行的进程
      await this.stopCore();
      
      // 如果传递了代理配置，更新代理设置
      if (proxyConfig) {
        this.setProxyConfig(proxyConfig);
      }
      
      // 从配置文件解析端口配置
      const configInfo = this.parseConfigFile(configPath);
      if (configInfo && configInfo.port) {
        logger.info(`从配置文件解析到代理端口: ${configInfo.port}`);
        // 只更新端口，保持其他代理设置不变
        this.proxyConfig.port = configInfo.port;
      }
      
      logger.info(`启动核心，配置文件: ${configPath}, 代理端口: ${this.proxyConfig.port}`);
      
      // 定义输出回调和退出回调
      const outputCallback = (data) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('singbox-output', data);
        }
      };
      
      const exitCallback = (code, error) => {
        logger.info(`sing-box进程退出，退出码: ${code}${error ? ', 错误: ' + error : ''}`);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('singbox-exit', { code, error });
        }
        
        // 如果启用了系统代理，尝试恢复
        if (this.proxyConfig.enableSystemProxy) {
          this.disableSystemProxy().catch(err => {
            logger.error(`恢复系统代理失败: ${err.message}`);
          });
        }
      };
      
      // 启动核心
      const result = await this.run(configPath, outputCallback, exitCallback);
      
      if (result.success) {
        logger.info(`sing-box核心启动成功，PID: ${result.pid}`);
        
        // 记录状态
        this.status = {
          isRunning: true,
          configPath: configPath,
          startTime: new Date().toISOString(),
          systemProxyEnabled: enableSystemProxy,
          proxyPort: this.proxyConfig.port,
          pid: result.pid
        };
        
        // 如果需要启用系统代理
        if (enableSystemProxy) {
          await this.enableSystemProxy();
        }
        
        return {
          success: true,
          status: this.status
        };
      } else {
        logger.error(`sing-box核心启动失败: ${result.error}`);
        return result;
      }
    } catch (error) {
      const errorMsg = `启动sing-box核心服务失败: ${error.message}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }
  
  /**
   * 停止内核服务
   * @returns {Object} 停止结果
   */
  async stopCore() {
    try {
      logger.info('[SingBox] 停止内核');
      
      // 先禁用系统代理，再停止服务
      await this.disableSystemProxy();
      
      return this.stop();
    } catch (error) {
      logger.error(`[SingBox] 停止内核时发生异常: ${error.message}`);
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
      const proxyServer = `${host}:${port}`;
      logger.info(`[SingBox] 启用系统代理: ${proxyServer}`);
      
      const result = await systemProxy.enableProxy(proxyServer);
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
      
      const result = await systemProxy.disableProxy();
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
   * 获取内核运行状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    try {
      const isRunning = this.processHandlers.size > 0;
      const runningPids = Array.from(this.processHandlers.keys());
      
      let processDetails = [];
      if (isRunning) {
        // 收集每个进程的基本信息
        for (const pid of runningPids) {
          processDetails.push({
            pid,
            uptime: this.processHandlers.has(pid) ? '运行中' : '未知'
          });
        }
      }
      
      return {
        success: true,
        isRunning,
        processCount: this.processHandlers.size,
        processes: runningPids,
        processDetails: processDetails,
        lastCheckedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`[SingBox] 获取状态时发生异常: ${error.message}`);
      return { success: false, error: error.message };
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
        
        // 设置超时
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            try {
              childProcess.kill();
            } catch (e) {}
            reject(new Error(`命令执行超时(${timeout}ms)`));
          }, timeout);
        }
        
        // 处理标准输出
        childProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
        });
        
        // 处理错误输出
        childProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
        });
        
        // 处理错误
        childProcess.on('error', (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        });
        
        // 处理进程结束
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

  // 清理进程相关的状态
  cleanupProcess() {
    if (this.process) {
      try {
        // 尝试终止进程（如果仍在运行）
        this.process.kill();
      } catch (e) {
        logger.error(`尝试终止进程失败: ${e.message}`);
      }
    }
    
    // 从processHandlers中移除
    if (this.pid && this.processHandlers.has(this.pid)) {
      this.processHandlers.delete(this.pid);
    }
    
    // 更新状态
    this.process = null;
    this.pid = null;
    this.configPath = null;
    
    // 更新状态对象
    if (this.status) {
      this.status.isRunning = false;
    }
    
    logger.info('进程状态已清理');
  }

  /**
   * 设置主窗口，用于日志传递
   * @param {BrowserWindow} window - Electron的主窗口对象
   */
  setMainWindow(window) {
    this.mainWindow = window;
    logger.info('SingBox模块已连接到主窗口');
  }
}

// 导出单例
module.exports = new SingBox(); 