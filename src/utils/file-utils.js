/**
 * 文件操作工具函数
 * 提供统一的文件和路径处理功能
 */

const fs = require('fs');
const path = require('path');

/**
 * 获取文件详细信息
 * @param {string} filePath 文件路径
 * @returns {Object} 文件信息
 */
function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      fileSize: stats.size,
      isExecutable: process.platform === 'win32' 
        ? filePath.endsWith('.exe') 
        : !!(stats.mode & parseInt('111', 8)),
      lastModified: stats.mtime.toISOString(),
      exists: true
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * 检查文件是否存在且可执行
 * @param {string} filePath 文件路径
 * @returns {boolean} 是否存在且可执行
 */
function isExecutable(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const stats = fs.statSync(filePath);
    
    if (process.platform === 'win32') {
      return filePath.endsWith('.exe');
    }
    
    return !!(stats.mode & parseInt('111', 8));
  } catch {
    return false;
  }
}

/**
 * 安全地创建目录
 * @param {string} dirPath 目录路径
 * @returns {boolean} 是否成功
 */
function ensureDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getFileInfo,
  isExecutable,
  ensureDirectory
};