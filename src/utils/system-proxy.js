/**
 * 系统代理设置工具
 * 封装@mihomo-party/sysproxy模块的实现
 */

const logger = require('./logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');
let sysproxy = null;

/**
 * 懒加载sysproxy模块
 * @returns {Object|null} sysproxy模块或null
 */
function loadSysProxy() {
  if (sysproxy) {
    return sysproxy;
  }
  
  try {
    sysproxy = require('@mihomo-party/sysproxy');
    return sysproxy;
  } catch (error) {
    logger.error(`加载@mihomo-party/sysproxy模块失败: ${error.message}`);
    return null;
  }
}

/**
 * 设置系统代理
 * @param {Object} options 代理选项
 * @param {String} options.host 代理主机
 * @param {Number} options.port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setGlobalProxy(options) {
  try {
    logger.info(`正在设置系统代理: ${options.host}:${options.port}`);
    
    const proxy = loadSysProxy();
    if (!proxy) {
      return { success: false, error: '代理模块不可用' };
    }
    
    // 默认的bypass列表
    const bypass = "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*";
    
    try {
      // 使用新模块的triggerManualProxy方法设置系统代理
      proxy.triggerManualProxy(true, options.host, options.port, bypass);
      logger.info(`系统代理设置成功: ${options.host}:${options.port}`);
      return { success: true };
    } catch (error) {
      logger.error(`设置系统代理失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    logger.error(`设置系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeGlobalProxy() {
  try {
    logger.info('正在清除系统代理');
    
    const proxy = loadSysProxy();
    if (!proxy) {
      return { success: false, error: '代理模块不可用' };
    }
    
    try {
      // 使用新模块的triggerManualProxy方法禁用系统代理
      proxy.triggerManualProxy(false, "", 0, "");
      logger.info('系统代理已清除');
      return { success: true };
    } catch (error) {
      logger.error(`清除系统代理失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    logger.error(`清除系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  setGlobalProxy,
  removeGlobalProxy
}; 