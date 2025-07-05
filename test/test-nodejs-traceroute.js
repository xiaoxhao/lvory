const Traceroute = require('nodejs-traceroute');

/**
 * 测试 nodejs-traceroute 包的基本功能
 */
async function testNodejsTraceroute() {
  console.log('开始测试 nodejs-traceroute 包...');
  
  const testTargets = ['8.8.8.8', 'baidu.com'];
  
  for (const target of testTargets) {
    console.log(`\n测试目标: ${target}`);
    console.log('=' .repeat(50));
    
    try {
      const tracer = new Traceroute();
      
      // 监听事件
      tracer.on('pid', (pid) => {
        console.log(`进程 ID: ${pid}`);
      });
      
      tracer.on('destination', (destination) => {
        console.log(`目标地址: ${destination}`);
      });
      
      tracer.on('hop', (hop) => {
        console.log(`跳点: ${JSON.stringify(hop)}`);
      });
      
      tracer.on('close', (code) => {
        console.log(`完成，退出代码: ${code}`);
      });
      
      tracer.on('error', (error) => {
        console.error(`错误: ${error.message}`);
      });
      
      // 执行跟踪
      tracer.trace(target);
      
      // 等待一段时间让跟踪完成
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error(`测试 ${target} 失败:`, error.message);
    }
  }
  
  console.log('\n测试完成!');
}

// 运行测试
if (require.main === module) {
  testNodejsTraceroute().catch(console.error);
}

module.exports = { testNodejsTraceroute }; 