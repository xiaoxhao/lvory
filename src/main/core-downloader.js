/**
 * 内核下载器模块
 * 负责下载和安装sing-box内核
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const logger = require('../utils/logger');

// 尝试导入AdmZip，用于解压文件
let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (error) {
  logger.warn('AdmZip库未安装，解压功能将不可用');
}

/**
 * 下载内核函数
 * @param {Object} options 下载选项
 * @returns {Promise<Object>} 下载结果
 */
const downloadCore = async (mainWindow) => {
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
        const downloadWithRedirects = async (url, maxRedirects = 5) => {
          let redirectCount = 0;
          let currentUrl = url;
          
          while (redirectCount < maxRedirects) {
            const urlObj = new URL(currentUrl);
            const options = {
              hostname: urlObj.hostname,
              path: urlObj.pathname + urlObj.search,
              headers: {
                'User-Agent': 'LVORY-Downloader'
              }
            };
            
            try {
              await new Promise((resolve, reject) => {
                const request = https.get(options, async (response) => {
                  // 处理重定向
                  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    redirectCount++;
                    currentUrl = response.headers.location;
                    fileStream.close();
                    resolve();
                    return;
                  }
                  
                  if (response.statusCode !== 200) {
                    reject(new Error(`状态码: ${response.statusCode}`));
                    return;
                  }
                  
                  const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                  let downloadedBytes = 0;
                  
                  response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
                      const progress = Math.floor((downloadedBytes / totalBytes) * 100);
                      mainWindow.webContents.send('core-download-progress', {
                        progress,
                        message: `已下载: ${progress}%`
                      });
                    }
                  });
                  
                  try {
                    await streamPipeline(response, fileStream);
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                });
                
                request.on('error', (err) => {
                  reject(err);
                });
              });
              
              // 如果没有重定向，跳出循环
              break;
            } catch (error) {
              if (redirectCount >= maxRedirects) {
                throw new Error(`超过最大重定向次数: ${maxRedirects}`);
              }
              // 继续下一次重定向尝试
            }
          }
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

module.exports = {
  downloadCore
}; 