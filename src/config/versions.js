/**
 * 内核版本配置
 * 统一管理所有内核的默认版本
 */

const CORE_VERSIONS = {
  // sing-box 内核版本
  'sing-box': 'v1.12.0-rc.4',
  'singbox': 'v1.12.0-rc.4', // 兼容旧名称
  
  // mihomo 内核版本
  'mihomo': 'v1.19.12'
};

module.exports = {
  CORE_VERSIONS,
  getDefaultVersion: (coreType) => {
    return CORE_VERSIONS[coreType] || null;
  }
};