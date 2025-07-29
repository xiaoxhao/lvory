import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'lvory_privacy_settings';

const defaultSettings = {
  hideNodeNames: false,
  hideNodeIPs: false,
  hideNodeTypes: false,
  hidePersonalIP: 'none', // 'none', 'partial', 'full'
};

// 从 localStorage 加载设置
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch (error) {
    console.warn('Failed to load privacy settings from localStorage:', error);
    return defaultSettings;
  }
};

// 保存设置到 localStorage
const saveSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save privacy settings to localStorage:', error);
  }
};

export const usePrivacySettings = () => {
  const [privacySettings, setPrivacySettingsState] = useState(loadSettings);

  // 更新设置的回调函数
  const setPrivacySettings = useCallback((newSettings) => {
    setPrivacySettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  // 缓存的隐藏状态计算函数
  const createHideStates = useCallback((privateMode = false) => {
    return {
      hideNodeNames: privateMode || privacySettings.hideNodeNames,
      hideNodeIPs: privateMode || privacySettings.hideNodeIPs,
      hideNodeTypes: privateMode || privacySettings.hideNodeTypes,
      hidePersonalIP: privacySettings.hidePersonalIP
    };
  }, [privacySettings]);

  // IP格式化函数
  const formatIpForDisplay = useMemo(() => {
    return (ipString) => {
      if (!ipString) return ipString;
      
      if (privacySettings.hidePersonalIP === 'full') {
        return '隐藏';
      } else if (privacySettings.hidePersonalIP === 'partial') {
        // 部分隐藏IP地址
        const ipMatch = ipString.match(/(\d+\.\d+\.\d+\.)\d+/);
        if (ipMatch) {
          return ipString.replace(/(\d+\.\d+\.\d+\.)\d+/, '$1***');
        }
        // 如果不是标准IP格式，隐藏后半部分
        const parts = ipString.split(' ');
        if (parts.length > 1) {
          return parts[0] + ' ***';
        }
        return ipString.length > 10 ? ipString.substring(0, 10) + '***' : ipString;
      }
      
      return ipString;
    };
  }, [privacySettings.hidePersonalIP]);

  return {
    privacySettings,
    setPrivacySettings,
    createHideStates,
    formatIpForDisplay
  };
};

export default usePrivacySettings;
