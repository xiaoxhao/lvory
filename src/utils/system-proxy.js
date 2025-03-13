/**
 * 系统代理配置工具
 * 提供Windows系统代理的设置和恢复功能
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemProxy {
  constructor() {
    this.originalSettings = null;
    this.isProxyEnabled = false;
  }

  /**
   * 获取当前系统代理设置
   * @returns {Promise<Object>} 当前代理设置
   */
  async getCurrentSettings() {
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable');
      const proxyEnabledMatch = stdout.match(/ProxyEnable\s+REG_DWORD\s+(0x\d+)/i);
      const proxyEnabled = proxyEnabledMatch ? parseInt(proxyEnabledMatch[1], 16) === 1 : false;

      let proxyServer = '';
      try {
        const { stdout: serverStdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer');
        const proxyServerMatch = serverStdout.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
        proxyServer = proxyServerMatch ? proxyServerMatch[1].trim() : '';
      } catch (e) {
        // TODO: if key not found, ignore error
      }

      return {
        enabled: proxyEnabled,
        server: proxyServer
      };
    } catch (error) {
      console.error('获取系统代理设置失败:', error);
      return { enabled: false, server: '' };
    }
  }

  /**
   * 启用系统代理
   * @param {String} proxyServer 代理服务器地址，格式为 "host:port"
   * @returns {Promise<Boolean>} 是否成功
   */
  async enableProxy(proxyServer) {
    try {
      // 保存当前设置，以便后续恢复
      if (!this.originalSettings) {
        this.originalSettings = await this.getCurrentSettings();
        console.log('保存原始代理设置:', this.originalSettings);
      }

      console.log(`设置系统代理: ${proxyServer}`);
      
      // 设置代理服务器地址
      await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`);
      
      // 启用代理
      await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
      
      // 刷新系统设置
      await this.refreshSettings();
      
      this.isProxyEnabled = true;
      return true;
    } catch (error) {
      console.error('启用系统代理失败:', error);
      return false;
    }
  }

  /**
   * 禁用系统代理，恢复原始设置
   * @returns {Promise<Boolean>} 是否成功
   */
  async disableProxy() {
    try {
      if (!this.isProxyEnabled) {
        console.log('代理未启用，无需禁用');
        return true;
      }

      console.log('禁用系统代理，恢复原始设置');
      
      if (this.originalSettings) {
        // 如果之前有保存原始设置，恢复它
        if (this.originalSettings.enabled) {
          // 如果原来是启用的，恢复原来的服务器和启用状态
          await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${this.originalSettings.server}" /f`);
          await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
        } else {
          // 如果原来是禁用的，只需禁用
          await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
        }
      } else {
        // 如果没有原始设置，直接禁用
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
      }
      
      // 刷新系统设置
      await this.refreshSettings();
      
      this.isProxyEnabled = false;
      return true;
    } catch (error) {
      console.error('禁用系统代理失败:', error);
      return false;
    }
  }

  /**
   * 刷新系统设置，使代理设置生效
   * @returns {Promise<void>}
   */
  async refreshSettings() {
    try {
      // 通知系统设置已更改
      await execAsync('rundll32.exe wininet.dll,InternetSetOptionW 0 0 0 0');
      console.log('系统代理设置已刷新');
    } catch (error) {
      console.error('刷新系统设置失败:', error);
    }
  }
}

// 导出单例
module.exports = new SystemProxy(); 