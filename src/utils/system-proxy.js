/**
 * 系统代理设置工具
 * 封装system-proxy模块的懒加载实现
 */

const logger = require('./logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');
let systemProxyModule = null;

/**
 * 懒加载system-proxy模块
 * @returns {Object|null} system-proxy模块或null
 */
function loadSystemProxy() {
  if (systemProxyModule) {
    return systemProxyModule;
  }
  
  try {
    systemProxyModule = require('system-proxy');
    return systemProxyModule;
  } catch (error) {
    logger.error(`加载system-proxy模块失败: ${error.message}`);
    return null;
  }
}

/**
 * 设置macOS系统代理
 * @param {String} host 代理主机
 * @param {Number} port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setMacOSProxy(host, port) {
  try {
    logger.info(`正在设置macOS系统代理: ${host}:${port}`);
    
    // 设置HTTP代理
    await execAsync(`networksetup -setwebproxy "Wi-Fi" ${host} ${port}`);
    await execAsync(`networksetup -setsecurewebproxy "Wi-Fi" ${host} ${port}`);
    
    // 设置SOCKS代理
    await execAsync(`networksetup -setsocksfirewallproxy "Wi-Fi" ${host} ${port}`);
    
    // 启用代理
    await execAsync(`networksetup -setwebproxystate "Wi-Fi" on`);
    await execAsync(`networksetup -setsecurewebproxystate "Wi-Fi" on`);
    await execAsync(`networksetup -setsocksfirewallproxystate "Wi-Fi" on`);
    
    logger.info('macOS系统代理设置成功');
    return { success: true };
  } catch (error) {
    logger.error(`设置macOS系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除macOS系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeMacOSProxy() {
  try {
    logger.info('正在清除macOS系统代理');
    
    // 禁用HTTP代理
    await execAsync(`networksetup -setwebproxystate "Wi-Fi" off`);
    await execAsync(`networksetup -setsecurewebproxystate "Wi-Fi" off`);
    
    // 禁用SOCKS代理
    await execAsync(`networksetup -setsocksfirewallproxystate "Wi-Fi" off`);
    
    logger.info('macOS系统代理已清除');
    return { success: true };
  } catch (error) {
    logger.error(`清除macOS系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 检测Linux桌面环境
 * @returns {String} 桌面环境名称
 */
async function detectLinuxDesktopEnvironment() {
  try {
    const desktopEnv = process.env.XDG_CURRENT_DESKTOP || '';
    logger.info(`检测到Linux桌面环境: ${desktopEnv}`);
    return desktopEnv.toUpperCase();
  } catch (error) {
    logger.error(`检测Linux桌面环境失败: ${error.message}`);
    return '';
  }
}

/**
 * 设置GNOME环境的系统代理
 * @param {String} host 代理主机
 * @param {Number} port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setGnomeProxy(host, port) {
  try {
    logger.info(`正在设置GNOME系统代理: ${host}:${port}`);
    
    // 设置HTTP代理
    await execAsync(`gsettings set org.gnome.system.proxy mode 'manual'`);
    await execAsync(`gsettings set org.gnome.system.proxy.http host '${host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.http port ${port}`);
    await execAsync(`gsettings set org.gnome.system.proxy.https host '${host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.https port ${port}`);
    await execAsync(`gsettings set org.gnome.system.proxy.socks host '${host}'`);
    await execAsync(`gsettings set org.gnome.system.proxy.socks port ${port}`);
    
    // 设置不使用代理的地址
    await execAsync(`gsettings set org.gnome.system.proxy ignore-hosts "['localhost', '127.0.0.0/8', '::1']"`);
    
    logger.info('GNOME系统代理设置成功');
    
    // 设置环境变量
    await setLinuxEnvProxyVariables(host, port);
    
    return { success: true };
  } catch (error) {
    logger.error(`设置GNOME系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除GNOME环境的系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeGnomeProxy() {
  try {
    logger.info('正在清除GNOME系统代理');
    
    // 设置为无代理模式
    await execAsync(`gsettings set org.gnome.system.proxy mode 'none'`);
    
    logger.info('GNOME系统代理已清除');
    
    // 清除环境变量
    await removeLinuxEnvProxyVariables();
    
    return { success: true };
  } catch (error) {
    logger.error(`清除GNOME系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 设置KDE环境的系统代理
 * @param {String} host 代理主机
 * @param {Number} port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setKDEProxy(host, port) {
  try {
    logger.info(`正在设置KDE系统代理: ${host}:${port}`);
    
    // 使用kwriteconfig5设置KDE代理
    await execAsync(`kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 1`);
    await execAsync(`kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key httpProxy "${host} ${port}"`);
    await execAsync(`kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key httpsProxy "${host} ${port}"`);
    await execAsync(`kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key socksProxy "${host} ${port}"`);
    
    // 重新加载KDE配置
    await execAsync(`dbus-send --type=signal /KIO/Scheduler org.kde.KIO.Scheduler.reparseSlaveConfiguration string:""`);
    
    logger.info('KDE系统代理设置成功');
    
    // 设置环境变量
    await setLinuxEnvProxyVariables(host, port);
    
    return { success: true };
  } catch (error) {
    logger.error(`设置KDE系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除KDE环境的系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeKDEProxy() {
  try {
    logger.info('正在清除KDE系统代理');
    
    // 设置为无代理模式
    await execAsync(`kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 0`);
    
    // 重新加载KDE配置
    await execAsync(`dbus-send --type=signal /KIO/Scheduler org.kde.KIO.Scheduler.reparseSlaveConfiguration string:""`);
    
    logger.info('KDE系统代理已清除');
    
    // 清除环境变量
    await removeLinuxEnvProxyVariables();
    
    return { success: true };
  } catch (error) {
    logger.error(`清除KDE系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 设置Linux环境变量代理
 * @param {String} host 代理主机
 * @param {Number} port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setLinuxEnvProxyVariables(host, port) {
  try {
    logger.info(`正在设置Linux环境变量代理: ${host}:${port}`);
    
    // 创建环境变量配置文件
    const configDir = path.join(os.homedir(), '.config', 'lvory');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const proxyEnvFile = path.join(configDir, 'proxy.sh');
    const proxyContent = `
export http_proxy=http://${host}:${port}
export https_proxy=http://${host}:${port}
export ftp_proxy=http://${host}:${port}
export HTTP_PROXY=http://${host}:${port}
export HTTPS_PROXY=http://${host}:${port}
export FTP_PROXY=http://${host}:${port}
export all_proxy=socks5://${host}:${port}
export ALL_PROXY=socks5://${host}:${port}
`;
    
    fs.writeFileSync(proxyEnvFile, proxyContent);
    fs.chmodSync(proxyEnvFile, 0o755);
    
    // 添加到bash环境
    const bashrcPath = path.join(os.homedir(), '.bashrc');
    let bashrcContent = '';
    
    if (fs.existsSync(bashrcPath)) {
      bashrcContent = fs.readFileSync(bashrcPath, 'utf8');
    }
    
    // 检查是否已经添加了加载脚本
    const sourceLine = `source ${proxyEnvFile}`;
    if (!bashrcContent.includes(sourceLine)) {
      // 添加加载脚本行
      const appendContent = `\n# LVORY Proxy Settings\nif [ -f "${proxyEnvFile}" ]; then\n  ${sourceLine}\nfi\n`;
      fs.appendFileSync(bashrcPath, appendContent);
    }
    
    logger.info('Linux环境变量代理设置成功');
    return { success: true };
  } catch (error) {
    logger.error(`设置Linux环境变量代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除Linux环境变量代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeLinuxEnvProxyVariables() {
  try {
    logger.info('正在清除Linux环境变量代理');
    
    // 删除环境变量配置文件
    const proxyEnvFile = path.join(os.homedir(), '.config', 'lvory', 'proxy.sh');
    if (fs.existsSync(proxyEnvFile)) {
      fs.unlinkSync(proxyEnvFile);
    }
    
    logger.info('Linux环境变量代理已清除');
    return { success: true };
  } catch (error) {
    logger.error(`清除Linux环境变量代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 设置Linux系统代理
 * @param {String} host 代理主机
 * @param {Number} port 代理端口
 * @returns {Promise<Object>} 设置结果
 */
async function setLinuxProxy(host, port) {
  try {
    logger.info(`正在设置Linux系统代理: ${host}:${port}`);
    
    // 检测桌面环境
    const desktopEnv = await detectLinuxDesktopEnvironment();
    
    // 根据不同桌面环境选择不同的设置方法
    if (desktopEnv.includes('GNOME')) {
      return await setGnomeProxy(host, port);
    } else if (desktopEnv.includes('KDE')) {
      return await setKDEProxy(host, port);
    } else {
      // 对于其他桌面环境，只设置环境变量
      logger.info(`未识别的桌面环境: ${desktopEnv}，只设置环境变量代理`);
      return await setLinuxEnvProxyVariables(host, port);
    }
  } catch (error) {
    logger.error(`设置Linux系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 清除Linux系统代理
 * @returns {Promise<Object>} 清除结果
 */
async function removeLinuxProxy() {
  try {
    logger.info('正在清除Linux系统代理');
    
    // 检测桌面环境
    const desktopEnv = await detectLinuxDesktopEnvironment();
    
    // 根据不同桌面环境选择不同的清除方法
    if (desktopEnv.includes('GNOME')) {
      return await removeGnomeProxy();
    } else if (desktopEnv.includes('KDE')) {
      return await removeKDEProxy();
    } else {
      // 对于其他桌面环境，只清除环境变量
      logger.info(`未识别的桌面环境: ${desktopEnv}，只清除环境变量代理`);
      return await removeLinuxEnvProxyVariables();
    }
  } catch (error) {
    logger.error(`清除Linux系统代理失败: ${error.message}`);
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
  // 对于macOS平台，使用特定的macOS代理设置方法
  if (process.platform === 'darwin') {
    return await setMacOSProxy(options.host, options.port);
  }
  
  // 对于Linux平台，使用特定的Linux代理设置方法
  if (process.platform === 'linux') {
    return await setLinuxProxy(options.host, options.port);
  }
  
  // 对于Windows平台，使用system-proxy库
  const proxy = loadSystemProxy();
  if (!proxy) {
    return { success: false, error: '代理模块不可用' };
  }
  
  try {
    logger.info(`正在设置系统代理: ${options.host}:${options.port}`);
    
    const result = await proxy.setGlobalProxy({
      server: options.host,
      port: options.port
    });
    
    logger.info(`设置系统代理结果: ${JSON.stringify(result)}`);
    return { success: true, result };
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
  // 对于macOS平台，使用特定的macOS代理清除方法
  if (process.platform === 'darwin') {
    return await removeMacOSProxy();
  }
  
  // 对于Linux平台，使用特定的Linux代理清除方法
  if (process.platform === 'linux') {
    return await removeLinuxProxy();
  }
  
  // 对于Windows平台，使用system-proxy库
  const proxy = loadSystemProxy();
  if (!proxy) {
    return { success: false, error: '代理模块不可用' };
  }
  
  try {
    logger.info('正在清除系统代理');
    
    const result = await proxy.removeGlobalProxy();
    
    logger.info(`清除系统代理结果: ${JSON.stringify(result)}`);
    return { success: true, result };
  } catch (error) {
    logger.error(`清除系统代理失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  setGlobalProxy,
  removeGlobalProxy
}; 