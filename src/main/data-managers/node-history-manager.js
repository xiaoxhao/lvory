const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { getAppDataDir } = require('../../utils/paths');
const BaseDatabaseManager = require('./base-database-manager');

class NodeHistoryManager extends BaseDatabaseManager {
  constructor() {
    super('node_history.db', '节点历史数据库');
    this.isEnabled = false;
    this.dataRetentionDays = 30;

    this.initDatabase();
    this.migrateFromJsonFiles();
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS node_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_tag TEXT NOT NULL,
        date TEXT NOT NULL,
        upload INTEGER DEFAULT 0,
        download INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        last_updated TEXT,
        UNIQUE(node_tag, date)
      );

      CREATE INDEX IF NOT EXISTS idx_node_tag ON node_history(node_tag);
      CREATE INDEX IF NOT EXISTS idx_date ON node_history(date);

      CREATE TABLE IF NOT EXISTS node_total_traffic (
        node_tag TEXT PRIMARY KEY,
        upload INTEGER DEFAULT 0,
        download INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        last_updated TEXT
      );
    `);
  }

  migrateFromJsonFiles() {
    try {
      const oldStorageDir = path.join(getAppDataDir(), 'node_history');
      const oldTotalTrafficPath = path.join(getAppDataDir(), 'node_total_traffic.json');

      if (fs.existsSync(oldStorageDir)) {
        const files = fs.readdirSync(oldStorageDir);
        let migratedCount = 0;

        this.executeInTransaction(() => {
          files.forEach(file => {
            if (file.endsWith('.json')) {
              const nodeTag = path.basename(file, '.json');
              const filePath = path.join(oldStorageDir, file);

              try {
                const fileData = fs.readFileSync(filePath, 'utf8');
                const nodeHistory = JSON.parse(fileData);

                const stmt = this.db.prepare(`
                  INSERT OR REPLACE INTO node_history (node_tag, date, upload, download, total, last_updated)
                  VALUES (?, ?, ?, ?, ?, ?)
                `);

                Object.entries(nodeHistory).forEach(([date, data]) => {
                  stmt.run(nodeTag, date, data.upload || 0, data.download || 0, data.total || 0, data.lastUpdated);
                });

                migratedCount++;
              } catch (error) {
                logger.error(`迁移节点历史数据文件失败 ${file}:`, error);
              }
            }
          });
          return {};
        });

        if (migratedCount > 0) {
          logger.info(`已迁移 ${migratedCount} 个节点的历史数据从 JSON 到 SQLite`);
          fs.rmSync(oldStorageDir, { recursive: true, force: true });
          logger.info('已删除旧的 JSON 历史数据文件');
        }
      }

      if (fs.existsSync(oldTotalTrafficPath)) {
        try {
          const data = fs.readFileSync(oldTotalTrafficPath, 'utf8');
          const totalTrafficData = JSON.parse(data);

          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO node_total_traffic (node_tag, upload, download, total, last_updated)
            VALUES (?, ?, ?, ?, ?)
          `);

          Object.entries(totalTrafficData).forEach(([nodeTag, traffic]) => {
            stmt.run(nodeTag, traffic.upload || 0, traffic.download || 0, traffic.total || 0, traffic.lastUpdated);
          });

          fs.unlinkSync(oldTotalTrafficPath);
          logger.info('已迁移累计流量数据从 JSON 到 SQLite');
        } catch (error) {
          logger.error('迁移累计流量数据失败:', error);
        }
      }
    } catch (error) {
      logger.error('数据迁移过程失败:', error);
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`节点历史数据存储已${enabled ? '启用' : '禁用'}`);
    return { success: true };
  }

  isHistoryEnabled() {
    return this.isEnabled;
  }

  updateNodeTraffic(nodeTag, trafficData) {
    if (!this.isEnabled || !this.initialized) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const upload = trafficData.upload || 0;
      const download = trafficData.download || 0;
      const total = upload + download;

      const historyStmt = this.db.prepare(`
        INSERT INTO node_history (node_tag, date, upload, download, total, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(node_tag, date) DO UPDATE SET
          upload = upload + excluded.upload,
          download = download + excluded.download,
          total = total + excluded.total,
          last_updated = excluded.last_updated
      `);

      historyStmt.run(nodeTag, today, upload, download, total, now);

      const totalStmt = this.db.prepare(`
        INSERT INTO node_total_traffic (node_tag, upload, download, total, last_updated)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(node_tag) DO UPDATE SET
          upload = upload + excluded.upload,
          download = download + excluded.download,
          total = total + excluded.total,
          last_updated = excluded.last_updated
      `);

      totalStmt.run(nodeTag, upload, download, total, now);
    } catch (error) {
      logger.error('更新节点流量历史数据失败:', error);
    }
  }

  getNodeHistory(nodeTag) {
    if (!this.initialized) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT date, upload, download, total, last_updated
        FROM node_history
        WHERE node_tag = ?
        ORDER BY date DESC
      `);

      const rows = stmt.all(nodeTag);

      if (rows.length === 0) {
        return { success: false, message: 'No history data found for this node' };
      }

      const history = {};
      rows.forEach(row => {
        history[row.date] = {
          upload: row.upload,
          download: row.download,
          total: row.total,
          lastUpdated: row.last_updated
        };
      });

      return { success: true, history };
    } catch (error) {
      logger.error('获取节点历史数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  cleanupExpiredData() {
    if (!this.initialized) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const stmt = this.db.prepare('DELETE FROM node_history WHERE date < ?');
      const result = stmt.run(cutoffDateStr);

      if (result.changes > 0) {
        logger.info(`已清理 ${result.changes} 条过期节点历史数据（保留 ${this.dataRetentionDays} 天）`);
      }

      return { success: true, deletedCount: result.changes };
    } catch (error) {
      logger.error('清理过期节点历史数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  loadAllHistoryData() {
    try {
      if (!this.initialized) {
        this.initDatabase();
      }

      const stmt = this.db.prepare('SELECT DISTINCT node_tag FROM node_history');
      const nodes = stmt.all();

      logger.info(`数据库中有 ${nodes.length} 个节点的历史数据`);

      this.cleanupExpiredData();

      return { success: true };
    } catch (error) {
      logger.error('加载所有节点历史数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  getTotalTraffic(nodeTag) {
    if (!this.initialized) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT upload, download, total, last_updated
        FROM node_total_traffic
        WHERE node_tag = ?
      `);

      const row = stmt.get(nodeTag);

      if (!row) {
        return { success: false, message: 'No total traffic data found for this node' };
      }

      return {
        success: true,
        traffic: {
          upload: row.upload,
          download: row.download,
          total: row.total,
          lastUpdated: row.last_updated
        }
      };
    } catch (error) {
      logger.error('获取节点累计流量失败:', error);
      return { success: false, error: error.message };
    }
  }

  getAllTotalTraffic() {
    if (!this.initialized) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT node_tag, upload, download, total, last_updated
        FROM node_total_traffic
      `);

      const rows = stmt.all();
      const trafficData = {};

      rows.forEach(row => {
        trafficData[row.node_tag] = {
          upload: row.upload,
          download: row.download,
          total: row.total,
          lastUpdated: row.last_updated
        };
      });

      return { success: true, trafficData };
    } catch (error) {
      logger.error('获取所有节点累计流量失败:', error);
      return { success: false, error: error.message };
    }
  }

  resetTotalTraffic(nodeTag) {
    if (!this.initialized) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const now = new Date().toISOString();

      if (nodeTag) {
        const stmt = this.db.prepare(`
          UPDATE node_total_traffic
          SET upload = 0, download = 0, total = 0, last_updated = ?
          WHERE node_tag = ?
        `);
        stmt.run(now, nodeTag);
      } else {
        const stmt = this.db.prepare(`
          UPDATE node_total_traffic
          SET upload = 0, download = 0, total = 0, last_updated = ?
        `);
        stmt.run(now);
      }

      return { success: true };
    } catch (error) {
      logger.error('重置节点累计流量失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 创建单例实例
const nodeHistoryManager = new NodeHistoryManager();
module.exports = nodeHistoryManager; 