const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { getAppDataDir } = require('../../utils/paths');

class TrafficStatsManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(getAppDataDir(), 'traffic_stats.db');
    this.statsPeriod = 'month';
    this.currentPeriodStart = null;
    this.retentionDays = 90;
    this.initDatabase();
  }

  initDatabase() {
    try {
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new DatabaseSync(this.dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS traffic_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          period_type TEXT NOT NULL,
          period_start TEXT NOT NULL,
          period_end TEXT,
          upload INTEGER DEFAULT 0,
          download INTEGER DEFAULT 0,
          total INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(period_type, period_start)
        )
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.loadSettings();
      logger.info('流量统计数据库初始化成功');
    } catch (error) {
      logger.error('初始化流量统计数据库失败:', error);
    }
  }

  loadSettings() {
    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?)');
      const results = stmt.all('stats_period', 'retention_days');

      results.forEach(row => {
        if (row.key === 'stats_period') {
          this.statsPeriod = row.value;
        } else if (row.key === 'retention_days') {
          this.retentionDays = parseInt(row.value, 10);
        }
      });

      if (results.length === 0) {
        this.saveSettings();
      }

      logger.info(`流量统计周期: ${this.statsPeriod}, 数据保留天数: ${this.retentionDays}`);
    } catch (error) {
      logger.error('加载流量统计设置失败:', error);
    }
  }

  saveSettings() {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run('stats_period', this.statsPeriod);
      stmt.run('retention_days', this.retentionDays.toString());
      logger.info('流量统计设置已保存');
    } catch (error) {
      logger.error('保存流量统计设置失败:', error);
    }
  }

  setStatsPeriod(period) {
    if (!['day', 'week', 'month'].includes(period)) {
      return { success: false, error: '无效的统计周期' };
    }

    try {
      this.statsPeriod = period;
      this.saveSettings();
      this.currentPeriodStart = null;
      return { success: true };
    } catch (error) {
      logger.error('设置流量统计周期失败:', error);
      return { success: false, error: error.message };
    }
  }

  getStatsPeriod() {
    return { success: true, period: this.statsPeriod };
  }

  getPeriodStart(date = new Date()) {
    const d = new Date(date);
    
    switch (this.statsPeriod) {
      case 'day':
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      
      case 'week':
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      
      default:
        return d.toISOString();
    }
  }

  getPeriodEnd(periodStart) {
    const d = new Date(periodStart);
    
    switch (this.statsPeriod) {
      case 'day':
        d.setDate(d.getDate() + 1);
        d.setMilliseconds(-1);
        return d.toISOString();
      
      case 'week':
        d.setDate(d.getDate() + 7);
        d.setMilliseconds(-1);
        return d.toISOString();
      
      case 'month':
        d.setMonth(d.getMonth() + 1);
        d.setMilliseconds(-1);
        return d.toISOString();
      
      default:
        return d.toISOString();
    }
  }

  updateTraffic(upload, download) {
    try {
      const periodStart = this.getPeriodStart();
      const periodEnd = this.getPeriodEnd(periodStart);
      const total = upload + download;

      const stmt = this.db.prepare(`
        INSERT INTO traffic_stats (period_type, period_start, period_end, upload, download, total)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(period_type, period_start) DO UPDATE SET
          upload = upload + excluded.upload,
          download = download + excluded.download,
          total = total + excluded.total,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(this.statsPeriod, periodStart, periodEnd, upload, download, total);
      
      this.currentPeriodStart = periodStart;
      
      return { success: true };
    } catch (error) {
      logger.error('更新流量统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  getCurrentPeriodStats() {
    try {
      const periodStart = this.getPeriodStart();
      
      const stmt = this.db.prepare(`
        SELECT upload, download, total, period_start, period_end, updated_at
        FROM traffic_stats
        WHERE period_type = ? AND period_start = ?
      `);
      
      const result = stmt.get(this.statsPeriod, periodStart);
      
      if (result) {
        return {
          success: true,
          stats: {
            upload: result.upload,
            download: result.download,
            total: result.total,
            periodStart: result.period_start,
            periodEnd: result.period_end,
            updatedAt: result.updated_at
          }
        };
      }
      
      return {
        success: true,
        stats: {
          upload: 0,
          download: 0,
          total: 0,
          periodStart: periodStart,
          periodEnd: this.getPeriodEnd(periodStart),
          updatedAt: null
        }
      };
    } catch (error) {
      logger.error('获取当前周期流量统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  getHistoryStats(limit = 30) {
    try {
      const stmt = this.db.prepare(`
        SELECT period_type, period_start, period_end, upload, download, total, updated_at
        FROM traffic_stats
        WHERE period_type = ?
        ORDER BY period_start DESC
        LIMIT ?
      `);
      
      const results = stmt.all(this.statsPeriod, limit);
      
      return {
        success: true,
        history: results.map(row => ({
          periodType: row.period_type,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          upload: row.upload,
          download: row.download,
          total: row.total,
          updatedAt: row.updated_at
        }))
      };
    } catch (error) {
      logger.error('获取历史流量统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  resetCurrentPeriod() {
    try {
      const periodStart = this.getPeriodStart();
      
      const stmt = this.db.prepare(`
        DELETE FROM traffic_stats
        WHERE period_type = ? AND period_start = ?
      `);
      
      stmt.run(this.statsPeriod, periodStart);
      
      this.currentPeriodStart = null;
      
      logger.info('当前周期流量统计已重置');
      return { success: true };
    } catch (error) {
      logger.error('重置当前周期流量统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  setRetentionDays(days) {
    if (typeof days !== 'number' || days < 1) {
      return { success: false, error: '保留天数必须是大于0的数字' };
    }

    try {
      this.retentionDays = days;
      this.saveSettings();
      return { success: true };
    } catch (error) {
      logger.error('设置数据保留天数失败:', error);
      return { success: false, error: error.message };
    }
  }

  getRetentionDays() {
    return { success: true, retentionDays: this.retentionDays };
  }

  cleanupOldData(retentionDays = null) {
    try {
      const days = retentionDays !== null ? retentionDays : this.retentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = cutoffDate.toISOString();

      const stmt = this.db.prepare(`
        DELETE FROM traffic_stats
        WHERE period_start < ?
      `);

      const result = stmt.run(cutoffDateStr);

      logger.info(`已清理 ${result.changes} 条过期流量统计数据（保留 ${days} 天）`);
      return { success: true, deletedCount: result.changes };
    } catch (error) {
      logger.error('清理过期流量统计数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  close() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        logger.info('流量统计数据库已关闭');
      }
    } catch (error) {
      logger.error('关闭流量统计数据库失败:', error);
    }
  }
}

const trafficStatsManager = new TrafficStatsManager();
module.exports = trafficStatsManager;

