# IPC 接口优化说明

## 概述

为了减少资源消耗和提高代码维护性，我对 IPC 接口进行了合并优化。优化主要将相关功能的 IPC 接口合并到统一的命名空间下，移除了重复和冗余的接口，实现更清晰的架构。

## 优化内容

### 1. 窗口管理接口合并

**统一接口：**
```javascript
electron.window.minimize()    // 最小化窗口
electron.window.maximize()    // 最大化窗口
electron.window.close()       // 关闭窗口
electron.window.show()        // 显示窗口
electron.window.quit()        // 退出应用
electron.window.onVisibilityChange(callback) // 监听窗口可见性变化
```

### 2. 下载管理接口合并

**统一接口：**
```javascript
electron.download.profile(data)           // 下载配置文件
electron.download.core()                  // 下载核心
electron.download.onCoreProgress(callback) // 监听核心下载进度
electron.download.onComplete(callback)    // 监听下载完成
```

### 3. SingBox 版本接口优化

**优化：**
- 移除了重复的 `getSingBoxVersion()` 接口
- 统一使用 `electron.singbox.getVersion()`
- 将版本更新监听合并到 SingBox 命名空间下

**接口：**
```javascript
electron.singbox.getVersion()              // 获取版本
electron.singbox.onVersionUpdate(callback) // 监听版本更新
```

### 4. 配置文件管理接口合并

**统一接口：**
```javascript
electron.profiles.getData()                 // 获取配置数据
electron.profiles.getFiles()               // 获取配置文件列表
electron.profiles.getMetadata(fileName)    // 获取元数据
electron.profiles.update(fileName)         // 更新配置文件
electron.profiles.updateAll()              // 更新所有配置文件
electron.profiles.delete(fileName)         // 删除配置文件
electron.profiles.openInEditor(fileName)   // 在编辑器中打开
electron.profiles.openAddDialog()          // 打开添加对话框
electron.profiles.onData(callback)         // 监听数据变化
electron.profiles.onUpdated(callback)      // 监听更新事件
electron.profiles.onChanged(callback)      // 监听变更事件
```

### 5. 配置路径管理接口合并

**统一接口：**
```javascript
electron.config.getPath()       // 获取配置路径
electron.config.setPath(path)   // 设置配置路径
electron.config.getCurrent()    // 获取当前配置
```

### 6. 日志管理接口优化

**统一接口：**
```javascript
electron.logs.onMessage(callback)           // 监听日志消息
electron.logs.onActivity(callback)          // 监听活动日志
electron.logs.onConnection(callback)        // 监听连接日志
electron.logs.getHistory()                  // 获取日志历史
electron.logs.getConnectionHistory()        // 获取连接日志历史
electron.logs.clear()                       // 清除日志
electron.logs.clearConnection()             // 清除连接日志
electron.logs.startConnectionMonitoring()   // 开始连接监听
electron.logs.stopConnectionMonitoring()    // 停止连接监听
```

### 7. 设置管理接口合并

**统一接口：**
```javascript
electron.settings.save(settings)        // 保存设置
electron.settings.get()                 // 获取设置
electron.settings.setAutoLaunch(enable) // 设置开机自启
electron.settings.getAutoLaunch()       // 获取开机自启状态
```

### 8. 节点管理接口合并

**统一接口：**
```javascript
electron.nodes.getHistory(nodeTag)          // 获取节点历史
electron.nodes.loadAllHistory()             // 加载所有历史
electron.nodes.isHistoryEnabled()           // 检查历史功能是否启用
electron.nodes.getTotalTraffic(nodeTag)     // 获取节点总流量
electron.nodes.getAllTotalTraffic()         // 获取所有节点总流量
electron.nodes.resetTotalTraffic(nodeTag)   // 重置节点总流量
```

### 9. 版本管理接口合并

**统一接口：**
```javascript
electron.version.checkForUpdates()  // 检查更新
electron.version.getAll()           // 获取所有版本
```

## 使用指南

### 新的接口结构

所有接口都采用统一的命名空间结构：

```javascript
// 窗口操作
electron.window.minimize();
electron.window.show();

// 下载管理
electron.download.profile(data);
electron.download.core();

// 配置管理
electron.profiles.getFiles();
electron.config.getPath();

// 系统设置
electron.settings.save(settings);
electron.settings.setAutoLaunch(true);

// 日志系统
electron.logs.getHistory();
electron.logs.clear();

// 节点管理
electron.nodes.getHistory(nodeTag);
electron.nodes.getTotalTraffic(nodeTag);

// 版本管理
electron.version.checkForUpdates();
```

## 优化效果

1. **显著减少内存占用**：移除重复接口，减少事件监听器数量
2. **提高代码可维护性**：相关功能集中在统一命名空间下
3. **改善开发体验**：更清晰的接口组织结构，易于理解和使用
4. **减少bundle大小**：移除冗余代码，优化打包体积
5. **提升性能**：减少IPC通道数量，提高通信效率

## 迁移注意事项

由于移除了旧的接口，需要将现有代码更新为新的接口：

### 重要变更

1. **窗口控制**：`minimizeWindow()` → `window.minimize()`
2. **下载功能**：`downloadProfile()` → `download.profile()`
3. **配置管理**：`getProfileFiles()` → `profiles.getFiles()`
4. **设置管理**：`saveSettings()` → `settings.save()`
5. **节点管理**：`getNodeHistory()` → `nodes.getHistory()`
6. **版本管理**：`checkForUpdates()` → `version.checkForUpdates()`

### 快速迁移

可以使用查找替换功能快速更新代码：

```javascript
// 查找: electron.minimizeWindow()
// 替换: electron.window.minimize()

// 查找: electron.downloadProfile(
// 替换: electron.download.profile(

// 查找: electron.getProfileFiles()
// 替换: electron.profiles.getFiles()
```

## 最佳实践

1. **使用新的统一接口**进行所有新功能开发
2. **保持命名空间一致性**，按功能模块组织代码
3. **利用IDE的自动完成**功能，提高开发效率
4. **参考文档**了解新接口的完整功能
