#!/bin/bash
# lvory Flatpak 启动包装脚本
# 此脚本处理 Flatpak 沙盒环境中的应用程序启动

set -e

# 调试信息
DEBUG=${LVORY_DEBUG:-0}
if [ "$DEBUG" = "1" ]; then
    set -x
    echo "lvory Flatpak 启动脚本开始执行"
fi

# 环境变量设置
export ELECTRON_IS_DEV=0
export ELECTRON_TRASH=gio
export ELECTRON_DISABLE_SECURITY_WARNINGS=1

# Flatpak 应用数据目录
FLATPAK_APP_DATA="$HOME/.var/app/com.lvory.app"
FLATPAK_CONFIG_DIR="$FLATPAK_APP_DATA/config/lvory"
FLATPAK_DATA_DIR="$FLATPAK_APP_DATA/data/lvory"
FLATPAK_CORES_DIR="$FLATPAK_DATA_DIR/cores"

# 创建必要的目录结构
mkdir -p "$FLATPAK_CONFIG_DIR"
mkdir -p "$FLATPAK_DATA_DIR"
mkdir -p "$FLATPAK_CORES_DIR"
mkdir -p "$FLATPAK_DATA_DIR/logs"
mkdir -p "$FLATPAK_DATA_DIR/bin"

# 便携模式兼容性处理
# 在 Flatpak 环境中模拟便携模式的目录结构
if [ ! -L "$FLATPAK_DATA_DIR/data" ]; then
    ln -sf "$FLATPAK_DATA_DIR" "$FLATPAK_DATA_DIR/data" 2>/dev/null || true
fi

# sing-box 核心文件管理
SINGBOX_BINARY="$FLATPAK_CORES_DIR/sing-box"
SINGBOX_VERSION="1.8.0"

# 检查并下载 sing-box 核心
download_singbox() {
    local arch=$(uname -m)
    local arch_name
    
    case $arch in
        x86_64) arch_name="amd64" ;;
        aarch64) arch_name="arm64" ;;
        armv7l) arch_name="armv7" ;;
        *) 
            echo "警告: 不支持的架构 $arch，尝试使用 amd64"
            arch_name="amd64"
            ;;
    esac
    
    local download_url="https://github.com/SagerNet/sing-box/releases/download/v${SINGBOX_VERSION}/sing-box-${SINGBOX_VERSION}-linux-${arch_name}.tar.gz"
    local temp_dir=$(mktemp -d)
    
    echo "正在下载 sing-box 核心 v${SINGBOX_VERSION} (${arch_name})..."
    
    if command -v curl >/dev/null 2>&1; then
        curl -L "$download_url" -o "$temp_dir/sing-box.tar.gz"
    elif command -v wget >/dev/null 2>&1; then
        wget "$download_url" -O "$temp_dir/sing-box.tar.gz"
    else
        echo "错误: 未找到 curl 或 wget，无法下载 sing-box 核心"
        rm -rf "$temp_dir"
        return 1
    fi
    
    cd "$temp_dir"
    tar -xzf sing-box.tar.gz
    
    # 查找 sing-box 二进制文件
    local singbox_file=$(find . -name "sing-box" -type f | head -1)
    if [ -n "$singbox_file" ]; then
        cp "$singbox_file" "$SINGBOX_BINARY"
        chmod +x "$SINGBOX_BINARY"
        echo "✓ sing-box 核心下载完成: $SINGBOX_BINARY"
    else
        echo "错误: 在下载的文件中未找到 sing-box 二进制文件"
        rm -rf "$temp_dir"
        return 1
    fi
    
    rm -rf "$temp_dir"
    return 0
}

# 检查 sing-box 核心是否存在
if [ ! -f "$SINGBOX_BINARY" ]; then
    echo "未找到 sing-box 核心，正在下载..."
    if ! download_singbox; then
        echo "警告: sing-box 核心下载失败，应用程序可能无法正常工作"
    fi
elif [ ! -x "$SINGBOX_BINARY" ]; then
    echo "修复 sing-box 核心文件权限..."
    chmod +x "$SINGBOX_BINARY"
fi

# 设置应用程序环境变量，指向 Flatpak 数据目录
export LVORY_PORTABLE_MODE=true
export LVORY_DATA_DIR="$FLATPAK_DATA_DIR"
export LVORY_CONFIG_DIR="$FLATPAK_CONFIG_DIR"
export LVORY_CORES_DIR="$FLATPAK_CORES_DIR"

# 兼容性符号链接（如果应用程序期望特定路径）
if [ ! -e "$FLATPAK_DATA_DIR/sing-box.json" ] && [ -f "$FLATPAK_CONFIG_DIR/sing-box.json" ]; then
    ln -sf "$FLATPAK_CONFIG_DIR/sing-box.json" "$FLATPAK_DATA_DIR/sing-box.json" 2>/dev/null || true
fi

# 调试信息
if [ "$DEBUG" = "1" ]; then
    echo "环境变量:"
    echo "  FLATPAK_APP_DATA=$FLATPAK_APP_DATA"
    echo "  FLATPAK_CONFIG_DIR=$FLATPAK_CONFIG_DIR"
    echo "  FLATPAK_DATA_DIR=$FLATPAK_DATA_DIR"
    echo "  FLATPAK_CORES_DIR=$FLATPAK_CORES_DIR"
    echo "  SINGBOX_BINARY=$SINGBOX_BINARY"
    echo "目录结构:"
    ls -la "$FLATPAK_APP_DATA" 2>/dev/null || echo "  (无法列出目录)"
fi

# 启动应用程序
echo "启动 lvory..."
exec zypak-wrapper /app/main/lvory "$@"
