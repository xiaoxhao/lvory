/**
 * AppImage 模式测试
 * 测试 AppImage 环境检测和路径处理逻辑
 */

const fs = require('fs');
const path = require('path');

function testAppImageMode() {
  console.log('=== AppImage 模式测试 ===');
  
  const pathsFilePath = path.join(__dirname, '../src/utils/paths.js');
  const originalContent = fs.readFileSync(pathsFilePath, 'utf8');
  
  // 保存原始环境变量
  const originalEnv = {
    APPIMAGE: process.env.APPIMAGE,
    APPDIR: process.env.APPDIR,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME
  };
  const originalExecPath = process.execPath;
  
  try {
    console.log('1. 测试标准模式（非 AppImage）');
    
    // 清除 AppImage 相关环境变量
    delete process.env.APPIMAGE;
    delete process.env.APPDIR;
    delete process.env.XDG_CONFIG_HOME;
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths1 = require('../src/utils/paths');
    
    const runModeInfo1 = paths1.getRunModeInfo();
    console.log('运行模式信息:', runModeInfo1);
    console.log('应用数据目录:', paths1.getAppDataDir());
    console.log('Bin目录:', paths1.getBinDir());
    console.log('配置目录:', paths1.getConfigDir());
    
    console.log('\n2. 测试 AppImage 模式（通过 APPIMAGE 环境变量）');
    
    // 设置 AppImage 环境变量
    process.env.APPIMAGE = '/tmp/lvory-0.2.1-x86_64.AppImage';
    process.env.XDG_CONFIG_HOME = '/home/user/.config';
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths2 = require('../src/utils/paths');
    
    const runModeInfo2 = paths2.getRunModeInfo();
    console.log('运行模式信息:', runModeInfo2);
    console.log('应用数据目录:', paths2.getAppDataDir());
    console.log('Bin目录:', paths2.getBinDir());
    console.log('配置目录:', paths2.getConfigDir());
    
    console.log('\n3. 测试 AppImage 模式（通过 APPDIR 环境变量）');
    
    // 清除 APPIMAGE，设置 APPDIR
    delete process.env.APPIMAGE;
    process.env.APPDIR = '/tmp/.mount_lvoryXXXXXX';
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths3 = require('../src/utils/paths');
    
    const runModeInfo3 = paths3.getRunModeInfo();
    console.log('运行模式信息:', runModeInfo3);
    console.log('应用数据目录:', paths3.getAppDataDir());
    console.log('Bin目录:', paths3.getBinDir());
    console.log('配置目录:', paths3.getConfigDir());
    
    console.log('\n4. 测试 AppImage 模式（通过进程路径检测）');
    
    // 清除环境变量，模拟 AppImage 挂载路径
    delete process.env.APPDIR;
    delete process.env.XDG_CONFIG_HOME;
    process.execPath = '/tmp/.mount_lvory123456/usr/bin/lvory';
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths4 = require('../src/utils/paths');
    
    const runModeInfo4 = paths4.getRunModeInfo();
    console.log('运行模式信息:', runModeInfo4);
    console.log('应用数据目录:', paths4.getAppDataDir());
    console.log('Bin目录:', paths4.getBinDir());
    console.log('配置目录:', paths4.getConfigDir());
    
    console.log('\n5. 测试 AppImage 模式（使用自定义 XDG_CONFIG_HOME）');
    
    // 设置自定义配置目录
    process.env.APPIMAGE = '/home/user/Applications/lvory.AppImage';
    process.env.XDG_CONFIG_HOME = '/home/user/.local/config';
    
    // 清除缓存并重新加载
    delete require.cache[pathsFilePath];
    const paths5 = require('../src/utils/paths');
    
    const runModeInfo5 = paths5.getRunModeInfo();
    console.log('运行模式信息:', runModeInfo5);
    console.log('应用数据目录:', paths5.getAppDataDir());
    console.log('Bin目录:', paths5.getBinDir());
    console.log('配置目录:', paths5.getConfigDir());
    
    console.log('\n=== 测试完成 ===');
    
    // 验证结果
    let allTestsPassed = true;
    
    // 验证标准模式
    if (runModeInfo1.mode !== 'standard' || runModeInfo1.isAppImage) {
      console.log('标准模式检测失败！');
      allTestsPassed = false;
    }
    
    // 验证 AppImage 模式检测
    if (runModeInfo2.mode !== 'appimage' || !runModeInfo2.isAppImage) {
      console.log('AppImage 模式检测失败（APPIMAGE 环境变量）！');
      allTestsPassed = false;
    }
    
    if (runModeInfo3.mode !== 'appimage' || !runModeInfo3.isAppImage) {
      console.log('AppImage 模式检测失败（APPDIR 环境变量）！');
      allTestsPassed = false;
    }
    
    if (runModeInfo4.mode !== 'appimage' || !runModeInfo4.isAppImage) {
      console.log('AppImage 模式检测失败（进程路径检测）！');
      allTestsPassed = false;
    }
    
    // 验证路径是否正确指向配置目录
    if (!paths5.getAppDataDir().includes('.local/config/lvory')) {
      console.log('AppImage 模式路径配置失败（自定义 XDG_CONFIG_HOME）！');
      allTestsPassed = false;
    }
    
    if (allTestsPassed) {
      console.log('所有 AppImage 模式测试通过！');
    } else {
      console.log('部分测试失败，请检查实现！');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 恢复原始环境变量
    if (originalEnv.APPIMAGE !== undefined) {
      process.env.APPIMAGE = originalEnv.APPIMAGE;
    } else {
      delete process.env.APPIMAGE;
    }
    
    if (originalEnv.APPDIR !== undefined) {
      process.env.APPDIR = originalEnv.APPDIR;
    } else {
      delete process.env.APPDIR;
    }
    
    if (originalEnv.XDG_CONFIG_HOME !== undefined) {
      process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    
    // 恢复原始进程路径
    process.execPath = originalExecPath;
    
    // 清除缓存
    delete require.cache[pathsFilePath];
  }
}

// 运行测试
if (require.main === module) {
  testAppImageMode();
}

module.exports = { testAppImageMode };
