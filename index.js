const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const os = require('os');
const { spawn, exec } = require('child_process');

// 引入日志系统
const logger = require('./src/utils/logger');
// 引入sing-box模块
const singbox = require('./src/utils/sing-box');

// 动态导入AdmZip
let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (error) {
  logger.warn('AdmZip库未安装，解压功能将不可用');
}

try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (error) {
  logger.info('electron-squirrel-startup not found, skipping');
}

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';
logger.info(`Running in ${isDev ? 'development' : 'production'} mode`);

// 保存对主窗口的引用
let mainWindow = null;

// 扫描文档目录中的配置文件并解析
const scanProfileConfig = () => {
  try {
    const documentsPath = app.getPath('documents');
    
    // 先尝试读取profiles-test.json文件
    const testConfigPath = path.join(documentsPath, 'profiles-test.json');
    const configFilePath = path.join(documentsPath, 'sing-box.json');
    
    let fileToUse = null;
    
    // 优先使用profiles-test.json
    if (fs.existsSync(testConfigPath)) {
      fileToUse = testConfigPath;
      logger.info('找到测试配置文件:', testConfigPath);
    } else if (fs.existsSync(configFilePath)) {
      fileToUse = configFilePath;
      logger.info('找到标准配置文件:', configFilePath);
    } else {
      logger.info('未找到配置文件');
      return [];
    }

    // 保存当前使用的配置文件路径
    currentConfigPath = fileToUse;
    
    // 读取并解析配置文件
    const configContent = fs.readFileSync(fileToUse, 'utf8');
    const config = JSON.parse(configContent);
    
    // 提取outbounds
    if (config && config.outbounds && Array.isArray(config.outbounds)) {
      logger.info('解析到的outbound tags:', config.outbounds.length);
      return config.outbounds;
    }
    
    return [];
  } catch (error) {
    logger.error('扫描配置文件失败:', error);
    return [];
  }
};

// 获取当前配置文件路径
let currentConfigPath = null;

// 获取配置文件路径
const getConfigPath = () => {
  if (currentConfigPath) {
    return currentConfigPath;
  }
  
  // 如果未设置，尝试查找配置文件
  const documentsPath = app.getPath('documents');
  const testConfigPath = path.join(documentsPath, 'profiles-test.json');
  const configFilePath = path.join(documentsPath, 'sing-box.json');
  
  if (fs.existsSync(testConfigPath)) {
    currentConfigPath = testConfigPath;
  } else if (fs.existsSync(configFilePath)) {
    currentConfigPath = configFilePath;
  } else {
    currentConfigPath = configFilePath; // 默认使用标准路径
  }
  
  return currentConfigPath;
};

// 初始化SingBox模块
singbox.init();

// 设置输出回调
singbox.setOutputCallback((output) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('singbox-output', output);
  }
});

// 设置退出回调
singbox.setExitCallback((exitInfo) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('singbox-exit', exitInfo);
  }
});

// 创建主窗口
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    resizable: true, // 允许调整大小
    frame: false,
    titleBarStyle: 'hidden',
  });

  // 设置主窗口到logger
  logger.setMainWindow(mainWindow);
  
  // 设置主窗口到SingBox模块
  singbox.setMainWindow(mainWindow);

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Failed to load: ${errorDescription} (${errorCode})`);
    // 尝试重新加载
    setTimeout(() => {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }, 1000);
  });

  // 添加页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Page loaded successfully');
    
    // 扫描配置文件并将数据发送到渲染进程
    const profileData = scanProfileConfig();
    if (profileData) {
      mainWindow.webContents.send('profile-data', profileData);
    }
  });

  // 根据环境加载不同的URL或文件
  if (isDev) {
    // 开发环境：连接到webpack-dev-server
    mainWindow.loadURL('http://localhost:3000');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
};

// 设置IPC处理程序
const setupIpcHandlers = () => {
  // 窗口控制
  ipcMain.on('window-control', (event, command) => {
    switch (command) {
      case 'minimize':
        if (mainWindow) mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow) {
          if (mainWindow.isMaximized()) {
            mainWindow.restore();
          } else {
            mainWindow.maximize();
          }
        }
        break;
      case 'close':
        if (mainWindow) mainWindow.close();
        break;
    }
  });
  
  // 获取配置文件路径
  ipcMain.handle('get-config-path', async () => {
    return getConfigPath();
  });
  
  // 启动sing-box内核
  ipcMain.handle('singbox-start-core', async (event, options) => {
    try {
      // 如果没有提供配置文件路径，使用默认路径
      const configPath = options && options.configPath ? options.configPath : getConfigPath();
      
      // 代理设置
      const proxyConfig = options && options.proxyConfig ? options.proxyConfig : {
        host: '127.0.0.1',
        port: 7890,
        enableSystemProxy: true  // 默认启用系统代理
      };
      
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
  
  // 停止sing-box内核
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
  
  // 获取配置文件数据
  ipcMain.handle('get-profile-data', async () => {
    try {
      const outbounds = scanProfileConfig();
      
      // 转换为前端需要的格式
      const profileData = outbounds.map(item => ({
        tag: item.tag,
        type: item.type,
        server: item.server || '',
        description: `${item.type || 'Unknown'} - ${item.server || 'N/A'}`
      }));
      
      return profileData;
    } catch (error) {
      logger.error('获取配置文件数据失败:', error);
      return [];
    }
  });

  // 日志系统IPC处理程序
  ipcMain.handle('get-log-history', () => {
    return logger.getHistory();
  });

  ipcMain.handle('clear-logs', () => {
    return logger.clearHistory();
  });
};

// 处理下载配置文件请求
ipcMain.handle('download-profile', async (event, data) => {
  try {
    // 确保data是对象格式
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
    
    // 基本URL验证
    if (!fileUrl || !fileUrl.trim() || typeof fileUrl !== 'string') {
      return {
        success: false,
        message: 'URL cannot be empty and must be a string',
        error: 'Invalid URL format'
      };
    }
    
    // 验证URL格式
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
    
    // 获取Windows的文档目录
    const documentsPath = app.getPath('documents');
    logger.info('Documents directory:', documentsPath);
    
    // 如果没有提供自定义文件名，从URL中提取
    if (!customFileName) {
      // 使用Node的URL模块解析
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
    const filePath = path.join(documentsPath, customFileName);
    logger.info('File will be saved to:', filePath);
    
    // 检查文件夹是否可写
    try {
      // 检查文档目录是否存在，如果不存在则创建
      if (!fs.existsSync(documentsPath)) {
        fs.mkdirSync(documentsPath, { recursive: true });
      }
      
      // 检查目录是否可写
      fs.accessSync(documentsPath, fs.constants.W_OK);
    } catch (err) {
      return {
        success: false,
        message: 'Cannot write to Documents folder: ' + err.message,
        error: 'Permission denied'
      };
    }
    
    // 使用适当的协议
    const parsedUrlForProtocol = new URL(fileUrl);
    const protocol = parsedUrlForProtocol.protocol === 'https:' ? https : http;
    
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
          mainWindow.webContents.send('download-complete', {
            success: true,
            message: `Profile saved to: ${filePath}`,
            path: filePath,
            isDefaultConfig: isDefaultConfig
          });
          
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

// 下载内核函数
const downloadCore = async () => {
  try {
    // 检查是否有AdmZip库
    if (!AdmZip) {
      return { 
        success: false, 
        error: '未安装AdmZip库，无法解压文件。请联系管理员安装此依赖。' 
      };
    }

    // 检测系统环境
    const platform = process.platform;
    const arch = process.arch;
    logger.info(`当前系统: ${platform}, 架构: ${arch}`);
    
    // 目前只支持Windows x64
    if (platform !== 'win32' || arch !== 'x64') {
      return { 
        success: false, 
        error: `不支持的系统或架构: ${platform} ${arch}。目前只支持Windows x64。` 
      };
    }
    
    const downloadUrls = [
      'https://github.com/SagerNet/sing-box/releases/download/v1.11.4/sing-box-1.11.4-windows-amd64.zip',
      'https://ghfast.top/https://github.com/SagerNet/sing-box/releases/download/v1.11.4/sing-box-1.11.4-windows-amd64.zip'
    ];
    
    // 创建临时目录
    const tempDir = path.join(os.tmpdir(), 'sing-box-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const zipFilePath = path.join(tempDir, 'sing-box.zip');
    
    const binDir = path.join(app.getAppPath(), 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    // 尝试所有下载链接，直到一个成功
    let lastError = null;
    for (const url of downloadUrls) {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-download-progress', { 
            progress: 0,
            message: `正在尝试下载: ${url.substring(0, 30)}...`
          });
        }
        
        // 如果存在旧的zip文件，删除它
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }
        
        // 创建可写流
        const fileStream = fs.createWriteStream(zipFilePath);
        
        // 使用https下载文件 - 创建一个支持重定向的下载函数
        const downloadWithRedirects = (url, maxRedirects = 5) => {
          return new Promise((resolve, reject) => {
            let redirectCount = 0;
            
            const makeRequest = (currentUrl) => {
              logger.info(`正在请求: ${currentUrl}`);
              
              const isHttps = currentUrl.startsWith('https:');
              const protocolModule = isHttps ? https : http;
              
              const request = protocolModule.get(currentUrl, response => {
                // 处理重定向
                if (response.statusCode >= 300 && response.statusCode < 400) {
                  if (redirectCount >= maxRedirects) {
                    return reject(new Error(`超过最大重定向次数: ${maxRedirects}`));
                  }
                  
                  const location = response.headers.location;
                  if (!location) {
                    return reject(new Error(`收到重定向状态码 ${response.statusCode}，但没有Location头`));
                  }
                  
                  // 构建完整的重定向URL
                  const redirectUrl = new URL(location, currentUrl).toString();
                  logger.info(`重定向到: ${redirectUrl}`);
                  
                  redirectCount++;
                  makeRequest(redirectUrl);
                }
                // 处理成功响应
                else if (response.statusCode === 200) {
                  const totalLength = parseInt(response.headers['content-length'], 10);
                  let downloadedLength = 0;
                  
                  response.on('data', (chunk) => {
                    downloadedLength += chunk.length;
                    const progress = Math.floor((downloadedLength / totalLength) * 100) || 0;
                    // 通知渲染进程下载进度
                    if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.webContents.send('core-download-progress', { progress });
                    }
                  });
                  
                  response.pipe(fileStream);
                  
                  fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                  });

                  fileStream.on('error', (err) => {
                    fileStream.close();
                    if (fs.existsSync(zipFilePath)) {
                      fs.unlinkSync(zipFilePath);
                    }
                    reject(new Error(`文件写入失败: ${err.message}`));
                  });
                }
                // 处理错误响应
                else {
                  response.resume(); // 消耗响应数据以释放内存
                  reject(new Error(`下载失败，状态码: ${response.statusCode}`));
                }
              });
              
              request.on('error', (err) => {
                reject(new Error(`下载请求失败: ${err.message}`));
              });
              
              request.setTimeout(60000, () => {
                request.abort();
                reject(new Error('请求超时，GitHub响应较慢，请稍后再试'));
              });
            };
            
            makeRequest(url);
          });
        };
        
        await downloadWithRedirects(url);
        logger.info(`从 ${url} 下载成功，准备解压`);
        
        const zip = new AdmZip(zipFilePath);
        
        const extractDir = path.join(tempDir, 'extracted');
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });
        
        zip.extractAllTo(extractDir, true);
        
        const exePath = path.join(extractDir, 'sing-box-1.11.4-windows-amd64', 'sing-box.exe');
        
        if (!fs.existsSync(exePath)) {
          throw new Error('未找到sing-box.exe文件');
        }
        
        // 复制到bin目录
        const targetPath = path.join(binDir, 'sing-box.exe');
        fs.copyFileSync(exePath, targetPath);
        
        logger.info(`核心已安装到: ${targetPath}`);
        
        // 清理临时文件
        try {
          if (fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
          }
          if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
          }
        } catch (err) {
          logger.error('清理临时文件失败:', err);
        }
        
        return { 
          success: true, 
          version: 'v1.11.4',
          path: targetPath
        };
      } catch (err) {
        logger.error(`尝试从 ${url} 下载失败:`, err);
        lastError = err;
        
        // 尝试清理可能存在的临时文件
        try {
          if (fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
          }
        } catch (e) {}
        
        // 继续尝试下一个链接
        continue;
      }
    }
    
    // 如果所有链接都失败了，返回最后一个错误
    return { 
      success: false,
      error: `异常下载 ${lastError?.message || '未知错误'}`
    };
  } catch (error) {
    logger.error('下载内核时发生错误:', error);
    return { success: false, error: error.message };
  }
};

// 监听渲染进程请求下载sing-box核心
ipcMain.handle('download-core', async (event) => {
  try {
    const result = await downloadCore();
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

// 监听渲染进程请求通过singbox下载sing-box核心
ipcMain.handle('singbox-download-core', async (event) => {
  try {
    const result = await downloadCore();
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

// 注册sing-box运行服务的IPC处理程序
ipcMain.handle('singbox-run', async (event, args) => {
  try {
    const { configPath } = args;
    
    // 检查是否已有运行的进程
    const runningProcess = singbox.process;
    if (runningProcess) {
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
  if (!runningProcess || !runningProcess.childProcess) {
    return { success: false, error: '没有正在运行的服务' };
  }
  
  try {
    // 先禁用系统代理
    await singbox.disableSystemProxy();
    
    // 然后停止服务
    const result = singbox.stop(runningProcess.pid);
    if (result.success) {
      runningProcess = null;
    }
    return result;
  } catch (error) {
    logger.error('停止服务错误:', error);
    return { success: false, error: error.message };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createWindow();
  
  // 设置IPC处理程序
  setupIpcHandlers();
  
  logger.info('初始化SingBox模块');
  singbox.init();
  
  if (singbox.checkInstalled()) {
    logger.info('sing-box已安装，正在获取版本信息');
    singbox.getVersion().then(result => {
      logger.info('sing-box版本获取结果:', result);
      if (result.success && mainWindow && !mainWindow.isDestroyed()) {
        // 通知渲染进程更新版本信息
        const versionData = {
          version: result.version,
          fullOutput: result.fullOutput
        };
        logger.info('发送版本更新事件到渲染进程:', versionData);
        mainWindow.webContents.send('core-version-update', versionData);
      } else {
        logger.error('获取版本信息失败或窗口已关闭:', result);
      }
    }).catch(err => {
      logger.error('获取sing-box版本失败:', err);
    });
  } else {
    logger.info('sing-box未安装，不获取版本信息');
  }
  
  // 设置定期版本检查（每10秒检查一次，确保界面能获取到）
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    if (!singbox.checkInstalled()) return;
    
    logger.info('执行延迟版本检查');
    singbox.getVersion().then(result => {
      if (result.success && mainWindow && !mainWindow.isDestroyed()) {
        logger.info('延迟检查 - 发送版本更新事件:', result.version);
        mainWindow.webContents.send('core-version-update', {
          version: result.version,
          fullOutput: result.fullOutput
        });
      }
    }).catch(err => {
      logger.error('延迟版本检查失败:', err);
    });
  }, 3000);
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 确保在退出前禁用系统代理
    singbox.disableSystemProxy().finally(() => {
      app.quit();
    });
  }
});

// 确保应用退出前清理所有资源
app.on('will-quit', async (event) => {
  // 阻止应用退出，先执行清理任务
  event.preventDefault();
  
  try {
    // 禁用系统代理
    await singbox.disableSystemProxy();
    
    await singbox.stopCore();
    
    logger.info('退出前清理完成');
  } catch (error) {
    logger.error('退出前清理失败:', error);
  } finally {
    app.exit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});