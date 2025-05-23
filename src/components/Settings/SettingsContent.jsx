import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { getAboutInfo } from '../../utils/version';

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
  toggleDisabledStyle: {
    backgroundColor: '#e2e8f0',
    cursor: 'not-allowed'
  },
  toggleButtonDisabled: {
    backgroundColor: '#cbd5e1'
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '5px',
    whiteSpace: 'nowrap',
    fontWeight: '600',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out, visibility 0.2s ease-in-out',
    visibility: 'hidden',
    opacity: 0
  },
  tooltipVisible: {
    visibility: 'visible'
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

// 可复用的文本描述组件
const DescriptionText = ({ children }) => (
  <p style={{ 
    fontSize: '12px', 
    color: '#64748b', 
    marginTop: '-12px', 
    marginBottom: '15px',
    marginLeft: '2px'
  }}>{children}</p>
);

// 可复用的带标签输入框组件
const InputWithLabel = ({ label, value, onChange, placeholder, type = "text", min, max, style = {} }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={styles.label}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      style={{...styles.input, ...style}}
      placeholder={placeholder}
      min={min}
      max={max}
    />
  </div>
);

// 可复用的只读标签组件
const ReadOnlyLabel = ({ label, value, loading = false, error = null }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={styles.label}>{label}</label>
    <div style={{
      ...styles.input,
      backgroundColor: '#f8fafc',
      color: loading ? '#64748b' : (error ? '#dc2626' : '#1e293b'),
      border: '1px solid #e2e8f0',
      cursor: 'default',
      display: 'flex',
      alignItems: 'center',
      fontWeight: '600',
      position: 'relative'
    }}>
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid #e2e8f0',
          borderTopColor: '#64748b',
          animation: 'spin 1s linear infinite',
          marginRight: '8px'
        }}></span>
      )}
      <span style={{ color: loading ? '#64748b' : (error ? '#dc2626' : '#334155') }}>
        {loading ? '从配置文件读取中...' : (error ? `错误: ${error}` : (value || '未设置'))}
      </span>
      {!loading && !error && value && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#059669',
          fontWeight: 'normal'
        }}>
          ✓ 从配置文件读取
        </span>
      )}
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// 可复用的选择框组件
const SelectWithLabel = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={styles.label}>{label}</label>
    <select
      value={value}
      onChange={onChange}
      style={{
        ...styles.input,
        height: '36px'
      }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const ToggleWithTooltip = ({ label, tKey, value, onChange, disabled = false, tooltipText }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleClick = () => {
    if (!disabled && onChange) {
      onChange(!value);
    }
  };

  return (
    <div style={styles.toggleContainer} 
         onMouseEnter={() => setIsHovered(true)} 
         onMouseLeave={() => setIsHovered(false)}>
      <label style={{...styles.toggleLabel, color: disabled ? '#94a3b8' : '#1e293b'}}>{label}</label>
      <div 
        onClick={handleToggleClick}
        style={{
          ...styles.toggle,
          ...(disabled ? styles.toggleDisabledStyle : (value ? styles.toggleEnabled : styles.toggleDisabled))
        }}
      >
        <div style={{
          ...styles.toggleButton,
          right: value ? '2px' : '22px',
          ...(disabled ? styles.toggleButtonDisabled : {})
        }} />
      </div>
      {disabled && isHovered && tooltipText && (
        <div style={{...styles.tooltip, ...styles.tooltipVisible, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '5px', whiteSpace: 'nowrap' }}>
          {tooltipText}
        </div>
      )}
    </div>
  );
};

const SettingsContent = ({ section }) => {
  const { t } = useTranslation();
  const { showAnimations, updateSettings, appSettings } = useAppContext();
  const [userConfig, setUserConfig] = useState({ settings: {} });
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
  const [aboutInfo, setAboutInfo] = useState({
    APP_VERSION: '-',
    APP_NAME: 'lvory',
    APP_DESCRIPTION: '-',
    COPYRIGHT: '-',
    WEBSITE: '-',
    LICENSE: '-',
    AUTHOR: '-',
    CORE_VERSION: '-'
  });
  const [configValues, setConfigValues] = useState({
    proxyPort: { value: '', loading: true, error: null },
    apiAddress: { value: '', loading: true, error: null }
  });

  // 从当前配置文件读取代理端口和API地址
  const loadConfigValues = async () => {
    try {
      setConfigValues(prev => ({
        ...prev,
        proxyPort: { value: '', loading: true, error: null },
        apiAddress: { value: '', loading: true, error: null }
      }));

      if (window.electron && window.electron.getCurrentConfig) {
        const result = await window.electron.getCurrentConfig();
        if (result.success && result.config) {
          const config = result.config;
          
          // 使用前端简化版引擎获取值
          let proxyPort = '';
          let apiAddress = '';
          
          try {
            // 查找mixed类型的inbound端口
            if (config.inbounds && Array.isArray(config.inbounds)) {
              const mixedInbound = config.inbounds.find(inbound => inbound.type === 'mixed');
              if (mixedInbound && mixedInbound.listen_port) {
                proxyPort = mixedInbound.listen_port.toString();
              }
            }
            
            // 获取API地址
            if (config.experimental && config.experimental.clash_api && config.experimental.clash_api.external_controller) {
              apiAddress = config.experimental.clash_api.external_controller;
            }
            
            setConfigValues({
              proxyPort: { value: proxyPort, loading: false, error: null },
              apiAddress: { value: apiAddress, loading: false, error: null }
            });
            
            // 同时更新settings状态，用于其他逻辑
            setSettings(prev => ({
              ...prev,
              proxyPort: proxyPort,
              apiAddress: apiAddress
            }));
            
          } catch (parseError) {
            console.error('解析配置值失败:', parseError);
            setConfigValues({
              proxyPort: { value: '', loading: false, error: '解析失败' },
              apiAddress: { value: '', loading: false, error: '解析失败' }
            });
          }
        } else {
          setConfigValues({
            proxyPort: { value: '', loading: false, error: '配置文件不存在' },
            apiAddress: { value: '', loading: false, error: '配置文件不存在' }
          });
        }
      } else {
        setConfigValues({
          proxyPort: { value: '', loading: false, error: 'API不可用' },
          apiAddress: { value: '', loading: false, error: 'API不可用' }
        });
      }
    } catch (error) {
      console.error('读取配置文件失败:', error);
      setConfigValues({
        proxyPort: { value: '', loading: false, error: '读取失败' },
        apiAddress: { value: '', loading: false, error: '读取失败' }
      });
    }
  };

  // 加载关于信息
  useEffect(() => {
    const loadAboutInfo = async () => {
      const info = await getAboutInfo();
      setAboutInfo(info);
    };
    
    if (section === 'about') {
      loadAboutInfo();
    }
    
    // 当进入basic设置页面时，加载配置文件中的值
    if (section === 'basic') {
      loadConfigValues();
    }
  }, [section]);

  // 监听配置文件变化，刷新值
  useEffect(() => {
    // 监听配置文件变更事件
    if (window.electron && window.electron.onProfilesChanged && section === 'basic') {
      const removeListener = window.electron.onProfilesChanged(() => {
        loadConfigValues();
      });
      
      return removeListener;
    }
  }, [section]);

  // 初始化加载设置
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // 加载用户配置
        if (window.electron && window.electron.userConfig && window.electron.userConfig.get) {
          const result = await window.electron.userConfig.get();
          if (result.success && result.config) {
            setUserConfig(result.config);
            setSettings(prev => createUserConfigMapping(result, prev));
          }
        }
        
        // 加载系统级设置
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
          }
        }
      } catch (error) {
        console.error('初始化设置失败:', error);
      }
    };

    initializeSettings();
  }, []);

  // 将映射逻辑提取为独立函数
  const mapSettingToUserConfig = (key, value, userConfig) => {
    // 确保settings对象存在
    if (!userConfig.settings) {
      userConfig.settings = {};
    }

    // 映射关系对象
    const mappings = {
      proxyPort: 'proxy_port',
      allowLan: 'allow_lan',
      apiAddress: 'api_address',
      tunMode: 'tun_mode',
      autoRestart: 'auto_restart',
      checkUpdateOnBoot: 'check_update_on_boot',
      nodeAdvancedMonitoring: 'node_advanced_monitoring',
      nodeExitStatusMonitoring: 'node_exit_status_monitoring',
      nodeExitIPPurity: 'node_exit_ip_purity',
      cloudInterconnection: 'cloud_interconnection',
      backendAddress: 'backend_address',
      gpuAcceleration: 'gpu_acceleration',
      kernelWatchdog: 'kernel_watchdog',
      usePrivateProtocol: 'use_private_protocol',
      logRotationPeriod: 'log_rotation_period',
      extraLogSaving: 'extra_log_saving',
      language: 'language',
      keepNodeTrafficHistory: 'keep_node_traffic_history',
      nodeIPDetailAPI: 'node_ip_detail_api',
    };

    // 如果是autoStart，它是系统级设置，不需要存入用户配置文件
    if (key === 'autoStart') {
      return userConfig;
    }

    // 使用映射表来更新用户配置
    if (mappings[key]) {
      userConfig.settings[mappings[key]] = value;
    }

    return userConfig;
  };

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);

    // 同时更新用户配置对象，但不立即保存
    const newUserConfig = { ...userConfig };
    
    // 使用映射函数更新用户配置
    const updatedUserConfig = mapSettingToUserConfig(key, value, newUserConfig);
    setUserConfig(updatedUserConfig);

    // 如果是语言设置，立即更新全局状态以切换语言
    if (key === 'language') {
      updateSettings({ language: value });
    }
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
          showNotification('settings.settingsApplied');
          
          // 可选：应用映射到现有配置
          if (window.electron && window.electron.mappingEngine && window.electron.mappingEngine.applyMapping) {
            await window.electron.mappingEngine.applyMapping();
          }
          
          // 重新加载配置文件中的值
          if (section === 'basic') {
            await loadConfigValues();
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
          
          // 使用映射函数更新设置
          setSettings(prev => createUserConfigMapping(result, prev));
          
          showNotification('settings.settingsReset');
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
      
      // 重新加载配置文件中的值
      if (section === 'basic') {
        await loadConfigValues();
      }
    } catch (error) {
      console.error('重置设置失败:', error);
    }
  };

  // 辅助函数，用于从配置创建映射
  const createUserConfigMapping = (result, prevSettings) => {
    if (!result.config || !result.config.settings) return prevSettings;
    
    const config = result.config.settings;
    return {
      ...prevSettings,
      proxyPort: config.proxy_port || prevSettings.proxyPort,
      allowLan: config.allow_lan || false,
      apiAddress: config.api_address || prevSettings.apiAddress,
      tunMode: config.tun_mode || false,
      autoRestart: config.auto_restart || false,
      checkUpdateOnBoot: config.check_update_on_boot !== undefined ? config.check_update_on_boot : prevSettings.checkUpdateOnBoot,
      
      // Nodes设置
      nodeAdvancedMonitoring: config.node_advanced_monitoring || false,
      nodeExitStatusMonitoring: config.node_exit_status_monitoring || false,
      nodeExitIPPurity: config.node_exit_ip_purity || false,
      keepNodeTrafficHistory: config.keep_node_traffic_history || false,
      
      // 多云互联设置
      cloudInterconnection: config.cloud_interconnection || false,
      backendAddress: config.backend_address || '',
      
      // 高级设置
      gpuAcceleration: config.gpu_acceleration || false,
      kernelWatchdog: config.kernel_watchdog !== undefined ? config.kernel_watchdog : prevSettings.kernelWatchdog,
      usePrivateProtocol: config.use_private_protocol || false,
      logRotationPeriod: config.log_rotation_period || 7,
      extraLogSaving: config.extra_log_saving || false,
      language: config.language || 'zh_CN',
      nodeIPDetailAPI: config.node_ip_detail_api || 'ip.sb',
    };
  };

  const showNotification = (messageKey) => {
    setNotification(t(messageKey));
    setTimeout(() => {
      setNotification(null);
    }, 3000);
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

  // 创建通用的设置部分组件
  const SettingsSection = ({ title, description, children, badge }) => (
    <div style={styles.section}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.description}>{description}</p>
          </div>
          {badge && <span style={styles.betaBadge}>{badge}</span>}
        </div>
        {children}
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
            {t('settings.reset')}
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
            {t('settings.apply')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'basic':
        return (
          <div>
            <SettingsSection 
              title={t('settings.basicSettings')} 
              description={t('settings.configureBasic')}
            >
              {/* 代理端口设置 */}
              <ReadOnlyLabel
                label={t('settings.proxyPort')}
                value={configValues.proxyPort.value}
                loading={configValues.proxyPort.loading}
                error={configValues.proxyPort.error}
              />

              {/* API地址设置 */}
              <ReadOnlyLabel
                label={t('settings.apiAddress')}
                value={configValues.apiAddress.value}
                loading={configValues.apiAddress.loading}
                error={configValues.apiAddress.error}
              />

              {/* 允许局域网连接开关 */}
              {renderToggle(t('settings.allowLan'), 'allowLan', settings.allowLan)}

              {/* TUN模式开关 - Disabled */}
              <ToggleWithTooltip
                label={t('settings.tunMode')}
                tKey="tunMode"
                value={settings.tunMode}
                onChange={(val) => handleSettingChange('tunMode', val)}
                disabled={true}
                tooltipText={t('settings.featureUnderDevelopment')}
              />

              {/* 开机自启动开关 */}
              {renderToggle(t('settings.autoStart'), 'autoStart', settings.autoStart)}

              {/* 自动重启内核开关 */}
              {renderToggle(t('settings.autoRestart'), 'autoRestart', settings.autoRestart)}
              
              {/* 开机检查更新 */}
              {renderToggle(t('settings.checkUpdates'), 'checkUpdateOnBoot', settings.checkUpdateOnBoot)}

              {/* 语言选择 */}
              <SelectWithLabel
                label={t('settings.language')}
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                options={[
                  { value: 'zh_CN', label: '中文' },
                  { value: 'en_US', label: 'English' }
                ]}
              />
            </SettingsSection>
          </div>
        );
      
      case 'advanced':
        return (
          <div>
            <SettingsSection 
              title={t('settings.advancedSettings')} 
              description={t('settings.configureAdvanced')}
            >
              {/* 内核看门狗 */}
              {renderToggle(t('settings.kernelWatchdog'), 'kernelWatchdog', settings.kernelWatchdog)}
              <DescriptionText>{t('settings.kernelWatchdogDesc')}</DescriptionText>

              {/* 使用lvory私有协议 - Disabled */}
              <ToggleWithTooltip
                label={t('settings.usePrivateProtocol')}
                tKey="usePrivateProtocol"
                value={settings.usePrivateProtocol}
                onChange={(val) => handleSettingChange('usePrivateProtocol', val)}
                disabled={true}
                tooltipText={t('settings.featureUnderDevelopment')}
              />
              <DescriptionText>{t('settings.usePrivateProtocolDesc')}</DescriptionText>

              {/* 日志设置 */}
              <div style={{ marginBottom: '5px' }}>
                <label style={styles.label}>{t('settings.logSettings')}</label>
              </div>

              {/* 日志轮转周期和额外保存放在同一层级，修正行间距 */}
              <div style={{ marginBottom: '15px' }}>
                {/* 日志轮转周期 */}
                <div style={{...styles.toggleContainer, marginBottom: '12px'}}>
                  <label style={styles.toggleLabel}>{t('settings.logRotation')}</label>
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
                {renderToggle(t('settings.extraLogSaving'), 'extraLogSaving', settings.extraLogSaving)}
              </div>
            </SettingsSection>
          </div>
        );
      
      
      case 'nodes':
        return (
          <div>
            <SettingsSection 
              title={t('settings.nodesSettings')} 
              description={t('settings.configureNodes')}
            >
              {/* IP Details API Selection */}
              <SelectWithLabel
                label={t('settings.ipDetailsApi')}
                value={settings.nodeIPDetailAPI}
                onChange={(e) => handleSettingChange('nodeIPDetailAPI', e.target.value)}
                options={[
                  { value: 'ip.sb', label: 'ip.sb' }
                ]}
              />

              {/* 节点高级监控 */}
              {renderToggle(t('settings.advancedNodeMonitoring'), 'nodeAdvancedMonitoring', settings.nodeAdvancedMonitoring)}
              
              {/* 保留节点流量历史数据 */}
              {renderToggle(t('settings.keepNodeTraffic'), 'keepNodeTrafficHistory', settings.keepNodeTrafficHistory)}
              <DescriptionText>{t('settings.keepNodeTrafficDesc')}</DescriptionText>
              
              {/* 子选项始终显示，但在未启用高级监控时禁用 */}
              <div style={{ marginLeft: '0px', marginTop: '0px', opacity: settings.nodeAdvancedMonitoring ? 1 : 0.5, pointerEvents: settings.nodeAdvancedMonitoring ? 'auto' : 'none' }}>
                {/* 节点出口状态监控 - Disabled */}
                <ToggleWithTooltip
                  label={t('settings.nodeExitStatus')}
                  tKey="nodeExitStatusMonitoring"
                  value={settings.nodeExitStatusMonitoring}
                  onChange={(val) => handleSettingChange('nodeExitStatusMonitoring', val)}
                  disabled={true}
                  tooltipText={t('settings.featureUnderDevelopment')}
                />
                
                {/* 节点出口IP纯净度 - Disabled */}
                <ToggleWithTooltip
                  label={t('settings.nodeExitIpPurity')}
                  tKey="nodeExitIPPurity"
                  value={settings.nodeExitIPPurity}
                  onChange={(val) => handleSettingChange('nodeExitIPPurity', val)}
                  disabled={true}
                  tooltipText={t('settings.featureUnderDevelopment')}
                />
              </div>
            </SettingsSection>
          </div>
        );
        
      case 'about':
        return (
          <div>
            <div style={styles.section}>
              <div style={{ 
                minHeight: 'calc(100vh - 150px)', 
                display: 'flex', 
                flexDirection: 'column'
              }}>
                <h1 style={styles.title}>{t('settings.about')}</h1>
                <p style={styles.description}>
                  {t('settings.aboutDescription')}
                </p>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  marginTop: '24px',
                  flex: 1,
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '40px'
                    }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        backgroundColor: '#818cf8',
                        borderRadius: '24px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '42px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(129, 140, 248, 0.2)'
                      }}>L</div>
                      <h2 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        margin: '10px 0 0 0'
                      }}>{aboutInfo.APP_NAME}</h2>
                      <p style={{
                        margin: '0',
                        color: '#64748b',
                        fontSize: '16px'
                      }}>{aboutInfo.APP_DESCRIPTION}</p>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '150px 1fr',
                      gap: '16px',
                      alignItems: 'center',
                      maxWidth: '600px',
                      margin: '0 auto',
                      marginTop: '40px'
                    }}>
                      <div style={{color: '#64748b', fontWeight: '600', fontSize: '15px'}}>{t('settings.appVersion')}</div>
                      <div style={{fontSize: '15px'}}>{aboutInfo.APP_VERSION}</div>
                      
                      <div style={{color: '#64748b', fontWeight: '600', fontSize: '15px'}}>{t('settings.coreVersion')}</div>
                      <div style={{fontSize: '15px'}}>{aboutInfo.CORE_VERSION}</div>
                      
                      <div style={{color: '#64748b', fontWeight: '600', fontSize: '15px'}}>{t('settings.license')}</div>
                      <div style={{fontSize: '15px'}}>{aboutInfo.LICENSE}</div>
                      
                      <div style={{color: '#64748b', fontWeight: '600', fontSize: '15px'}}>{t('settings.projectUrl')}</div>
                      <div>
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.electron && window.electron.openExternal) {
                              window.electron.openExternal(aboutInfo.WEBSITE);
                            }
                          }}
                          style={{
                            color: '#818cf8',
                            textDecoration: 'none',
                            fontSize: '15px'
                          }}
                        >
                          {aboutInfo.WEBSITE}
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '20px 24px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginTop: 'auto',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}>
                    <p style={{margin: '0', color: '#64748b', fontSize: '14px', lineHeight: '1.7'}}>
                      {t('settings.aboutDisclaimer')}
                    </p>
                  </div>
                </div>
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
