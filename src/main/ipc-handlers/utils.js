/**
 * IPC处理程序公共工具模块
 */
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const windowManager = require('../window');
const { ipcMain, app, shell } = require('electron');
const os = require('os');
const https = require('https');
const { getAppDataDir, getConfigDir } = require('../../utils/paths');

// 应用构建日期，由CI注入
const APP_BUILD_DATE = '20240101'; // 默认构建日期

/**
 * 获取主窗口
 * @returns {BrowserWindow|null} 主窗口对象或null
 */
function getMainWindow() {
  return windowManager.getMainWindow();
}

/**
 * 读取元数据缓存文件
 * @returns {Object} 元数据缓存对象
 */
function readMetaCache() {
  try {
    const metaCachePath = path.join(getConfigDir(), 'meta.cache');
    if (fs.existsSync(metaCachePath)) {
      const cacheData = fs.readFileSync(metaCachePath, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    logger.error(`读取meta.cache失败: ${error.message}`);
  }
  return {};
}

/**
 * 写入元数据缓存文件
 * @param {Object} metaCache 元数据缓存对象
 * @returns {Boolean} 是否成功写入
 */
function writeMetaCache(metaCache) {
  try {
    const metaCachePath = path.join(getConfigDir(), 'meta.cache');
    fs.writeFileSync(metaCachePath, JSON.stringify(metaCache, null, 2));
    return true;
  } catch (error) {
    logger.error(`更新meta.cache失败: ${error.message}`);
    return false;
  }
}

// 获取应用版本
function getAppVersion() {
  ipcMain.handle('get-app-version', async () => {
    try {
      // 使用Electron内置app对象获取版本号
      return app.getVersion();
    } catch (error) {
      console.error('获取应用版本失败:', error);
      // 返回默认版本号
      return '0.1.7';
    }
  });
}

// 获取应用构建日期
function getBuildDate() {
  ipcMain.handle('get-build-date', async () => {
    try {
      return APP_BUILD_DATE;
    } catch (error) {
      console.error('获取构建日期失败:', error);
      return '20240101'; // 返回默认日期
    }
  });
}

// 检查应用版本更新
function checkForUpdates() {
  ipcMain.handle('check-for-updates', async () => {
    return new Promise((resolve) => {
      try {
        // 获取当前版本和构建日期
        const currentVersion = app.getVersion();
        const currentBuildDate = APP_BUILD_DATE;
        const isDevelopmentBuild = currentBuildDate === '20240101'; // 判断是否为开发构建
        let isFirstRun = false;
        
        try {
          // 检查是否首次运行
          const appDataDir = getAppDataDir();
          const updateFlagPath = path.join(appDataDir, 'first_run_flag');
          if (!fs.existsSync(updateFlagPath)) {
            // 创建首次运行标记文件
            fs.writeFileSync(updateFlagPath, new Date().toISOString());
            isFirstRun = true;
          }
        } catch (flagError) {
          logger.error('检查首次运行失败:', flagError);
        }
        
        // 如果是开发构建且是首次运行，直接返回开发模式提示
        if (isDevelopmentBuild && isFirstRun) {
          return resolve({
            success: true,
            currentVersion,
            buildDate: currentBuildDate,
            isDevelopmentBuild: true,
            isFirstRun: true,
            hasUpdate: false,
            updateType: 'development'
          });
        }
        
        // 请求GitHub最新版本信息
        const options = {
          hostname: 'github.com',
          path: '/sxueck/lvory/releases/latest',
          method: 'GET',
          headers: {
            'User-Agent': 'lvory-updater'
          }
        };

        const req = https.request(options, (res) => {
          // 处理重定向，获取最终URL
          if (res.statusCode === 302 || res.statusCode === 301) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              // 从重定向URL中提取版本号
              const versionMatch = redirectUrl.match(/\/tag\/v([\d\.]+)$/);
              const nightlyMatch = redirectUrl.match(/\/tag\/nightly-(\d{8})$/);
              
              let latestVersion = currentVersion;
              let latestBuildDate = currentBuildDate;
              let isNightlyBuild = false;
              
              if (versionMatch && versionMatch[1]) {
                // 正式版本
                latestVersion = versionMatch[1];
                
                // 比较版本号
                const hasNewVersion = compareVersions(latestVersion, currentVersion) > 0;
                
                if (hasNewVersion) {
                  logger.info(`检查更新: 当前版本=${currentVersion}, 最新版本=${latestVersion}, 有更新=true`);
                  
                  // 获取版本说明
                  getVersionDescription(redirectUrl).then(description => {
                    resolve({
                      success: true,
                      currentVersion,
                      latestVersion,
                      buildDate: currentBuildDate,
                      hasUpdate: true,
                      releaseUrl: redirectUrl,
                      releaseDescription: description,
                      updateType: 'release'
                    });
                  }).catch(error => {
                    logger.error('获取版本说明失败:', error);
                    resolve({
                      success: true,
                      currentVersion,
                      latestVersion,
                      buildDate: currentBuildDate,
                      hasUpdate: true,
                      releaseUrl: redirectUrl,
                      updateType: 'release'
                    });
                  });
                } else {
                  logger.info(`检查更新: 当前版本=${currentVersion}, 最新版本=${latestVersion}, 有更新=false`);
                  resolve({
                    success: true,
                    currentVersion,
                    latestVersion,
                    buildDate: currentBuildDate,
                    hasUpdate: false,
                    updateType: 'release'
                  });
                }
              } else if (nightlyMatch && nightlyMatch[1]) {
                // 夜间构建版本，忽略
                resolve({
                  success: true,
                  currentVersion,
                  buildDate: currentBuildDate,
                  hasUpdate: false,
                  updateType: 'ignore'
                });
              } else {
                resolve({
                  success: false,
                  error: '无法解析版本号',
                  currentVersion,
                  buildDate: currentBuildDate
                });
              }
            } else {
              resolve({
                success: false,
                error: '重定向URL为空',
                currentVersion,
                buildDate: currentBuildDate
              });
            }
          } else {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              // 如果无法通过重定向获取版本，尝试从页面内容解析
              resolve({
                success: false,
                error: `请求返回状态码 ${res.statusCode}`,
                currentVersion,
                buildDate: currentBuildDate
              });
            });
          }
        });

        req.on('error', (error) => {
          logger.error('检查更新失败:', error);
          resolve({
            success: false,
            error: error.message,
            currentVersion,
            buildDate: currentBuildDate
          });
        });

        req.end();
      } catch (error) {
        logger.error('检查更新异常:', error);
        resolve({
          success: false,
          error: error.message,
          currentVersion: app.getVersion(),
          buildDate: APP_BUILD_DATE
        });
      }
    });
  });
}

// 比较版本号
function compareVersions(versionA, versionB) {
  const partsA = versionA.split('.').map(Number);
  const partsB = versionB.split('.').map(Number);
  
  const maxLength = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < maxLength; i++) {
    const partA = i < partsA.length ? partsA[i] : 0;
    const partB = i < partsB.length ? partsB[i] : 0;
    
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  
  return 0;
}

// 获取版本说明
async function getVersionDescription(releaseUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'github.com',
      path: releaseUrl.replace('https://github.com', ''),
      method: 'GET',
      headers: {
        'User-Agent': 'lvory-updater'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // 简单提取版本说明，使用正则表达式
          const descriptionMatch = data.match(/<div class="markdown-body my-3">([\s\S]*?)<\/div>/);
          if (descriptionMatch && descriptionMatch[1]) {
            // 简单清理HTML标签
            let description = descriptionMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/\n+/g, '\n')
              .trim();
            
            // 限制长度
            if (description.length > 300) {
              description = description.substring(0, 300) + '...';
            }
            
            resolve(description);
          } else {
            resolve('');
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// 获取本机所有网络接口
function getNetworkInterfaces() {
  ipcMain.handle('get-network-interfaces', async () => {
    try {
      const networkInterfaces = os.networkInterfaces();
      const result = [];
      
      // 遍历所有网络接口
      Object.keys(networkInterfaces).forEach(interfaceName => {
        // 过滤IPv4地址并排除本地回环
        const interfaces = networkInterfaces[interfaceName]
          .filter(iface => iface.family === 'IPv4' && !iface.internal);
        
        interfaces.forEach(iface => {
          result.push({
            name: interfaceName,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac
          });
        });
      });
      
      return result;
    } catch (error) {
      console.error('获取网络接口信息失败:', error);
      return [];
    }
  });
}

// 打开外部链接
function openExternal() {
  ipcMain.handle('open-external', async (event, url) => {
    try {
      if (!url) {
        return { success: false, error: 'URL不能为空' };
      }
      
      // 验证URL以防止恶意链接
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { success: false, error: '不支持的URL协议' };
      }
      
      // 使用shell模块打开外部链接
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      logger.error('打开外部链接失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  getAppDataDir,
  getConfigDir,
  getMainWindow,
  readMetaCache,
  writeMetaCache,
  getNetworkInterfaces,
  getAppVersion,
  getBuildDate,
  checkForUpdates,
  openExternal
}; 
