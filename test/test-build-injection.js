/**
 * 构建注入测试脚本
 * 验证构建时参数注入的正确性
 */
const fs = require('fs');
const path = require('path');

// 备份和恢复文件
class FileBackup {
  constructor() {
    this.backups = new Map();
  }
  
  backup(filePath) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      this.backups.set(filePath, content);
      console.log(`备份文件: ${filePath}`);
    }
  }
  
  restore(filePath) {
    if (this.backups.has(filePath)) {
      fs.writeFileSync(filePath, this.backups.get(filePath), 'utf8');
      console.log(`恢复文件: ${filePath}`);
    }
  }
  
  restoreAll() {
    for (const [filePath] of this.backups) {
      this.restore(filePath);
    }
    this.backups.clear();
  }
}

// 模拟注入过程
function simulateInjection(isPortable = false) {
  const backup = new FileBackup();
  
  try {
    console.log(`\n=== 模拟 ${isPortable ? '便携版' : '安装版'} 注入过程 ===`);
    
    // 需要注入的文件
    const targetFiles = [
      'src/main/ipc-handlers/utils.js',
      'src/utils/paths.js'
    ];
    
    // 备份文件
    targetFiles.forEach(file => backup.backup(file));
    
    const buildDate = '20241201';
    let injectedFiles = 0;
    
    // 注入过程
    targetFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        console.log(`文件不存在: ${file}`);
        return;
      }
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // 注入构建日期
      if (content.includes("const APP_BUILD_DATE = '")) {
        content = content.replace(/const APP_BUILD_DATE = '\d+'/, `const APP_BUILD_DATE = '${buildDate}'`);
        modified = true;
        console.log(`注入构建日期到 ${file}: ${buildDate}`);
      }
      
      // 注入便携模式标识（仅便携版）
      if (isPortable && content.includes("const APP_IS_PORTABLE = '")) {
        content = content.replace(/const APP_IS_PORTABLE = '(true|false)'/, "const APP_IS_PORTABLE = 'true'");
        modified = true;
        console.log(`注入便携模式标识到 ${file}: true`);
      } else if (!isPortable && content.includes("const APP_IS_PORTABLE = '")) {
        content = content.replace(/const APP_IS_PORTABLE = '(true|false)'/, "const APP_IS_PORTABLE = 'false'");
        console.log(`保持便携模式标识到 ${file}: false`);
      }
      
      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        injectedFiles++;
      }
    });
    
    console.log(`总共注入了 ${injectedFiles} 个文件`);
    
    // 验证注入结果
    console.log('\n--- 验证注入结果 ---');
    targetFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查构建日期
        const buildDateMatch = content.match(/const APP_BUILD_DATE = '(\d+)'/);
        if (buildDateMatch) {
          console.log(`${file} - 构建日期: ${buildDateMatch[1]}`);
        }
        
        // 检查便携模式
        const portableMatch = content.match(/const APP_IS_PORTABLE = '(true|false)'/);
        if (portableMatch) {
          console.log(`${file} - 便携模式: ${portableMatch[1]}`);
        }
      }
    });
    
    // 恢复文件
    console.log('\n--- 恢复原始文件 ---');
    backup.restoreAll();
    
  } catch (error) {
    console.error('测试过程中出错:', error);
    // 确保恢复文件
    backup.restoreAll();
  }
}

// 运行测试
if (require.main === module) {
  console.log('开始构建注入测试');
  
  // 测试安装版注入
  simulateInjection(false);
  
  // 测试便携版注入
  simulateInjection(true);
  
  console.log('\n✅ 构建注入测试完成');
}

module.exports = { simulateInjection, FileBackup }; 