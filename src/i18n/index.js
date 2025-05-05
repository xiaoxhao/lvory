import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './translations/en-US';
import zhCN from './translations/zh-CN';

const resources = {
  en_US: {
    translation: enUS
  },
  zh_CN: {
    translation: zhCN
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en_US',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language'
    }
  });

export default i18n; 