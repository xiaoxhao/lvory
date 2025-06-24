/**
 * 下载相关IPC处理程序
 */
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const http = require('http');
const https = require('https');
const logger = require('../../utils/logger');
const utils = require('./utils');

/**
 * 设置下载相关IPC处理程序
 */
function setup() {
  // 处理下载配置文件请求
  ipcMain.handle('download-profile', async (event, data) => {
    let customFileName;
    let configDir;
    try {
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          message: 'Invalid request format',
          error: 'Expected object with url property'
        };
      }

      const fileUrl = data.url;
      const isDefaultConfig = data.isDefaultConfig || false; // 从传入参数中获取
      
      logger.info('Starting download:', fileUrl);
      
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
      
      // 获取配置文件目录
      configDir = utils.getConfigDir();
      logger.info('Config directory:', configDir);
      
      // 如果没有提供自定义文件名，从URL中提取
      if (!data.fileName) {
        const parsedUrlObj = new URL(fileUrl);
        customFileName = path.basename(parsedUrlObj.pathname) || 'profile.json';
      } else {
        customFileName = data.fileName;
      }

      
      // 确保文件名是安全的
      customFileName = customFileName.replace(/[/\\?%*:|"<>]/g, '-');
      
      // 完整的保存路径
      const filePath = path.join(configDir, customFileName);
      logger.info('File will be saved to:', filePath);
      
      // 检查文件夹是否可写
      try {
        await fsPromises.access(configDir, fs.constants.W_OK);
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
      const mainWindow = utils.getMainWindow();
      
      // 使用 await 和 Promise 处理异步下载操作
      const downloadResult = await new Promise((resolve, reject) => {
        const request = protocol.get(fileUrl, async (response) => {
          let filePath;
          try {
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
              throw new Error(errorMessage);
            }
            
            // 检查内容类型，如果服务器返回了明确的错误页面类型，可能是被重定向了
            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('text/html') && !fileUrl.endsWith('.html')) {
              throw new Error('Server returned HTML instead of a file. This URL may be a web page, not a downloadable file.');
            }
            
            // 从响应头中获取文件名
            if (!data.fileName || customFileName === path.basename(new URL(fileUrl).pathname)) {
              // 优先使用Content-Disposition头
              const contentDisposition = response.headers['content-disposition'];
              if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                  customFileName = filenameMatch[1];
                  logger.info(`从Content-Disposition头获取的文件名: ${customFileName}`);
                }
              }
            }
            
            customFileName = customFileName.replace(/[/\\?%*:|"<>]/g, '-');
            
            // 确定最终文件路径
            filePath = path.join(configDir, customFileName);
            logger.info('File will be saved to:', filePath);
            
            const file = fs.createWriteStream(filePath);
            
            // 使用 Promise 处理 stream 事件
            await new Promise((resolveFile, rejectFile) => {
              response.pipe(file);
              
              file.on('error', async (err) => {
                file.close();
                try {
                  await fsPromises.unlink(filePath);
                  logger.warn(`Deleted partially downloaded file due to write error: ${filePath}`);
                } catch (unlinkErr) {
                  if (unlinkErr.code !== 'ENOENT') {
                     logger.error(`Failed to delete partially downloaded file after write error: ${filePath}`, unlinkErr);
                  }
                }
                rejectFile(new Error(`Failed to write file: ${err.message}`));
              });
              
              file.on('finish', () => {
                file.close();
                resolveFile();
              });
            });
            
            // 创建文件元数据
            const metadata = {
              url: fileUrl,
              timestamp: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              updateCount: 0,
              failCount: 0,
              status: 'active'
            };
            
            try {
              let metaCache = utils.readMetaCache();
              metaCache[customFileName] = metadata;
              utils.writeMetaCache(metaCache);
              logger.info('The profile metadata has been updated');
            } catch (cacheErr) {
              logger.error(`Failed to update meta.cache: ${cacheErr.message}`);
            }
            
            // 通知渲染进程下载完成
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-complete', {
                success: true,
                message: `Profile saved to: ${filePath}`,
                path: filePath,
                isDefaultConfig: isDefaultConfig,
                url: fileUrl
              });
            }
            
            resolve({
              success: true,
              message: `Profile saved to: ${filePath}`,
              path: filePath,
              isDefaultConfig: isDefaultConfig,
              url: fileUrl
            });
          } catch (responseError) {
            logger.error('Error during download response processing:', responseError);
            if (filePath) {
               fsPromises.unlink(filePath).catch(unlinkErr => {
                 if (unlinkErr.code !== 'ENOENT') {
                   logger.error(`Failed to delete file on response error: ${filePath}`, unlinkErr);
                 }
               });
            }
            reject(responseError);
          }
        });
        
        // 处理请求错误
        request.on('error', (err) => {
          logger.error('Download request error:', err);
          const tentativeFilePath = path.join(configDir, customFileName);
          fsPromises.unlink(tentativeFilePath).catch(unlinkErr => {
            if (unlinkErr.code !== 'ENOENT') {
              logger.error(`Failed to delete file on request error: ${tentativeFilePath}`, unlinkErr);
            }
          });
          
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
          request.destroy();
          const tentativeFilePath = path.join(configDir, customFileName);
          fsPromises.unlink(tentativeFilePath).catch(unlinkErr => {
            if (unlinkErr.code !== 'ENOENT') {
              logger.error(`Failed to delete file on timeout: ${tentativeFilePath}`, unlinkErr);
            }
          }).finally(() => {
            reject(new Error('Download request timed out. The server is taking too long to respond.'));
          });
        });
      });

      return downloadResult;
    } catch (error) {
      logger.error('Failed to download profile (outer catch):', error);
      return {
        success: false,
        message: `Download failed: ${error.message}`,
        error: error.toString()
      };
    }
  });
}

module.exports = {
  setup
}; 