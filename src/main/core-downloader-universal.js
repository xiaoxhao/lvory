/**
 * 通用内核下载器模块
 * 支持下载和安装多种内核类型（sing-box, mihomo）
 * 支持代理源重试机制
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
const { getAppDataDir, getBinDir } = require('../utils/paths');
const { CORE_TYPES, getCoreConfig, getCurrentPlatformArch } = require('../constants/core-types');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (error) {
  logger.warn(`AdmZip库未安装，解压功能将不可用: ${error.message}`);
}

const MIRROR_BASE_URL = 'https://mirrors.sxueck.com';
const { CORE_VERSIONS } = require('../config/versions');

class UniversalCoreDownloader {
  constructor() {
    this.downloadInProgress = false;
    this.currentDownload = null;
  }

  /**
   * 检查URL是否可达
   * @param {string} url 要检查的URL
   * @param {number} timeout 超时时间（毫秒）
   * @returns {Promise<boolean>} 是否可达
   */
  async checkUrlAvailability(url, timeout = 5000) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: timeout,
        headers: {
          'User-Agent': 'lvory-downloader'
        }
      };

      const request = https.request(options, (response) => {
        resolve(response.statusCode >= 200 && response.statusCode < 400);
      });

      request.on('error', () => {
        resolve(false);
      });

      request.on('timeout', () => {
        request.destroy();
        resolve(false);
      });

      request.end();
    });
  }

  /**
   * 获取 GitHub releases 信息
   * @param {string} coreType 内核类型
   * @returns {Promise<Object>} releases 信息
   */
  async getGitHubReleases(coreType) {
    const config = getCoreConfig(coreType);
    const repoUrl = config.downloadUrl.github;
    
    // 从 GitHub URL 提取仓库信息
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${repoUrl}`);
    }

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases`,
        method: 'GET',
        headers: {
          'User-Agent': 'lvory-downloader',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const releases = JSON.parse(data);
            resolve(releases);
          } catch (error) {
            reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`GitHub API request failed: ${error.message}`));
      });

      request.end();
    });
  }

  /**
   * 获取最新版本信息
   * @param {string} coreType 内核类型
   * @returns {Promise<Object>} 最新版本信息
   */
  async getLatestVersion(coreType) {
    try {
      const releases = await this.getGitHubReleases(coreType);
      if (!releases || releases.length === 0) {
        throw new Error('No releases found');
      }

      const latestRelease = releases[0];
      // 确保所有返回的属性都是可序列化的基本类型
      return {
        version: String(latestRelease.tag_name || ''),
        name: String(latestRelease.name || ''),
        publishedAt: String(latestRelease.published_at || ''),
        // 只返回必要的 assets 信息，避免复杂对象导致克隆错误
        assetsCount: Number(latestRelease.assets ? latestRelease.assets.length : 0)
      };
    } catch (error) {
      logger.error(`获取 ${coreType} 最新版本失败:`, error);
      throw error;
    }
  }

  /**
   * 构建下载URL
   * @param {string} coreType 内核类型
   * @param {string} version 版本号
   * @param {boolean} useMirror 是否使用代理源
   * @returns {Object} 下载信息
   */
  buildDownloadInfo(coreType, version, useMirror = false) {
    // 标准化内核类型名称
    const normalizedCoreType = coreType === 'sing-box' ? CORE_TYPES.SINGBOX :
                              coreType === 'mihomo' ? CORE_TYPES.MIHOMO : coreType;

    const config = getCoreConfig(normalizedCoreType);
    const { platform, arch } = getCurrentPlatformArch();

    let downloadUrl, archiveName, binaryName, extractedFolderName;

    if (coreType === CORE_TYPES.SINGBOX || coreType === 'sing-box') {
      // sing-box 下载逻辑
      const versionWithoutV = version.replace(/^v/, '');
      archiveName = `sing-box-${versionWithoutV}-${platform}-${arch}`;
      extractedFolderName = archiveName;

      if (platform === 'windows') {
        archiveName += '.zip';
      } else {
        archiveName += '.tar.gz';
      }

      if (useMirror) {
        // 使用代理源
        downloadUrl = `${MIRROR_BASE_URL}/github.com/SagerNet/sing-box/releases/download/${version}/${archiveName}`;
      } else {
        // 使用原始 GitHub 地址
        downloadUrl = `https://github.com/SagerNet/sing-box/releases/download/${version}/${archiveName}`;
      }
      binaryName = config.binaryName;

    } else if (coreType === CORE_TYPES.MIHOMO || coreType === 'mihomo') {
      // mihomo 下载逻辑
      // 注意：mihomo的文件名需要保留版本号前的 'v'
      if (platform === 'windows') {
        archiveName = `mihomo-windows-${arch}-${version}.zip`;
      } else if (platform === 'darwin') {
        archiveName = `mihomo-darwin-${arch}-${version}.gz`;
      } else {
        archiveName = `mihomo-linux-${arch}-${version}.gz`;
      }

      if (useMirror) {
        // 使用代理源
        downloadUrl = `${MIRROR_BASE_URL}/github.com/MetaCubeX/mihomo/releases/download/${version}/${archiveName}`;
      } else {
        // 使用原始 GitHub 地址
        downloadUrl = `https://github.com/MetaCubeX/mihomo/releases/download/${version}/${archiveName}`;
      }
      binaryName = config.binaryName;
    } else {
      throw new Error(`Unsupported core type: ${coreType}`);
    }

    return {
      downloadUrl,
      archiveName,
      binaryName,
      extractedFolderName,
      platform,
      arch
    };
  }

  /**
   * 下载文件（支持重定向和超时）
   * @param {string} url 下载URL
   * @param {string} outputPath 输出路径
   * @param {Function} progressCallback 进度回调
   * @param {number} maxRedirects 最大重定向次数
   * @returns {Promise<void>}
   */
  async downloadFile(url, outputPath, progressCallback, maxRedirects = 5) {
    let redirectCount = 0;
    let currentUrl = url;

    while (redirectCount < maxRedirects) {
      try {
        await this._downloadFileInternal(currentUrl, outputPath, progressCallback);
        return; // 下载成功，退出循环
      } catch (error) {
        if (error.isRedirect && redirectCount < maxRedirects) {
          redirectCount++;
          currentUrl = error.location;
          logger.info(`重定向到: ${currentUrl} (${redirectCount}/${maxRedirects})`);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`超过最大重定向次数: ${maxRedirects}`);
  }

  /**
   * 内部下载文件方法
   * @param {string} url 下载URL
   * @param {string} outputPath 输出路径
   * @param {Function} progressCallback 进度回调
   * @returns {Promise<void>}
   */
  async _downloadFileInternal(url, outputPath, progressCallback) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);

      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        timeout: 30000, // 30秒超时
        headers: {
          'User-Agent': 'lvory-downloader'
        }
      };

      const request = https.get(options, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // 处理重定向
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          const redirectError = new Error('Redirect');
          redirectError.isRedirect = true;
          redirectError.location = response.headers.location;
          return reject(redirectError);
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          logger.error(`下载失败 - HTTP ${response.statusCode}: ${response.statusMessage}`);
          logger.error(`请求URL: ${url}`);
          return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize && progressCallback) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            progressCallback(progress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (error) => {
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(error);
        });
      });

      request.on('error', (error) => {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error('下载超时'));
      });
    });
  }

  /**
   * 解压文件
   * @param {string} archivePath 压缩文件路径
   * @param {string} extractDir 解压目录
   * @param {string} binaryName 二进制文件名
   * @param {string} coreType 内核类型
   * @param {string} extractedFolderName 解压后的文件夹名称
   * @returns {Promise<void>}
   */
  async extractArchive(archivePath, extractDir, binaryName, coreType, extractedFolderName = null) {
    const ext = path.extname(archivePath).toLowerCase();
    const binaryPath = path.join(extractDir, binaryName);

    if (ext === '.zip') {
      if (!AdmZip) {
        throw new Error('AdmZip library not available');
      }

      // 处理 ZIP 文件
      const zip = new AdmZip(archivePath);

      if (extractedFolderName) {
        // sing-box 风格：解压到指定文件夹，然后复制二进制文件
        zip.extractAllTo(extractDir, true);
        const sourcePath = path.join(extractDir, extractedFolderName, binaryName);
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`未找到二进制文件: ${sourcePath}`);
        }
        fs.copyFileSync(sourcePath, binaryPath);
      } else {
        // mihomo 风格：直接从 ZIP 中提取二进制文件
        const entries = zip.getEntries();
        let found = false;

        for (const entry of entries) {
          if (entry.entryName.endsWith(binaryName) ||
              ((coreType === CORE_TYPES.MIHOMO || coreType === 'mihomo') && entry.entryName.includes('mihomo'))) {
            fs.writeFileSync(binaryPath, entry.getData());
            found = true;
            break;
          }
        }

        if (!found) {
          throw new Error('Binary file not found in archive');
        }
      }

      // 设置执行权限
      if (process.platform !== 'win32') {
        fs.chmodSync(binaryPath, 0o755);
      }

    } else if (ext === '.gz' && !archivePath.includes('.tar.gz')) {
      // 处理单独的 GZ 文件（mihomo 使用）
      const zlib = require('zlib');
      const readStream = fs.createReadStream(archivePath);
      const gunzip = zlib.createGunzip();
      const writeStream = fs.createWriteStream(binaryPath);

      await streamPipeline(readStream, gunzip, writeStream);

      // 设置执行权限
      if (process.platform !== 'win32') {
        fs.chmodSync(binaryPath, 0o755);
      }

    } else if (archivePath.includes('.tar.gz')) {
      // 处理 TAR.GZ 文件（sing-box 在 macOS/Linux 使用）
      const { exec } = require('child_process');

      await new Promise((resolve, reject) => {
        exec(`tar -xzf "${archivePath}" -C "${extractDir}"`, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      // 复制二进制文件
      if (extractedFolderName) {
        const sourcePath = path.join(extractDir, extractedFolderName, binaryName);
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`未找到二进制文件: ${sourcePath}`);
        }
        fs.copyFileSync(sourcePath, binaryPath);
      }

      // 设置执行权限
      if (process.platform !== 'win32') {
        fs.chmodSync(binaryPath, 0o755);
      }

    } else {
      throw new Error(`Unsupported archive format: ${ext}`);
    }
  }

  /**
   * 下载内核（支持代理源重试）
   * @param {string} coreType 内核类型
   * @param {string} version 版本号（可选，默认最新版本）
   * @param {Object} mainWindow 主窗口对象
   * @returns {Promise<Object>} 下载结果
   */
  async downloadCore(coreType, version = null, mainWindow = null) {
    if (this.downloadInProgress) {
      return { success: false, error: '下载正在进行中' };
    }

    this.downloadInProgress = true;

    try {
      // 检查是否有AdmZip库
      if (!AdmZip) {
        throw new Error('解压库未安装，无法下载和解压内核');
      }

      // 获取版本信息
      if (!version) {
        // 使用默认指定版本而不是最新版本
        version = CORE_VERSIONS[coreType];
        if (!version) {
          // 如果没有默认版本配置，则获取最新版本
          const latestVersion = await this.getLatestVersion(coreType);
          version = latestVersion.version;
        }
      }

      logger.info(`开始下载 ${coreType} ${version}`);

      const binDir = getBinDir();
      const appDataDir = getAppDataDir();
      const tempFilePath = path.join(appDataDir, 'temp_download');

      // 确保目录存在
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }
      if (!fs.existsSync(tempFilePath)) {
        fs.mkdirSync(tempFilePath, { recursive: true });
      }

      // 发送开始下载事件
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('core-download-progress', {
          progress: 0,
          message: `开始下载 ${coreType} ${version}`
        });
      }

      // 尝试下载：先尝试原始源，失败后使用代理源
      let downloadSuccess = false;
      let lastError = null;

      for (const useMirror of [false, true]) {
        try {
          const downloadInfo = this.buildDownloadInfo(coreType, version, useMirror);
          const archivePath = path.join(tempFilePath, downloadInfo.archiveName);
          const binaryPath = path.join(binDir, downloadInfo.binaryName);

          // 清理旧文件
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
          }

          const sourceType = useMirror ? '代理源' : '原始源';
          logger.info(`尝试从${sourceType}下载: ${downloadInfo.downloadUrl}`);
          logger.info(`文件名: ${downloadInfo.archiveName}, 平台: ${downloadInfo.platform}, 架构: ${downloadInfo.arch}`);

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('core-download-progress', {
              progress: 0,
              message: `正在从${sourceType}下载内核`
            });
          }

          // 下载文件
          await this.downloadFile(downloadInfo.downloadUrl, archivePath, (progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('core-download-progress', {
                progress,
                message: `下载中... ${progress}%`
              });
            }
          });

          logger.info(`从${sourceType}下载成功`);

          // 解压文件
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('core-download-progress', {
              progress: 90,
              message: '正在解压...'
            });
          }

          const extractDir = path.join(tempFilePath, 'extracted');
          if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
          }
          fs.mkdirSync(extractDir, { recursive: true });

          await this.extractArchive(archivePath, extractDir, downloadInfo.binaryName, coreType, downloadInfo.extractedFolderName);

          // 复制到最终位置
          const extractedBinaryPath = path.join(extractDir, downloadInfo.binaryName);
          if (fs.existsSync(extractedBinaryPath)) {
            fs.copyFileSync(extractedBinaryPath, binaryPath);
          }

          // 验证二进制文件
          if (!fs.existsSync(binaryPath)) {
            throw new Error('解压后未找到二进制文件');
          }

          // 清理临时文件
          try {
            if (fs.existsSync(archivePath)) {
              fs.unlinkSync(archivePath);
            }
            if (fs.existsSync(extractDir)) {
              fs.rmSync(extractDir, { recursive: true, force: true });
            }
          } catch (err) {
            logger.error('清理临时文件失败:', err);
          }

          // 发送完成事件
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('core-download-progress', {
              progress: 100,
              message: '下载完成'
            });
          }

          logger.info(`${coreType} ${version} 下载完成`);
          downloadSuccess = true;
          // 使用统一的错误处理
          const { createSerializableResult } = require('../utils/error-handler');
          return createSerializableResult({ success: true, version });

        } catch (error) {
          const sourceType = useMirror ? '代理源' : '原始源';
          logger.warn(`从${sourceType}下载失败: ${error.message}`);
          lastError = error;

          if (!useMirror) {
            // 如果原始源失败，准备尝试代理源
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('core-download-progress', {
                progress: 0,
                message: '原始源下载失败，尝试代理源...'
              });
            }
          }
        }
      }

      // 如果所有源都失败了
      if (!downloadSuccess) {
        throw new Error(`所有下载源都失败了: ${lastError?.message || '未知错误'}`);
      }

    } catch (error) {
      logger.error(`下载 ${coreType} 失败:`, error);

      // 发送错误事件
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('core-download-progress', {
          progress: -1,
          message: error.message
        });
      }

      // 使用统一的错误处理
      const { normalizeError } = require('../utils/error-handler');
      return normalizeError(error, { defaultMessage: '下载失败' });
    } finally {
      this.downloadInProgress = false;
    }
  }

  /**
   * 检查下载是否正在进行
   * @returns {boolean} 是否正在下载
   */
  isDownloading() {
    return this.downloadInProgress;
  }

  /**
   * 取消当前下载
   */
  cancelDownload() {
    if (this.currentDownload) {
      this.currentDownload.destroy();
      this.currentDownload = null;
    }
    this.downloadInProgress = false;
  }
}

// 创建单例实例
const universalCoreDownloader = new UniversalCoreDownloader();

/**
 * 兼容性函数：下载 sing-box 内核（保持与旧 core-downloader.js 的兼容性）
 * @param {Object} mainWindow 主窗口对象
 * @returns {Promise<Object>} 下载结果
 */
const downloadCore = async (mainWindow) => {
  try {
    // 使用指定版本下载 sing-box
    const version = CORE_VERSIONS[CORE_TYPES.SINGBOX];
    const result = await universalCoreDownloader.downloadCore(CORE_TYPES.SINGBOX, version, mainWindow);

    // 使用统一的错误处理
    const { createSerializableResult } = require('../utils/error-handler');
    return createSerializableResult(result);
  } catch (error) {
    return {
      success: false,
      error: String(error.message || '下载失败')
    };
  }
};

module.exports = {
  // 导出类实例
  universalCoreDownloader,
  // 导出兼容性函数
  downloadCore,
  // 导出类本身
  UniversalCoreDownloader
};
