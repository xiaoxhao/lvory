/**
 * 配置文件相关IPC处理程序
 */
const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const utils = require('./utils');
const profileManager = require('../profile-manager');

/**
 * 设置配置文件相关IPC处理程序
 */
function setup() {
  // 获取配置文件路径
  ipcMain.handle('get-config-path', async () => {
    try {
      return profileManager.getConfigPath();
    } catch (error) {
      logger.error('获取配置文件路径失败:', error);
      return null;
    }
  });
  
  // 设置配置文件路径
  ipcMain.handle('set-config-path', async (event, filePath) => {
    try {
      if (!filePath) {
        return { success: false, error: '文件路径不能为空' };
      }
      
      const configDir = utils.getConfigDir();
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(configDir, filePath);
      
      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `文件不存在: ${fullPath}` };
      }
      
      // 使用profileManager的setConfigPath方法
      const success = profileManager.setConfigPath(fullPath);
      if (success) {
        logger.info(`设置当前配置文件路径: ${fullPath}`);
        return { success: true, configPath: fullPath };
      } else {
        return { success: false, error: '设置配置文件路径失败' };
      }
    } catch (error) {
      logger.error('设置配置文件路径失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取profiles数据
  ipcMain.handle('get-profile-data', async () => {
    try {
      const outbounds = profileManager.scanProfileConfig();
      
      // 转换为前端需要的格式
      const profileData = outbounds.map(item => ({
        tag: item.tag,
        type: item.type,
        server: item.server || '',
        description: `${item.type || 'Unknown'} - ${item.server || 'N/A'}`
      }));
      
      // 保持与原有API格式一致，返回对象而不是直接返回数组
      return {
        success: true,
        profiles: profileData
      };
    } catch (error) {
      logger.error('获取配置文件数据失败:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  });
  
  // 获取配置文件列表
  ipcMain.handle('getProfileFiles', async () => {
    try {
      const configDir = utils.getConfigDir();
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        return { success: true, files: [] };
      }
      
      const files = fs.readdirSync(configDir)
        // 仅显示JSON配置文件
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ext === '.json';
        })
        .map(file => {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          
          // 尝试获取元数据
          let status = 'active';
          try {
            const metaCache = utils.readMetaCache();
            if (metaCache[file] && metaCache[file].status) {
              status = metaCache[file].status;
            }
          } catch (err) {
            logger.error(`读取文件状态失败: ${err.message}`);
          }
          
          return {
            name: file,
            path: filePath,
            size: `${Math.round(stats.size / 1024)} KB`,
            createDate: new Date(stats.birthtime).toLocaleDateString(),
            modifiedDate: new Date(stats.mtime).toLocaleDateString(),
            status: status
          };
        });
      
      logger.info(`找到${files.length}个配置文件`);
      return { success: true, files };
    } catch (error) {
      logger.error(`获取配置文件列表失败: ${error.message}`);
      return { success: false, error: error.message, files: [] };
    }
  });
  
  // 获取配置文件元数据
  ipcMain.handle('getProfileMetadata', async (event, fileName) => {
    try {
      if (!fileName) {
        return {
          success: false,
          error: 'File name is required'
        };
      }
      
      // 从meta.cache读取
      const metaCache = utils.readMetaCache();
      if (metaCache[fileName]) {
        logger.info(`从meta.cache获取元数据: ${fileName}`);
        return {
          success: true,
          metadata: metaCache[fileName]
        };
      }
      
      // 如果没有找到元数据
      return {
        success: false,
        error: 'Metadata not found for this file'
      };
    } catch (error) {
      logger.error(`获取配置文件元数据失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // 导出配置文件
  ipcMain.handle('exportProfile', async (event, fileName) => {
    try {
      const configDir = utils.getConfigDir();
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      const { app } = require('electron');
      const saveDialog = await dialog.showSaveDialog({
        title: '导出配置文件',
        defaultPath: path.join(app.getPath('downloads'), fileName),
        filters: [
          { name: '配置文件', extensions: ['json', 'yaml', 'yml', 'config'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      
      if (saveDialog.canceled) {
        return { success: false, error: '用户取消' };
      }
      
      fs.copyFileSync(filePath, saveDialog.filePath);
      return { success: true };
    } catch (error) {
      logger.error(`导出配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 重命名配置文件
  ipcMain.handle('renameProfile', async (event, { oldName, newName }) => {
    try {
      const configDir = utils.getConfigDir();
      const oldPath = path.join(configDir, oldName);
      const newPath = path.join(configDir, newName);
      
      if (!fs.existsSync(oldPath)) {
        return { success: false, error: '原文件不存在' };
      }
      
      if (fs.existsSync(newPath)) {
        return { success: false, error: '新文件名已存在' };
      }
      
      fs.renameSync(oldPath, newPath);
      
      // 更新meta.cache
      const metaCache = utils.readMetaCache();
      if (metaCache[oldName]) {
        metaCache[newName] = metaCache[oldName];
        delete metaCache[oldName];
        utils.writeMetaCache(metaCache);
      }
      
      // 触发配置文件变更事件
      const mainWindow = utils.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`重命名配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 删除配置文件
  ipcMain.handle('deleteProfile', async (event, fileName) => {
    try {
      const configDir = utils.getConfigDir();
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      fs.unlinkSync(filePath);
      
      // 更新meta.cache
      const metaCache = utils.readMetaCache();
      if (metaCache[fileName]) {
        delete metaCache[fileName];
        utils.writeMetaCache(metaCache);
      }
      
      // 触发配置文件变更事件
      const mainWindow = utils.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`删除配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 使用默认编辑器打开配置文件
  ipcMain.handle('openFileInEditor', async (event, fileName) => {
    try {
      const configDir = utils.getConfigDir();
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      logger.error(`打开编辑器失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 打开配置文件所在目录
  ipcMain.handle('openConfigDir', async () => {
    try {
      const configDir = utils.getConfigDir();
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      shell.openPath(configDir);
      return { success: true };
    } catch (error) {
      logger.error(`打开配置目录失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 配置文件变更事件处理
  ipcMain.on('profiles-changed-listen', (event) => {
    const webContents = event.sender;
    
    // 移除旧的监听器，防止重复
    ipcMain.removeListener('profiles-changed-notify', () => {});
    
    // 添加新的监听器
    ipcMain.on('profiles-changed-notify', () => {
      if (!webContents.isDestroyed()) {
        webContents.send('profiles-changed');
      }
    });
  });
  
  // 移除配置文件变更监听
  ipcMain.on('profiles-changed-unlisten', () => {
    ipcMain.removeListener('profiles-changed-notify', () => {});
  });
}

module.exports = {
  setup
}; 