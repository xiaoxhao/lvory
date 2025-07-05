const Traceroute = require('nodejs-traceroute');

/**
 * 简单测试 nodejs-traceroute 包的功能
 */
async function testTraceroute() {
  console.log('开始测试 nodejs-traceroute 包...');
  
  const testTargets = ['8.8.8.8'];
  
  for (const target of testTargets) {
    console.log(`\n测试目标: ${target}`);
    console.log('='.repeat(50));
    
    await new Promise((resolve) => {
      const tracer = new Traceroute();
      let hopCount = 0;
      
      tracer.on('pid', (pid) => {
        console.log(`进程 ID: ${pid}`);
      });
      
      tracer.on('destination', (destination) => {
        console.log(`目标地址: ${destination}`);
      });
      
      tracer.on('hop', (hop) => {
        hopCount++;
        const rtt = hop.rtt1 || hop.rtt2 || hop.rtt3 || '*';
        console.log(`跳点 ${hop.hop}: ${hop.ip} - ${rtt}`);
      });
      
      tracer.on('close', (code) => {
        console.log(`\n跟踪完成，共 ${hopCount} 个跳点，退出代码: ${code}`);
        resolve();
      });
      
      tracer.on('error', (error) => {
        console.error('跟踪错误:', error.message);
        resolve();
      });
      
      try {
        tracer.trace(target);
      } catch (error) {
        console.error('启动跟踪失败:', error.message);
        resolve();
      }
    });
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n测试完成!');
}

// 运行测试
testTraceroute().catch(console.error); 