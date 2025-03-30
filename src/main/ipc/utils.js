/**
 * IPC工具函数
 */
const { BrowserWindow } = require('electron');
const logger = require('../../utils/logger');

/**
 * 获取主窗口实例
 * @returns {BrowserWindow|null} 主窗口实例或null
 */
function getMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    logger.warn('无法获取主窗口: 没有打开的窗口');
    return null;
  }
  return windows[0];
}

/**
 * 统一的错误处理
 * @param {Error} error 错误对象
 * @param {String} operation 操作名称
 * @returns {Object} 格式化的错误对象
 */
function handleError(error, operation) {
  logger.error(`${operation}失败:`, error);
  return {
    success: false,
    error: error.message || '未知错误'
  };
}

/**
 * 创建成功响应
 * @param {*} data 响应数据
 * @returns {Object} 格式化的成功响应
 */
function createSuccess(data = null) {
  return {
    success: true,
    data
  };
}

module.exports = {
  getMainWindow,
  handleError,
  createSuccess
}; 