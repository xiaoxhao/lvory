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
 * 更新单个配置文件
 * @param {string} fileName 配置文件名
 * @returns {Promise<Object>} 更新结果
 */
async function updateProfile(fileName) {
  try {
    if (!fileName) {
      return { success: false, error: '文件名不能为空' };
    }

    const configDir = utils.getConfigDir();
    const filePath = path.join(configDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `配置文件不存在: ${fileName}` };
    }

    // 从元数据中获取URL
    const metaCache = utils.readMetaCache();
    const metadata = metaCache[fileName];
    
    if (!metadata || !metadata.url) {
      return { success: false, error: `找不到文件 ${fileName} 的下载URL，无法更新` };
    }

    const fileUrl = metadata.url;
    logger.info(`开始更新配置文件: ${fileName} from ${fileUrl}`);

    // 使用适当的协议
    const parsedUrl = new URL(fileUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const request = protocol.get(fileUrl, (response) => {
        try {
          // 检查HTTP响应状态
          if (response.statusCode !== 200) {
            const error = `HTTP ${response.statusCode}: ${response.statusMessage || 'Request failed'}`;
            logger.error(`更新失败: ${error}`);
            
            // 更新失败计数
            const subscriptionManager = require('../data-managers/subscription-manager');
            subscriptionManager.updateSubscription(fileName, {
              failCount: (metadata.failCount || 0) + 1,
              lastError: error,
              lastAttempt: new Date().toISOString()
            });
            
            resolve({ success: false, error: error });
            return;
          }

          // 创建临时文件
          const tempFileName = `${fileName}.tmp`;
          const tempFilePath = path.join(configDir, tempFileName);
          const file = fs.createWriteStream(tempFilePath);

          response.pipe(file);

          file.on('error', (err) => {
            file.close();
            // 删除临时文件
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            
            const errorMsg = `写入文件失败: ${err.message}`;
            logger.error(errorMsg);

            // 更新失败计数
            const subscriptionManager = require('../data-managers/subscription-manager');
            subscriptionManager.updateSubscription(fileName, {
              failCount: (metadata.failCount || 0) + 1,
              lastError: errorMsg,
              lastAttempt: new Date().toISOString()
            });
            
            resolve({ success: false, error: errorMsg });
          });

          file.on('finish', () => {
            file.close();
            
            try {
              // 注意：移除了配置文件处理调用
              // TUN配置现在由映射引擎根据用户设置动态管理
              
              // 用新文件替换旧文件
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              fs.renameSync(tempFilePath, filePath);
              
              logger.info(`配置文件更新完成: ${fileName}`);

              // 更新元数据
              const subscriptionManager = require('../data-managers/subscription-manager');
              subscriptionManager.updateSubscription(fileName, {
                lastUpdated: new Date().toISOString(),
                updateCount: (metadata.updateCount || 0) + 1,
                failCount: 0,
                status: 'active',
                lastError: null
              });
              
              resolve({
                success: true,
                message: `配置文件 ${fileName} 更新成功`,
                updateCount: metadata.updateCount
              });
              
            } catch (replaceError) {
              // 清理临时文件
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
              
              const errorMsg = `替换文件失败: ${replaceError.message}`;
              logger.error(errorMsg);

              // 更新失败计数
              const subscriptionManager = require('../data-managers/subscription-manager');
              subscriptionManager.updateSubscription(fileName, {
                failCount: (metadata.failCount || 0) + 1,
                lastError: errorMsg,
                lastAttempt: new Date().toISOString()
              });
              
              resolve({ success: false, error: errorMsg });
            }
          });

        } catch (responseError) {
          logger.error('更新响应处理错误:', responseError);
          
          // 清理临时文件
          const tempFilePath = path.join(configDir, `${fileName}.tmp`);
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          
          const errorMsg = `响应处理失败: ${responseError.message}`;

          // 更新失败计数
          const subscriptionManager = require('../data-managers/subscription-manager');
          subscriptionManager.updateSubscription(fileName, {
            failCount: (metadata.failCount || 0) + 1,
            lastError: errorMsg,
            lastAttempt: new Date().toISOString()
          });
          
          resolve({ success: false, error: errorMsg });
        }
      });

      // 处理请求错误
      request.on('error', (err) => {
        logger.error('更新请求错误:', err);
        
        let errorMessage = err.message;
        if (err.code === 'ENOTFOUND') {
          errorMessage = '主机未找到，请检查URL或网络连接';
        } else if (err.code === 'ECONNREFUSED') {
          errorMessage = '连接被拒绝，服务器可能宕机或阻止请求';
        } else if (err.code === 'ECONNRESET') {
          errorMessage = '连接重置，远程服务器强制关闭了连接';
        } else if (err.code === 'ETIMEDOUT') {
          errorMessage = '连接超时，服务器响应时间过长';
        }
        
        // 更新失败计数
        const subscriptionManager = require('../data-managers/subscription-manager');
        subscriptionManager.updateSubscription(fileName, {
          failCount: (metadata.failCount || 0) + 1,
          lastError: errorMessage,
          lastAttempt: new Date().toISOString()
        });
        
        resolve({ success: false, error: errorMessage });
      });

      // 设置请求超时
      request.setTimeout(30000, () => {
        request.destroy();
        
        const errorMsg = '更新请求超时，服务器响应时间过长';

        // 更新失败计数
        const subscriptionManager = require('../data-managers/subscription-manager');
        subscriptionManager.updateSubscription(fileName, {
          failCount: (metadata.failCount || 0) + 1,
          lastError: errorMsg,
          lastAttempt: new Date().toISOString()
        });
        
        resolve({ success: false, error: errorMsg });
      });
    });

  } catch (error) {
    logger.error(`更新配置文件 ${fileName} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 设置更新相关IPC处理程序
 */
function setup() {
  // 处理更新单个配置文件请求
  ipcMain.handle('update-profile', async (event, fileName) => {
    return await updateProfile(fileName);
  });

  // 处理批量更新配置文件请求
  ipcMain.handle('update-all-profiles', async (event) => {
    try {
      const configDir = utils.getConfigDir();
      
      if (!fs.existsSync(configDir)) {
        return {
          success: false,
          error: '配置目录不存在'
        };
      }

      // 读取元数据缓存
      const metaCache = utils.readMetaCache();
      const fileNames = Object.keys(metaCache);
      
      if (fileNames.length === 0) {
        return {
          success: true,
          message: '没有配置文件需要更新',
          results: []
        };
      }

      logger.info(`开始批量更新 ${fileNames.length} 个配置文件`);

      // 并行更新所有文件
      const updatePromises = fileNames.map(fileName => 
        updateProfile(fileName).then(result => ({
          fileName,
          ...result
        }))
      );

      const results = await Promise.all(updatePromises);
      
      // 统计结果
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      logger.info(`批量更新完成: ${successCount} 成功, ${failCount} 失败`);

      return {
        success: true,
        message: `批量更新完成: ${successCount} 成功, ${failCount} 失败`,
        results: results,
        successCount: successCount,
        failCount: failCount
      };

    } catch (error) {
      logger.error('批量更新失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = {
  setup,
  updateProfile
}; 