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
    const tempDir = os.tmpdir();
    const logFileName = `sing-box-${Date.now()}.log`;
    return path.join(tempDir, logFileName);
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
    } else if (elevationMethod === 'gksu') {
      elevatedArgs = ['gksu', `${binPath} ${args.join(' ')}`];
    } else {
      elevatedArgs = ['sudo', binPath, ...args];
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
      
      if (this.platform === 'win32') {
        await execPromise(`taskkill /F /IM ${processName}.exe`);
        logger.info(`[PlatformLauncher] 已终止Windows进程: ${processName}`);
      } else {
        // macOS 和 Linux
        await execPromise(`pkill -f ${processName}`);
        logger.info(`[PlatformLauncher] 已终止Unix进程: ${processName}`);
      }
      
      return true;
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
}

module.exports = PlatformLauncher; 