# Lvory   

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory)

Minimalist Cross-Platform Client for Singbox

[中文](README-zh.md)

## Feature Introduction  

Lvory is a highly flexible cross-platform SingBox client developed with Electron, **targeted at users with self-hosting capabilities**. Its core features include:  

1. **Automatic Kernel Management**: Automatically downloads, installs, and updates the SingBox kernel.  
2. **Proxy Management**: Enables/disables system proxy with one click and automatically detects configuration file ports.  
3. **Configuration File Management**: Supports multiple configuration files and automatically parses and displays node information.  
4. **Auto-Updates**: Supports scheduled automatic updates for configuration files.  
5. **Activity Logs**: Displays SingBox runtime logs and system activities in real time.  
6. **Greater Flexibility**: Core operations are based on configuration file declarations, with the UI only providing assistance, significantly improving flexibility.  
7. **(Planned) Advanced Features**: Node SLA calculation, node quality assessment, NGFW-like threat intelligence subscriptions, and flexible policy development.  

## Preview

This preview is a development version and is currently in an unstable stage. For more page details, please refer to [screenshot](docs/screenshot.md)

![Dashboard](docs/screenshot/dashboard.png)

## Development

[配置映射引擎设计原型 - Alpha](docs/profiles_engine.md)

[代理节点打分算法与流程 - Alpha](docs/node_score.md)

## DISCLAIMER

1. This project and its documentation are provided solely for technical research, discussion, and learning purposes and do not constitute commercial or legal advice.
2. The author and maintainers of this project shall not be liable for any direct, indirect, incidental, or consequential damages, data loss, or system failures resulting from the use of this project.
3. This project must not be used for any illegal, unauthorized, or regulatory-violating activities. Liability arising from such misuse is solely the responsibility of the user.
4. Users are solely responsible for ensuring compliance with all applicable laws, regulations, and industry standards when using this project.
