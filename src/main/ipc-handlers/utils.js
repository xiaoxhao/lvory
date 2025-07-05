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

const APP_BUILD_DATE = '20240101';
const APP_IS_PORTABLE = 'false';

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

function getAppVersion() {
  ipcMain.handle('get-app-version', async () => {
    try {
      return app.getVersion();
    } catch (error) {
      console.error('获取应用版本失败:', error);
      return '0.1.7';
    }
  });
}

function getBuildDate() {
  ipcMain.handle('get-build-date', async () => {
    try {
      return APP_BUILD_DATE;
    } catch (error) {
      console.error('获取构建日期失败:', error);
      return '20240101';
    }
  });
}

function getIsPortable() {
  ipcMain.handle('get-is-portable', async () => {
    try {
      return APP_IS_PORTABLE === 'true';
    } catch (error) {
      console.error('获取便携模式标识失败:', error);
      return false;
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
        
        // 使用GitHub API获取最新版本信息
        const options = {
          hostname: 'api.github.com',
          path: '/repos/sxueck/lvory/releases',
          method: 'GET',
          headers: {
            'User-Agent': 'lvory-updater',
            'Accept': 'application/vnd.github.v3+json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const releases = JSON.parse(data);
              if (!Array.isArray(releases) || releases.length === 0) {
                resolve({
                  success: false,
                  error: '无法获取版本信息',
                  currentVersion,
                  buildDate: currentBuildDate
                });
                return;
              }

              // 分离正式版本和夜间构建版本
              const stableReleases = releases.filter(release => 
                release.tag_name.match(/^v\d+\.\d+\.\d+$/)
              );
              const nightlyReleases = releases.filter(release => 
                release.tag_name.match(/^nightly-\d{8}$/)
              );

              let hasUpdate = false;
              let latestVersion = currentVersion;
              let latestBuildDate = currentBuildDate;
              let releaseUrl = '';
              let updateType = 'none';

              // 检查是否有新的正式版本
              if (stableReleases.length > 0) {
                const latestStable = stableReleases[0];
                const latestStableVersion = latestStable.tag_name.replace(/^v/, '');
                
                if (compareVersions(latestStableVersion, currentVersion) > 0) {
                  hasUpdate = true;
                  latestVersion = latestStableVersion;
                  releaseUrl = latestStable.html_url;
                  updateType = 'stable';
                }
              }

              // 如果是开发构建，检查夜间构建版本
              if (isDevelopmentBuild && nightlyReleases.length > 0) {
                const latestNightly = nightlyReleases[0];
                const latestNightlyDate = latestNightly.tag_name.replace(/^nightly-/, '');
                
                if (latestNightlyDate > currentBuildDate) {
                  hasUpdate = true;
                  latestBuildDate = latestNightlyDate;
                  releaseUrl = latestNightly.html_url;
                  updateType = 'nightly';
                }
              }

              logger.info(`检查更新: 当前版本=${currentVersion}, 最新版本=${latestVersion}, 有更新=${hasUpdate}, 类型=${updateType}`);

              resolve({
                success: true,
                currentVersion,
                latestVersion,
                buildDate: currentBuildDate,
                latestBuildDate,
                hasUpdate,
                releaseUrl,
                updateType,
                isDevelopmentBuild
              });

            } catch (parseError) {
              logger.error('解析版本信息失败:', parseError);
              resolve({
                success: false,
                error: '解析版本信息失败',
                currentVersion,
                buildDate: currentBuildDate
              });
            }
          });
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
      let dataSize = 0;
      const maxSize = 100 * 1024; // 限制响应大小为100KB
      
      res.on('data', (chunk) => {
        dataSize += chunk.length;
        if (dataSize > maxSize) {
          req.destroy();
          reject(new Error('响应数据过大'));
          return;
        }
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const searchLimit = Math.min(data.length, 50000); // 只搜索前50KB
          const limitedData = data.substring(0, searchLimit);
          
          // 查找markdown-body div的开始位置
          const startPattern = '<div class="markdown-body my-3">';
          const endPattern = '</div>';
          const startIndex = limitedData.indexOf(startPattern);
          
          if (startIndex !== -1) {
            const contentStart = startIndex + startPattern.length;
            const contentEnd = limitedData.indexOf(endPattern, contentStart);
            
            if (contentEnd !== -1) {
              let description = limitedData.substring(contentStart, contentEnd);
              
              // 安全地清理HTML标签，使用简单的字符串替换而非复杂正则
              description = description
                .replace(/</g, ' <')  // 在<前添加空格，避免标签粘连
                .replace(/<[^>]{1,100}>/g, '')  // 限制标签长度，防止恶意构造的超长标签
                .replace(/\s+/g, ' ')  // 合并多个空白字符
                .trim();
              
              // 限制长度
              if (description.length > 300) {
                description = description.substring(0, 300) + '...';
              }
              
              resolve(description);
            } else {
              resolve('');
            }
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
    
    // 设置请求超时，防止长时间等待
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
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

// 获取所有版本信息
function getAllVersions() {
  ipcMain.handle('get-all-versions', async () => {
    return new Promise((resolve) => {
      try {
        const options = {
          hostname: 'api.github.com',
          path: '/repos/sxueck/lvory/releases?per_page=50',
          method: 'GET',
          headers: {
            'User-Agent': 'lvory-updater',
            'Accept': 'application/vnd.github.v3+json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const releases = JSON.parse(data);
              if (!Array.isArray(releases)) {
                resolve({
                  success: false,
                  error: '无效的响应格式'
                });
                return;
              }

              // 分类和处理版本信息
              const processedReleases = releases.map(release => {
                const isNightly = release.tag_name.startsWith('nightly-');
                const isPrerelease = release.prerelease;
                const isDraft = release.draft;
                
                let version = release.tag_name;
                let type = 'stable';
                
                if (isNightly) {
                  type = 'nightly';
                  version = release.tag_name.replace('nightly-', '');
                } else if (isPrerelease) {
                  type = 'prerelease';
                  version = version.replace(/^v/, '');
                } else if (!isDraft) {
                  version = version.replace(/^v/, '');
                }

                return {
                  id: release.id,
                  tag_name: release.tag_name,
                  version,
                  type,
                  name: release.name || release.tag_name,
                  body: release.body || '',
                  html_url: release.html_url,
                  published_at: release.published_at,
                  created_at: release.created_at,
                  assets: release.assets.map(asset => ({
                    name: asset.name,
                    size: asset.size,
                    download_count: asset.download_count,
                    browser_download_url: asset.browser_download_url,
                    content_type: asset.content_type
                  })),
                  prerelease: isPrerelease,
                  draft: isDraft
                };
              }).filter(release => !release.draft); // 过滤掉草稿版本

              resolve({
                success: true,
                releases: processedReleases,
                total: processedReleases.length
              });

            } catch (parseError) {
              logger.error('解析版本列表失败:', parseError);
              resolve({
                success: false,
                error: '解析版本列表失败'
              });
            }
          });
        });

        req.on('error', (error) => {
          logger.error('获取版本列表失败:', error);
          resolve({
            success: false,
            error: error.message
          });
        });

        req.end();
      } catch (error) {
        logger.error('获取版本列表异常:', error);
        resolve({
          success: false,
          error: error.message
        });
      }
    });
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
  getIsPortable,
  checkForUpdates,
  openExternal,
  getAllVersions
}; 
