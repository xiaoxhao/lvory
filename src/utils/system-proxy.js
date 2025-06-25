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
 * Linux下使用gsettings设置系统代理（备选方案）
 * @param {Object} options 代理选项
 * @returns {Promise<Object>} 设置结果
 */
async function setLinuxProxyFallback(options) {
  try {
    logger.info(`使用gsettings设置Linux系统代理: ${options.host}:${options.port}`);
    
    // 检查是否有gsettings命令
    try {
      await execAsync('which gsettings');
    } catch (error) {
      return { success: false, error: 'gsettings命令不可用，无法设置系统代理' };
    }
    
    // 设置HTTP代理
    await execAsync(`gsettings set org.gnome.system.proxy.http host '${options.host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.http port ${options.port}`);
    
    // 设置HTTPS代理
    await execAsync(`gsettings set org.gnome.system.proxy.https host '${options.host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.https port ${options.port}`);
    
    // 设置SOCKS代理
    await execAsync(`gsettings set org.gnome.system.proxy.socks host '${options.host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.socks port ${options.port}`);
    
    // 启用代理
    await execAsync(`gsettings set org.gnome.system.proxy mode 'manual'`);
    
    // 设置忽略主机
    const ignoreHosts = "['localhost', '127.0.0.0/8', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']";
    await execAsync(`gsettings set org.gnome.system.proxy ignore-hosts "${ignoreHosts}"`);
    
    logger.info('Linux系统代理设置成功');
    return { success: true };
  } catch (error) {
    logger.error(`Linux系统代理设置失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Linux下使用gsettings清除系统代理（备选方案）
 * @returns {Promise<Object>} 清除结果
 */
async function removeLinuxProxyFallback() {
  try {
    logger.info('使用gsettings清除Linux系统代理');
    
    // 检查是否有gsettings命令
    try {
      await execAsync('which gsettings');
    } catch (error) {
      return { success: false, error: 'gsettings命令不可用' };
    }
    
    // 禁用代理
    await execAsync(`gsettings set org.gnome.system.proxy mode 'none'`);
    
    logger.info('Linux系统代理已清除');
    return { success: true };
  } catch (error) {
    logger.error(`清除Linux系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * macOS下使用networksetup设置系统代理
 * @param {Object} options 代理选项
 * @returns {Promise<Object>} 设置结果
 */
async function setMacOSProxyFallback(options) {
  try {
    logger.info(`使用networksetup设置macOS系统代理: ${options.host}:${options.port}`);
    
    // 检查是否有networksetup命令
    try {
      await execAsync('which networksetup');
    } catch (error) {
      return { success: false, error: 'networksetup命令不可用，无法设置系统代理' };
    }
    
    // 获取活动的网络服务
    const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
    const serviceLines = services.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('*'));
    
    if (serviceLines.length === 0) {
      return { success: false, error: '未找到可用的网络服务' };
    }
    
    // 为每个网络服务设置代理
    for (const service of serviceLines) {
      const serviceName = service.trim();
      if (serviceName) {
        try {
          // 设置HTTP代理
          await execAsync(`networksetup -setwebproxy "${serviceName}" ${options.host} ${options.port}`);
          // 设置HTTPS代理
          await execAsync(`networksetup -setsecurewebproxy "${serviceName}" ${options.host} ${options.port}`);
          // 设置SOCKS代理
          await execAsync(`networksetup -setsocksfirewallproxy "${serviceName}" ${options.host} ${options.port}`);
          
          logger.info(`已为服务 ${serviceName} 设置代理`);
        } catch (serviceError) {
          logger.warn(`为服务 ${serviceName} 设置代理失败: ${serviceError.message}`);
        }
      }
    }
    
    logger.info('macOS系统代理设置成功');
    return { success: true };
  } catch (error) {
    logger.error(`macOS系统代理设置失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * macOS下使用networksetup清除系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeMacOSProxyFallback() {
  try {
    logger.info('使用networksetup清除macOS系统代理');
    
    // 检查是否有networksetup命令
    try {
      await execAsync('which networksetup');
    } catch (error) {
      return { success: false, error: 'networksetup命令不可用' };
    }
    
    // 获取活动的网络服务
    const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
    const serviceLines = services.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('*'));
    
    if (serviceLines.length === 0) {
      return { success: false, error: '未找到可用的网络服务' };
    }
    
    // 为每个网络服务禁用代理
    for (const service of serviceLines) {
      const serviceName = service.trim();
      if (serviceName) {
        try {
          // 禁用HTTP代理
          await execAsync(`networksetup -setwebproxystate "${serviceName}" off`);
          // 禁用HTTPS代理
          await execAsync(`networksetup -setsecurewebproxystate "${serviceName}" off`);
          // 禁用SOCKS代理
          await execAsync(`networksetup -setsocksfirewallproxystate "${serviceName}" off`);
          
          logger.info(`已为服务 ${serviceName} 禁用代理`);
        } catch (serviceError) {
          logger.warn(`为服务 ${serviceName} 禁用代理失败: ${serviceError.message}`);
        }
      }
    }
    
    logger.info('macOS系统代理已清除');
    return { success: true };
  } catch (error) {
    logger.error(`清除macOS系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
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
      // 如果是Linux系统且模块加载失败，尝试使用gsettings备选方案
      if (process.platform === 'linux') {
        logger.info('尝试使用gsettings备选方案设置Linux系统代理');
        return await setLinuxProxyFallback(options);
      }
      if (process.platform === 'darwin') {
        logger.info('尝试使用networksetup备选方案设置macOS系统代理');
        return await setMacOSProxyFallback(options);
      }
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
      
      // 如果是Linux系统且主模块失败，尝试使用备选方案
      if (process.platform === 'linux') {
        logger.info('主模块失败，尝试使用gsettings备选方案');
        return await setLinuxProxyFallback(options);
      }
      
      if (process.platform === 'darwin') {
        logger.info('主模块失败，尝试使用networksetup备选方案');
        return await setMacOSProxyFallback(options);
      }
      
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
      // 如果是Linux系统且模块加载失败，尝试使用gsettings备选方案
      if (process.platform === 'linux') {
        logger.info('尝试使用gsettings备选方案清除Linux系统代理');
        return await removeLinuxProxyFallback();
      }
      if (process.platform === 'darwin') {
        logger.info('尝试使用networksetup备选方案清除macOS系统代理');
        return await removeMacOSProxyFallback();
      }
      return { success: false, error: '代理模块不可用' };
    }
    
    try {
      // 使用新模块的triggerManualProxy方法禁用系统代理
      proxy.triggerManualProxy(false, "", 0, "");
      logger.info('系统代理已清除');
      return { success: true };
    } catch (error) {
      logger.error(`清除系统代理失败: ${error.message}`);
      
      if (process.platform === 'linux') {
        logger.info('主模块失败，尝试使用gsettings备选方案');
        return await removeLinuxProxyFallback();
      }
      
      if (process.platform === 'darwin') {
        logger.info('主模块失败，尝试使用networksetup备选方案');
        return await removeMacOSProxyFallback();
      }
      
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