/**
 * 便携模式测试脚本
 * 用于验证便携模式下的路径配置是否正确
 */

const path = require('path');
const fs = require('fs');

// 保存原始值
const originalExecPath = process.execPath;
const originalCwd = process.cwd;

function testPortableMode() {
  console.log('=== 便携模式路径测试 ===\n');
  
  // 备份原始文件
  const pathsFilePath = require.resolve('../src/utils/paths');
  const originalContent = fs.readFileSync(pathsFilePath, 'utf8');
  
  try {
    console.log('1. 测试标准模式（非便携）');
    
    // 设置非便携模式
    let modifiedContent = originalContent.replace(/const APP_IS_PORTABLE = '[^']*'/, "const APP_IS_PORTABLE = 'false'");
    fs.writeFileSync(pathsFilePath, modifiedContent);
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths1 = require('../src/utils/paths');
    
    console.log('Bin目录:', paths1.getBinDir());
    console.log('应用数据目录:', paths1.getAppDataDir());
    
    console.log('\n2. 测试便携模式');
    
    // 设置便携模式
    modifiedContent = originalContent.replace(/const APP_IS_PORTABLE = '[^']*'/, "const APP_IS_PORTABLE = 'true'");
    fs.writeFileSync(pathsFilePath, modifiedContent);
    
    // 模拟不同的工作目录和可执行文件路径
    process.cwd = () => 'D:\\portable-app';
    process.execPath = 'D:\\somewhere-else\\lvory.exe';
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths2 = require('../src/utils/paths');
    
    console.log('Bin目录:', paths2.getBinDir());
    console.log('应用数据目录:', paths2.getAppDataDir());
    
    console.log('\n=== 测试完成 ===');
    
    // 验证结果
    if (paths2.getBinDir() === 'D:\\portable-app' && paths2.getAppDataDir() === 'D:\\portable-app\\data') {
      console.log('✅ 便携模式路径配置正确！');
    } else {
      console.log('❌ 便携模式路径配置有误！');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 恢复原始值
    process.execPath = originalExecPath;
    process.cwd = originalCwd;
    
    // 恢复原始文件内容
    fs.writeFileSync(pathsFilePath, originalContent);
    
    // 清除缓存
    delete require.cache[pathsFilePath];
  }
}

// 运行测试
if (require.main === module) {
  testPortableMode();
}

module.exports = { testPortableMode }; 