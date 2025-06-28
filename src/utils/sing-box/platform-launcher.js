/**
 * SingBox 跨平台启动器模块
 * 负责处理不同平台的启动逻辑，包括管理员权限启动
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../logger');

class PlatformLauncher {
  constructor() {
    this.platform = process.platform;
  }

  /**
   * 获取临时日志文件路径
   * @returns {String} 日志文件路径
   */
  getTempLogPath() {
    const { getLogDir } = require('../paths');
    const logDir = getLogDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    const logFileName = `sing-box-${timestamp}-${randomId}.log`;
    return path.join(logDir, logFileName);
  }

  /**
   * 写入临时日志文件
   * @param {String} logFilePath 日志文件路径
   * @param {String} content 内容
   */
  writeToTempLog(logFilePath, content) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${content}`;
      fs.appendFileSync(logFilePath, logEntry);
    } catch (error) {
      logger.warn(`[PlatformLauncher] 写入临时日志失败: ${error.message}`);
    }
  }

  /**
   * 普通模式启动
   * @param {String} binPath 可执行文件路径
   * @param {Array} args 启动参数
   * @param {String} workingDir 工作目录
   * @returns {Object} 子进程对象
   */
  startNormal(binPath, args, workingDir) {
    logger.info(`[PlatformLauncher] 普通模式启动: ${binPath} ${args.join(' ')}`);
    
    return spawn(binPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: workingDir
    });
  }

  /**
   * Windows 管理员模式启动
   * @param {String} binPath 可执行文件路径
   * @param {Array} args 启动参数
   * @param {String} logFilePath 日志文件路径
   * @returns {Promise<Object>} 启动结果
   */
  async startWindowsElevated(binPath, args, logFilePath) {
    const { exec } = require('child_process');
    
    // 将参数转义并构建命令
    const escapedArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes('"')) {
        return `"${arg.replace(/"/g, '""')}"`;
      }
      return arg;
    });
    
    const command = `powershell -Command "Start-Process '${binPath}' -ArgumentList ${escapedArgs.map(arg => `'${arg}'`).join(', ')} -Verb RunAs -WindowStyle Hidden"`;
    
    logger.info(`[PlatformLauncher] Windows管理员权限启动命令: ${binPath} ${args.join(' ')}`);

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`[PlatformLauncher] Windows管理员权限启动失败: ${error.message}`);
          resolve({ success: false, error: `管理员权限启动失败: ${error.message}` });
          return;
        }
        
        logger.info('[PlatformLauncher] Windows管理员权限启动请求已发送');
        
        setTimeout(async () => {
          const isRunning = await this.checkProcessRunning();
          if (isRunning) {
            resolve({ 
              success: true, 
              pid: null,
              elevated: true,
              logFile: logFilePath,
              message: '内核已使用管理员权限启动'
            });
          } else {
            let errorFromLog = '';
            try {
              if (fs.existsSync(logFilePath)) {
                const logContent = fs.readFileSync(logFilePath, 'utf8');
                const errorLines = logContent.split('\n').filter(line => 
                  line.toLowerCase().includes('error') || 
                  line.toLowerCase().includes('fatal') ||
                  line.toLowerCase().includes('panic')
                );
                if (errorLines.length > 0) {
                  errorFromLog = errorLines.slice(-3).join('; ');
                }
              }
            } catch (logErr) {
              logger.warn(`[PlatformLauncher] 无法读取日志文件: ${logErr.message}`);
            }
            
            const errorMessage = errorFromLog 
              ? `管理员权限启动失败: ${errorFromLog}`
              : '管理员权限启动失败，未检测到运行中的进程';
            
            resolve({
              success: false,
              error: errorMessage
            });
          }
        }, 3000);
      });
    });
  }

  /**
   * macOS 管理员模式启动
   * @param {String} binPath 可执行文件路径
   * @param {Array} args 启动参数
   * @returns {Object} 子进程对象
   */
  startMacOSElevated(binPath, args) {
    logger.info('[PlatformLauncher] macOS管理员权限启动');
    logger.info(`[PlatformLauncher] macOS管理员权限启动命令: sudo ${binPath} ${args.join(' ')}`);
    
    // 使用 sudo 启动
    const sudoArgs = ['sudo', binPath, ...args];
    return spawn(sudoArgs[0], sudoArgs.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  /**
   * Linux 管理员模式启动
   * @param {String} binPath 可执行文件路径
   * @param {Array} args 启动参数
   * @returns {Object} 子进程对象
   */
  startLinuxElevated(binPath, args) {
    logger.info('[PlatformLauncher] Linux管理员权限启动');
    
    // 检查是否有可用的图形权限提升工具
    const { execSync } = require('child_process');
    let elevationMethod = 'sudo';
    
    try {
      // 检查 pkexec 是否可用
      execSync('which pkexec', { stdio: 'ignore' });
      elevationMethod = 'pkexec';
      logger.info('[PlatformLauncher] 使用 pkexec 进行权限提升');
    } catch (e) {
      try {
        // 检查 gksu 是否可用
        execSync('which gksu', { stdio: 'ignore' });
        elevationMethod = 'gksu';
        logger.info('[PlatformLauncher] 使用 gksu 进行权限提升');
      } catch (e2) {
        logger.info('[PlatformLauncher] 使用 sudo 进行权限提升');
      }
    }
    
    let elevatedArgs;
    if (elevationMethod === 'pkexec') {
      elevatedArgs = ['pkexec', binPath, ...args];
      logger.info(`[PlatformLauncher] Linux管理员权限启动命令: pkexec ${binPath} ${args.join(' ')}`);
    } else if (elevationMethod === 'gksu') {
      elevatedArgs = ['gksu', `${binPath} ${args.join(' ')}`];
      logger.info(`[PlatformLauncher] Linux管理员权限启动命令: gksu ${binPath} ${args.join(' ')}`);
    } else {
      elevatedArgs = ['sudo', binPath, ...args];
      logger.info(`[PlatformLauncher] Linux管理员权限启动命令: sudo ${binPath} ${args.join(' ')}`);
    }
    
    return spawn(elevatedArgs[0], elevatedArgs.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  /**
   * 启动进程（根据平台和模式选择启动方式）
   * @param {String} binPath 可执行文件路径
   * @param {Array} args 启动参数
   * @param {Object} options 启动选项
   * @returns {Promise<Object>} 启动结果或子进程对象
   */
  async start(binPath, args, options = {}) {
    const { tunMode = false, workingDir = process.cwd() } = options;
    
    if (!tunMode) {
      // 普通模式启动
      return this.startNormal(binPath, args, workingDir);
    }
    
    // TUN 模式需要管理员权限
    const logFilePath = this.getTempLogPath();
    
    switch (this.platform) {
      case 'win32':
        return await this.startWindowsElevated(binPath, args, logFilePath);
      
      case 'darwin':
        return this.startMacOSElevated(binPath, args);
      
      case 'linux':
        return this.startLinuxElevated(binPath, args);
      
      default:
        throw new Error(`不支持的平台: ${this.platform}`);
    }
  }

  /**
   * 检查进程是否运行中
   * @param {String} processName 进程名称，默认为 sing-box
   * @returns {Promise<boolean>} 是否运行中
   */
  async checkProcessRunning(processName = 'sing-box') {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      if (this.platform === 'win32') {
        const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${processName}.exe" /FO CSV`);
        const lines = stdout.split('\n');
        const processes = lines.filter(line => line.includes(`${processName}.exe`));
        return processes.length > 0;
      } else {
        // macOS 和 Linux 使用 pgrep
        try {
          await execPromise(`pgrep -f ${processName}`);
          return true;
        } catch (error) {
          return false;
        }
      }
    } catch (error) {
      logger.error(`[PlatformLauncher] 检查进程状态失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 停止进程
   * @param {String} processName 进程名称，默认为 sing-box
   * @returns {Promise<boolean>} 是否成功停止
   */
  async stopProcess(processName = 'sing-box') {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      let success = await this.tryNormalStop(processName, execPromise);
      
      if (!success) {
        logger.warn(`[PlatformLauncher] 常规停止方法失败，尝试权限提升停止`);
        success = await this.tryElevatedStop(processName, execPromise);
      }
      
      if (!success) {
        logger.warn(`[PlatformLauncher] 权限提升停止失败，尝试强制停止`);
        success = await this.tryForceStop(processName, execPromise);
      }
      
      if (success) {
        // 等待进程完全停止
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 验证进程是否真的停止了
        const isStillRunning = await this.checkProcessRunning(processName);
        if (isStillRunning) {
          logger.warn(`[PlatformLauncher] 进程 ${processName} 停止后仍在运行`);
          return false;
        }
        
        logger.info(`[PlatformLauncher] 已成功停止进程: ${processName}`);
        return true;
      }
      
      logger.error(`[PlatformLauncher] 所有停止方法都失败了`);
      return false;
      
    } catch (error) {
      if (error.message.includes('not found') || 
          error.message.includes('找不到') || 
          error.message.includes('No such process')) {
        logger.info(`[PlatformLauncher] 没有找到运行中的 ${processName} 进程`);
        return true;
      } else {
        logger.error(`[PlatformLauncher] 停止进程失败: ${error.message}`);
        return false;
      }
    }
  }

  /**
   * 尝试常规方法停止进程
   * @param {String} processName 进程名称
   * @param {Function} execPromise 执行promise函数
   * @returns {Promise<boolean>} 是否成功
   */
  async tryNormalStop(processName, execPromise) {
    try {
      if (this.platform === 'win32') {
        await execPromise(`taskkill /IM ${processName}.exe`);
        logger.info(`[PlatformLauncher] 常规方法终止Windows进程: ${processName}`);
      } else {
        // macOS 和 Linux 首先尝试 SIGTERM
        await execPromise(`pkill -TERM -f ${processName}`);
        logger.info(`[PlatformLauncher] 常规方法终止Unix进程: ${processName}`);
      }
      return true;
    } catch (error) {
      logger.warn(`[PlatformLauncher] 常规停止方法失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 尝试权限提升的停止方法
   * @param {String} processName 进程名称
   * @param {Function} execPromise 执行promise函数
   * @returns {Promise<boolean>} 是否成功
   */
  async tryElevatedStop(processName, execPromise) {
    try {
      if (this.platform === 'win32') {
        // Windows: 使用 PowerShell 以管理员权限停止
        const psCommand = `powershell -Command "Start-Process taskkill -ArgumentList '/F', '/IM', '${processName}.exe' -Verb RunAs -WindowStyle Hidden -Wait"`;
        await execPromise(psCommand);
        logger.info(`[PlatformLauncher] 管理员权限终止Windows进程: ${processName}`);
      } else {
        // macOS 和 Linux: 尝试使用 sudo
        try {
          await execPromise(`sudo pkill -TERM -f ${processName}`);
          logger.info(`[PlatformLauncher] sudo权限终止Unix进程: ${processName}`);
        } catch (sudoError) {
          // 如果 sudo 失败，尝试其他权限提升工具
          if (this.platform === 'linux') {
            try {
              await execPromise(`pkexec pkill -TERM -f ${processName}`);
              logger.info(`[PlatformLauncher] pkexec权限终止Linux进程: ${processName}`);
            } catch (pkexecError) {
              throw sudoError; // 抛出原始的 sudo 错误
            }
          } else {
            throw sudoError;
          }
        }
      }
      return true;
    } catch (error) {
      logger.warn(`[PlatformLauncher] 权限提升停止方法失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 尝试强制停止进程
   * @param {String} processName 进程名称
   * @param {Function} execPromise 执行promise函数
   * @returns {Promise<boolean>} 是否成功
   */
  async tryForceStop(processName, execPromise) {
    try {
      if (this.platform === 'win32') {
        // Windows: 强制终止
        await execPromise(`taskkill /F /IM ${processName}.exe`);
        logger.info(`[PlatformLauncher] 强制终止Windows进程: ${processName}`);
      } else {
        // macOS 和 Linux: 使用 SIGKILL
        await execPromise(`pkill -KILL -f ${processName}`);
        logger.info(`[PlatformLauncher] 强制终止Unix进程: ${processName}`);
      }
      return true;
    } catch (error) {
      logger.warn(`[PlatformLauncher] 强制停止方法失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 优雅停止进程（首先尝试优雅停止，然后强制停止）
   * @param {String} processName 进程名称
   * @param {Number} gracefulTimeout 优雅停止超时时间（毫秒）
   * @returns {Promise<boolean>} 是否成功停止
   */
  async gracefulStop(processName = 'sing-box', gracefulTimeout = 5000) {
    try {
      logger.info(`[PlatformLauncher] 开始优雅停止进程: ${processName}`);
      
      // 首先检查进程是否存在
      const isRunning = await this.checkProcessRunning(processName);
      if (!isRunning) {
        logger.info(`[PlatformLauncher] 进程 ${processName} 未在运行`);
        return true;
      }
      
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      // 第一步：尝试优雅停止（SIGTERM 或 taskkill 不带 /F）
      let gracefulSuccess = false;
      try {
        if (this.platform === 'win32') {
          await execPromise(`taskkill /IM ${processName}.exe`);
        } else {
          await execPromise(`pkill -TERM -f ${processName}`);
        }
        gracefulSuccess = true;
        logger.info(`[PlatformLauncher] 发送优雅停止信号成功`);
      } catch (error) {
        logger.warn(`[PlatformLauncher] 发送优雅停止信号失败: ${error.message}`);
      }
      
      if (gracefulSuccess) {
        // 等待优雅停止完成
        let waitTime = 0;
        const checkInterval = 500;
        
        while (waitTime < gracefulTimeout) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          
          const stillRunning = await this.checkProcessRunning(processName);
          if (!stillRunning) {
            logger.info(`[PlatformLauncher] 进程 ${processName} 已优雅停止`);
            return true;
          }
        }
        
        logger.warn(`[PlatformLauncher] 优雅停止超时，转为强制停止`);
      }
      
      // 第二步：强制停止
      return await this.stopProcess(processName);
      
    } catch (error) {
      logger.error(`[PlatformLauncher] 优雅停止进程失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = PlatformLauncher; 