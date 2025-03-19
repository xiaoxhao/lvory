/**
 * 下载相关IPC处理程序
 */
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
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
      
      // 获取配置文件目录
      const configDir = utils.getConfigDir();
      logger.info('Config directory:', configDir);
      
      // 如果没有提供自定义文件名，从URL中提取
      if (!customFileName) {
        const parsedUrlObj = new URL(fileUrl);
        customFileName = path.basename(parsedUrlObj.pathname) || 'profile.json';
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
      const mainWindow = utils.getMainWindow();
      
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
          
          // 从响应头中获取文件名
          if (!customFileName || customFileName === path.basename(new URL(fileUrl).pathname)) {
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
          
          // 如果设置为默认配置，强制文件名为sing-box.json
          if (isDefaultConfig) {
            customFileName = 'sing-box.json';
          }
          
          const filePath = path.join(configDir, customFileName);
          logger.info('File will be saved to:', filePath);
          
          const file = fs.createWriteStream(filePath);
          response.pipe(file);
          
          file.on('error', (err) => {
            file.close();
            fs.unlink(filePath, () => {}); // 删除失败的文件
            reject(new Error(`Failed to write file: ${err.message}`));
          });
          
          // 文件写入完成
          file.on('finish', () => {
            file.close();
            
            // 创建文件元数据
            const metadata = {
              url: fileUrl,
              timestamp: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              updateCount: 0,
              failCount: 0,
              status: 'active' // 状态：active, failed
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
            
            // 返回成功信息
            resolve({
              success: true,
              message: `Profile saved to: ${filePath}`,
              path: filePath,
              isDefaultConfig: isDefaultConfig,
              url: fileUrl
            });
          });
        });
        
        // 处理请求错误
        request.on('error', (err) => {
          logger.error('Download request error:', err);
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // 忽略删除错误
          }
          
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
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // 忽略删除错误
          }
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
}

module.exports = {
  setup
}; 