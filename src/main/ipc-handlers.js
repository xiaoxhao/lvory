/**
 * IPC事件处理模块
 * 统一管理Electron的IPC通信处理
 */
const { app, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('../utils/logger');
const singbox = require('../utils/sing-box');
const profileManager = require('./profile-manager');
const windowManager = require('./window');
const coreDownloader = require('./core-downloader');
const settingsManager = require('./settings-manager');

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
  // 使用LOCALAPPDATA目录作为数据存储位置
  const appDataDir = process.env.LOCALAPPDATA || '';
  const appDir = path.join(appDataDir, 'LVORY');
  
  // 确保目录存在
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
    } catch (error) {
      logger.error(`创建应用数据目录失败: ${error.message}`);
    }
  }
  
  return appDir;
}

let ipcHandlersRegistered = false;

const setupIpcHandlers = () => {
  // 防止重复注册
  if (ipcHandlersRegistered) {
    logger.info('IPC处理程序已注册，跳过');
    return;
  }
  
  logger.info('设置IPC处理程序');
  
  removeExistingHandlers();
  
  // 窗口控制
  ipcMain.on('window-control', (event, command) => {
    const mainWindow = windowManager.getMainWindow();
    if (!mainWindow) return;
    
    switch (command) {
      case 'minimize':
        // 改为隐藏窗口而不是最小化
        mainWindow.hide();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.restore();
          // 确保恢复后的窗口不小于最小尺寸
          const [width, height] = mainWindow.getSize();
          if (width < 800 || height < 600) {
            mainWindow.setSize(Math.max(width, 800), Math.max(height, 600));
          }
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        // 只是隐藏窗口，不真正关闭
        mainWindow.hide();
        break;
    }
  });
  
  // 获取配置文件路径
  ipcMain.handle('get-config-path', async () => {
    try {
      return profileManager.getConfigPath();
    } catch (error) {
      logger.error('获取配置文件路径失败:', error);
      return null;
    }
  });
  
  // 设置配置文件路径
  ipcMain.handle('set-config-path', async (event, filePath) => {
    try {
      if (!filePath) {
        return { success: false, error: '文件路径不能为空' };
      }
      
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(configDir, filePath);
      
      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `文件不存在: ${fullPath}` };
      }
      
      // 使用profileManager的setConfigPath方法
      const success = profileManager.setConfigPath(fullPath);
      if (success) {
        logger.info(`设置当前配置文件路径: ${fullPath}`);
        return { success: true, configPath: fullPath };
      } else {
        return { success: false, error: '设置配置文件路径失败' };
      }
    } catch (error) {
      logger.error('设置配置文件路径失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取profiles数据
  ipcMain.handle('get-profile-data', async () => {
    try {
      const outbounds = profileManager.scanProfileConfig();
      
      // 转换为前端需要的格式
      const profileData = outbounds.map(item => ({
        tag: item.tag,
        type: item.type,
        server: item.server || '',
        description: `${item.type || 'Unknown'} - ${item.server || 'N/A'}`
      }));
      
      // 保持与原有API格式一致，返回对象而不是直接返回数组
      return {
        success: true,
        profiles: profileData
      };
    } catch (error) {
      logger.error('获取配置文件数据失败:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  });
  
  // 启动sing-box
  ipcMain.handle('singbox-start-core', async (event, options) => {
    try {
      // 如果没有提供配置文件路径，使用默认路径
      const configPath = options && options.configPath ? options.configPath : profileManager.getConfigPath();
      
      const proxyConfig = options && options.proxyConfig ? options.proxyConfig : {
        host: '127.0.0.1',
        port: 7890,
        enableSystemProxy: true  // 默认启用系统代理
      };
      
      // 启动内核前检查版本
      logger.info('启动内核前检查版本');
      const versionResult = await singbox.getVersion();
      if (versionResult.success) {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-version-update', {
            version: versionResult.version,
            fullOutput: versionResult.fullOutput
          });
        }
      }
      
      // 这里不需要打印代理设置，因为在startCore函数里会获取配置文件中的端口并覆盖
      logger.info(`启动sing-box内核，配置文件: ${configPath}`);
      
      // 启动内核
      const result = await singbox.startCore({ 
        configPath,
        proxyConfig,
        enableSystemProxy: proxyConfig.enableSystemProxy
      });
      
      return result;
    } catch (error) {
      logger.error('启动sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止sing-box
  ipcMain.handle('singbox-stop-core', async () => {
    try {
      logger.info('停止sing-box内核');
      return singbox.stopCore();
    } catch (error) {
      logger.error('停止sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box状态
  ipcMain.handle('singbox-get-status', async () => {
    try {
      return singbox.getStatus();
    } catch (error) {
      logger.error('获取sing-box状态失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box版本
  ipcMain.handle('singbox-get-version', async () => {
    try {
      return await singbox.getVersion();
    } catch (error) {
      logger.error('获取sing-box版本失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // SingBox相关的IPC处理程序
  // 检查sing-box是否安装
  ipcMain.handle('singbox-check-installed', () => {
    return { installed: singbox.checkInstalled() };
  });
  
  // 检查配置
  ipcMain.handle('singbox-check-config', async (event, { configPath }) => {
    try {
      return await singbox.checkConfig(configPath);
    } catch (error) {
      logger.error('检查配置错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 格式化配置
  ipcMain.handle('singbox-format-config', async (event, { configPath }) => {
    try {
      return await singbox.formatConfig(configPath);
    } catch (error) {
      logger.error('格式化配置错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载sing-box核心
  ipcMain.handle('singbox-download-core', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      return await coreDownloader.downloadCore(mainWindow);
    } catch (error) {
      logger.error('下载sing-box核心失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载核心
  ipcMain.handle('download-core', async (event) => {
    try {
      const mainWindow = windowManager.getMainWindow();
      const result = await coreDownloader.downloadCore(mainWindow);
      // 如果下载成功，尝试获取版本信息
      if (result.success) {
        setTimeout(async () => {
          const versionInfo = await singbox.getVersion();
          if (versionInfo.success && mainWindow && !mainWindow.isDestroyed()) {
            // 通知渲染进程更新版本信息
            mainWindow.webContents.send('core-version-update', {
              version: versionInfo.version,
              fullOutput: versionInfo.fullOutput
            });
          }
        }, 500); // 稍微延迟以确保文件已正确解压并可访问
      }
      return result;
    } catch (error) {
      logger.error('下载内核处理器错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 从托盘显示窗口
  ipcMain.handle('show-window', () => {
    windowManager.showWindow();
    return { success: true };
  });
  
  // 真正退出应用
  ipcMain.handle('quit-app', async () => {
    try {
      // 退出前清理
      await singbox.disableSystemProxy();
      await singbox.stopCore();
      
      // 标记为真正退出
      global.isQuitting = true;
      require('electron').app.quit();
      return { success: true };
    } catch (error) {
      logger.error('退出应用失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 日志系统IPC处理程序
  ipcMain.handle('get-log-history', () => {
    return logger.getHistory();
  });

  ipcMain.handle('clear-logs', () => {
    return logger.clearHistory();
  });
  
  // 处理下载配置文件请求
  ipcMain.handle('download-profile', async (event, data) => {
    try {
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          message: 'Invalid request format',
          error: 'Expected object with url property'
        };
      }

      const fileUrl = data.url;
      let customFileName = data.fileName;
      const isDefaultConfig = data.isDefaultConfig === true;
      
      logger.info('Starting download:', fileUrl);
      logger.info('Custom filename:', customFileName);
      logger.info('Set as default config:', isDefaultConfig);
      
      if (!fileUrl || !fileUrl.trim() || typeof fileUrl !== 'string') {
        return {
          success: false,
          message: 'URL cannot be empty and must be a string',
          error: 'Invalid URL format'
        };
      }
      
      try {
        const parsedUrl = new URL(fileUrl);
        if (!parsedUrl.protocol || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
          return {
            success: false,
            message: 'Only HTTP and HTTPS protocols are supported',
            error: 'Invalid protocol'
          };
        }
      } catch (e) {
        return {
          success: false,
          message: 'Invalid URL format: ' + e.message,
          error: 'URL parsing error'
        };
      }
      
      // 获取应用数据目录
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      
      // 确保配置目录存在
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      logger.info('Config directory:', configDir);
      
      // 如果没有提供自定义文件名，从URL中提取
      if (!customFileName) {
        const parsedUrlObj = new URL(fileUrl);
        customFileName = path.basename(parsedUrlObj.pathname) || 'profile.config';
      }
      
      // 如果设置为默认配置，强制文件名为sing-box.json
      if (isDefaultConfig) {
        customFileName = 'sing-box.json';
        logger.info('Setting as default config, renamed to:', customFileName);
      }
      
      // 确保文件名是安全的
      customFileName = customFileName.replace(/[/\\?%*:|"<>]/g, '-');
      
      // 完整的保存路径
      const filePath = path.join(configDir, customFileName);
      logger.info('File will be saved to:', filePath);
      
      // 检查文件夹是否可写
      try {
        // 检查目录是否可写
        fs.accessSync(configDir, fs.constants.W_OK);
      } catch (err) {
        return {
          success: false,
          message: 'Cannot write to config folder: ' + err.message,
          error: 'Permission denied'
        };
      }
      
      // 使用适当的协议
      const parsedUrlForProtocol = new URL(fileUrl);
      const protocol = parsedUrlForProtocol.protocol === 'https:' ? https : http;
      
      const mainWindow = windowManager.getMainWindow();
      
      return new Promise((resolve, reject) => {
        // 创建请求
        const request = protocol.get(fileUrl, (response) => {
          // 检查状态码
          if (response.statusCode !== 200) {
            let errorMessage = `HTTP Error: ${response.statusCode}`;
            if (response.statusCode === 404) {
              errorMessage = 'File not found on server (404)';
            } else if (response.statusCode === 403) {
              errorMessage = 'Access forbidden (403)';
            } else if (response.statusCode === 401) {
              errorMessage = 'Authentication required (401)';
            } else if (response.statusCode >= 500) {
              errorMessage = 'Server error, please try again later';
            }
            
            reject(new Error(errorMessage));
            return;
          }
          
          // 检查内容类型，如果服务器返回了明确的错误页面类型，可能是被重定向了
          const contentType = response.headers['content-type'];
          if (contentType && contentType.includes('text/html') && !fileUrl.endsWith('.html')) {
            reject(new Error('Server returned HTML instead of a file. This URL may be a web page, not a downloadable file.'));
            return;
          }
          
          // 创建写入流
          const file = fs.createWriteStream(filePath);
          
          // 将响应流导向文件
          response.pipe(file);
          
          // 处理写入错误
          file.on('error', (err) => {
            file.close();
            fs.unlink(filePath, () => {}); // 删除失败的文件
            reject(new Error(`Failed to write file: ${err.message}`));
          });
          
          // 文件写入完成
          file.on('finish', () => {
            file.close();
            
            // 通知渲染进程下载完成
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-complete', {
                success: true,
                message: `Profile saved to: ${filePath}`,
                path: filePath,
                isDefaultConfig: isDefaultConfig
              });
            }
            
            // 返回成功信息
            resolve({
              success: true,
              message: `Profile saved to: ${filePath}`,
              path: filePath,
              isDefaultConfig: isDefaultConfig
            });
          });
        });
        
        // 处理请求错误
        request.on('error', (err) => {
          logger.error('Download request error:', err);
          fs.unlink(filePath, () => {}); // 删除可能已创建的文件
          
          let errorMessage = err.message;
          if (err.code === 'ENOTFOUND') {
            errorMessage = 'Host not found. Please check your URL or internet connection.';
          } else if (err.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. The server may be down or blocking requests.';
          } else if (err.code === 'ECONNRESET') {
            errorMessage = 'Connection reset. The connection was forcibly closed by the remote server.';
          } else if (err.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timed out. The server took too long to respond.';
          }
          
          reject(new Error(errorMessage));
        });
        
        // 设置请求超时
        request.setTimeout(30000, () => {
          request.abort();
          fs.unlink(filePath, () => {});
          reject(new Error('Download request timed out. The server is taking too long to respond.'));
        });
      });
    } catch (error) {
      logger.error('Failed to download profile:', error);
      return {
        success: false,
        message: `Download failed: ${error.message}`,
        error: error.toString()
      };
    }
  });
  
  // 注册sing-box运行服务的IPC处理程序
  ipcMain.handle('singbox-run', async (event, args) => {
    try {
      const { configPath } = args;
      const mainWindow = windowManager.getMainWindow();
      
      // 检查是否已有运行的进程
      if (singbox.process) {
        logger.info('检测到已有运行的sing-box进程，正在终止');
        try {
          await singbox.stopCore();
        } catch (e) {
          logger.error('终止旧进程失败:', e);
        }
      }
      
      // 定义输出回调，将sing-box输出传递给渲染进程
      const outputCallback = (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('singbox-output', data);
        }
      };
      
      // 定义退出回调
      const exitCallback = (code, error) => {
        logger.info(`sing-box进程退出，退出码: ${code}${error ? ', 错误: ' + error : ''}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('singbox-exit', { code, error });
        }
      };
      
      // 解析配置文件中的端口
      const configInfo = singbox.parseConfigFile(configPath);
      if (configInfo && configInfo.port) {
        logger.info(`从配置文件解析到代理端口: ${configInfo.port}`);
        // 只更新端口，保持其他设置不变
        singbox.setProxyConfig({
          ...singbox.proxyConfig,
          port: configInfo.port
        });
      }
      
      logger.info(`启动sing-box服务，配置文件: ${configPath}, 代理端口: ${singbox.proxyConfig.port}`);
      
      const result = await singbox.run(configPath, outputCallback, exitCallback);
      return result;
    } catch (error) {
      logger.error('运行服务错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止运行的sing-box服务
  ipcMain.handle('singbox-stop', async () => {
    try {
      // 先禁用系统代理
      await singbox.disableSystemProxy();
      
      return await singbox.stopCore();
    } catch (error) {
      logger.error('停止服务错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取配置文件列表
  ipcMain.handle('getProfileFiles', async () => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        return { success: true, files: [] };
      }
      
      const files = fs.readdirSync(configDir)
        // 重点显示JSON配置文件
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ext === '.json' || ext === '.yaml' || ext === '.yml' || ext === '.config';
        })
        .map(file => {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: `${Math.round(stats.size / 1024)} KB`,
            createDate: new Date(stats.birthtime).toLocaleDateString(),
            modifiedDate: new Date(stats.mtime).toLocaleDateString()
          };
        });
      
      logger.info(`找到${files.length}个配置文件`);
      return { success: true, files };
    } catch (error) {
      logger.error(`获取配置文件列表失败: ${error.message}`);
      return { success: false, error: error.message, files: [] };
    }
  });

  // 导出配置文件
  ipcMain.handle('exportProfile', async (event, fileName) => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      const saveDialog = await dialog.showSaveDialog({
        title: '导出配置文件',
        defaultPath: path.join(app.getPath('downloads'), fileName),
        filters: [
          { name: '配置文件', extensions: ['json', 'yaml', 'yml', 'config'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      
      if (saveDialog.canceled) {
        return { success: false, error: '用户取消' };
      }
      
      fs.copyFileSync(filePath, saveDialog.filePath);
      return { success: true };
    } catch (error) {
      logger.error(`导出配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 重命名配置文件
  ipcMain.handle('renameProfile', async (event, { oldName, newName }) => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      const oldPath = path.join(configDir, oldName);
      const newPath = path.join(configDir, newName);
      
      if (!fs.existsSync(oldPath)) {
        return { success: false, error: '原文件不存在' };
      }
      
      if (fs.existsSync(newPath)) {
        return { success: false, error: '新文件名已存在' };
      }
      
      fs.renameSync(oldPath, newPath);
      
      // 触发配置文件变更事件
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`重命名配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 删除配置文件
  ipcMain.handle('deleteProfile', async (event, fileName) => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      fs.unlinkSync(filePath);
      
      // 触发配置文件变更事件
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`删除配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 使用默认编辑器打开配置文件
  ipcMain.handle('openFileInEditor', async (event, fileName) => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      logger.error(`打开编辑器失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 打开配置文件所在目录
  ipcMain.handle('openConfigDir', async () => {
    try {
      const appDataDir = getAppDataDir();
      const configDir = path.join(appDataDir, 'configs');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      shell.openPath(configDir);
      return { success: true };
    } catch (error) {
      logger.error(`打开配置目录失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 添加配置文件变更事件
  ipcMain.on('profiles-changed-listen', (event) => {
    const webContents = event.sender;
    const win = windowManager.getMainWindow();
    
    // 移除旧的监听器，防止重复
    ipcMain.removeListener('profiles-changed-notify', () => {});
    
    // 添加新的监听器
    ipcMain.on('profiles-changed-notify', () => {
      if (!webContents.isDestroyed()) {
        webContents.send('profiles-changed');
      }
    });
  });
  
  // 移除配置文件变更监听
  ipcMain.on('profiles-changed-unlisten', () => {
    ipcMain.removeListener('profiles-changed-notify', () => {});
  });
  
  // 设置开机自启动
  ipcMain.handle('set-auto-launch', async (event, enable) => {
    return settingsManager.setAutoLaunch(enable);
  });

  // 获取开机自启动状态
  ipcMain.handle('get-auto-launch', async () => {
    return settingsManager.getAutoLaunch();
  });
  
  // 保存设置
  ipcMain.handle('save-settings', async (event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  // 加载设置
  ipcMain.handle('get-settings', async () => {
    const settings = await settingsManager.loadSettings();
    return { success: true, settings };
  });
  
  // 标记IPC处理程序已注册
  ipcHandlersRegistered = true;
  logger.info('IPC处理程序注册完成');
};

/**
 * 移除已存在的IPC处理程序
 */
const removeExistingHandlers = () => {
  try {
    // 需要移除的处理程序列表
    const handlersToRemove = [
      'get-config-path',
      'open-config-dir',
      'get-profile-data',
      'singbox-start-core',
      'singbox-stop-core',
      'singbox-get-status',
      'singbox-get-version',
      'singbox-check-installed',
      'singbox-check-config',
      'singbox-format-config',
      'singbox-download-core',
      'download-core',
      'show-window',
      'quit-app',
      'get-log-history',
      'clear-logs',
      'download-profile',
      'singbox-run',
      'singbox-stop',
      'getProfileFiles',
      'exportProfile',
      'renameProfile',
      'deleteProfile',
      'openFileInEditor',
      'openConfigDir',
      'profiles-changed-listen',
      'profiles-changed-unlisten',
      'set-auto-launch',
      'get-auto-launch',
      'save-settings',
      'get-settings'
    ];
    
    // 尝试移除每个处理程序
    for (const handler of handlersToRemove) {
      try {
        ipcMain.removeHandler(handler);
      } catch (error) {
        // 忽略错误，因为处理程序可能不存在
      }
    }
    
    logger.info('已清理旧的IPC处理程序');
  } catch (error) {
    logger.error('清理IPC处理程序失败:', error);
  }
};

module.exports = {
  setupIpcHandlers
}; 