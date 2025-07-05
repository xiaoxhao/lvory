const { registerTracerouteHandlers } = require('../src/main/ipc-handlers/traceroute-handlers');
const { ipcMain } = require('electron');

// 模拟 electron 环境
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

/**
 * 集成测试 - 验证优化后的 traceroute 功能
 */
describe('Traceroute Integration Tests', () => {
  beforeAll(() => {
    // 注册处理程序
    registerTracerouteHandlers();
  });

  test('should validate target addresses correctly', async () => {
    // 获取注册的处理程序
    const validateHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'traceroute:validate'
    )[1];

    // 测试有效地址
    expect(await validateHandler(null, '8.8.8.8')).toBe(true);
    expect(await validateHandler(null, 'google.com')).toBe(true);
    expect(await validateHandler(null, 'baidu.com')).toBe(true);

    // 测试无效地址
    expect(await validateHandler(null, '')).toBe(false);
    expect(await validateHandler(null, null)).toBe(false);
    expect(await validateHandler(null, 'invalid..domain')).toBe(false);
    expect(await validateHandler(null, '999.999.999.999')).toBe(false);
  });

  test('should execute traceroute successfully', async () => {
    // 获取注册的处理程序
    const executeHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'traceroute:execute'
    )[1];

    // 测试执行 traceroute
    const result = await executeHandler(null, '8.8.8.8');
    
    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result).toHaveProperty('hops');
      expect(Array.isArray(result.hops)).toBe(true);
      
      // 验证跳点数据结构
      if (result.hops.length > 0) {
        const hop = result.hops[0];
        expect(hop).toHaveProperty('hop');
        expect(hop).toHaveProperty('ip');
        expect(hop).toHaveProperty('type');
        expect(hop).toHaveProperty('country');
        expect(hop).toHaveProperty('city');
        expect(hop).toHaveProperty('latitude');
        expect(hop).toHaveProperty('longitude');
      }
    }
  }, 30000); // 30秒超时

  test('should handle invalid targets gracefully', async () => {
    const executeHandler = ipcMain.handle.mock.calls.find(
      call => call[0] === 'traceroute:execute'
    )[1];

    const result = await executeHandler(null, 'invalid-target');
    
    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });
});

// 如果直接运行此文件，执行手动测试
if (require.main === module) {
  console.log('运行 Traceroute 集成测试...');
  
  // 手动测试
  const testTraceroute = async () => {
    try {
      // 直接导入 traceroute handlers
      const Traceroute = require('nodejs-traceroute');
      
      console.log('测试 nodejs-traceroute 包...');
      
      const tracer = new Traceroute();
      let hopCount = 0;
      
      tracer.on('hop', (hop) => {
        hopCount++;
        console.log(`跳点 ${hop.hop}: ${hop.ip} - ${hop.rtt1 || hop.rtt2 || hop.rtt3 || '*'}`);
      });
      
      tracer.on('close', (code) => {
        console.log(`\n跟踪完成，共 ${hopCount} 个跳点，退出代码: ${code}`);
      });
      
      tracer.on('error', (error) => {
        console.error('跟踪错误:', error.message);
      });
      
      console.log('开始跟踪 8.8.8.8...');
      tracer.trace('8.8.8.8');
      
    } catch (error) {
      console.error('测试失败:', error.message);
    }
  };
  
  testTraceroute();
} 