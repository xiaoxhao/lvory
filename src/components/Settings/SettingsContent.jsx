import React, { useState, useEffect } from 'react';

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
  }
};

const SettingsContent = ({ section }) => {
  const [settings, setSettings] = useState({
    proxyPort: '7890',
    apiAddress: '127.0.0.1:9090',
    tunMode: false,
    autoStart: false,
    autoRestart: false
  });

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
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

        // 加载API地址
        if (window.electron && window.electron.getProfileData) {
          const profileData = await window.electron.getProfileData();
          if (profileData && profileData.experimental && profileData.experimental.clash_api) {
            setSettings(prev => ({
              ...prev,
              apiAddress: profileData.experimental.clash_api.external_controller || '127.0.0.1:9090'
            }));
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSettingChange = async (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);

    // 保存设置
    try {
      if (window.electron && window.electron.saveSettings) {
        await window.electron.saveSettings(newSettings);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const renderToggle = (label, key, value) => (
    <div style={styles.toggleContainer}>
      <label style={styles.toggleLabel}>{label}</label>
      <div 
        onClick={() => handleSettingChange(key, !value)}
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

                {/* TUN模式开关 */}
                {renderToggle('TUN Mode', 'tunMode', settings.tunMode)}

                {/* 开机自启动开关 */}
                {renderToggle('Auto Start on Boot', 'autoStart', settings.autoStart)}

                {/* 自动重启内核开关 */}
                {renderToggle('Auto Restart Core', 'autoRestart', settings.autoRestart)}
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
    </div>
  );
};

export default SettingsContent; 