# Lvory   

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory)

Minimalist Cross-Platform Client for Singbox

## 功能介绍

Lvory 是一个基于 Electron 开发的**面向具备自建服务能力**的超高灵活跨平台 SingBox 客户端，具有以下核心功能：

1. **自动内核管理**：自动下载、安装和更新 SingBox 内核
2. **代理管理**：一键启用/禁用系统代理，自动识别配置文件端口
3. **配置文件管理**：支持多种配置文件，自动解析和展示节点信息
4. **自动更新**：支持配置文件定时自动更新功能
5. **活动日志**：实时显示 SingBox 运行日志和系统活动
6. **更加灵活**: 核心操作基于配置文件声明，UI 只提供辅助，极高提升了灵活度
7. **(计划中) 高阶功能**: 计算节点 SLA，计算节点质量，类 NGFW 情报威胁订阅，灵活开发策略

## 预览

该预览为开发版本，暂时还处于不稳定阶段，更多页面介绍可以参考 [screenshot](docs/screenshot.md)

Dashboard

![Dashboard](docs/screenshot/dashboard.png)

## 技术栈

- Electron
- React
- Node.js
- Golang

## 开发指南

[配置映射引擎设计原型 - Alpha](docs/profiles_engine.md)

[代理节点打分算法与流程 - Alpha](docs/node_score.md)

## DISCLAIMER

1. This project and its documentation are provided solely for technical research, discussion, and learning purposes and do not constitute commercial or legal advice.
2. The author and maintainers of this project shall not be liable for any direct, indirect, incidental, or consequential damages, data loss, or system failures resulting from the use of this project.
3. This project must not be used for any illegal, unauthorized, or regulatory-violating activities. Liability arising from such misuse is solely the responsibility of the user.
4. Users are solely responsible for ensuring compliance with all applicable laws, regulations, and industry standards when using this project.

## 免责声明
1. 本项目及其文档仅用于技术研究、讨论和学习目的，不构成商业或法律建议
2. 本项目的作者和维护者不对因使用本项目而导致的任何直接、间接、附带损害、数据丢失或系统故障承担责任
3. 本项目不得用于任何非法、未经授权或违反监管规定的活动。因此类滥用而产生的责任完全由用户承担
4. 用户在使用本项目时，应自行负责确保遵守所有适用的法律、法规和行业标准
