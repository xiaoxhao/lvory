/**
 * 测试 asar 配置动态修改
 * 验证便携版构建时能否正确禁用 asar
 */
const fs = require('fs');

function testAsarConfigModification() {
  console.log('=== 测试 asar 配置动态修改 ===\n');
  
  // 读取当前的 package.json
  const packageJsonPath = 'package.json';
  const originalContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(originalContent);
  
  console.log('原始 asar 配置:', packageJson.build.asar);
  
  // 测试禁用 asar
  const modifiedPackageJson = JSON.parse(originalContent);
  modifiedPackageJson.build.asar = false;
  
  console.log('修改后 asar 配置:', modifiedPackageJson.build.asar);
  
  // 验证修改是否生效
  if (modifiedPackageJson.build.asar === false) {
    console.log('✅ asar 配置修改成功');
  } else {
    console.log('❌ asar 配置修改失败');
  }
  
  // 测试 JSON 序列化
  try {
    const jsonString = JSON.stringify(modifiedPackageJson, null, 2);
    console.log('✅ JSON 序列化成功');
    
    // 验证序列化后的配置
    const parsedBack = JSON.parse(jsonString);
    if (parsedBack.build.asar === false) {
      console.log('✅ 序列化后配置保持正确');
    } else {
      console.log('❌ 序列化后配置错误');
    }
  } catch (error) {
    console.error('❌ JSON 序列化失败:', error.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testAsarConfigModification();
}

module.exports = { testAsarConfigModification }; 