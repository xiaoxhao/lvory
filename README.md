<div align="center">

# Lvory

*Minimalist Cross-Platform Client for Singbox*

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) 
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory) 
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=sxueck_lvory&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=sxueck_lvory)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

[中文文档](README-zh.md) • [Screenshots](docs/screenshot.md) • [Documentation](docs/)

</div>

## Table of Contents

- [Features](#features)
- [Preview](#preview)
- [Getting Started](#getting-started)
- [Development](#development)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)



## Features

Lvory is a highly flexible cross-platform SingBox client developed with Electron, **targeted at users with self-hosting capabilities**.

### Core Features

| Feature | Description |
|---------|-------------|
| **Automatic Kernel Management** | Automatically downloads, installs, and updates the SingBox kernel |
| **Proxy Management** | One-click system proxy enable/disable with automatic port detection |
| **Configuration Management** | Multi-config support with automatic node parsing and display |
| **Auto-Updates** | Scheduled automatic updates for configuration files |
| **Activity Logs** | Real-time SingBox runtime logs and system activities |
| **Greater Flexibility** | File-based operations with UI assistance for maximum flexibility |

### Planned Features

- Node SLA calculation and quality assessment
- Flexible policy development framework


## Preview

<div align="center">

![Dashboard](docs/screenshot/dashboard.png)

*Main Dashboard Interface*

</div>

For more screenshots, visit our [More Screenshots](docs/screenshot.md)



## Getting Started

### Prerequisites

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **SingBox**: Automatically managed by Lvory

### Installation

Download the latest release from our [GitHub Releases](https://github.com/sxueck/lvory/releases) page.

Choose the appropriate package for your operating system:
- **Windows**: `Lvory-Setup-x.x.x.exe`
- **macOS**: `Lvory-x.x.x.dmg`
- **Linux**: `Lvory-x.x.x.deb`

### Quick Start

1. **Launch Lvory** - Start the application
2. **Add Configuration** - Import your SingBox configuration files
3. **Enable Proxy** - Toggle system proxy with one click
4. **Monitor Activity** - View real-time logs and connection status



## Development

### Architecture Documents

- **[Profiles Engine Design - Alpha](docs/profiles_engine.md)**  
  Configuration mapping engine prototype and implementation details

- **[Node Scoring Algorithm - Alpha](docs/node_score.md)**  
  Proxy node scoring algorithm and workflow documentation

### Development Setup

```bash
# Install development dependencies
npm i

# Run in development mode
npm run dev

# Build for production
npm run build
```



## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

### Guidelines

- Follow the existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed



## ⚠️ Disclaimer

> **Important**: Please read carefully before using this software.

1. **Educational Purpose**: This project and its documentation are provided solely for technical research, discussion, and learning purposes and do not constitute commercial or legal advice.

2. **No Warranty**: The author and maintainers shall not be liable for any direct, indirect, incidental, or consequential damages, data loss, or system failures resulting from the use of this project.

3. **Legal Compliance**: This project must not be used for any illegal, unauthorized, or regulatory-violating activities. Liability arising from such misuse is solely the responsibility of the user.

4. **User Responsibility**: Users are solely responsible for ensuring compliance with all applicable laws, regulations, and industry standards when using this project.



## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
