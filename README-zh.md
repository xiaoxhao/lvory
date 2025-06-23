<div align="center">

# Lvory

*Singbox 极简跨平台客户端*

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) 
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) 
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

[English](README.md) • [截图预览](docs/screenshot.md) • [开发文档](docs/)

</div>


## 目录

- [功能特性](#功能特性)
- [预览](#预览)
- [快速开始](#快速开始)
- [文档](#文档)
- [开发指南](#开发指南)
- [贡献](#贡献)
- [免责声明](#免责声明)
- [许可证](#许可证)


## 功能特性

Lvory 是一个基于 Electron 开发的**面向具备自建服务能力**的超高灵活跨平台 SingBox 客户端。

### 核心功能

| 功能 | 描述 |
|------|------|
| **自动内核管理** | 自动下载、安装和更新 SingBox 内核 |
| **代理管理** | 一键启用/禁用系统代理，自动识别配置文件端口 |
| **配置文件管理** | 支持多种配置文件，自动解析和展示节点信息 |
| **自动更新** | 支持配置文件定时自动更新功能 |
| **活动日志** | 实时显示 SingBox 运行日志和系统活动 |
| **更高灵活性** | 核心操作基于配置文件声明，UI 只提供辅助，极大提升灵活度 |

### 计划中功能

- 节点 SLA 计算和质量评估
- 灵活的策略开发框架


## 预览

<div align="center">

![Dashboard](docs/screenshot/dashboard.png)

*主控制面板界面*

</div>

查看更多截图，请访问 [更多截图](docs/screenshot.md)

## 快速开始

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, 或 Linux
- **SingBox**: 由 Lvory 自动管理

### 安装

从我们的 [GitHub Releases](https://github.com/sxueck/lvory/releases) 页面下载最新版本。

为你的操作系统选择合适的安装包：
- **Windows**: `Lvory-Setup-x.x.x.exe`
- **macOS**: `Lvory-x.x.x.dmg`
- **Linux**: `Lvory-x.x.x.deb`

### 快速入门

1. **启动 Lvory** - 运行应用程序
2. **添加配置** - 导入您的 SingBox 配置文件
3. **启用代理** - 一键切换系统代理
4. **监控活动** - 查看实时日志和连接状态

## 开发指南

### 架构文档

- **[配置映射引擎设计原型 - Alpha](docs/profiles_engine.md)**  
  配置映射引擎原型和实现细节

- **[代理节点打分算法与流程 - Alpha](docs/node_score.md)**  
  代理节点打分算法和工作流程文档

### 开发环境搭建

```bash
# 安装开发依赖
npm i

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

## 贡献

我们欢迎贡献！请随时提交问题和拉取请求。

### 贡献指南

- 遵循现有代码风格
- 编写清晰的提交信息
- 为新功能添加测试
- 根据需要更新文档


## ⚠️ 免责声明

> **重要**: 使用本软件前请仔细阅读。

1. **教育目的**: 本项目及其文档仅用于技术研究、讨论和学习目的，不构成商业或法律建议。

2. **无担保**: 本项目的作者和维护者不对因使用本项目而导致的任何直接、间接、附带损害、数据丢失或系统故障承担责任。

3. **法律合规**: 本项目不得用于任何非法、未经授权或违反监管规定的活动。因此类滥用而产生的责任完全由用户承担。

4. **用户责任**: 用户在使用本项目时，应自行负责确保遵守所有适用的法律、法规和行业标准。


## 许可证

本项目采用 Apache 2.0 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。