import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [state, setState] = useState({
    privateMode: false,
    theme: 'light',
    language: 'zh_CN',
    // ... 其他状态
  });

  // 加载持久化的设置
  useEffect(() => {
    const loadSettings = async () => {
          if (window.electron && window.electron.settings && window.electron.settings.get) {
      try {
        const result = await window.electron.settings.get();
          if (result.success) {
            setState(prev => ({
              ...prev,
              ...result.settings,
              showAnimations: result.settings.showAnimations !== undefined 
                ? result.settings.showAnimations 
                : true,
              language: result.settings.language || 'zh_CN'
            }));
            
            // 设置i18n语言
            if(result.settings.language) {
              i18n.changeLanguage(result.settings.language);
            }
          }
        } catch (error) {
          console.error('加载设置失败:', error);
        }
      }
    };

    loadSettings();
  }, [i18n]);

  const updateSettings = async (newSettings) => {
    setState(prev => ({
      ...prev,
      ...newSettings
    }));

    // 如果更新了语言设置，则切换i18n语言
    if (newSettings.language && newSettings.language !== state.language) {
      i18n.changeLanguage(newSettings.language);
    }

    // 持久化设置
    if (window.electron && window.electron.settings && window.electron.settings.save) {
      try {
        await window.electron.settings.save({
          ...state,
          ...newSettings
        });
      } catch (error) {
        console.error('保存设置失败:', error);
      }
    }
  };

  return (
    <AppContext.Provider value={{ 
      ...state,
      updateSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext; 