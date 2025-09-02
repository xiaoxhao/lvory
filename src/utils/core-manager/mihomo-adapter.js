/**
 * Mihomo 内核适配器
 * 基于 BaseCore 实现 mihomo 内核的管理功能
 */

const BaseCore = require('./base-core');
const { CORE_TYPES } = require('../../constants/core-types');
const logger = require('../logger');
const MihomoConfigParser = require('../mihomo/config-parser');

class MihomoAdapter extends BaseCore {
  constructor() {
    super(CORE_TYPES.MIHOMO);
    // 延迟加载 Mihomo 实例以避免循环依赖
    this._mihomoInstance = null;
    this.configParser = new MihomoConfigParser();
  }

  /**
   * 获取 Mihomo 实例   * @returns {Object} Mihomo 实例
   */
  getMihomoInstance() {
    if (!this._mihomoInstance) {
      this._mihomoInstance = require('../mihomo/core');
    }
 return this._mihomoInstance;
  }

  /**
   * 启动内核
   * @param {Object} options 启动选项
   * @returns {Promise<Object>} 启动结果 */
  async startCore(options = {}) {
    try {
      this.startTime = new Date();
      const mihomo = this.getMihomoInstance();
      const result = await mihomo.startCore(options);
      
      if (result.success) {
        this.isRunning = true;
        this.lastError = null;
      } else {
        this.lastError = result.error;
      }
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      logger.error('[MihomoAdapter] 启动内核失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止内核
   * @returns {Promise<Object>} 停止结果
   */
  async stopCore() {
    try {
      const mihomo = this.getMihomoInstance();
      const result = await mihomo.stopCore();
      
      if (result.success) {
        this.isRunning = false;
        this.startTime = null;
      } else {
        this.lastError = result.error;
      }
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      logger.error('[MihomoAdapter] 停止内核失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取内核运行状态   * @returns {Object} 状态信息
   */
  getStatus() {
    try {
      const mihomo = this.getMihomoInstance();
      const mihomoStatus = mihomo.getStatus();
      return {
        ...this.getBaseStatus(),
        ...mihomoStatus
      };
    } catch (error) {
      logger.error('[MihomoAdapter] 获取状态失败:', error);
      return {
        ...this.getBaseStatus(),
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取详细的内核运行状态 * @returns {Object} 详细状态信息
   */
  getDetailedStatus() {
    try {
      const mihomo = this.getMihomoInstance();
      const detailedStatus = mihomo.getDetailedStatus();
      
      return {
        ...this.getBaseStatus(),
        ...detailedStatus
      };
    } catch (error) {
      logger.error('[MihomoAdapter] 获取详细状态失败:', error);
      return {
        ...this.getBaseStatus(),
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取内核版本信息
   * @returns {Promise<Object>} 版本信息
 */
  async getVersion() {
    try {
      const mihomo = this.getMihomoInstance();
      return await mihomo.getVersion();
    } catch (error) {
      logger.error('[MihomoAdapter] 获取版本失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查内核是否已安装
   * @returns {Promise<Object>} 检查结果
   */
  async checkInstalled() {
    try {
      const mihomo = this.getMihomoInstance();
      const installed = mihomo.checkInstalled();

      if (installed) {
        // 尝试获取版本信息来验证二进制文件是否可用        const versionResult = await this.getVersion();

        // 使用统一的文件工具获取文件信息
        const { getFileInfo } = require('../../utils/file-utils');
        const fileInfo = getFileInfo(mihomo.binPath);

        return {
          success: true,
          installed: versionResult.success,
          path: mihomo.binPath,
          version: versionResult.version || null,
          ...fileInfo
        };
      } else {
        return {
          success: true,
          installed: false,
          path: mihomo.binPath,
          reason: '二进制文件不存在'
        };
      }
    } catch (error) {
      logger.error('[MihomoAdapter] 检查安装状态失败:', error);
      return {
        success: false,
        error: error.message,
        installed: false
      };
    }
  }

  /**
   * 验证配置文件
   * @param {string} configPath 配置文件路径
   * @returns {Promise<Object>} 验证结果
   */
  async checkConfig(configPath) {
    try {
      // 使用 MihomoConfigParser 验证配置
      const validationResult = this.configParser.validateConfig(configPath);
      return validationResult;
    } catch (error) {
      logger.error('[MihomoAdapter] 验证配置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 格式化配置文件
   * @param {string} configPath 配置文件路径
   * @returns {Promise<Object>} 格式化结果
   */
  async formatConfig(configPath) {
    try {
      return await this.configParser.formatConfig(configPath);
    } catch (error) {
      logger.error('[MihomoAdapter] 格式化配置失败:', error);
      return { success: false, error: error.message };
    }
 }

  /**
   * 下载内核
   * @returns {Promise<Object>} 下载结果
   */
  async downloadCore() {
    try {
      const mihomo = this.getMihomoInstance();
      return await mihomo.downloadCore();
    } catch (error) {
      logger.error('[MihomoAdapter] 下载内核失败:', error);
      return { success: false, error: error.message };
    }
 }
}

module.exports = MihomoAdapter;