/**
 * 映射定义模块
 * 定义用户配置到目标配置的映射规则
 */

/**
 * 获取默认的映射定义
 * @returns {Object} 默认映射定义对象
 */
function getDefaultMappingDefinition() {
  return {
    "mappings": [
      {
        "user_path": "settings.allow_lan",
        "target_path": "inbounds.[type=mixed].listen",
        "type": "boolean",
        "transform": "conditional",
        "condition": "value === true",
        "true_value": "0.0.0.0",
        "false_value": "127.0.0.1",
        "description": "是否允许局域网连接"
      },
      {
        "user_path": "settings.api_address",
        "target_path": "experimental.clash_api.external_controller",
        "type": "string",
        "default": "127.0.0.1:9090",
        "description": "API地址设置"
      },
      {
        "user_path": "settings.log_enabled",
        "target_path": "log",
        "type": "boolean",
        "default": true,
        "transform": "conditional",
        "condition": "value === true",
        "true_value": {
          "level": "{settings.log_level}",
          "output": "{settings.log_output}",
          "disabled": "{settings.log_disabled}",
          "timestamp": "{settings.log_timestamp}"
        },
        "false_action": "remove",
        "conflict_strategy": "override",
        "description": "完整日志配置"
      },
      {
        "user_path": "settings.tun_mode",
        "target_path": "inbounds.[type=tun]",
        "type": "boolean",
        "transform": "conditional",
        "condition": "value === true",
        "true_value": {
          "tag": "tun-in",
          "type": "tun",
          "address": [
            "172.18.0.1/30",
            "fdfe:dcba:9876::1/126"
          ],
          "auto_route": true,
          "strict_route": true,
          "stack": "system",
          "platform": {
            "http_proxy": {
              "enabled": true,
              "server": "127.0.0.1",
              "server_port": "{settings.proxy_port}"
            }
          }
        },
        "false_action": "remove",
        "description": "TUN模式配置"
      },

      {
        "user_path": "nodes[*]",
        "target_path": "outbounds.[tag={nodes[*].name}]",
        "transform": "template",
        "template": {
          "type": "{nodes[*].protocol}",
          "tag": "{nodes[*].name}",
          "server": "{nodes[*].server}",
          "server_port": "{nodes[*].port}"
        },
        "description": "节点信息映射"
      }
    ]
  };
}

/**
 * @returns {Object} 完整的TUN配置模板
 */
function getTunConfigTemplate() {
  return {
    "tag": "tun-in",
    "type": "tun",
    "address": [
      "172.18.0.1/30",
      "fdfe:dcba:9876::1/126"
    ],
    "auto_route": true,
    "strict_route": true,
    "stack": "system",
    "platform": {
      "http_proxy": {
        "enabled": true,
        "server": "127.0.0.1",
        "server_port": 7890
      }
    }
  };
}

/**
 * 获取特定协议的映射模板
 * @param {String} protocol 协议类型
 * @returns {Object} 特定协议的映射模板
 */
function getProtocolTemplate(protocol) {
  // 根据不同协议类型返回不同的模板
  const templates = {
    "shadowsocks": {
      "type": "shadowsocks",
      "tag": "{nodes[*].name}",
      "server": "{nodes[*].server}",
      "server_port": "{nodes[*].port}",
      "method": "{nodes[*].method}",
      "password": "{nodes[*].password}"
    },
    "vmess": {
      "type": "vmess",
      "tag": "{nodes[*].name}",
      "server": "{nodes[*].server}",
      "server_port": "{nodes[*].port}",
      "uuid": "{nodes[*].uuid}",
      "alter_id": "{nodes[*].alter_id}",
      "security": "{nodes[*].security}"
    },
    "trojan": {
      "type": "trojan",
      "tag": "{nodes[*].name}",
      "server": "{nodes[*].server}",
      "server_port": "{nodes[*].port}",
      "password": "{nodes[*].password}"
    }
  };
  
  return templates[protocol] || {};
}

/**
 * 创建针对特定协议的映射定义
 * @param {String} protocol 协议类型
 * @returns {Object} 映射定义对象
 */
function createProtocolMapping(protocol) {
  return {
    "user_path": `nodes[protocol=${protocol}]`,
    "target_path": "outbounds.[tag={nodes[*].name}]",
    "transform": "template",
    "template": getProtocolTemplate(protocol),
    "description": `${protocol}节点映射`
  };
}

/**
 * 获取默认日志配置模板
 * @returns {Object} 默认日志配置
 */
function getDefaultLogConfig() {
  return {
    "disabled": false,
    "level": "info",
    "timestamp": true
  };
}

module.exports = {
  getDefaultMappingDefinition,
  getTunConfigTemplate,
  getProtocolTemplate,
  createProtocolMapping,
  getDefaultLogConfig
}; 