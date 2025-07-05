/**
 * 测试实时traceroute功能
 */

const { ipcMain } = require('electron');
const { registerTracerouteHandlers } = require('../src/main/ipc-handlers/traceroute-handlers');

// 模拟事件发送器
class MockEvent {
  constructor() {
    this.sender = {
      send: (channel, data) => {
        console.log(`[IPC Event] ${channel}:`, JSON.stringify(data, null, 2));
      }
    };
  }
}

// 注册处理器
registerTracerouteHandlers();

async function testRealtimeTraceroute() {
  console.log('开始测试实时traceroute功能...\n');
  
  const testTargets = ['8.8.8.8', 'baidu.com'];
  
  for (const target of testTargets) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试目标: ${target}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const mockEvent = new MockEvent();
      
      // 调用实时traceroute
      const result = await ipcMain.handle('traceroute:executeRealtime', mockEvent, target);
      
      console.log('\n最终结果:', result);
      
      // 等待一段时间让所有事件完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`测试 ${target} 失败:`, error.message);
    }
  }
  
  console.log('\n测试完成!');
  process.exit(0);
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testRealtimeTraceroute();
}

module.exports = { testRealtimeTraceroute };
