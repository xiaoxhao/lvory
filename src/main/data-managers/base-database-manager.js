const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { getAppDataDir } = require('../../utils/paths');

/**
 * 数据库管理基类
 * 提供通用的数据库初始化、连接管理和错误处理功能
 */
class BaseDatabaseManager {
  constructor(dbFileName, logPrefix = '数据库') {
    this.db = null;
    this.dbPath = null;
    this.initialized = false;
    this.dbFileName = dbFileName;
    this.logPrefix = logPrefix;
  }

  /**
   * 初始化数据库连接
   * @param {string} dbFileName - 数据库文件名（可选，覆盖构造函数中的值）
   * @returns {boolean} 初始化是否成功
   */
  initDatabase(dbFileName = null) {
    if (this.initialized) {
      return true;
    }

    try {
      const appDataDir = getAppDataDir();
      const dataDir = path.join(appDataDir, 'data');
      
      // 确保数据目录存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.debug(`数据目录已创建: ${dataDir}`);
      }

      // 设置数据库路径
      const fileName = dbFileName || this.dbFileName;
      this.dbPath = path.join(dataDir, fileName);
      
      // 创建数据库连接
      this.db = new DatabaseSync(this.dbPath);
      
      // 调用子类的表创建方法
      this.createTables();
      
      this.initialized = true;
      logger.info(`${this.logPrefix}初始化成功: ${this.dbPath}`);
      
      return true;
    } catch (error) {
      logger.error(`${this.logPrefix}初始化失败:`, error);
      throw error;
    }
  }

  /**
   * 创建数据库表（由子类实现）
   * 子类必须重写此方法以创建特定的表结构
   */
  createTables() {
    throw new Error('createTables() 方法必须由子类实现');
  }

  /**
   * 确保数据库已初始化
   * @throws {Error} 如果数据库未初始化
   */
  ensureInitialized() {
    if (!this.initialized) {
      this.initDatabase();
    }
  }

  /**
   * 执行SQL语句（带错误处理）
   * @param {string} sql - SQL语句
   * @param {string} operation - 操作描述（用于日志）
   * @returns {boolean} 执行是否成功
   */
  executeSql(sql, operation = 'SQL操作') {
    try {
      this.ensureInitialized();
      this.db.exec(sql);
      return true;
    } catch (error) {
      logger.error(`${operation}失败:`, error);
      throw error;
    }
  }

  /**
   * 开始事务
   */
  beginTransaction() {
    this.ensureInitialized();
    this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * 提交事务
   */
  commit() {
    this.db.exec('COMMIT');
  }

  /**
   * 回滚事务
   */
  rollback() {
    try {
      this.db.exec('ROLLBACK');
    } catch (error) {
      logger.error('事务回滚失败:', error);
    }
  }

  /**
   * 执行带事务的批量操作
   * @param {Function} operation - 要执行的操作函数
   * @returns {Object} 操作结果 {success: boolean, error?: string}
   */
  async executeInTransaction(operation) {
    try {
      this.beginTransaction();
      const result = await operation();
      this.commit();
      return { success: true, ...result };
    } catch (error) {
      this.rollback();
      logger.error('事务执行失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
        this.initialized = false;
        logger.info(`${this.logPrefix}连接已关闭`);
      } catch (error) {
        logger.error(`${this.logPrefix}关闭失败:`, error);
      }
    }
  }

  /**
   * 获取数据库路径
   * @returns {string|null} 数据库文件路径
   */
  getDbPath() {
    return this.dbPath;
  }

  /**
   * 检查数据库是否已初始化
   * @returns {boolean} 是否已初始化
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = BaseDatabaseManager;