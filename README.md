# Lvory   
Minimalist Cross-Platform Client for Singbox

## 功能介绍

Lvory 是一个基于 Electron 开发的跨平台 SingBox 客户端，具有以下核心功能：

1. **自动内核管理**：自动下载、安装和更新 SingBox 内核
2. **代理管理**：一键启用/禁用系统代理，自动识别配置文件端口
3. **配置文件管理**：支持多种配置文件，自动解析和展示节点信息
4. **自动更新**：支持配置文件定时自动更新功能
5. **活动日志**：实时显示 SingBox 运行日志和系统活动
6. **更加灵活**: 核心操作基于配置文件声明，UI 只提供辅助，极高提升了灵活度

## 使用指南

### 配置文件

Lvory支持以下两种方式管理配置文件：

1. **直接导入**：点击界面右上角的 "Add Profiles" 按钮，输入配置文件 URL 进行下载
2. **本地配置**：将配置文件命名为`sing-box.json`并保存到系统的 Documents 目录
   - Windows: `C:\Users\YourUsername\Documents\sing-box.json`
   - macOS: `/Users/YourUsername/Documents/sing-box.json`
   - Linux: `/home/YourUsername/Documents/sing-box.json`

## 技术栈

- Electron
- React
- Node.js
- Golang

## DISCLAIMER

1. This project and its documentation are provided solely for technical research, discussion, and learning purposes and do not constitute commercial or legal advice.
2. The author and maintainers of this project shall not be liable for any direct, indirect, incidental, or consequential damages, data loss, or system failures resulting from the use of this project.
3. This project must not be used for any illegal, unauthorized, or regulatory-violating activities. Liability arising from such misuse is solely the responsibility of the user.
4. Users are solely responsible for ensuring compliance with all applicable laws, regulations, and industry standards when using this project.
