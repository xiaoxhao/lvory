/**
 * Traceroute 网络追踪服务
 * 通过 IPC 调用主进程的 traceroute 功能
 */

class TracerouteService {
  /**
   * 验证IP地址或域名格式
   * @param {string} target 目标地址
   * @returns {boolean} 是否有效
   */
  static isValidTarget(target) {
    if (!target || typeof target !== 'string' || target.trim().length === 0) {
      return false;
    }
    
    const trimmedTarget = target.trim();
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return ipv4Regex.test(trimmedTarget) || domainRegex.test(trimmedTarget);
  }

  /**
   * 执行 traceroute 追踪
   * @param {string} target 目标主机或IP地址
   * @returns {Promise<Array>} 返回路由跳点信息数组
   */
  static async trace(target) {
    try {
      if (window.electron && window.electron.traceroute) {
        const result = await window.electron.traceroute.execute(target);
        
        if (result.success) {
          return result.hops || [];
        } else {
          throw new Error(result.error || 'Traceroute execution failed');
        }
      } else {
        throw new Error('Traceroute service not available');
      }
    } catch (error) {
      console.error('Traceroute execution failed:', error);
      throw error;
    }
  }

  /**
   * 验证目标地址
   * @param {string} target 目标地址
   * @returns {Promise<boolean>} 是否有效
   */
  static async validateTarget(target) {
    try {
      if (window.electron && window.electron.traceroute) {
        return await window.electron.traceroute.validate(target);
      } else {
        return this.isValidTarget(target);
      }
    } catch (error) {
      console.error('Target validation failed:', error);
      return this.isValidTarget(target);
    }
  }
}

module.exports = TracerouteService; 