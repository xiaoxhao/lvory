const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const APP_IS_PORTABLE = 'false';
function isPortableMode() {
  return APP_IS_PORTABLE === 'true';
}

/**
 * 检测是否运行在 AppImage 环境中
 * @returns {Boolean} 是否为 AppImage 模式
 */
function isAppImageMode() {
  // 检查 APPIMAGE 环境变量（AppImage 运行时会设置此变量）
  if (process.env.APPIMAGE) {
    return true;
  }

  // 检查 APPDIR 环境变量（AppImage 挂载目录）
  if (process.env.APPDIR) {
    return true;
  }
  const execPath = process.execPath;
  if (execPath && (
    execPath.includes('/.mount_') || // AppImage 挂载目录特征
    execPath.includes('/tmp/.mount_') || // 常见的 AppImage 临时挂载路径
    execPath.endsWith('.AppImage') // 直接运行 AppImage 文件
  )) {
    return true;
  }

  if (process.platform === 'linux') {
    const homeDir = require('os').homedir();
    const currentDir = process.cwd();

    if (currentDir === homeDir && execPath && execPath.includes('/tmp/')) {
      if (execPath.match(/\/tmp\/\.mount_[^\/]+\//) ||
          execPath.match(/\/tmp\/appimage[^\/]*\//) ||
          execPath.includes('squashfs-root')) {
        return true;
      }
    }
  }

  return false;
}


function getAppDataDir() {
  let appDir;

  if (isPortableMode()) {
    appDir = path.join(process.cwd(), 'data');
  } else if (isAppImageMode()) {
    // AppImage 模式：所有文件存储到 XDG_CONFIG_HOME 或 ~/.config
    const homeDir = os.homedir();
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
      appDir = path.join(xdgConfigHome, 'lvory');
    } else {
      appDir = path.join(homeDir, '.config', 'lvory');
    }
  } else {
    if (process.platform === 'win32') {
      const appDataDir = process.env.LOCALAPPDATA || '';
      appDir = path.join(appDataDir, 'lvory');
    } else if (process.platform === 'darwin') {
      const homeDir = os.homedir();
      appDir = path.join(homeDir, 'Library', 'Application Support', 'lvory');
    } else {
      const homeDir = os.homedir();
      const xdgConfigHome = process.env.XDG_CONFIG_HOME;
      if (xdgConfigHome) {
        appDir = path.join(xdgConfigHome, 'lvory');
      } else {
        appDir = path.join(homeDir, '.config', 'lvory');
      }
    }
  }
  
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
    } catch (error) {
      console.error(`创建应用数据目录失败: ${error.message}`);
    }
  }
  
  return appDir;
}


function getConfigDir() {
  const appDataDir = getAppDataDir();
  const configDir = path.join(appDataDir, 'configs');
  
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (error) {
      console.error(`创建配置目录失败: ${error.message}`);
    }
  }
  
  return configDir;
}

function getBinDir() {
  let binDir;

  if (isPortableMode()) {
    binDir = process.cwd();
  } else if (isAppImageMode()) {
    // AppImage 模式：内核文件也存储到配置目录下的 bin 子目录
    const appDataDir = getAppDataDir();
    binDir = path.join(appDataDir, 'bin');

    if (!fs.existsSync(binDir)) {
      try {
        fs.mkdirSync(binDir, { recursive: true });
      } catch (error) {
        console.error(`创建bin目录失败: ${error.message}`);
      }
    }
  } else {
    const appDataDir = getAppDataDir();
    binDir = path.join(appDataDir, 'bin');

    if (!fs.existsSync(binDir)) {
      try {
        fs.mkdirSync(binDir, { recursive: true });
      } catch (error) {
        console.error(`创建bin目录失败: ${error.message}`);
      }
    }
  }

  return binDir;
}

function getUserSettingsPath() {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'settings.json');
}

function getStorePath() {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'store.json');
}

function getLogDir() {
  const appDataDir = getAppDataDir();
  const logDir = path.join(appDataDir, 'logs');
  
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error(`创建日志目录失败: ${error.message}`);
    }
  }
  
  return logDir;
}

function getTempLogDir() {
  return getLogDir();
}

function generateDefaultLogPath() {
  const logDir = getLogDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uuid = crypto.randomUUID().split('-')[0];
  return path.join(logDir, `sing-box-${timestamp}-${uuid}.log`);
}

/**
 * 获取当前运行模式信息
 * @returns {Object} 运行模式信息
 */
function getRunModeInfo() {
  return {
    isPortable: isPortableMode(),
    isAppImage: isAppImageMode(),
    platform: process.platform,
    mode: isPortableMode() ? 'portable' :
          isAppImageMode() ? 'appimage' :
          'standard'
  };
}

module.exports = {
  getAppDataDir,
  getConfigDir,
  getBinDir,
  getUserSettingsPath,
  getStorePath,
  getLogDir,
  getTempLogDir,
  generateDefaultLogPath,
  isPortableMode,
  isAppImageMode,
  getRunModeInfo
};

