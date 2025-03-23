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
    tunMode: false,
    autoStart: false,
    autoRestart: false
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
          const autoLaunch = await window.electron.getAutoLaunch();
          setSettings(prev => ({
            ...prev,
            autoStart: autoLaunch
          }));
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
                autoRestart: result.config.settings.auto_restart || false
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
        await window.electron.setAutoLaunch(settings.autoStart);
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
              autoRestart: result.config.settings.auto_restart || false
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
        const autoLaunch = await window.electron.getAutoLaunch();
        setSettings(prev => ({
          ...prev,
          autoStart: autoLaunch
        }));
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
                {renderToggle('Animation effect', null, showAnimations, handleAnimationChange)}
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '-12px', 
                  marginBottom: '20px',
                  marginLeft: '2px'
                }}>
                  Enable or disable animation effects in the interface (e.g. sci-fi background in node details)
                </p>

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