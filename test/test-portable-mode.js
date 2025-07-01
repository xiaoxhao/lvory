/**
 * 便携模式测试脚本
 * 用于验证便携模式下的路径配置是否正确
 */

// 模拟 Electron 的 app 对象
const mockApp = {
  getAppPath: () => '/path/to/app',
};

// 模拟 process.execPath
const originalExecPath = process.execPath;
process.execPath = '/path/to/app/lvory.exe';

// 设置模拟的便携模式标识
global.mockPortableMode = false;

// 动态修改 paths.js 进行测试
function testPortableMode() {
  console.log('=== 便携模式路径测试 ===\n');
  
  console.log('1. 测试标准模式（非便携）');
  global.mockPortableMode = false;
  
  // 重新加载模块以应用新的模式设置
  delete require.cache[require.resolve('../src/utils/paths')];
  const paths1 = require('../src/utils/paths');
  
  // 模拟 isPortableMode 返回 false
  const originalIsPortable1 = paths1.isPortableMode;
  paths1.isPortableMode = () => false;
  
  console.log('应用数据目录:', paths1.getAppDataDir());
  console.log('配置目录:', paths1.getConfigDir());
  console.log('Bin目录:', paths1.getBinDir());
  console.log('设置文件路径:', paths1.getUserSettingsPath());
  console.log('存储文件路径:', paths1.getStorePath());
  console.log('日志目录:', paths1.getLogDir());
  
  console.log('\n2. 测试便携模式');
  global.mockPortableMode = true;
  
  // 重新加载模块
  delete require.cache[require.resolve('../src/utils/paths')];
  const paths2 = require('../src/utils/paths');
  
  // 模拟 isPortableMode 返回 true
  const originalIsPortable2 = paths2.isPortableMode;
  paths2.isPortableMode = () => true;
  
  console.log('应用数据目录:', paths2.getAppDataDir());
  console.log('配置目录:', paths2.getConfigDir());
  console.log('Bin目录:', paths2.getBinDir());
  console.log('设置文件路径:', paths2.getUserSettingsPath());
  console.log('存储文件路径:', paths2.getStorePath());
  console.log('日志目录:', paths2.getLogDir());
  
  console.log('\n=== 测试完成 ===');
  
  // 恢复原始值
  process.execPath = originalExecPath;
}

// 运行测试
if (require.main === module) {
  testPortableMode();
}

module.exports = { testPortableMode }; 