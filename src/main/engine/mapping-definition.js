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
        "user_path": "settings.proxy_port",
        "target_path": "inbounds.[type=mixed].listen_port",
        "type": "number",
        "default": 7890,
        "description": "代理服务器端口"
      },
      {
        "user_path": "settings.allow_lan",
        "target_path": "inbounds.[type=mixed].listen",
        "type": "string",
        "transform": "direct",
        "default": "127.0.0.1",
        "description": "是否允许局域网连接",
        "dependencies": [
          {
            "condition": "value === true",
            "target_path": "inbounds.[type=mixed].listen",
            "value": "0.0.0.0",
            "type": "string"
          }
        ]
      },
      {
        "user_path": "settings.api_address",
        "target_path": "experimental.clash_api.external_controller",
        "type": "string",
        "default": "127.0.0.1:9090",
        "description": "API地址设置"
      },
      {
        "user_path": "settings.tun_mode",
        "target_path": "inbounds.[type=tun].enabled",
        "type": "boolean",
        "default": false,
        "description": "TUN模式开关",
        "dependencies": [
          {
            "condition": "value === true",
            "target_path": "inbounds.[type=tun]",
            "value": {
              "type": "tun",
              "tag": "tun-in",
              "interface_name": "tun0",
              "stack": "system",
              "inet4_address": "172.19.0.1/30",
              "mtu": 9000,
              "auto_route": true,
              "strict_route": true
            },
            "type": "object",
            "override_if_exists": false
          }
        ]
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

module.exports = {
  getDefaultMappingDefinition,
  getProtocolTemplate,
  createProtocolMapping
}; 