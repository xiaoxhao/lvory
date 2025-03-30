/**
 * IPC常量定义
 * 这个文件定义了所有IPC通道名称，便于统一管理
 */

// 窗口管理相关
const WINDOW = {
  CONTROL: 'window.control', // 控制窗口动作：最小化，最大化，关闭
  ACTION: 'window.action'    // 窗口操作：显示，退出
};

module.exports = {
  WINDOW
}; 