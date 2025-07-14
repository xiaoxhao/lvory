# AppImage 模式支持


## 概述

## 功能特性

### 1. 自动检测 AppImage 环境

应用程序会自动检测是否运行在 AppImage 环境中，检测方法包括：

- **APPIMAGE 环境变量**：AppImage 运行时会设置此变量指向 AppImage 文件路径
- **APPDIR 环境变量**：AppImage 挂载目录路径
- **进程路径特征**：检查可执行文件路径是否包含 AppImage 特征（如 `/.mount_` 或 `/tmp/.mount_`）

### 2. 符合标准的文件存储

在 AppImage 模式下，所有应用程序数据都存储到符合 XDG 基础目录规范的位置：

- **配置目录**：`$XDG_CONFIG_HOME/lvory` 或 `~/.config/lvory`
- **内核文件**：`$XDG_CONFIG_HOME/lvory/bin` 或 `~/.config/lvory/bin`
- **配置文件**：`$XDG_CONFIG_HOME/lvory/configs` 或 `~/.config/lvory/configs`
- **日志文件**：`$XDG_CONFIG_HOME/lvory/logs` 或 `~/.config/lvory/logs`

### 3. 运行模式显示

在应用程序的"设置 > 关于"页面中，会显示当前的运行模式信息，包括：

- 运行模式类型（标准模式、便携模式、AppImage）
- 平台信息
- 模式状态标识