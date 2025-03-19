/**
 * 新版IPC处理程序文件 - 模块化结构
 * 为保持向后兼容，该文件保持与原始ipc-handlers.js相同的接口
 */

// 导入新的模块化处理程序入口
const { setupIpcHandlers } = require('./ipc-handlers/index');

// 导出原本的setupIpcHandlers函数
module.exports = {
  setupIpcHandlers
}; 