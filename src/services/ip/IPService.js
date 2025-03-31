/**
 * IP地理位置服务
 * 基于 https://ip.sb/api/ 提供的API
 */

class IPService {
  /**
   * 获取当前出口IP地址信息
   * @returns {Promise<Object>} 包含IP和地理位置信息的对象
   */
  static async getIPInfo() {
    try {
      const response = await fetch('https://api.ip.sb/geoip', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`IP查询失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取IP地理位置信息失败:', error);
      return {
        ip: '未知',
        country: '未知',
        city: '',
        region: '',
        asn: '',
        organization: ''
      };
    }
  }
  
  /**
   * 获取IP地址的格式化地理位置信息
   * @returns {Promise<String>} 格式化的地理位置信息
   */
  static async getLocationString() {
    try {
      const ipInfo = await this.getIPInfo();
      
      // 组合地理位置信息
      const locationParts = [];
      
      if (ipInfo.ip) {
        locationParts.push(ipInfo.ip);
      }
      
      const locationInfo = [];
      if (ipInfo.country) {
        locationInfo.push(ipInfo.country);
      }
      if (ipInfo.region && ipInfo.region !== ipInfo.country) {
        locationInfo.push(ipInfo.region);
      }
      if (ipInfo.city) {
        locationInfo.push(ipInfo.city);
      }
      
      if (locationInfo.length > 0) {
        locationParts.push(`(${locationInfo.join(', ')})`);
      }
      
      return locationParts.join(' ');
    } catch (error) {
      console.error('获取地理位置字符串失败:', error);
      return '未知位置';
    }
  }

  /**
   * 获取IP的ASN组织信息
   * @returns {Promise<String>} 格式化的ASN和组织信息
   */
  static async getAsnString() {
    try {
      const ipInfo = await this.getIPInfo();
      
      // 组合ASN和组织信息
      const asnParts = [];
      
      if (ipInfo.ip) {
        asnParts.push(ipInfo.ip);
      }
      
      const asnInfo = [];
      if (ipInfo.asn) {
        asnInfo.push(`ASN: ${ipInfo.asn}`);
      }
      if (ipInfo.organization) {
        asnInfo.push(ipInfo.organization);
      }
      
      if (asnInfo.length > 0) {
        asnParts.push(`(${asnInfo.join(' | ')})`);
      }
      
      return asnParts.join(' ');
    } catch (error) {
      console.error('获取ASN信息失败:', error);
      return '未知ASN信息';
    }
  }
}

export default IPService; 