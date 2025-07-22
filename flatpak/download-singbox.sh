#!/bin/bash
# sing-box 核心下载和管理脚本
# 用于在 Flatpak 环境中管理 sing-box 核心文件

set -e

# 配置
SINGBOX_VERSION="${SINGBOX_VERSION:-1.8.0}"
GITHUB_API_URL="https://api.github.com/repos/SagerNet/sing-box/releases"
GITHUB_RELEASE_URL="https://github.com/SagerNet/sing-box/releases/download"

# 目录配置
CORES_DIR="${LVORY_CORES_DIR:-/app/cores}"
TEMP_DIR=$(mktemp -d)

# 清理函数
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# 检测系统架构
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64) echo "amd64" ;;
        aarch64) echo "arm64" ;;
        armv7l) echo "armv7" ;;
        armv6l) echo "armv6" ;;
        i386|i686) echo "386" ;;
        *) 
            error "不支持的架构: $arch"
            return 1
            ;;
    esac
}

# 获取最新版本
get_latest_version() {
    log "正在获取最新版本信息..."
    
    if command -v curl >/dev/null 2>&1; then
        curl -s "$GITHUB_API_URL/latest" | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/' | head -1
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "$GITHUB_API_URL/latest" | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/' | head -1
    else
        error "未找到 curl 或 wget，无法获取版本信息"
        return 1
    fi
}

# 下载文件
download_file() {
    local url="$1"
    local output="$2"
    
    log "正在下载: $url"
    
    if command -v curl >/dev/null 2>&1; then
        curl -L --progress-bar "$url" -o "$output"
    elif command -v wget >/dev/null 2>&1; then
        wget --progress=bar:force "$url" -O "$output"
    else
        error "未找到 curl 或 wget，无法下载文件"
        return 1
    fi
}

# 验证下载的文件
verify_download() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        error "下载的文件不存在: $file"
        return 1
    fi
    
    if [ ! -s "$file" ]; then
        error "下载的文件为空: $file"
        return 1
    fi
    
    # 检查文件类型
    if command -v file >/dev/null 2>&1; then
        local file_type=$(file "$file")
        if [[ "$file_type" != *"gzip compressed"* ]] && [[ "$file_type" != *"tar archive"* ]]; then
            error "下载的文件格式不正确: $file_type"
            return 1
        fi
    fi
    
    return 0
}

# 提取和安装 sing-box
extract_and_install() {
    local archive="$1"
    local target_dir="$2"
    
    log "正在提取 sing-box..."
    
    cd "$TEMP_DIR"
    tar -xzf "$archive"
    
    # 查找 sing-box 二进制文件
    local singbox_binary=$(find . -name "sing-box" -type f -executable | head -1)
    
    if [ -z "$singbox_binary" ]; then
        error "在压缩包中未找到 sing-box 二进制文件"
        return 1
    fi
    
    # 创建目标目录
    mkdir -p "$target_dir"
    
    # 复制二进制文件
    cp "$singbox_binary" "$target_dir/sing-box"
    chmod +x "$target_dir/sing-box"
    
    log "✓ sing-box 安装完成: $target_dir/sing-box"
    
    # 验证安装
    if "$target_dir/sing-box" version >/dev/null 2>&1; then
        local installed_version=$("$target_dir/sing-box" version 2>/dev/null | head -1 || echo "未知版本")
        log "✓ 安装验证成功: $installed_version"
    else
        error "安装验证失败"
        return 1
    fi
    
    return 0
}

# 主函数
main() {
    log "sing-box 核心下载器启动"
    
    # 检测架构
    local arch
    if ! arch=$(detect_arch); then
        exit 1
    fi
    log "检测到系统架构: $arch"
    
    # 确定版本
    local version="$SINGBOX_VERSION"
    if [ "$version" = "latest" ]; then
        if ! version=$(get_latest_version); then
            error "无法获取最新版本，使用默认版本 1.8.0"
            version="1.8.0"
        fi
    fi
    log "目标版本: v$version"
    
    # 检查是否已安装
    if [ -f "$CORES_DIR/sing-box" ]; then
        if "$CORES_DIR/sing-box" version >/dev/null 2>&1; then
            local current_version=$("$CORES_DIR/sing-box" version 2>/dev/null | head -1 || echo "")
            log "当前已安装版本: $current_version"
            
            if [[ "$current_version" == *"$version"* ]]; then
                log "✓ 已安装目标版本，无需重新下载"
                exit 0
            fi
        fi
    fi
    
    # 构建下载 URL
    local filename="sing-box-${version}-linux-${arch}.tar.gz"
    local download_url="$GITHUB_RELEASE_URL/v${version}/$filename"
    local archive_path="$TEMP_DIR/$filename"
    
    # 下载文件
    if ! download_file "$download_url" "$archive_path"; then
        exit 1
    fi
    
    # 验证下载
    if ! verify_download "$archive_path"; then
        exit 1
    fi
    
    # 提取和安装
    if ! extract_and_install "$archive_path" "$CORES_DIR"; then
        exit 1
    fi
    
    log "✓ sing-box 核心下载和安装完成"
}

# 帮助信息
show_help() {
    cat << EOF
sing-box 核心下载器

用法: $0 [选项]

选项:
  -v, --version VERSION    指定要下载的版本 (默认: $SINGBOX_VERSION)
  -d, --dir DIRECTORY      指定安装目录 (默认: $CORES_DIR)
  -h, --help              显示此帮助信息

环境变量:
  SINGBOX_VERSION         要下载的版本
  LVORY_CORES_DIR         安装目录

示例:
  $0                      # 下载默认版本
  $0 -v 1.7.8            # 下载指定版本
  $0 -v latest           # 下载最新版本
  $0 -d /custom/path     # 安装到自定义目录

EOF
}

# 参数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            SINGBOX_VERSION="$2"
            shift 2
            ;;
        -d|--dir)
            CORES_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主函数
main
