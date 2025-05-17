// 版本信息常量定义
const VERSION_INFO = {
  APP_VERSION: '0.1.7', // 默认版本号
  APP_NAME: 'lvory',
  APP_DESCRIPTION: '基于Sing-Box内核的通用桌面GUI客户端',
  LICENSE: 'MIT License',
  WEBSITE: 'https://github.com/sxueck/lvory',
};

// 尝试从Electron环境获取版本信息
const initVersionInfo = async () => {
  // 在Electron环境中获取package.json信息
  if (window.electron) {
    try {
      // 使用新添加的IPC接口获取版本
      const version = await window.electron.invoke('get-app-version');
      if (version) {
        VERSION_INFO.APP_VERSION = version;
      }
    } catch (error) {
      console.error('无法获取应用版本信息:', error);
    }
  }
};

// 初始化版本信息
initVersionInfo();

// 获取应用版本信息
const getAppVersion = () => VERSION_INFO.APP_VERSION;

// 获取应用名称
const getAppName = () => VERSION_INFO.APP_NAME;

// 获取完整版本信息对象
const getVersionInfo = () => ({...VERSION_INFO});

// 获取格式化的关于信息
const getAboutInfo = async () => {
  let coreVersion = 'Not Installed';
  
  // 尝试更新应用版本信息
  await initVersionInfo();
  
  // 尝试获取内核版本
  if (window.electron && window.electron.singbox && window.electron.singbox.getVersion) {
    try {
      const result = await window.electron.singbox.getVersion();
      if (result.success) {
        coreVersion = result.version || 'Unknown';
      }
    } catch (error) {
      console.error('获取内核版本失败:', error);
    }
  }
  
  return {
    ...VERSION_INFO,
    CORE_VERSION: coreVersion,
  };
};

export {
  getAppVersion,
  getAppName,
  getVersionInfo,
  getAboutInfo,
}; 