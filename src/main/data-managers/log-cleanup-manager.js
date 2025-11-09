const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { getLogDir } = require('../../utils/paths');

class LogCleanupManager {
  constructor() {
    this.logRetentionDays = 7;
    this.cleanupInterval = null;
    this.cleanupIntervalMs = 24 * 60 * 60 * 1000;
  }

  startAutoCleanup() {
    this.performCleanup();
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanupIntervalMs);
    
    logger.info(`日志自动清理已启动，保留期限: ${this.logRetentionDays} 天`);
  }

  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('日志自动清理已停止');
    }
  }

  setRetentionDays(days) {
    if (days < 1) {
      return { success: false, error: '保留天数必须大于0' };
    }
    
    this.logRetentionDays = days;
    logger.info(`日志保留期限已更新为 ${days} 天`);
    return { success: true };
  }

  getRetentionDays() {
    return { success: true, retentionDays: this.logRetentionDays };
  }

  performCleanup() {
    try {
      const logDir = getLogDir();
      
      if (!fs.existsSync(logDir)) {
        return { success: true, deletedCount: 0 };
      }

      const cutoffTime = Date.now() - (this.logRetentionDays * 24 * 60 * 60 * 1000);
      const files = fs.readdirSync(logDir);
      let deletedCount = 0;
      let deletedSize = 0;

      files.forEach(file => {
        if (file.endsWith('.log') || file.endsWith('.txt')) {
          const filePath = path.join(logDir, file);
          
          try {
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              const fileSize = stats.size;
              fs.unlinkSync(filePath);
              deletedCount++;
              deletedSize += fileSize;
              logger.debug(`已删除过期日志文件: ${file}`);
            }
          } catch (error) {
            logger.error(`处理日志文件失败 ${file}:`, error);
          }
        }
      });

      if (deletedCount > 0) {
        const sizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
        logger.info(`已清理 ${deletedCount} 个过期日志文件，释放空间 ${sizeMB} MB（保留 ${this.logRetentionDays} 天）`);
      }

      return { success: true, deletedCount, deletedSize };
    } catch (error) {
      logger.error('清理过期日志文件失败:', error);
      return { success: false, error: error.message };
    }
  }

  getLogFileStats() {
    try {
      const logDir = getLogDir();
      
      if (!fs.existsSync(logDir)) {
        return { success: true, stats: { totalFiles: 0, totalSize: 0, oldestFile: null, newestFile: null } };
      }

      const files = fs.readdirSync(logDir);
      let totalFiles = 0;
      let totalSize = 0;
      let oldestTime = null;
      let newestTime = null;

      files.forEach(file => {
        if (file.endsWith('.log') || file.endsWith('.txt')) {
          const filePath = path.join(logDir, file);
          
          try {
            const stats = fs.statSync(filePath);
            totalFiles++;
            totalSize += stats.size;
            
            const mtime = stats.mtime.getTime();
            if (oldestTime === null || mtime < oldestTime) {
              oldestTime = mtime;
            }
            if (newestTime === null || mtime > newestTime) {
              newestTime = mtime;
            }
          } catch (error) {
            logger.error(`获取日志文件状态失败 ${file}:`, error);
          }
        }
      });

      return {
        success: true,
        stats: {
          totalFiles,
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          oldestFile: oldestTime ? new Date(oldestTime).toISOString() : null,
          newestFile: newestTime ? new Date(newestTime).toISOString() : null
        }
      };
    } catch (error) {
      logger.error('获取日志文件统计失败:', error);
      return { success: false, error: error.message };
    }
  }
}

const logCleanupManager = new LogCleanupManager();
module.exports = logCleanupManager;

