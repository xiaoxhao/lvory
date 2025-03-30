/**
 * 窗口IPC测试脚本
 * 在控制台执行以下代码测试新的窗口IPC功能
 */

// 测试窗口控制
console.log('=== 测试窗口控制 ===');
console.log('通过新API最小化窗口:');
console.log('window.electron.window.control("minimize")');

console.log('通过新API最大化窗口:');
console.log('window.electron.window.control("maximize")');

console.log('通过新API关闭窗口:');
console.log('window.electron.window.control("close")');

// 测试窗口操作
console.log('\n=== 测试窗口操作 ===');
console.log('通过新API显示窗口:');
console.log('window.electron.window.action("show").then(console.log)');

console.log('通过新API退出应用(慎用):');
console.log('window.electron.window.action("quit").then(console.log)');

console.log('\n你可以复制上面的代码，在浏览器控制台中执行以测试新的IPC功能'); 