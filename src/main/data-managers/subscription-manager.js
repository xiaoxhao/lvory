const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { getAppDataDir } = require('../../utils/paths');

class SubscriptionManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.initialized = false;

    this.ALLOWED_FIELDS = new Set([
      'url',
      'protocol',
      'status',
      'source',
      'timestamp',
      'last_updated',
      'update_count',
      'fail_count',
      'last_error',
      'last_attempt',
      'loaded_at',
      'singbox_cache',
      'generated_from',
      'last_generated',
      'last_processed',
      'is_cache'
    ]);
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const appDataDir = getAppDataDir();
      const dataDir = path.join(appDataDir, 'data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.dbPath = path.join(dataDir, 'subscriptions.db');
      this.db = new DatabaseSync(this.dbPath);
      
      this.createTables();
      this.initialized = true;
      
      logger.info(`订阅数据库初始化成功: ${this.dbPath}`);
    } catch (error) {
      logger.error('订阅数据库初始化失败:', error);
      throw error;
    }
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL UNIQUE,
        url TEXT,
        protocol TEXT DEFAULT 'singbox',
        status TEXT DEFAULT 'active',
        source TEXT,
        timestamp TEXT,
        last_updated TEXT,
        update_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_error TEXT,
        last_attempt TEXT,
        loaded_at TEXT,
        singbox_cache TEXT,
        generated_from TEXT,
        last_generated TEXT,
        last_processed TEXT,
        is_cache INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_file_name ON subscriptions(file_name);
      CREATE INDEX IF NOT EXISTS idx_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_protocol ON subscriptions(protocol);
    `);
  }

  addSubscription(fileName, metadata) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO subscriptions (
          file_name, url, protocol, status, source,
          timestamp, last_updated, update_count, fail_count,
          last_error, last_attempt, loaded_at, singbox_cache,
          generated_from, last_generated, last_processed, is_cache
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_name) DO UPDATE SET
          url = excluded.url,
          protocol = excluded.protocol,
          status = excluded.status,
          source = excluded.source,
          timestamp = excluded.timestamp,
          last_updated = excluded.last_updated,
          update_count = excluded.update_count,
          fail_count = excluded.fail_count,
          last_error = excluded.last_error,
          last_attempt = excluded.last_attempt,
          loaded_at = excluded.loaded_at,
          singbox_cache = excluded.singbox_cache,
          generated_from = excluded.generated_from,
          last_generated = excluded.last_generated,
          last_processed = excluded.last_processed,
          is_cache = excluded.is_cache,
          updated_at = datetime('now')
      `);

      stmt.run(
        fileName,
        metadata.url || null,
        metadata.protocol || 'singbox',
        metadata.status || 'active',
        metadata.source || null,
        metadata.timestamp || null,
        metadata.lastUpdated || null,
        metadata.updateCount || 0,
        metadata.failCount || 0,
        metadata.lastError || null,
        metadata.lastAttempt || null,
        metadata.loadedAt || null,
        metadata.singboxCache || null,
        metadata.generatedFrom || null,
        metadata.lastGenerated || null,
        metadata.lastProcessed || null,
        metadata.isCache ? 1 : 0
      );

      return { success: true };
    } catch (error) {
      logger.error('添加订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  getSubscription(fileName) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM subscriptions WHERE file_name = ?');
      const row = stmt.get(fileName);
      
      if (!row) {
        return { success: false, error: 'Subscription not found' };
      }

      const metadata = this.rowToMetadata(row);
      return { success: true, metadata };
    } catch (error) {
      logger.error('获取订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  getAllSubscriptions() {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC');
      const rows = stmt.all();
      
      const subscriptions = {};
      rows.forEach(row => {
        subscriptions[row.file_name] = this.rowToMetadata(row);
      });

      return { success: true, subscriptions };
    } catch (error) {
      logger.error('获取所有订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  updateSubscription(fileName, updates) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const fields = [];
      const values = [];

      const fieldMap = {
        url: 'url',
        protocol: 'protocol',
        status: 'status',
        source: 'source',
        timestamp: 'timestamp',
        lastUpdated: 'last_updated',
        updateCount: 'update_count',
        failCount: 'fail_count',
        lastError: 'last_error',
        lastAttempt: 'last_attempt',
        loadedAt: 'loaded_at',
        singboxCache: 'singbox_cache',
        generatedFrom: 'generated_from',
        lastGenerated: 'last_generated',
        lastProcessed: 'last_processed',
        isCache: 'is_cache'
      };

      for (const [key, dbField] of Object.entries(fieldMap)) {
        if (updates.hasOwnProperty(key)) {
          if (!this.ALLOWED_FIELDS.has(dbField)) {
            logger.warn(`尝试更新非法字段: ${dbField}`);
            continue;
          }
          fields.push(`${dbField} = ?`);
          values.push(key === 'isCache' ? (updates[key] ? 1 : 0) : updates[key]);
        }
      }

      if (fields.length === 0) {
        return { success: true };
      }

      fields.push('updated_at = datetime(\'now\')');
      values.push(fileName);

      const sql = `UPDATE subscriptions SET ${fields.join(', ')} WHERE file_name = ?`;
      const stmt = this.db.prepare(sql);
      stmt.run(...values);

      return { success: true };
    } catch (error) {
      logger.error('更新订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  deleteSubscription(fileName) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const stmt = this.db.prepare('DELETE FROM subscriptions WHERE file_name = ?');
      stmt.run(fileName);
      return { success: true };
    } catch (error) {
      logger.error('删除订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  batchAddSubscriptions(subscriptions) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      this.db.exec('BEGIN TRANSACTION');

      for (const [fileName, metadata] of Object.entries(subscriptions)) {
        const result = this.addSubscription(fileName, metadata);
        if (!result.success) {
          this.db.exec('ROLLBACK');
          return { success: false, error: `添加订阅 ${fileName} 失败: ${result.error}` };
        }
      }

      this.db.exec('COMMIT');
      return { success: true };
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        logger.error('事务回滚失败:', rollbackError);
      }
      logger.error('批量添加订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  batchDeleteSubscriptions(fileNames) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      this.db.exec('BEGIN TRANSACTION');

      const stmt = this.db.prepare('DELETE FROM subscriptions WHERE file_name = ?');
      for (const fileName of fileNames) {
        stmt.run(fileName);
      }

      this.db.exec('COMMIT');
      return { success: true };
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        logger.error('事务回滚失败:', rollbackError);
      }
      logger.error('批量删除订阅失败:', error);
      return { success: false, error: error.message };
    }
  }

  rowToMetadata(row) {
    return {
      url: row.url,
      protocol: row.protocol,
      status: row.status,
      source: row.source,
      timestamp: row.timestamp,
      lastUpdated: row.last_updated,
      updateCount: row.update_count,
      failCount: row.fail_count,
      lastError: row.last_error,
      lastAttempt: row.last_attempt,
      loadedAt: row.loaded_at,
      singboxCache: row.singbox_cache,
      generatedFrom: row.generated_from,
      lastGenerated: row.last_generated,
      lastProcessed: row.last_processed,
      isCache: row.is_cache === 1
    };
  }
}

const subscriptionManager = new SubscriptionManager();

module.exports = subscriptionManager;

