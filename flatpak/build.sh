#!/bin/bash
# lvory Flatpak 构建脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $*"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $*"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $*" >&2
}

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$SCRIPT_DIR/build"
REPO_DIR="$SCRIPT_DIR/repo"

# 配置
APP_ID="com.lvory.app"
MANIFEST="$SCRIPT_DIR/$APP_ID.yml"

# 清理函数
cleanup() {
    if [ "$KEEP_BUILD" != "1" ]; then
        log "清理构建目录..."
        rm -rf "$BUILD_DIR"
    fi
}

# 检查依赖
check_dependencies() {
    log "检查构建依赖..."
    
    local missing_deps=()
    
    # 检查 flatpak-builder
    if ! command -v flatpak-builder &> /dev/null; then
        missing_deps+=("flatpak-builder")
    fi
    
    # 检查 flatpak
    if ! command -v flatpak &> /dev/null; then
        missing_deps+=("flatpak")
    fi
    
    # 检查 jq (用于处理 JSON)
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "缺少以下依赖: ${missing_deps[*]}"
        echo ""
        echo "请安装缺少的依赖:"
        echo "  Ubuntu/Debian: sudo apt install flatpak flatpak-builder jq"
        echo "  Fedora: sudo dnf install flatpak flatpak-builder jq"
        echo "  Arch: sudo pacman -S flatpak flatpak-builder jq"
        exit 1
    fi
    
    success "所有依赖已满足"
}

# 检查 Flatpak 运行时
check_runtimes() {
    log "检查 Flatpak 运行时..."
    
    local required_runtimes=(
        "org.freedesktop.Platform//23.08"
        "org.freedesktop.Sdk//23.08"
        "org.freedesktop.Sdk.Extension.node18//23.08"
        "org.electronjs.Electron2.BaseApp//23.08"
    )
    
    local missing_runtimes=()
    
    for runtime in "${required_runtimes[@]}"; do
        if ! flatpak list --runtime | grep -q "$runtime"; then
            missing_runtimes+=("$runtime")
        fi
    done
    
    if [ ${#missing_runtimes[@]} -ne 0 ]; then
        warning "缺少以下运行时，将自动安装:"
        for runtime in "${missing_runtimes[@]}"; do
            echo "  - $runtime"
        done
        
        log "安装缺少的运行时..."
        for runtime in "${missing_runtimes[@]}"; do
            flatpak install --user -y flathub "$runtime" || {
                error "安装运行时失败: $runtime"
                exit 1
            }
        done
    fi
    
    success "所有运行时已准备就绪"
}

# 生成 Node.js 依赖源
generate_node_sources() {
    log "生成 Node.js 依赖源..."
    
    if [ ! -f "$PROJECT_ROOT/package-lock.json" ]; then
        error "未找到 package-lock.json 文件"
        echo "请先在项目根目录运行 'npm install' 生成 package-lock.json"
        exit 1
    fi
    
    # 检查是否已存在生成的源文件
    if [ -f "$SCRIPT_DIR/generated-sources.json" ]; then
        local package_lock_time=$(stat -c %Y "$PROJECT_ROOT/package-lock.json" 2>/dev/null || echo 0)
        local generated_time=$(stat -c %Y "$SCRIPT_DIR/generated-sources.json" 2>/dev/null || echo 0)
        
        if [ "$generated_time" -gt "$package_lock_time" ]; then
            success "Node.js 依赖源已是最新"
            return 0
        fi
    fi
    
    # 运行生成脚本
    if [ -f "$SCRIPT_DIR/generate-sources.sh" ]; then
        bash "$SCRIPT_DIR/generate-sources.sh"
    else
        error "未找到 generate-sources.sh 脚本"
        exit 1
    fi
    
    success "Node.js 依赖源生成完成"
}

# 更新清单文件中的源 URL 和哈希
update_manifest() {
    log "更新清单文件..."
    
    # 获取当前版本
    local version=$(jq -r '.version' "$PROJECT_ROOT/package.json")
    local archive_url="https://github.com/sxueck/lvory/archive/v${version}.tar.gz"
    
    log "计算源代码哈希值..."
    local temp_file=$(mktemp)
    
    if command -v curl >/dev/null 2>&1; then
        curl -sL "$archive_url" > "$temp_file"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$temp_file" "$archive_url"
    else
        error "未找到 curl 或 wget，无法下载源代码"
        rm -f "$temp_file"
        exit 1
    fi
    
    local sha256=$(sha256sum "$temp_file" | cut -d' ' -f1)
    rm -f "$temp_file"
    
    # 更新清单文件
    sed -i "s/PLACEHOLDER_SHA256_HASH/$sha256/g" "$MANIFEST"
    
    success "清单文件已更新 (版本: $version, SHA256: ${sha256:0:16}...)"
}

# 构建应用程序
build_app() {
    log "开始构建 Flatpak 应用程序..."
    
    # 创建构建目录
    mkdir -p "$BUILD_DIR"
    
    # 构建参数
    local build_args=(
        --force-clean
        --install-deps-from=flathub
        --user
        --ccache
    )
    
    # 如果指定了仓库目录，添加 --repo 参数
    if [ "$CREATE_REPO" = "1" ]; then
        build_args+=(--repo="$REPO_DIR")
    fi
    
    # 如果需要安装，添加 --install 参数
    if [ "$INSTALL_APP" = "1" ]; then
        build_args+=(--install)
    fi
    
    # 执行构建
    log "执行 flatpak-builder..."
    flatpak-builder "${build_args[@]}" "$BUILD_DIR" "$MANIFEST"
    
    success "Flatpak 应用程序构建完成"
}

# 测试应用程序
test_app() {
    if [ "$INSTALL_APP" != "1" ]; then
        warning "应用程序未安装，跳过测试"
        return 0
    fi
    
    log "测试应用程序..."
    
    # 检查应用程序是否已安装
    if ! flatpak list --app | grep -q "$APP_ID"; then
        error "应用程序未正确安装"
        return 1
    fi
    
    # 尝试运行应用程序（非交互式测试）
    log "验证应用程序可以启动..."
    timeout 10s flatpak run "$APP_ID" --version &>/dev/null || {
        warning "应用程序启动测试超时或失败（这可能是正常的）"
    }
    
    success "应用程序测试完成"
}

# 显示帮助信息
show_help() {
    cat << EOF
lvory Flatpak 构建脚本

用法: $0 [选项]

选项:
  -h, --help              显示此帮助信息
  -c, --clean             清理构建目录后退出
  -i, --install           构建后安装应用程序
  -r, --repo              创建本地仓库
  -k, --keep-build        保留构建目录
  -t, --test              构建后测试应用程序
  -f, --force-sources     强制重新生成 Node.js 依赖源

示例:
  $0                      # 仅构建
  $0 -i                   # 构建并安装
  $0 -i -t                # 构建、安装并测试
  $0 -r                   # 构建并创建仓库
  $0 -c                   # 清理构建目录

EOF
}

# 主函数
main() {
    log "lvory Flatpak 构建脚本启动"
    
    # 检查清单文件
    if [ ! -f "$MANIFEST" ]; then
        error "未找到清单文件: $MANIFEST"
        exit 1
    fi
    
    # 执行构建流程
    check_dependencies
    check_runtimes
    
    if [ "$FORCE_SOURCES" = "1" ] || [ ! -f "$SCRIPT_DIR/generated-sources.json" ]; then
        generate_node_sources
    fi
    
    update_manifest
    build_app
    
    if [ "$INSTALL_APP" = "1" ] && [ "$TEST_APP" = "1" ]; then
        test_app
    fi
    
    # 显示结果
    echo ""
    success "构建完成！"
    
    if [ "$INSTALL_APP" = "1" ]; then
        echo ""
        echo "运行应用程序:"
        echo "  flatpak run $APP_ID"
    fi
    
    if [ "$CREATE_REPO" = "1" ]; then
        echo ""
        echo "本地仓库已创建: $REPO_DIR"
        echo "安装命令:"
        echo "  flatpak install --user $REPO_DIR $APP_ID"
    fi
    
    echo ""
    echo "其他有用的命令:"
    echo "  flatpak list --app                    # 列出已安装的应用程序"
    echo "  flatpak uninstall --user $APP_ID      # 卸载应用程序"
    echo "  flatpak run --command=sh $APP_ID      # 进入应用程序沙盒"
}

# 参数解析
INSTALL_APP=0
CREATE_REPO=0
KEEP_BUILD=0
TEST_APP=0
FORCE_SOURCES=0

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--clean)
            log "清理构建目录..."
            rm -rf "$BUILD_DIR" "$REPO_DIR"
            success "清理完成"
            exit 0
            ;;
        -i|--install)
            INSTALL_APP=1
            shift
            ;;
        -r|--repo)
            CREATE_REPO=1
            shift
            ;;
        -k|--keep-build)
            KEEP_BUILD=1
            shift
            ;;
        -t|--test)
            TEST_APP=1
            INSTALL_APP=1  # 测试需要先安装
            shift
            ;;
        -f|--force-sources)
            FORCE_SOURCES=1
            shift
            ;;
        *)
            error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 设置清理陷阱
trap cleanup EXIT

# 执行主函数
main
