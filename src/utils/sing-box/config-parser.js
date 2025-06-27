/**
 * SingBox 配置解析模块
 * 负责解析配置文件并提取关键信息
 */
const fs = require('fs');
const logger = require('../logger');

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
      if (!fs.existsSync(configPath)) {
        logger.error(`[ConfigParser] 配置文件不存在: ${configPath}`);
        return null;
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContent);
      } catch (e) {
        logger.error(`[ConfigParser] 解析配置文件失败: ${e.message}`);
        return null;
      }

      const result = {
        port: this.defaultProxyConfig.port
      };

      if (config.inbounds && Array.isArray(config.inbounds)) {
        logger.info(`[ConfigParser] 配置文件包含 ${config.inbounds.length} 个入站配置`);
        
        // 优先查找 HTTP 或 mixed 代理
        for (const inbound of config.inbounds) {
          logger.info(`[ConfigParser] 检查入站: 类型=${inbound.type}, 端口=${inbound.listen_port}`);
          
          if (inbound.type === 'http' || inbound.type === 'mixed') {
            if (inbound.listen_port) {
              result.port = inbound.listen_port;
              logger.info(`[ConfigParser] 从配置文件解析到HTTP代理端口: ${result.port}`);
              break;
            }
          }
        }

        // 如果没有找到 HTTP 代理，查找 SOCKS 代理
        if (result.port === this.defaultProxyConfig.port) {
          for (const inbound of config.inbounds) {
            if (inbound.type === 'socks' || inbound.type === 'mixed') {
              if (inbound.listen_port) {
                result.port = inbound.listen_port;
                logger.info(`[ConfigParser] 从配置文件解析到SOCKS代理端口: ${result.port}`);
                break;
              }
            }
          }
        }
      } else {
        logger.warn(`[ConfigParser] 配置文件中没有找到入站配置`);
      }

      return result;
    } catch (error) {
      logger.error(`[ConfigParser] 解析配置文件出错: ${error.message}`);
      return null;
    }
  }

  /**
   * 验证配置文件格式
   * @param {String} configPath 配置文件路径
   * @returns {Object} 验证结果
   */
  validateConfig(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        return { valid: false, error: '配置文件不存在' };
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      
      try {
        const config = JSON.parse(configContent);
        
        // 基本结构验证
        if (!config.inbounds || !Array.isArray(config.inbounds)) {
          return { valid: false, error: '配置文件缺少有效的入站配置' };
        }

        if (!config.outbounds || !Array.isArray(config.outbounds)) {
          return { valid: false, error: '配置文件缺少有效的出站配置' };
        }

        return { valid: true, config };
      } catch (e) {
        return { valid: false, error: `JSON 格式错误: ${e.message}` };
      }
    } catch (error) {
      return { valid: false, error: `读取文件失败: ${error.message}` };
    }
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