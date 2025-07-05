/**
 * 简单测试nodejs-traceroute包的实时功能
 */

const Traceroute = require('nodejs-traceroute');

async function testRealtimeTraceroute() {
  console.log('开始测试nodejs-traceroute实时功能...\n');
  
  const target = '8.8.8.8';
  console.log(`测试目标: ${target}`);
  console.log('='.repeat(50));
  
  return new Promise((resolve) => {
    const tracer = new Traceroute();
    let hopCount = 0;
    
    tracer.on('pid', (pid) => {
      console.log(`[事件] 进程启动 - PID: ${pid}`);
    });
    
    tracer.on('destination', (destination) => {
      console.log(`[事件] 目标地址: ${destination}`);
    });
    
    tracer.on('hop', (hop) => {
      hopCount++;
      const rtt = hop.rtt1 || hop.rtt2 || hop.rtt3 || '*';
      console.log(`[实时跳点 ${hop.hop}] IP: ${hop.ip} - RTT: ${rtt}`);
    });
    
    tracer.on('close', (code) => {
      console.log(`\n[事件] 追踪完成 - 共 ${hopCount} 个跳点，退出代码: ${code}`);
      resolve();
    });
    
    tracer.on('error', (error) => {
      console.error(`[事件] 追踪错误:`, error.message);
      resolve();
    });
    
    try {
      console.log('开始追踪...\n');
      tracer.trace(target);
    } catch (error) {
      console.error('启动追踪失败:', error.message);
      resolve();
    }
  });
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testRealtimeTraceroute().then(() => {
    console.log('\n测试完成!');
    process.exit(0);
  });
}

module.exports = { testRealtimeTraceroute };
