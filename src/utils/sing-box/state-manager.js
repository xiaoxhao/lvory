/**
 * SingBox 状态管理模块
 * 负责管理全局状态、监听器和状态通知
 */
const logger = require('../logger');

class StateManager {
  constructor() {
    this.globalState = {
      isRunning: false,
      isInitialized: false,
      lastError: null,
      startTime: null,
      connectionMonitor: {
        enabled: false,
        retryCount: 0,
        maxRetries: 5,
        retryDelay: 3000,
        lastRetryTime: null
      }
    };
    
    this.stateListeners = new Set();
  }

  /**
   * 添加状态监听器
   * @param {Function} listener 状态变化监听器
   */
  addStateListener(listener) {
    if (typeof listener === 'function') {
      this.stateListeners.add(listener);
      logger.info(`[StateManager] 添加状态监听器，当前监听器数量: ${this.stateListeners.size}`);
    }
  }

  /**
   * 移除状态监听器
   * @param {Function} listener 要移除的监听器
   */
  removeStateListener(listener) {
    this.stateListeners.delete(listener);
    logger.info(`[StateManager] 移除状态监听器，当前监听器数量: ${this.stateListeners.size}`);
  }

  /**
   * 通知所有状态监听器
   * @param {Object} stateChange 状态变化信息
   */
  notifyStateListeners(stateChange) {
    const notification = {
      ...stateChange,
      timestamp: Date.now(),
      globalState: { ...this.globalState }
    };
    
    logger.info(`[StateManager] 通知状态变化: ${JSON.stringify(stateChange)}`);
    
    this.stateListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        logger.error(`[StateManager] 状态监听器执行失败: ${error.message}`);
      }
    });
  }

  /**
   * 更新全局状态
   * @param {Object} updates 状态更新
   */
  updateGlobalState(updates) {
    const oldState = { ...this.globalState };
    this.globalState = { ...this.globalState, ...updates };
    
    this.notifyStateListeners({
      type: 'state-update',
      oldState,
      newState: { ...this.globalState },
      changes: updates
    });
  }

  /**
   * 获取全局状态
   */
  getGlobalState() {
    return { ...this.globalState };
  }

  /**
   * 重置连接监控状态
   */
  resetConnectionMonitor() {
    this.updateGlobalState({
      connectionMonitor: {
        enabled: false,
        retryCount: 0,
        maxRetries: 5,
        retryDelay: 3000,
        lastRetryTime: null
      }
    });
    
    this.notifyStateListeners({
      type: 'connection-monitor-reset',
      message: '连接监控已重置'
    });
  }

  /**
   * 启用连接监控
   */
  enableConnectionMonitor() {
    this.updateGlobalState({
      connectionMonitor: {
        ...this.globalState.connectionMonitor,
        enabled: true,
        retryCount: 0
      }
    });
    
    this.notifyStateListeners({
      type: 'connection-monitor-enabled',
      message: '连接监控已启用'
    });
  }

  /**
   * 禁用连接监控
   */
  disableConnectionMonitor() {
    this.updateGlobalState({
      connectionMonitor: {
        ...this.globalState.connectionMonitor,
        enabled: false
      }
    });
    
    this.notifyStateListeners({
      type: 'connection-monitor-disabled',
      message: '连接监控已禁用'
    });
  }

  /**
   * 记录连接重试
   */
  recordConnectionRetry() {
    const monitor = this.globalState.connectionMonitor;
    const newRetryCount = monitor.retryCount + 1;
    
    this.updateGlobalState({
      connectionMonitor: {
        ...monitor,
        retryCount: newRetryCount,
        lastRetryTime: Date.now()
      }
    });
    
    if (newRetryCount >= monitor.maxRetries) {
      logger.warn(`[StateManager] 连接重试次数已达到上限 (${monitor.maxRetries})`);
      this.disableConnectionMonitor();
      
      this.notifyStateListeners({
        type: 'connection-monitor-max-retries',
        message: `连接重试次数已达到上限 (${monitor.maxRetries})，停止重试`
      });
    }
  }

  /**
   * 保存状态到存储
   * @param {Object} additionalState 额外的状态信息
   */
  async saveState(additionalState = {}) {
    const state = {
      ...this.globalState,
      ...additionalState,
      lastRunTime: new Date().toISOString(),
      isDev: process.env.NODE_ENV === 'development'
    };
    
    const store = require('../store');
    await store.set('singbox.state', state);
  }

  /**
   * 从存储加载状态
   */
  async loadState() {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('[StateManager] 开发模式下不加载状态');
        return null;
      }
      
      const store = require('../store');
      const state = await store.get('singbox.state');
      
      if (state && state.isDev === true && process.env.NODE_ENV !== 'development') {
        logger.info('[StateManager] 从开发模式切换到生产模式，不加载之前的状态');
        return null;
      }
      
      if (state) {
        this.globalState = { ...this.globalState, ...state };
      }
      
      return state;
    } catch (error) {
      logger.error(`[StateManager] 加载状态失败: ${error.message}`);
      return null;
    }
  }
}

module.exports = StateManager; 