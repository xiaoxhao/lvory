const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const APP_IS_PORTABLE = 'false';
function isPortableMode() {
  return APP_IS_PORTABLE === 'true';
}


function getAppDataDir() {
  let appDir;
  
  if (isPortableMode()) {
    appDir = path.join(process.cwd(), 'data');
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

module.exports = {
  getAppDataDir,
  getConfigDir,
  getBinDir,
  getUserSettingsPath,
  getStorePath,
  getLogDir,
  getTempLogDir,
  generateDefaultLogPath,
  isPortableMode
}; 

