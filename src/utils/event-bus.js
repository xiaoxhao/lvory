/**
 * 全局事件总线
 * 用于解决模块间的循环依赖问题
 */
const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 增加监听器上限
    this.services = new Map(); // 服务容器
    this.initialized = false;
  }

  /**
   * 注册服务
   * @param {String} name 服务名称
   * @param {Function|Object} service 服务实例或工厂函数
   */
  registerService(name, service) {
    this.services.set(name, service);
  }

  /**
   * 获取服务
   * @param {String} name 服务名称
   * @returns {Object} 服务实例
   */
  getService(name) {
    const service = this.services.get(name);
    if (typeof service === 'function') {
      // 如果是工厂函数，执行并缓存结果
      const instance = service();
      this.services.set(name, instance);
      return instance;
    }
    return service;
  }

  /**
   * 检查服务是否存在
   * @param {String} name 服务名称
   * @returns {Boolean}
   */
  hasService(name) {
    return this.services.has(name);
  }

  /**
   * 安全地获取服务（如果不存在则返回null）
   * @param {String} name 服务名称
   * @returns {Object|null}
   */
  safeGetService(name) {
    try {
      return this.getService(name);
    } catch (error) {
      console.warn(`获取服务 ${name} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 发送状态变化事件
   * @param {String} type 事件类型
   * @param {Object} data 事件数据
   */
  emitStateChange(type, data = {}) {
    this.emit('state-change', { type, data, timestamp: Date.now() });
    this.emit(`state-change:${type}`, data);
  }

  /**
   * 监听状态变化
   * @param {String} type 事件类型，可选
   * @param {Function} callback 回调函数
   * @returns {Function} 取消监听的函数
   */
  onStateChange(type, callback) {
    if (typeof type === 'function') {
      // 如果第一个参数是函数，则监听所有状态变化
      callback = type;
      this.on('state-change', callback);
      return () => this.removeListener('state-change', callback);
    } else {
      // 监听特定类型的状态变化
      const eventName = `state-change:${type}`;
      this.on(eventName, callback);
      return () => this.removeListener(eventName, callback);
    }
  }

  /**
   * 初始化事件总线
   */
  initialize() {
    if (this.initialized) return;
    
    this.initialized = true;
    console.log('EventBus: 已初始化');
  }

  /**
   * 清理事件总线
   */
  destroy() {
    this.removeAllListeners();
    this.services.clear();
    this.initialized = false;
    console.log('EventBus: 已清理');
  }
}

// 导出单例
const eventBus = new EventBus();
module.exports = eventBus; 