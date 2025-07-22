# lvory Flatpak 打包

这个目录包含了为 lvory Electron 应用程序创建 Flatpak 包的完整配置和脚本。

## 文件结构

```
flatpak/
├── com.lvory.app.yml              # 主要的 Flatpak 清单文件
├── com.lvory.app.desktop          # 桌面文件
├── com.lvory.app.metainfo.xml     # AppStream 元数据
├── lvory-wrapper.sh               # 应用程序启动包装脚本
├── download-singbox.sh            # sing-box 核心下载脚本
├── portable-mode-patch.js         # 便携模式兼容性补丁
├── generate-sources.sh            # Node.js 依赖源生成脚本
├── build.sh                       # 构建脚本
├── install.sh                     # 安装脚本
├── uninstall.sh                   # 卸载脚本
├── test.sh                        # 测试脚本
└── README.md                      # 本文件
```

## 快速开始

### 1. 准备环境

确保系统已安装必要的依赖：

```bash
# Ubuntu/Debian
sudo apt install flatpak flatpak-builder jq curl

# Fedora
sudo dnf install flatpak flatpak-builder jq curl

# Arch Linux
sudo pacman -S flatpak flatpak-builder jq curl
```

添加 Flathub 仓库：

```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

### 2. 生成 Node.js 依赖源

```bash
cd flatpak
chmod +x generate-sources.sh
./generate-sources.sh
```

### 3. 构建和安装

```bash
chmod +x build.sh install.sh
./install.sh
```

### 4. 运行应用程序

```bash
flatpak run com.lvory.app
```

## 详细说明

### 构建流程

1. **依赖检查**: 检查 flatpak-builder、Node.js 等必要工具
2. **运行时安装**: 自动安装所需的 Flatpak 运行时
3. **源文件生成**: 生成 NPM 依赖的离线源文件
4. **应用程序构建**: 使用 electron-builder 构建应用程序
5. **打包**: 将应用程序打包为 Flatpak 格式

### 便携模式兼容性

Flatpak 版本完全支持便携模式功能：

- **数据存储**: 应用程序数据存储在 `~/.var/app/com.lvory.app/data/lvory`
- **配置文件**: 配置文件存储在 `~/.var/app/com.lvory.app/config/lvory`
- **核心文件**: sing-box 核心文件存储在数据目录的 `cores` 子目录中
- **路径映射**: 自动将便携模式路径映射到 Flatpak 沙盒路径

### sing-box 核心管理

- **自动下载**: 首次运行时自动下载适合当前架构的 sing-box 核心
- **版本管理**: 支持指定版本或自动获取最新版本
- **权限处理**: 在 Flatpak 沙盒中正确处理核心文件权限

### 网络代理功能

Flatpak 版本保留了完整的网络代理功能：

- **网络访问**: 具有完整的网络访问权限
- **系统代理**: 支持设置系统代理（通过 NetworkManager）
- **端口监听**: 支持监听代理端口
- **TUN 模式**: 支持 TUN 模式（需要额外权限）

## 脚本说明

### build.sh - 构建脚本

```bash
./build.sh [选项]

选项:
  -i, --install           构建后安装应用程序
  -r, --repo              创建本地仓库
  -t, --test              构建后测试应用程序
  -c, --clean             清理构建目录
  -f, --force-sources     强制重新生成依赖源
```

### install.sh - 安装脚本

```bash
./install.sh [选项]

选项:
  -l, --local             从本地仓库安装
  -b, --build             构建并安装（默认）
  -s, --shortcut          创建桌面快捷方式
  -f, --force             强制重新安装
```

### test.sh - 测试脚本

```bash
./test.sh [选项]

选项:
  -q, --quick             快速测试
  -v, --verbose           详细输出
  -c, --cleanup           测试后清理环境
```

### uninstall.sh - 卸载脚本

```bash
./uninstall.sh [选项]

选项:
  -d, --remove-data       删除应用程序数据
  -r, --remove-runtimes   删除未使用的运行时
  --purge                 完全清理
```

## 开发和调试

### 进入应用程序沙盒

```bash
flatpak run --command=sh com.lvory.app
```

### 查看应用程序日志

```bash
flatpak logs com.lvory.app
```

### 调试模式启动

```bash
LVORY_DEBUG=1 flatpak run com.lvory.app
```

### 检查权限

```bash
flatpak info --show-permissions com.lvory.app
```

## 分发

### 创建本地仓库

```bash
./build.sh -r
```

### 导出应用程序

```bash
flatpak build-export repo build
```

### 创建单文件包

```bash
flatpak build-bundle repo lvory.flatpak com.lvory.app
```

## 故障排除

### 常见问题

1. **构建失败**: 检查 Node.js 依赖源是否正确生成
2. **运行时错误**: 确保所有必要的运行时已安装
3. **权限问题**: 检查 Flatpak 权限配置
4. **网络问题**: 确保网络访问权限已正确配置

### 清理和重建

```bash
# 完全清理
./uninstall.sh --purge
./build.sh -c

# 重新构建
./build.sh -f -i
```

### 查看详细日志

```bash
# 构建日志
./build.sh -v

# 运行日志
flatpak run --verbose com.lvory.app
```

## 跨平台兼容性

此 Flatpak 配置支持以下 Linux 发行版：

- **Ubuntu/Debian** (18.04+)
- **Fedora** (30+)
- **Arch Linux**
- **openSUSE**
- **CentOS/RHEL** (8+)

支持的架构：
- **x86_64** (amd64)
- **aarch64** (arm64)
- **armv7l** (arm32)

## 许可证

此 Flatpak 配置遵循与主项目相同的 Apache-2.0 许可证。
