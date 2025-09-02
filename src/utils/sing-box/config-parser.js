/**
 * SingBox 配置解析模块
 * 负责解析配置文件并提取关键信息
 */
const fs = require('fs');
const logger = require('../logger');
const { loadAndParseConfigFile } = require('../config-processor');

class ConfigParser {
  constructor() {
    this.defaultProxyConfig = {
      host: '127.0.0.1',
      port: 7890,
      enableSystemProxy: true
    };
  }

  /**
   * 解析配置文件并提取代理端口
   * @param {String} configPath 配置文件路径
   * @returns {Object} 解析结果，包含端口信息
   */
  parseConfigFile(configPath) {
    try {
      const config = this._loadAndParseConfig(configPath);
      if (!config) return null;

      const result = { port: this.defaultProxyConfig.port };
      const proxyPort = this._extractProxyPort(config.inbounds);

      if (proxyPort) {
        result.port = proxyPort;
      }

      return result;
    } catch (error) {
      logger.error(`[ConfigParser] 解析配置文件出错: ${error.message}`);
      return null;
    }
  }

  /**
   * 加载并解析配置文件
   * @param {String} configPath 配置文件路径
   * @returns {Object|null} 解析后的配置对象
   * @private
   */
  _loadAndParseConfig(configPath) {
    if (!fs.existsSync(configPath)) {
      logger.error(`[ConfigParser] 配置文件不存在: ${configPath}`);
      return null;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return loadAndParseConfigFile(configPath);
    } catch (e) {
      logger.error(`[ConfigParser] 解析配置文件失败: ${e.message}`);
      return null;
    }
  }

  /**
   * 从入站配置中提取代理端口
   * @param {Array} inbounds 入站配置数组
   * @returns {Number|null} 代理端口
   * @private
   */
  _extractProxyPort(inbounds) {
    if (!inbounds || !Array.isArray(inbounds)) {
      logger.warn(`[ConfigParser] 配置文件中没有找到入站配置`);
      return null;
    }

    logger.info(`[ConfigParser] 配置文件包含 ${inbounds.length} 个入站配置`);

    // 优先查找 HTTP 或 mixed 代理
    const httpPort = this._findPortByTypes(inbounds, ['http', 'mixed'], 'HTTP');
    if (httpPort) return httpPort;

    // 如果没有找到 HTTP 代理，查找 SOCKS 代理
    const socksPort = this._findPortByTypes(inbounds, ['socks', 'mixed'], 'SOCKS');
    return socksPort;
  }

  /**
   * 根据指定类型查找端口
   * @param {Array} inbounds 入站配置数组
   * @param {Array} types 要查找的类型数组
   * @param {String} logType 日志中显示的类型名称
   * @returns {Number|null} 找到的端口
   * @private
   */
  _findPortByTypes(inbounds, types, logType) {
    for (const inbound of inbounds) {
      logger.info(`[ConfigParser] 检查入站: 类型=${inbound.type}, 端口=${inbound.listen_port}`);

      if (types.includes(inbound.type) && inbound.listen_port) {
        logger.info(`[ConfigParser] 从配置文件解析到${logType}代理端口: ${inbound.listen_port}`);
        return inbound.listen_port;
      }
    }
    return null;
  }



  /**
   * 提取配置信息摘要
   * @param {String} configPath 配置文件路径
   * @returns {Object} 配置摘要
   */
  getConfigSummary(configPath) {
    const parseResult = this.parseConfigFile(configPath);
    const validationResult = this.validateConfig(configPath);

    if (!validationResult.valid) {
      return {
        valid: false,
        error: validationResult.error
      };
    }

    const config = validationResult.config;
    
    return {
      valid: true,
      proxyPort: parseResult ? parseResult.port : this.defaultProxyConfig.port,
      inboundsCount: config.inbounds ? config.inbounds.length : 0,
      outboundsCount: config.outbounds ? config.outbounds.length : 0,
      inboundTypes: config.inbounds ? config.inbounds.map(i => i.type).filter(Boolean) : [],
      hasTunMode: config.inbounds ? config.inbounds.some(i => i.type === 'tun') : false,
      hasRoute: !!config.route
    };
  }
}

module.exports = ConfigParser; 