/**
 * Lvory 同步协议处理器
 * 专注于解析和处理 lvory-sync 协议，提供配置同步功能
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../../utils/logger');

// fetch 将在需要时动态导入
let fetch;

/**
 * Lvory 同步协议处理器
 */
class LvorySyncProcessor {
  /**
   * 解析 Lvory 同步配置文件
   * @param {String} configPath 配置文件路径
   * @returns {Object} 解析后的配置对象
   */
  static async parseConfig(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`配置文件不存在: ${configPath}`);
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);

      // 基础验证
      if (!config.lvory_sync) {
        throw new Error('配置文件必须包含 lvory_sync 根节点');
      }

      const syncConfig = config.lvory_sync;
      if (!syncConfig.version) {
        throw new Error('配置文件必须指定版本号');
      }

      if (!syncConfig.master_config) {
        throw new Error('配置文件必须包含 master_config 节点');
      }

      logger.info(`成功解析 Lvory 同步配置: ${configPath}`);
      return config;
    } catch (error) {
      logger.error(`解析 Lvory 同步配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理同步配置，生成最终的 SingBox 配置
   * @param {String} syncConfigPath 同步配置文件路径
   * @returns {Object} 处理后的 SingBox 配置
   */
  static async processSync(syncConfigPath) {
    try {
      // 1. 解析同步配置
      const syncConfig = await this.parseConfig(syncConfigPath);
      const config = syncConfig.lvory_sync;

      // 2. 获取主配置
      const masterConfig = await this.fetchConfigSource(config.master_config, '主配置');

      // 3. 获取并处理副源节点
      const processedSourceNodes = await this.processSecondaryNodes(config.secondary_sources || []);

      // 4. 根据映射和同步模式合并配置
      const mergedConfig = this.mergeConfigsWithMapping(masterConfig, processedSourceNodes, config);

      logger.info(`同步处理完成，生成 ${mergedConfig.outbounds?.length || 0} 个节点`);
      return mergedConfig;

    } catch (error) {
      logger.error(`同步处理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取配置源内容
   * @param {Object} configSource 配置源对象
   * @param {String} sourceName 源名称
   * @returns {Object} 解析后的配置内容
   */
  static async fetchConfigSource(configSource, sourceName = '配置源') {
    try {
      let content;

      if (configSource.source === 'local') {
        if (!fs.existsSync(configSource.path)) {
          throw new Error(`本地文件不存在: ${configSource.path}`);
        }
        content = fs.readFileSync(configSource.path, 'utf8');
        logger.debug(`从本地文件加载 ${sourceName}: ${configSource.path}`);
      } else if (configSource.source === 'url') {
        // 确保 fetch 已被初始化
        if (!fetch) {
          // 动态导入 fetch
          const nodeFetch = await import('node-fetch');
          fetch = nodeFetch.default;
        }

        const response = await fetch(configSource.url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Lvory/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        content = await response.text();
        logger.debug(`从远程URL加载 ${sourceName}: ${configSource.url}`);
      }

      // 解析内容
      return this.parseConfigContent(content, configSource.config_type || 'auto');
    } catch (error) {
      logger.error(`获取 ${sourceName} 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 解析配置内容
   * @param {String} content 配置内容
   * @param {String} configType 配置类型
   * @returns {Object} 解析后的配置对象
   */
  static parseConfigContent(content, configType = 'auto') {
    try {
      // 自动检测配置类型
      if (configType === 'auto') {
        configType = this.detectConfigType(content);
      }

      switch (configType) {
        case 'singbox':
        case 'v2ray':
        case 'xray':
          return JSON.parse(content);
        case 'clash':
        case 'hysteria':
          return yaml.load(content);
        default:
          // 默认尝试JSON，失败则尝试YAML
          try {
            return JSON.parse(content);
          } catch {
            return yaml.load(content);
          }
      }
    } catch (error) {
      throw new Error(`解析配置内容失败 (${configType}): ${error.message}`);
    }
  }

  /**
   * 检测配置类型
   * @param {String} content 配置内容
   * @returns {String} 检测到的配置类型
   */
  static detectConfigType(content) {
    const trimmedContent = content.trim();

    // 检测JSON格式
    if (trimmedContent.startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.inbounds || parsed.outbounds || parsed.route) {
          return 'singbox';
        }
        if (parsed.inbounds || parsed.outbounds || parsed.routing) {
          return 'v2ray';
        }
        return 'singbox';
      } catch {
        // 继续检测其他格式
      }
    }

    // 检测YAML格式
    try {
      const parsed = yaml.load(content);
      if (parsed.proxies || parsed['proxy-groups'] || parsed.rules) {
        return 'clash';
      }
      if (parsed.server || parsed.protocol === 'hysteria') {
        return 'hysteria';
      }
      return 'clash';
    } catch {
      return 'singbox';
    }
  }

  /**
   * 处理副源节点，应用新的同步模式和映射机制
   * @param {Array} secondarySources 副源配置数组
   * @returns {Array} 处理后的节点列表，按源分组
   */
  static async processSecondaryNodes(secondarySources) {
    const processedSources = [];

    for (const source of secondarySources) {
      if (!source.enabled) {
        logger.debug(`跳过已禁用的源: ${source.name}`);
        continue;
      }

      try {
        logger.debug(`处理副源: ${source.name}`);
        const config = await this.fetchConfigSource(source, source.name);
        let nodes = this.extractNodes(config, source.config_type || 'auto');
        
        // 添加源信息
        nodes = nodes.map(node => ({
          ...node,
          source: source.name,
          priority: source.priority || 99
        }));

        // 应用过滤规则
        if (source.filter) {
          nodes = this.applyNodeFilter(nodes, source.filter);
        }
        
        // 注意：不在这里应用 node_scope，因为在 mapped_only 模式下
        // node_scope 会在 selectNodesByMapping 中进行预过滤
        // 在 selective 模式下，需要在这里应用
        if (source.sync_mode === 'selective' && source.node_scope) {
          nodes = this.applyNodeScope(nodes, source.node_scope);
        }

        // 根据同步模式选择节点
        const selectedNodes = this.selectNodesByMode(nodes, source);

        processedSources.push({
          source: source,
          nodes: selectedNodes
        });

        logger.debug(`从源 ${source.name} 选择了 ${selectedNodes.length} 个节点进行同步`);

      } catch (error) {
        logger.error(`处理副源 ${source.name} 失败: ${error.message}`);
        // 继续处理其他源
      }
    }

    return processedSources;
  }

  /**
   * 提取节点信息
   * @param {Object} config 配置对象
   * @param {String} configType 配置类型
   * @returns {Array} 节点列表
   */
  static extractNodes(config, configType = 'singbox') {
    try {
      switch (configType) {
        case 'singbox':
          return this.extractSingBoxNodes(config);
        case 'clash':
          return this.extractClashNodes(config);
        case 'v2ray':
        case 'xray':
          return this.extractV2RayNodes(config);
        case 'hysteria':
          return this.extractHysteriaNodes(config);
        default:
          logger.warn(`不支持的配置类型: ${configType}`);
          return [];
      }
    } catch (error) {
      logger.error(`提取节点信息失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 提取 SingBox 节点
   * @param {Object} config SingBox 配置
   * @returns {Array} 节点列表
   */
  static extractSingBoxNodes(config) {
    if (!config.outbounds || !Array.isArray(config.outbounds)) {
      return [];
    }

    return config.outbounds
      .filter(outbound => outbound.type && !['direct', 'block', 'dns'].includes(outbound.type))
      .map(outbound => ({
        tag: outbound.tag,
        type: outbound.type,
        server: outbound.server,
        server_port: outbound.server_port,
        config: outbound
      }));
  }

  /**
   * 提取 Clash 节点
   * @param {Object} config Clash 配置
   * @returns {Array} 节点列表
   */
  static extractClashNodes(config) {
    if (!config.proxies || !Array.isArray(config.proxies)) {
      return [];
    }

    return config.proxies.map(proxy => ({
      tag: proxy.name,
      type: proxy.type,
      server: proxy.server,
      server_port: proxy.port,
      config: this.convertClashToSingBox(proxy)
    }));
  }

  /**
   * 转换 Clash 配置为 SingBox 格式
   * @param {Object} clashProxy Clash 代理配置
   * @returns {Object} SingBox 格式配置
   */
  static convertClashToSingBox(clashProxy) {
    const base = {
      tag: clashProxy.name,
      type: clashProxy.type,
      server: clashProxy.server,
      server_port: clashProxy.port
    };

    switch (clashProxy.type) {
      case 'ss':
        return {
          ...base,
          type: 'shadowsocks',
          method: clashProxy.cipher,
          password: clashProxy.password
        };
      case 'vmess':
        return {
          ...base,
          uuid: clashProxy.uuid,
          alter_id: clashProxy['alter-id'] || 0,
          security: clashProxy.security || 'auto'
        };
      case 'trojan':
        return {
          ...base,
          password: clashProxy.password,
          tls: {
            enabled: true,
            server_name: clashProxy.sni || clashProxy.server
          }
        };
      default:
        return base;
    }
  }

  /**
   * 提取 V2Ray/Xray 节点
   * @param {Object} config V2Ray/Xray 配置
   * @returns {Array} 节点列表
   */
  static extractV2RayNodes(config) {
    if (!config.outbounds || !Array.isArray(config.outbounds)) {
      return [];
    }

    return config.outbounds
      .filter(outbound => outbound.protocol && !['freedom', 'blackhole', 'dns'].includes(outbound.protocol))
      .map(outbound => ({
        tag: outbound.tag,
        type: outbound.protocol,
        server: outbound.settings?.vnext?.[0]?.address || outbound.settings?.servers?.[0]?.address,
        server_port: outbound.settings?.vnext?.[0]?.port || outbound.settings?.servers?.[0]?.port,
        config: this.convertV2RayToSingBox(outbound)
      }));
  }

  /**
   * 转换 V2Ray 配置为 SingBox 格式
   * @param {Object} v2rayOutbound V2Ray outbound 配置
   * @returns {Object} SingBox 格式配置
   */
  static convertV2RayToSingBox(v2rayOutbound) {
    const base = {
      tag: v2rayOutbound.tag,
      type: v2rayOutbound.protocol
    };

    // 提取服务器信息
    if (v2rayOutbound.settings?.vnext?.[0]) {
      const vnext = v2rayOutbound.settings.vnext[0];
      base.server = vnext.address;
      base.server_port = vnext.port;
      
      if (vnext.users?.[0]) {
        const user = vnext.users[0];
        if (user.id) base.uuid = user.id;
        if (user.alterId !== undefined) base.alter_id = user.alterId;
        if (user.security) base.security = user.security;
      }
    }

    return base;
  }

  /**
   * 提取 Hysteria 节点
   * @param {Object} config Hysteria 配置
   * @returns {Array} 节点列表
   */
  static extractHysteriaNodes(config) {
    if (config.server) {
      return [{
        tag: config.name || 'hysteria-node',
        type: 'hysteria',
        server: config.server.split(':')[0],
        server_port: parseInt(config.server.split(':')[1]) || 443,
        config: {
          tag: config.name || 'hysteria-node',
          type: 'hysteria',
          server: config.server.split(':')[0],
          server_port: parseInt(config.server.split(':')[1]) || 443,
          auth_str: config.auth_str || config.auth,
          up_mbps: config.up_mbps || config.up,
          down_mbps: config.down_mbps || config.down
        }
      }];
    }
    return [];
  }

  /**
   * 应用节点过滤规则
   * @param {Array} nodes 节点列表
   * @param {Object} filter 过滤规则
   * @returns {Array} 过滤后的节点列表
   */
  static applyNodeFilter(nodes, filter = {}) {
    if (!filter || Object.keys(filter).length === 0) {
      return nodes;
    }

    return nodes.filter(node => {
      // 包含类型过滤
      if (filter.include_types && Array.isArray(filter.include_types)) {
        if (!filter.include_types.includes(node.type)) {
          return false;
        }
      }

      // 排除类型过滤
      if (filter.exclude_types && Array.isArray(filter.exclude_types)) {
        if (filter.exclude_types.includes(node.type)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 应用节点范围限制
   * @param {Array} nodes 节点列表
   * @param {Object} scope 节点范围配置
   * @returns {Array} 过滤后的节点列表
   */
  static applyNodeScope(nodes, scope = {}) {
    let filteredNodes = [...nodes];

    // 应用包含模式
    if (scope.include_patterns && Array.isArray(scope.include_patterns)) {
      filteredNodes = filteredNodes.filter(node => {
        return scope.include_patterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(node.tag);
        });
      });
    }

    // 应用排除模式  
    if (scope.exclude_patterns && Array.isArray(scope.exclude_patterns)) {
      filteredNodes = filteredNodes.filter(node => {
        return !scope.exclude_patterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(node.tag);
        });
      });
    }

    // 应用目标标签过滤 - 直接使用副源节点名称
    if (scope.target_tags && Array.isArray(scope.target_tags)) {
      filteredNodes = filteredNodes.filter(node => 
        scope.target_tags.includes(node.tag)
      );
    }

    // 应用数量限制
    if (scope.max_nodes && typeof scope.max_nodes === 'number') {
      const selection = scope.node_selection || 'first';
      
      switch (selection) {
        case 'first':
          filteredNodes = filteredNodes.slice(0, scope.max_nodes);
          break;
        case 'last':
          filteredNodes = filteredNodes.slice(-scope.max_nodes);
          break;
        case 'random':
          filteredNodes = this.shuffleArray(filteredNodes).slice(0, scope.max_nodes);
          break;
        case 'priority':
          filteredNodes = filteredNodes
            .sort((a, b) => a.priority - b.priority)
            .slice(0, scope.max_nodes);
          break;
      }
    }

    return filteredNodes;
  }

  /**
   * 根据同步模式选择节点
   * @param {Array} nodes 节点列表
   * @param {Object} source 源配置
   * @returns {Array} 选择的节点列表
   */
  static selectNodesByMode(nodes, source) {
    const syncMode = source.sync_mode || 'mapped_only';
    
    switch (syncMode) {
      case 'mapped_only':
        // 仅选择在 node_maps 中定义的节点，支持模糊匹配
        if (!source.node_maps) {
          return [];
        }
        return this.selectNodesByMapping(nodes, source.node_maps, source.node_scope);
        
      case 'selective':
        // 根据节点范围和过滤规则选择（已在之前步骤应用）
        return nodes;
        
      case 'all':
        // 返回所有节点（已过滤）
        return nodes;
        
      default:
        logger.warn(`未知的同步模式: ${syncMode}，使用默认的 mapped_only 模式`);
        return this.selectNodesByMode(nodes, { ...source, sync_mode: 'mapped_only' });
    }
  }

  /**
   * 根据节点映射选择节点，支持模糊匹配
   * @param {Array} nodes 节点列表
   * @param {Object} nodeMaps 节点映射配置
   * @param {Object} nodeScope 节点范围限制（可选）
   * @returns {Array} 匹配的节点列表
   */
  static selectNodesByMapping(nodes, nodeMaps, nodeScope = null) {
    const selectedNodes = [];
    const mappedNodeNames = Object.values(nodeMaps);
    
    // 如果有 node_scope，先进行预过滤以缩小搜索范围
    let candidateNodes = nodes;
    if (nodeScope) {
      candidateNodes = this.applyNodeScope(nodes, nodeScope);
      logger.debug(`节点范围过滤: ${nodes.length} -> ${candidateNodes.length} 个候选节点`, 'CONFIG');
    }
    
    for (const targetName of mappedNodeNames) {
      // 首先尝试精确匹配
      let matchedNode = candidateNodes.find(node => node.tag === targetName);
      
      if (!matchedNode) {
        // 如果精确匹配失败，尝试模糊匹配
        matchedNode = this.findBestMatch(targetName, candidateNodes);
      }
      
      if (matchedNode) {
        selectedNodes.push(matchedNode);
        logger.debug(`节点匹配成功: "${targetName}" -> "${matchedNode.tag}"`, 'CONFIG');
      } else {
        logger.warn(`未找到匹配节点: "${targetName}"`, 'CONFIG');
      }
    }
    
    return selectedNodes;
  }

  /**
   * 查找最佳匹配的节点
   * @param {String} targetName 目标节点名
   * @param {Array} nodes 节点列表
   * @param {Number} threshold 相似度阈值 (0-1)
   * @returns {Object|null} 最佳匹配的节点
   */
  static findBestMatch(targetName, nodes, threshold = 0.6) {
    let bestMatch = null;
    let bestScore = 0;
    
    // 清理目标名称，移除emoji和特殊字符
    const cleanTarget = this.cleanNodeName(targetName);
    
    for (const node of nodes) {
      const cleanNodeName = this.cleanNodeName(node.tag);
      
      // 计算相似度
      const similarity = this.calculateSimilarity(cleanTarget, cleanNodeName);
      
      
      if (similarity > bestScore && similarity >= threshold) {
        bestScore = similarity;
        bestMatch = node;
      }
    }
    
    if (bestMatch) {
      logger.debug(`最佳匹配: "${targetName}" -> "${bestMatch.tag}" (相似度: ${bestScore.toFixed(3)})`, 'CONFIG');
    }
    
    return bestMatch;
  }

  /**
   * 为映射阶段查找最佳匹配节点
   * @param {String} targetName 目标节点名
   * @param {Array} nodes 节点列表
   * @param {Number} threshold 相似度阈值 (0-1)
   * @returns {Object|null} 最佳匹配的节点
   */
  static findBestMatchForMapping(targetName, nodes, threshold = 0.6) {
    let bestMatch = null;
    let bestScore = 0;
    
    const cleanTarget = this.cleanNodeName(targetName);
    
    for (const node of nodes) {
      const cleanNodeName = this.cleanNodeName(node.tag);
      const similarity = this.calculateSimilarity(cleanTarget, cleanNodeName);
      
      if (similarity > bestScore && similarity >= threshold) {
        bestScore = similarity;
        bestMatch = node;
      }
    }
    
    return bestMatch;
  }

  /**
   * 清理节点名称，移除emoji和特殊字符
   * @param {String} name 原始节点名
   * @returns {String} 清理后的节点名
   */
  static cleanNodeName(name) {
    if (!name) return '';
    
    return name
      // 移除emoji（基于Unicode范围）
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      // 移除常见特殊字符
      .replace(/[🇭🇰🇺🇸🇯🇵🇸🇬🇨🇳]/g, '')
      // 移除多余的空格和标点
      .replace(/[\[\]()（）【】]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * 计算两个字符串的相似度
   * @param {String} str1 字符串1
   * @param {String} str2 字符串2
   * @returns {Number} 相似度 (0-1)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    // 综合计算相似度
    const jaccardSim = this.jaccardSimilarity(str1, str2);
    const levenshteinSim = this.levenshteinSimilarity(str1, str2);
    const containsSim = this.containsSimilarity(str1, str2);
    
    // 加权平均
    return (jaccardSim * 0.4 + levenshteinSim * 0.4 + containsSim * 0.2);
  }

  /**
   * Jaccard相似度（基于n-gram）
   * @param {String} str1 字符串1
   * @param {String} str2 字符串2
   * @returns {Number} Jaccard相似度
   */
  static jaccardSimilarity(str1, str2) {
    const ngrams1 = this.getNGrams(str1, 2);
    const ngrams2 = this.getNGrams(str2, 2);
    
    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * 编辑距离相似度
   * @param {String} str1 字符串1
   * @param {String} str2 字符串2
   * @returns {Number} 编辑距离相似度
   */
  static levenshteinSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - (distance / maxLen);
  }

  /**
   * 包含关系相似度
   * @param {String} str1 字符串1
   * @param {String} str2 字符串2
   * @returns {Number} 包含相似度
   */
  static containsSimilarity(str1, str2) {
    const words1 = str1.split(/\s+/).filter(w => w.length > 1);
    const words2 = str2.split(/\s+/).filter(w => w.length > 1);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  /**
   * 获取字符串的n-gram
   * @param {String} str 输入字符串
   * @param {Number} n n-gram大小
   * @returns {Array} n-gram数组
   */
  static getNGrams(str, n) {
    if (str.length < n) return [str];
    
    const ngrams = [];
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.substr(i, n));
    }
    return ngrams;
  }

  /**
   * 计算编辑距离
   * @param {String} str1 字符串1
   * @param {String} str2 字符串2
   * @returns {Number} 编辑距离
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * @param {Object} masterConfig 主配置
   * @param {Array} processedSources 处理后的源列表
   * @param {Object} syncConfig 同步配置
   * @returns {Object} 合并后的配置
   */
  static mergeConfigsWithMapping(masterConfig, processedSources, syncConfig) {
    // 深拷贝主配置
    const mergedConfig = JSON.parse(JSON.stringify(masterConfig));

    // 确保 outbounds 数组存在
    if (!mergedConfig.outbounds) {
      mergedConfig.outbounds = [];
    }

    // 构建主配置节点映射
    const masterNodeMap = new Map();
    mergedConfig.outbounds.forEach((outbound, index) => {
      masterNodeMap.set(outbound.tag, { outbound, index });
    });

    let updatedCount = 0;
    let addedCount = 0;

    // 处理每个源
    for (const { source, nodes } of processedSources) {
      const syncMode = source.sync_mode || 'mapped_only';
      
      if (syncMode === 'mapped_only' && source.node_maps) {
        // 仅更新映射的节点
        for (const [masterTag, sourceTag] of Object.entries(source.node_maps)) {
          // 首先尝试精确匹配
          let sourceNode = nodes.find(node => node.tag === sourceTag);
          
          // 如果精确匹配失败，尝试模糊匹配（这种情况下nodes已经是通过模糊匹配选择的）
          if (!sourceNode && nodes.length > 0) {
            // 从选中的节点中查找最匹配的
            sourceNode = this.findBestMatchForMapping(sourceTag, nodes);
          }
          
                  logger.debug(`查找映射节点: ${masterTag} <- ${sourceTag}`, 'CONFIG');
        logger.debug(`副源节点列表: ${nodes.map(n => n.tag).join(', ')}`, 'CONFIG');
        logger.debug(`主配置节点列表: ${Array.from(masterNodeMap.keys()).join(', ')}`, 'CONFIG');
        
        if (sourceNode) {
          logger.debug(`找到副源节点: ${sourceNode.tag} (${sourceNode.type})`, 'CONFIG');
            if (masterNodeMap.has(masterTag)) {
              // 更新主配置中的对应节点，保持主配置的tag名称
              const updatedConfig = { ...sourceNode.config };
              updatedConfig.tag = masterTag; // 保持主配置的节点名称
              
              const existing = masterNodeMap.get(masterTag);
              mergedConfig.outbounds[existing.index] = updatedConfig;
              updatedCount++;
              
              logger.info(`✓ 更新节点映射: ${masterTag} <- ${sourceNode.tag}`, 'CONFIG');
            } else {
                              logger.warn(`主配置中未找到节点: ${masterTag}`, 'CONFIG');
            }
          } else {
            logger.warn(`副源中未找到节点: ${sourceTag}`, 'CONFIG');
          }
        }
      } else {
        // selective 和 all 模式：添加新节点或更新现有节点
        for (const node of nodes) {
          if (masterNodeMap.has(node.tag)) {
            // 更新现有节点
            const existing = masterNodeMap.get(node.tag);
            mergedConfig.outbounds[existing.index] = node.config;
            updatedCount++;
          } else {
            // 添加新节点
            mergedConfig.outbounds.push(node.config);
            addedCount++;
          }
        }
      }
    }

    logger.info(`配置合并完成: 更新 ${updatedCount} 个节点，新增 ${addedCount} 个节点，总计 ${mergedConfig.outbounds.length} 个节点`);
    return mergedConfig;
  }

  /**
   * 数组洗牌算法
   * @param {Array} array 待洗牌的数组
   * @returns {Array} 洗牌后的数组
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = LvorySyncProcessor; 