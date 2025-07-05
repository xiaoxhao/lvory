/**
 * SingBox相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const utils = require('./utils');
const singbox = require('../../utils/sing-box');
const profileManager = require('../profile-manager');
const coreDownloader = require('../core-downloader');
const fs = require('fs');
const path = require('path');

/**
 * 设置SingBox相关IPC处理程序
 */
function setup() {
  // 检查sing-box是否安装
  ipcMain.handle('singbox-check-installed', async () => {
    try {
      const result = singbox.checkInstalled();
      return { success: true, installed: result };
    } catch (error) {
      logger.error('检查sing-box安装状态失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box版本
  ipcMain.handle('singbox-get-version', async () => {
    try {
      const result = await singbox.getVersion();
      return result;
    } catch (error) {
      logger.error('获取sing-box版本失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 检查配置
  ipcMain.handle('singbox-check-config', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.checkConfig(data.configPath);
      return result;
    } catch (error) {
      logger.error('检查配置文件失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 格式化配置
  ipcMain.handle('singbox-format-config', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.formatConfig(data.configPath);
      return result;
    } catch (error) {
      logger.error('格式化配置文件失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 启动sing-box内核
  ipcMain.handle('singbox-start-core', async (event, options) => {
    try {
      let configPath;
      if (options && options.configPath) {
        configPath = options.configPath;
      } else {
        configPath = profileManager.getConfigPath();
      }
      
      if (!configPath) {
        return { success: false, error: '无法获取配置文件路径' };
      }
      
      if (!fs.existsSync(configPath)) {
        return { success: false, error: `配置文件不存在: ${configPath}` };
      }
      
      // 获取设置管理器
      const settingsManager = require('../settings-manager');
      const settings = settingsManager.getSettings();
      
      // 从设置管理器获取统一的代理配置
      const proxyConfig = options && options.proxyConfig ? 
        { ...settingsManager.getProxyConfig(configPath), ...options.proxyConfig } : 
        settingsManager.getProxyConfig(configPath);
      
      // 获取 TUN 模式设置
      const tunMode = settings.tunMode || false;
      
      // 确保配置文件已经预处理（包含正确的日志配置）
      logger.info('确保配置文件已预处理...');
      await profileManager.preprocessConfig(configPath);
      
      // 验证日志配置是否正确注入
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        if (config.log && config.log.output) {
          logger.info(`确认日志配置已注入: ${config.log.output}`);
        } else {
          logger.warn('配置文件中未发现日志配置，这可能影响内核监控');
        }
      } catch (verifyError) {
        logger.warn(`验证配置文件失败: ${verifyError.message}`);
      }
      
      // 启动内核前检查版本
      logger.info('启动内核前检查版本');
      const versionResult = await singbox.getVersion();
      if (versionResult.success) {
        const mainWindow = utils.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-version-update', {
            version: versionResult.version,
            fullOutput: versionResult.fullOutput
          });
        }
      }
      
      logger.info(`启动sing-box内核，配置文件: ${configPath}${tunMode ? ' (TUN模式)' : ''}`);
      
      // 启动内核
      const result = await singbox.startCore({ 
        configPath,
        proxyConfig,
        enableSystemProxy: proxyConfig.enableSystemProxy,
        tunMode
      });
      
      return result;
    } catch (error) {
      logger.error('启动sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止sing-box内核
  ipcMain.handle('singbox-stop-core', async () => {
    try {
      const result = await singbox.stopCore();
      return result;
    } catch (error) {
      logger.error('停止sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box状态
  ipcMain.handle('singbox-get-status', async () => {
    try {
      const result = singbox.getStatus();
      return result;
    } catch (error) {
      logger.error('获取sing-box状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取sing-box详细状态
  ipcMain.handle('singbox-get-detailed-status', async () => {
    try {
      const result = singbox.getDetailedStatus();
      return result;
    } catch (error) {
      logger.error('获取sing-box详细状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 检查停止权限
  ipcMain.handle('singbox-check-stop-permission', async () => {
    try {
      const result = await singbox.checkStopPermission();
      return { success: true, ...result };
    } catch (error) {
      logger.error('检查停止权限失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载sing-box核心
  ipcMain.handle('singbox-download-core', async () => {
    try {
      const result = await singbox.downloadCore();
      return result;
    } catch (error) {
      logger.error('下载sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载核心
  ipcMain.handle('download-core', async (event) => {
    try {
      const mainWindow = utils.getMainWindow();
      const result = await coreDownloader.downloadCore(mainWindow);
      // 如果下载成功，尝试获取版本信息
      if (result.success) {
        setTimeout(async () => {
          const versionInfo = await singbox.getVersion();
          if (versionInfo.success && mainWindow && !mainWindow.isDestroyed()) {
            // 通知渲染进程更新版本信息
            mainWindow.webContents.send('core-version-update', {
              version: versionInfo.version,
              fullOutput: versionInfo.fullOutput
            });
          }
        }, 500); // 稍微延迟以确保文件已正确解压并可访问
      }
      return result;
    } catch (error) {
      logger.error('下载内核处理器错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 注册sing-box运行服务的IPC处理程序
  ipcMain.handle('singbox-run', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.run(data.configPath);
      return result;
    } catch (error) {
      logger.error('运行sing-box失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止运行的sing-box服务
  ipcMain.handle('singbox-stop', async () => {
    try {
      const result = await singbox.stop();
      return result;
    } catch (error) {
      logger.error('停止sing-box失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取路由规则
  ipcMain.handle('get-route-rules', async () => {
    try {
      const configPath = profileManager.getConfigPath();
      if (!configPath || !fs.existsSync(configPath)) {
        return { 
          success: false, 
          error: '配置文件不存在',
          rules: []
        };
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      if (!config.route || !config.route.rules) {
        return { 
          success: false, 
          error: '配置文件中未找到路由规则',
          rules: []
        };
      }

      // 转换路由规则格式
      const rules = config.route.rules.map((rule, index) => {
        let type = 'default';
        let payload = '';
        let proxy = rule.outbound || 'DIRECT';

        // 根据规则类型解析
        if (rule.ip_is_private) {
          type = 'ip_is_private';
          payload = 'ip_is_private=true';
        } else if (rule.domain) {
          type = 'domain';
          payload = `domain=${Array.isArray(rule.domain) ? `[${rule.domain.join(' ')}]` : rule.domain}`;
        } else if (rule.domain_keyword) {
          type = 'domain_keyword';
          payload = `domain_keyword=${Array.isArray(rule.domain_keyword) ? `[${rule.domain_keyword.join(' ')}]` : rule.domain_keyword}`;
        } else if (rule.rule_set) {
          type = 'rule_set';
          payload = `rule_set=${Array.isArray(rule.rule_set) ? `[${rule.rule_set.join(' ')}]` : rule.rule_set}`;
        } else if (rule.domain_suffix) {
          type = 'domain_suffix';
          payload = `domain_suffix=${Array.isArray(rule.domain_suffix) ? `[${rule.domain_suffix.join(' ')}]` : rule.domain_suffix}`;
        } else if (rule.geoip) {
          type = 'geoip';
          payload = `geoip=${Array.isArray(rule.geoip) ? `[${rule.geoip.join(' ')}]` : rule.geoip}`;
        } else if (rule.geosite) {
          type = 'geosite';
          payload = `geosite=${Array.isArray(rule.geosite) ? `[${rule.geosite.join(' ')}]` : rule.geosite}`;
        } else if (rule.ip_cidr) {
          type = 'ip_cidr';
          payload = `ip_cidr=${Array.isArray(rule.ip_cidr) ? `[${rule.ip_cidr.join(' ')}]` : rule.ip_cidr}`;
        } else if (rule.port) {
          type = 'port';
          payload = `port=${Array.isArray(rule.port) ? `[${rule.port.join(' ')}]` : rule.port}`;
        } else if (rule.port_range) {
          type = 'port_range';
          payload = `port_range=${Array.isArray(rule.port_range) ? `[${rule.port_range.join(' ')}]` : rule.port_range}`;
        } else if (rule.process_name) {
          type = 'process_name';
          payload = `process_name=${Array.isArray(rule.process_name) ? `[${rule.process_name.join(' ')}]` : rule.process_name}`;
        } else {
          // 其他类型的规则
          const keys = Object.keys(rule).filter(key => key !== 'outbound');
          if (keys.length > 0) {
            type = keys[0];
            const value = rule[keys[0]];
            payload = `${keys[0]}=${Array.isArray(value) ? `[${value.join(' ')}]` : value}`;
          }
        }

        return {
          type,
          payload,
          proxy
        };
      });

      return {
        success: true,
        rules
      };
    } catch (error) {
      logger.error('获取路由规则失败:', error);
      return { 
        success: false, 
        error: error.message,
        rules: []
      };
    }
  });
}

module.exports = {
  setup
}; 