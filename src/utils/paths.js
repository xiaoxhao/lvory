const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
  const appDataDir = process.env.LOCALAPPDATA || '';
  const appDir = path.join(appDataDir, 'LVORY');
  
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
    } catch (error) {
      logger.error(`创建应用数据目录失败: ${error.message}`);
    }
  }
  
  return appDir;
}

module.exports = {
  getAppDataDir
}; 