/**
 * 系统代理设置工具
 * 使用原生系统命令实现跨平台代理设置
 */

const logger = require('./logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

/**
 * Windows下使用注册表设置系统代理
 * @param {Object} options 代理选项
 * @returns {Promise<Object>} 设置结果
 */
async function setWindowsProxyFallback(options) {
  try {
    logger.info(`设置Windows系统代理: ${options.host}:${options.port}`);
    
    const proxyServer = `${options.host}:${options.port}`;
    const bypassList = 'localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;<local>';
    
    // 启用代理
    await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
    
    // 设置代理服务器
    await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`);
    
    // 设置代理绕过列表
    await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d "${bypassList}" /f`);
    
    // 通知系统代理设置已更改
    try {
      await execAsync('rundll32.exe wininet.dll,InternetSetOption 39 0 0 0');
    } catch (notifyError) {
      logger.warn(`通知系统代理变更失败: ${notifyError.message}`);
    }
    
    logger.info('Windows系统代理设置成功');
    return { success: true };
  } catch (error) {
    logger.error(`Windows系统代理设置失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Windows下使用注册表清除系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeWindowsProxyFallback() {
  try {
    logger.info('清除Windows系统代理');
    
    // 禁用代理
    await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
    
    // 清除代理服务器设置
    try {
      await execAsync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /f`);
    } catch (deleteError) {
      logger.warn(`删除ProxyServer注册表项失败: ${deleteError.message}`);
    }
    
    // 清除代理绕过列表
    try {
      await execAsync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /f`);
    } catch (deleteError) {
      logger.warn(`删除ProxyOverride注册表项失败: ${deleteError.message}`);
    }
    
    // 通知系统代理设置已更改
    try {
      await execAsync('rundll32.exe wininet.dll,InternetSetOption 39 0 0 0');
    } catch (notifyError) {
      logger.warn(`通知系统代理变更失败: ${notifyError.message}`);
    }
    
    logger.info('Windows系统代理已清除');
    return { success: true };
  } catch (error) {
    logger.error(`清除Windows系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Linux下使用gsettings设置系统代理
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
      logger.error(`检查gsettings命令失败: ${error.message}`);
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
 * Linux下使用gsettings清除系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeLinuxProxyFallback() {
  try {
    logger.info('使用gsettings清除Linux系统代理');
    
    // 检查是否有gsettings命令
    try {
      await execAsync('which gsettings');
    } catch (error) {
      logger.error(`检查gsettings命令失败: ${error.message}`);
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
      logger.error(`检查networksetup命令失败: ${error.message}`);
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
      logger.error(`检查networksetup命令失败: ${error.message}`);
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
    
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return await setWindowsProxyFallback(options);
      case 'darwin':
        return await setMacOSProxyFallback(options);
      case 'linux':
        return await setLinuxProxyFallback(options);
      default:
        logger.error(`不支持的平台: ${platform}`);
        return { success: false, error: `不支持的平台: ${platform}` };
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
    
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return await removeWindowsProxyFallback();
      case 'darwin':
        return await removeMacOSProxyFallback();
      case 'linux':
        return await removeLinuxProxyFallback();
      default:
        logger.error(`不支持的平台: ${platform}`);
        return { success: false, error: `不支持的平台: ${platform}` };
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