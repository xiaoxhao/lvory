/**
 * 更新相关IPC处理程序
 */
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('../../utils/logger');
const utils = require('./utils');

/**
 * 更新配置文件
 * @param {string} fileName 文件名
 * @returns {Promise<Object>} 更新结果
 */
async function updateProfile(fileName) {
  try {
    if (!fileName) {
      return { success: false, error: '文件名不能为空' };
    }
    
    // 获取元数据
    let metaCache = utils.readMetaCache();
    let metadata = metaCache[fileName];
    
    // 如果没有元数据，则无法更新
    if (!metadata || !metadata.url) {
      return { success: false, error: '找不到该文件的更新来源' };
    }
    
    // 开始更新
    logger.info(`开始更新配置文件: ${fileName}, URL: ${metadata.url}`);
    
    // 使用适当的协议
    const parsedUrl = new URL(metadata.url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      // 创建请求
      const request = protocol.get(metadata.url, (response) => {
        // 检查状态码
        if (response.statusCode !== 200) {
          // 更新失败计数
          metadata.failCount = (metadata.failCount || 0) + 1;
          if (metadata.failCount >= 3) {
            metadata.status = 'failed';
            logger.warn(`配置文件更新失败3次以上，标记为失效: ${fileName}`);
          }
          
          // 更新元数据
          metaCache[fileName] = metadata;
          utils.writeMetaCache(metaCache);
          
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
        
        // 检查内容类型
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html') && !metadata.url.endsWith('.html')) {
          // 更新失败计数
          metadata.failCount = (metadata.failCount || 0) + 1;
          if (metadata.failCount >= 3) {
            metadata.status = 'failed';
          }
          
          // 更新元数据
          metaCache[fileName] = metadata;
          utils.writeMetaCache(metaCache);
          
          reject(new Error('Server returned HTML instead of a file. This URL may be a web page, not a downloadable file.'));
          return;
        }
        
        const configDir = utils.getConfigDir();
        const filePath = path.join(configDir, fileName);
        
        // 创建写入流
        const file = fs.createWriteStream(filePath);
        
        // 将响应流导向文件
        response.pipe(file);
        
        // 处理写入错误
        file.on('error', (err) => {
          file.close();
          
          // 更新失败计数
          metadata.failCount = (metadata.failCount || 0) + 1;
          if (metadata.failCount >= 3) {
            metadata.status = 'failed';
          }
          
          // 更新元数据
          metaCache[fileName] = metadata;
          utils.writeMetaCache(metaCache);
          
          reject(new Error(`Failed to write file: ${err.message}`));
        });
        
        // 文件写入完成
        file.on('finish', () => {
          file.close();
          
          // 更新元数据
          metadata.lastUpdated = new Date().toISOString();
          metadata.updateCount = (metadata.updateCount || 0) + 1;
          metadata.failCount = 0; // 成功后重置失败计数
          metadata.status = 'active';
          
          // 更新元数据
          metaCache[fileName] = metadata;
          utils.writeMetaCache(metaCache);
          
          // 通知前端
          const mainWindow = utils.getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-updated', {
              success: true,
              fileName: fileName
            });
          }
          
          resolve({
            success: true,
            message: `配置文件已更新: ${fileName}`
          });
        });
      });
      
      // 处理请求错误
      request.on('error', (err) => {
        logger.error(`更新请求错误: ${err.message}`);
        
        // 更新失败计数
        metadata.failCount = (metadata.failCount || 0) + 1;
        if (metadata.failCount >= 3) {
          metadata.status = 'failed';
        }
        
        // 更新元数据
        metaCache[fileName] = metadata;
        utils.writeMetaCache(metaCache);
        
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
        
        // 更新失败计数
        metadata.failCount = (metadata.failCount || 0) + 1;
        if (metadata.failCount >= 3) {
          metadata.status = 'failed';
        }
        
        // 更新元数据
        metaCache[fileName] = metadata;
        utils.writeMetaCache(metaCache);
        
        reject(new Error('Download request timed out. The server is taking too long to respond.'));
      });
    });
  } catch (error) {
    logger.error(`更新配置文件失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 设置更新相关IPC处理程序
 */
function setup() {
  // 更新配置文件并更新状态
  ipcMain.handle('updateProfile', async (event, fileName) => {
    return await updateProfile(fileName);
  });
  
  // 更新所有配置文件
  ipcMain.handle('updateAllProfiles', async () => {
    try {
      const configDir = utils.getConfigDir();
      const metaCache = utils.readMetaCache();
      
      // 如果meta.cache为空，无法更新
      if (Object.keys(metaCache).length === 0) {
        return {
          success: false,
          error: '没有可更新的配置文件信息'
        };
      }
      
      // 筛选可更新的文件
      const files = Object.keys(metaCache).filter(fileName => {
        const metadata = metaCache[fileName];
        return metadata && metadata.url && fs.existsSync(path.join(configDir, fileName));
      });
      
      if (files.length === 0) {
        return {
          success: true,
          message: '没有找到可更新的配置文件',
          updatedFiles: []
        };
      }
      
      logger.info(`开始批量更新${files.length}个配置文件`);
      
      const mainWindow = utils.getMainWindow();
      const results = [];
      
      // 依次更新每个文件
      for (const fileName of files) {
        try {
          // 直接调用更新函数，不通过IPC
          const result = await updateProfile(fileName);
          if (result.success) {
            results.push({
              fileName,
              success: true
            });
          } else {
            results.push({
              fileName,
              success: false,
              error: result.error
            });
          }
        } catch (error) {
          logger.error(`更新${fileName}失败: ${error.message}`);
          results.push({
            fileName,
            success: false,
            error: error.message
          });
          
          // 通知前端
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-updated', {
              success: false,
              fileName: fileName,
              error: error.message
            });
          }
        }
      }
      
      // 更新完毕后，通知前端重新加载文件列表
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: true,
        message: `批量更新完成，成功: ${successCount}/${files.length}`,
        results: results
      };
    } catch (error) {
      logger.error(`批量更新配置文件失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = {
  setup
}; 