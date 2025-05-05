import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const styles = {
  container: {
    padding: '24px',
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: '100%',
  },
  section: {
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#1e293b',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  description: {
    color: '#475569',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    marginBottom: '24px',
    fontWeight: '500'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#1e293b',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '500'
  },
  warning: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '500'
  },
  toggleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  toggleLabel: {
    color: '#1e293b',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    flex: 1
  },
  toggle: {
    width: '40px',
    height: '20px',
    borderRadius: '10px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    flexShrink: 0
  },
  toggleEnabled: {
    backgroundColor: '#818cf8'
  },
  toggleDisabled: {
    backgroundColor: '#e2e8f0'
  },
  toggleButton: {
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    transition: 'right 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  betaBadge: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#818cf8',
    color: 'white',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600'
  },
  button: {
    backgroundColor: '#818cf8',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '13px'
  },
  buttonHover: {
    backgroundColor: '#6366f1'
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '13px',
    marginRight: '10px'
  },
  secondaryButtonHover: {
    backgroundColor: '#e5e7eb'
  },
  buttonContainer: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  notification: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '6px',
    backgroundColor: '#10b981',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out'
  }
};

const SettingsContent = ({ section }) => {
  const { showAnimations, updateSettings } = useAppContext();
  const [userConfig, setUserConfig] = useState({
    settings: {
      proxy_port: '7890',
      allow_lan: false,
      api_address: '127.0.0.1:9090'
    }
  });
  const [settings, setSettings] = useState({
    proxyPort: '7890',
    apiAddress: '127.0.0.1:9090',
    allowLan: false,
    tunMode: false,
    autoStart: false,
    autoRestart: false,
    checkUpdateOnBoot: true,
    
    // Nodes 相关设置
    nodeAdvancedMonitoring: false,
    nodeExitStatusMonitoring: false,
    nodeExitIPPurity: false,
    keepNodeTrafficHistory: false,
    
    // 多云互联设置
    cloudInterconnection: false,
    backendAddress: '',
    
    // 高级设置
    gpuAcceleration: false,
    kernelWatchdog: true,
    usePrivateProtocol: false,
    logRotationPeriod: 7,
    extraLogSaving: false,
    language: 'zh_CN',
    nodeIPDetailAPI: 'ip.sb',
  });
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isResetButtonHovered, setIsResetButtonHovered] = useState(false);
  const [notification, setNotification] = useState(null);

  // 加载设置和用户配置
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载持久化的设置
        if (window.electron && window.electron.getSettings) {
          const result = await window.electron.getSettings();
          if (result.success) {
            setSettings(prev => ({
              ...prev,
              ...result.settings
            }));
          }
        }

        // 加载开机自启动设置
        if (window.electron && window.electron.getAutoLaunch) {
          const result = await window.electron.getAutoLaunch();
          if (result.success) {
            setSettings(prev => ({
              ...prev,
              autoStart: result.enabled
            }));
          } else {
            console.error('获取开机自启动设置失败:', result.error);
          }
        }

        // 加载用户配置
        if (window.electron && window.electron.userConfig && window.electron.userConfig.get) {
          const result = await window.electron.userConfig.get();
          if (result.success && result.config) {
            setUserConfig(result.config);
            
            // 使用来自用户配置的值更新UI状态
            if (result.config.settings) {
              setSettings(prev => ({
                ...prev,
                proxyPort: result.config.settings.proxy_port || prev.proxyPort,
                allowLan: result.config.settings.allow_lan || false,
                apiAddress: result.config.settings.api_address || prev.apiAddress,
                tunMode: result.config.settings.tun_mode || false,
                autoRestart: result.config.settings.auto_restart || false,
                checkUpdateOnBoot: result.config.settings.check_update_on_boot !== undefined ? result.config.settings.check_update_on_boot : prev.checkUpdateOnBoot,
                
                // Nodes设置
                nodeAdvancedMonitoring: result.config.settings.node_advanced_monitoring || false,
                nodeExitStatusMonitoring: result.config.settings.node_exit_status_monitoring || false,
                nodeExitIPPurity: result.config.settings.node_exit_ip_purity || false,
                keepNodeTrafficHistory: result.config.settings.keep_node_traffic_history || false,
                
                // 多云互联设置
                cloudInterconnection: result.config.settings.cloud_interconnection || false,
                backendAddress: result.config.settings.backend_address || '',
                
                // 高级设置
                gpuAcceleration: result.config.settings.gpu_acceleration || false,
                kernelWatchdog: result.config.settings.kernel_watchdog !== undefined ? result.config.settings.kernel_watchdog : prev.kernelWatchdog,
                usePrivateProtocol: result.config.settings.use_private_protocol || false,
                logRotationPeriod: result.config.settings.log_rotation_period || 7,
                extraLogSaving: result.config.settings.extra_log_saving || false,
                language: result.config.settings.language || 'zh_CN',
                nodeIPDetailAPI: result.config.settings.node_ip_detail_api || 'ip.sb',
              }));
            }
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    loadData();
  }, []);

  // 监听用户配置更新
  useEffect(() => {
    if (window.electron && window.electron.userConfig && window.electron.userConfig.onUpdated) {
      const unsubscribe = window.electron.userConfig.onUpdated(() => {
        // 当用户配置更新时重新加载
        window.electron.userConfig.get().then(result => {
          if (result.success && result.config) {
            setUserConfig(result.config);
          }
        });
      });
      
      return unsubscribe;
    }
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);

    // 同时更新用户配置对象，但不立即保存
    const newUserConfig = { ...userConfig };
    
    // 确保settings对象存在
    if (!newUserConfig.settings) {
      newUserConfig.settings = {};
    }

    // 根据key更新相应字段
    switch (key) {
      case 'proxyPort':
        newUserConfig.settings.proxy_port = value;
        break;
      case 'allowLan':
        newUserConfig.settings.allow_lan = value;
        break;
      case 'apiAddress':
        newUserConfig.settings.api_address = value;
        break;
      case 'tunMode':
        newUserConfig.settings.tun_mode = value;
        break;
      case 'autoStart':
        // autoStart是系统级设置，不需要存入用户配置文件
        break;
      case 'autoRestart':
        newUserConfig.settings.auto_restart = value;
        break;
      case 'checkUpdateOnBoot':
        newUserConfig.settings.check_update_on_boot = value;
        break;
      case 'nodeAdvancedMonitoring':
        newUserConfig.settings.node_advanced_monitoring = value;
        break;
      case 'nodeExitStatusMonitoring':
        newUserConfig.settings.node_exit_status_monitoring = value;
        break;
      case 'nodeExitIPPurity':
        newUserConfig.settings.node_exit_ip_purity = value;
        break;
      case 'cloudInterconnection':
        newUserConfig.settings.cloud_interconnection = value;
        break;
      case 'backendAddress':
        newUserConfig.settings.backend_address = value;
        break;
      case 'gpuAcceleration':
        newUserConfig.settings.gpu_acceleration = value;
        break;
      case 'kernelWatchdog':
        newUserConfig.settings.kernel_watchdog = value;
        break;
      case 'usePrivateProtocol':
        newUserConfig.settings.use_private_protocol = value;
        break;
      case 'logRotationPeriod':
        newUserConfig.settings.log_rotation_period = value;
        break;
      case 'extraLogSaving':
        newUserConfig.settings.extra_log_saving = value;
        break;
      case 'language':
        newUserConfig.settings.language = value;
        break;
      case 'keepNodeTrafficHistory':
        newUserConfig.settings.keep_node_traffic_history = value;
        break;
      case 'nodeIPDetailAPI':
        newUserConfig.settings.node_ip_detail_api = value;
        break;
      // 其他可能的映射...
    }

    setUserConfig(newUserConfig);
  };

  // 处理动画效果设置改变
  const handleAnimationChange = (value) => {
    updateSettings({ showAnimations: value });
  };

  const applySettings = async () => {
    try {
      // 保存用户配置（会触发配置映射）
      if (window.electron && window.electron.userConfig && window.electron.userConfig.save) {
        const result = await window.electron.userConfig.save(userConfig);
        if (result.success) {
          showNotification('Settings applied successfully');
          
          // 可选：应用映射到现有配置
          if (window.electron && window.electron.mappingEngine && window.electron.mappingEngine.applyMapping) {
            await window.electron.mappingEngine.applyMapping();
          }
        } else {
          console.error('保存配置失败:', result.error);
        }
      }

      // 处理自动启动设置
      if (window.electron && window.electron.setAutoLaunch) {
        const result = await window.electron.setAutoLaunch(settings.autoStart);
        if (!result.success) {
          console.error('设置开机自启动失败:', result.error);
        }
      }

      // 同时保存electron设置
      if (window.electron && window.electron.saveSettings) {
        await window.electron.saveSettings(settings);
      }
    } catch (error) {
      console.error('应用设置失败:', error);
    }
  };

  const resetSettings = async () => {
    try {
      // 重新加载用户配置
      if (window.electron && window.electron.userConfig && window.electron.userConfig.get) {
        const result = await window.electron.userConfig.get();
        if (result.success && result.config) {
          setUserConfig(result.config);
          
          // 使用来自用户配置的值更新UI状态
          if (result.config.settings) {
            setSettings(prev => ({
              ...prev,
              proxyPort: result.config.settings.proxy_port || prev.proxyPort,
              allowLan: result.config.settings.allow_lan || false,
              apiAddress: result.config.settings.api_address || prev.apiAddress,
              tunMode: result.config.settings.tun_mode || false,
              autoRestart: result.config.settings.auto_restart || false,
              checkUpdateOnBoot: result.config.settings.check_update_on_boot !== undefined ? result.config.settings.check_update_on_boot : prev.checkUpdateOnBoot,
              
              // Nodes设置
              nodeAdvancedMonitoring: result.config.settings.node_advanced_monitoring || false,
              nodeExitStatusMonitoring: result.config.settings.node_exit_status_monitoring || false,
              nodeExitIPPurity: result.config.settings.node_exit_ip_purity || false,
              keepNodeTrafficHistory: result.config.settings.keep_node_traffic_history || false,
              
              // 多云互联设置
              cloudInterconnection: result.config.settings.cloud_interconnection || false,
              backendAddress: result.config.settings.backend_address || '',
              
              // 高级设置
              gpuAcceleration: result.config.settings.gpu_acceleration || false,
              kernelWatchdog: result.config.settings.kernel_watchdog !== undefined ? result.config.settings.kernel_watchdog : prev.kernelWatchdog,
              usePrivateProtocol: result.config.settings.use_private_protocol || false,
              logRotationPeriod: result.config.settings.log_rotation_period || 7,
              extraLogSaving: result.config.settings.extra_log_saving || false,
              language: result.config.settings.language || 'zh_CN',
              nodeIPDetailAPI: result.config.settings.node_ip_detail_api || 'ip.sb',
            }));
          }
          
          showNotification('Settings reset successfully');
        } else {
          console.error('重置设置失败:', result.error);
        }
      }
      
      // 重新获取系统级设置
      if (window.electron && window.electron.getSettings) {
        const result = await window.electron.getSettings();
        if (result.success) {
          setSettings(prev => ({
            ...prev,
            ...result.settings
          }));
        }
      }
      
      // 重新获取开机自启动设置
      if (window.electron && window.electron.getAutoLaunch) {
        const result = await window.electron.getAutoLaunch();
        if (result.success) {
          setSettings(prev => ({
            ...prev,
            autoStart: result.enabled
          }));
        } else {
          console.error('获取开机自启动设置失败:', result.error);
        }
      }
    } catch (error) {
      console.error('重置设置失败:', error);
    }
  };

  const renderToggle = (label, key, value, onChange) => (
    <div style={styles.toggleContainer}>
      <label style={styles.toggleLabel}>{label}</label>
      <div 
        onClick={() => onChange ? onChange(!value) : handleSettingChange(key, !value)}
        style={{
          ...styles.toggle,
          ...(value ? styles.toggleEnabled : styles.toggleDisabled)
        }}
      >
        <div style={{
          ...styles.toggleButton,
          right: value ? '2px' : '22px'
        }} />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'basic':
        return (
          <div>
            <div style={styles.section}>
              <div>
                <h1 style={styles.title}>Basic Settings</h1>
                <p style={styles.description}>
                  Configure basic program settings and behavior.
                </p>

                {/* 代理端口设置 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Proxy Port</label>
                  <input
                    type="text"
                    value={settings.proxyPort}
                    onChange={(e) => handleSettingChange('proxyPort', e.target.value)}
                    style={styles.input}
                    placeholder="Enter proxy port (e.g. 7890)"
                  />
                </div>

                {/* API地址设置 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>API Address</label>
                  <input
                    type="text"
                    value={settings.apiAddress}
                    onChange={(e) => handleSettingChange('apiAddress', e.target.value)}
                    style={styles.input}
                    placeholder="Enter API address (e.g. 127.0.0.1:9090)"
                  />
                  <p style={styles.warning}>
                    *Warning: Changing this will require program restart
                  </p>
                </div>

                {/* 允许局域网连接开关 */}
                {renderToggle('Allow LAN Connections', 'allowLan', settings.allowLan)}

                {/* TUN模式开关 */}
                {renderToggle('TUN Mode', 'tunMode', settings.tunMode)}

                {/* 开机自启动开关 */}
                {renderToggle('Auto Start on Boot', 'autoStart', settings.autoStart)}

                {/* 自动重启内核开关 */}
                {renderToggle('Auto Restart Core', 'autoRestart', settings.autoRestart)}
                
                {/* 开机检查更新 */}
                {renderToggle('Check for Updates on Startup', 'checkUpdateOnBoot', settings.checkUpdateOnBoot)}

                {/* 修改按钮容器 */}
                <div style={styles.buttonContainer}>
                  <button
                    onClick={resetSettings}
                    onMouseEnter={() => setIsResetButtonHovered(true)}
                    onMouseLeave={() => setIsResetButtonHovered(false)}
                    style={{
                      ...styles.secondaryButton,
                      ...(isResetButtonHovered ? styles.secondaryButtonHover : {})
                    }}
                  >
                    Reset
                  </button>
                
                  <button
                    onClick={applySettings}
                    onMouseEnter={() => setIsButtonHovered(true)}
                    onMouseLeave={() => setIsButtonHovered(false)}
                    style={{
                      ...styles.button,
                      ...(isButtonHovered ? styles.buttonHover : {})
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div>
            <div style={styles.section}>
              <div>
                <h1 style={styles.title}>System Settings</h1>
                <p style={styles.description}>
                  Configure system-related settings and preferences
                </p>

                {/* 动画效果开关 */}
                {renderToggle('Animation effect', 'animationEffect', settings.animationEffect)}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '-12px', 
                  marginBottom: '20px',
                  marginLeft: '2px'
                }}>
                  Enable or disable animation effects in the interface (e.g. sci-fi background in node details)
                </p>

                {/* 语言选择 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    style={{
                      ...styles.input,
                      height: '36px'
                    }}
                  >
                    <option value="zh_CN">中文</option>
                    <option value="en_US">English</option>
                  </select>
                </div>

                {/* 修改按钮容器 */}
                <div style={styles.buttonContainer}>
                  <button
                    onClick={resetSettings}
                    onMouseEnter={() => setIsResetButtonHovered(true)}
                    onMouseLeave={() => setIsResetButtonHovered(false)}
                    style={{
                      ...styles.secondaryButton,
                      ...(isResetButtonHovered ? styles.secondaryButtonHover : {})
                    }}
                  >
                    Reset
                  </button>
                
                  <button
                    onClick={applySettings}
                    onMouseEnter={() => setIsButtonHovered(true)}
                    onMouseLeave={() => setIsButtonHovered(false)}
                    style={{
                      ...styles.button,
                      ...(isButtonHovered ? styles.buttonHover : {})
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'advanced':
        return (
          <div>
            <div style={styles.section}>
              <div>
                <h1 style={styles.title}>Advanced Settings</h1>
                <p style={styles.description}>
                  Configure advanced settings and features
                </p>

                {/* 内核看门狗 */}
                {renderToggle('Kernel Watchdog', 'kernelWatchdog', settings.kernelWatchdog)}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '-12px', 
                  marginBottom: '15px',
                  marginLeft: '2px'
                }}>
                  Automatically restart the core if it crashes or stops responding
                </p>

                {/* 使用lvory私有协议 */}
                {renderToggle('Use lvory Private Protocol', 'usePrivateProtocol', settings.usePrivateProtocol)}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '-12px', 
                  marginBottom: '15px',
                  marginLeft: '2px'
                }}>
                  Use lvory private protocol for improved security and performance
                </p>

                {/* 日志设置 */}
                <div style={{ marginBottom: '5px' }}>
                  <label style={styles.label}>Log Settings</label>
                </div>

                {/* 日志轮转周期和额外保存放在同一层级，修正行间距 */}
                <div style={{ marginBottom: '15px' }}>
                  {/* 日志轮转周期 */}
                  <div style={{...styles.toggleContainer, marginBottom: '12px'}}>
                    <label style={styles.toggleLabel}>Log Rotation Period (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={settings.logRotationPeriod}
                      onChange={(e) => handleSettingChange('logRotationPeriod', parseInt(e.target.value, 10))}
                      style={{...styles.input, width: '80px'}}
                    />
                  </div>

                  {/* 额外保存 */}
                  {renderToggle('Extra Log Saving', 'extraLogSaving', settings.extraLogSaving)}
                </div>

                {/* 修改按钮容器 */}
                <div style={styles.buttonContainer}>
                  <button
                    onClick={resetSettings}
                    onMouseEnter={() => setIsResetButtonHovered(true)}
                    onMouseLeave={() => setIsResetButtonHovered(false)}
                    style={{
                      ...styles.secondaryButton,
                      ...(isResetButtonHovered ? styles.secondaryButtonHover : {})
                    }}
                  >
                    Reset
                  </button>
                
                  <button
                    onClick={applySettings}
                    onMouseEnter={() => setIsButtonHovered(true)}
                    onMouseLeave={() => setIsButtonHovered(false)}
                    style={{
                      ...styles.button,
                      ...(isButtonHovered ? styles.buttonHover : {})
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'ai':
        return (
          <div>
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={styles.title}>AI Configuration</h1>
                  <p style={styles.description}>
                    Configure AI-powered features and settings.
                  </p>
                </div>
                <span style={styles.betaBadge}>BETA</span>
              </div>
            </div>
          </div>
        );
      
      case 'nodes':
        return (
          <div>
            <div style={styles.section}>
              <div>
                <h1 style={styles.title}>Nodes Settings</h1>
                <p style={styles.description}>
                  Configure node monitoring and management settings
                </p>

                {/* IP Details API Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>IP Details API</label>
                  <select
                    value={settings.nodeIPDetailAPI}
                    onChange={(e) => handleSettingChange('nodeIPDetailAPI', e.target.value)}
                    style={{
                      ...styles.input,
                      height: '36px'
                    }}
                  >
                    <option value="ip.sb">ip.sb</option>
                  </select>
                </div>

                {/* 节点高级监控 */}
                {renderToggle('Advanced Node Monitoring', 'nodeAdvancedMonitoring', settings.nodeAdvancedMonitoring)}
                
                {/* 保留节点流量历史数据 */}
                {renderToggle('Keep Node Traffic History', 'keepNodeTrafficHistory', settings.keepNodeTrafficHistory)}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '-12px', 
                  marginBottom: '15px',
                  marginLeft: '2px'
                }}>
                  Store node traffic data for up to one month
                </p>
                
                {/* 子选项始终显示，但在未启用高级监控时禁用 */}
                <div style={{ marginLeft: '0px', marginTop: '0px', opacity: settings.nodeAdvancedMonitoring ? 1 : 0.5 }}>
                  {/* 节点出口状态监控 */}
                  <div style={styles.toggleContainer}>
                    <label style={styles.toggleLabel}>Node Exit Status Monitoring</label>
                    <div 
                      onClick={() => settings.nodeAdvancedMonitoring && handleSettingChange('nodeExitStatusMonitoring', !settings.nodeExitStatusMonitoring)}
                      style={{
                        ...styles.toggle,
                        ...(settings.nodeExitStatusMonitoring ? styles.toggleEnabled : styles.toggleDisabled),
                        cursor: settings.nodeAdvancedMonitoring ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <div style={{
                        ...styles.toggleButton,
                        right: settings.nodeExitStatusMonitoring ? '2px' : '22px'
                      }} />
                    </div>
                  </div>
                  
                  {/* 节点出口IP纯净度 */}
                  <div style={styles.toggleContainer}>
                    <label style={styles.toggleLabel}>Node Exit IP Purity Check</label>
                    <div 
                      onClick={() => settings.nodeAdvancedMonitoring && handleSettingChange('nodeExitIPPurity', !settings.nodeExitIPPurity)}
                      style={{
                        ...styles.toggle,
                        ...(settings.nodeExitIPPurity ? styles.toggleEnabled : styles.toggleDisabled),
                        cursor: settings.nodeAdvancedMonitoring ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <div style={{
                        ...styles.toggleButton,
                        right: settings.nodeExitIPPurity ? '2px' : '22px'
                      }} />
                    </div>
                  </div>
                </div>

                {/* 修改按钮容器 */}
                <div style={styles.buttonContainer}>
                  <button
                    onClick={resetSettings}
                    onMouseEnter={() => setIsResetButtonHovered(true)}
                    onMouseLeave={() => setIsResetButtonHovered(false)}
                    style={{
                      ...styles.secondaryButton,
                      ...(isResetButtonHovered ? styles.secondaryButtonHover : {})
                    }}
                  >
                    Reset
                  </button>
                
                  <button
                    onClick={applySettings}
                    onMouseEnter={() => setIsButtonHovered(true)}
                    onMouseLeave={() => setIsButtonHovered(false)}
                    style={{
                      ...styles.button,
                      ...(isButtonHovered ? styles.buttonHover : {})
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'cloudConnection':
        return (
          <div>
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={styles.title}>Cloud Connection</h1>
                  <p style={styles.description}>
                    When multiple clients use the same configuration, data can be saved to the cloud for global monitoring and node optimization
                  </p>
                </div>
              </div>
              
              {/* 互联模式开关 */}
              {renderToggle('Connection Mode', 'cloudInterconnection', settings.cloudInterconnection)}
              
              {/* 后端地址始终显示，但在未启用互联模式时禁用 */}
              <div style={{ opacity: settings.cloudInterconnection ? 1 : 0.5 }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.label}>Backend Address</label>
                  <input
                    type="text"
                    value={settings.backendAddress}
                    onChange={(e) => settings.cloudInterconnection && handleSettingChange('backendAddress', e.target.value)}
                    style={{
                      ...styles.input,
                      cursor: settings.cloudInterconnection ? 'text' : 'not-allowed'
                    }}
                    placeholder="Enter backend service address"
                    disabled={!settings.cloudInterconnection}
                  />
                </div>
              </div>

              {/* 修改按钮容器 */}
              <div style={styles.buttonContainer}>
                <button
                  onClick={resetSettings}
                  onMouseEnter={() => setIsResetButtonHovered(true)}
                  onMouseLeave={() => setIsResetButtonHovered(false)}
                  style={{
                    ...styles.secondaryButton,
                    ...(isResetButtonHovered ? styles.secondaryButtonHover : {})
                  }}
                >
                  Reset
                </button>
              
                <button
                  onClick={applySettings}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                  style={{
                    ...styles.button,
                    ...(isButtonHovered ? styles.buttonHover : {})
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Content for {section}</div>;
    }
  };

  return (
    <div style={styles.container}>
      {renderContent()}
      {notification && (
        <div style={styles.notification}>
          {notification}
        </div>
      )}
    </div>
  );
};

export default SettingsContent; 