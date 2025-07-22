#!/bin/bash
# lvory Flatpak 卸载脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 配置
APP_ID="com.lvory.app"

# 确认卸载
confirm_uninstall() {
    if [ "$FORCE_UNINSTALL" = "1" ]; then
        return 0
    fi
    
    echo ""
    warning "即将卸载 lvory Flatpak 应用程序"
    echo ""
    echo "这将删除:"
    echo "  - 应用程序本身"
    if [ "$REMOVE_DATA" = "1" ]; then
        echo "  - 所有应用程序数据和配置"
        echo "  - sing-box 核心文件"
        echo "  - 日志文件"
    fi
    if [ "$REMOVE_RUNTIMES" = "1" ]; then
        echo "  - 相关运行时（如果没有其他应用程序使用）"
    fi
    echo ""
    
    read -p "确定要继续吗？[y/N] " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "取消卸载"
        exit 0
    fi
}

# 检查应用程序是否已安装
check_app_installed() {
    if ! flatpak list --app | grep -q "$APP_ID"; then
        warning "应用程序 $APP_ID 未安装"
        exit 0
    fi
    
    success "找到已安装的应用程序: $APP_ID"
}

# 停止运行中的应用程序
stop_running_app() {
    log "检查并停止运行中的应用程序..."
    
    # 尝试优雅地停止应用程序
    if pgrep -f "flatpak run $APP_ID" >/dev/null; then
        warning "检测到运行中的应用程序，正在停止..."
        pkill -f "flatpak run $APP_ID" || true
        sleep 2
        
        # 如果仍在运行，强制停止
        if pgrep -f "flatpak run $APP_ID" >/dev/null; then
            warning "强制停止应用程序..."
            pkill -9 -f "flatpak run $APP_ID" || true
        fi
    fi
    
    success "应用程序已停止"
}

# 卸载应用程序
uninstall_app() {
    log "卸载应用程序..."
    
    flatpak uninstall --user -y "$APP_ID"
    success "应用程序已卸载"
}

# 清理应用程序数据
cleanup_app_data() {
    if [ "$REMOVE_DATA" != "1" ]; then
        return 0
    fi
    
    log "清理应用程序数据..."
    
    local app_data_dir="$HOME/.var/app/$APP_ID"
    
    if [ -d "$app_data_dir" ]; then
        # 显示将要删除的数据大小
        local data_size=$(du -sh "$app_data_dir" 2>/dev/null | cut -f1 || echo "未知")
        log "删除应用程序数据目录 ($data_size): $app_data_dir"
        
        rm -rf "$app_data_dir"
        success "应用程序数据已清理"
    else
        log "未找到应用程序数据目录"
    fi
}

# 清理桌面快捷方式
cleanup_desktop_shortcut() {
    log "清理桌面快捷方式..."
    
    local desktop_shortcut="$HOME/Desktop/$APP_ID.desktop"
    
    if [ -f "$desktop_shortcut" ]; then
        rm -f "$desktop_shortcut"
        success "桌面快捷方式已删除"
    else
        log "未找到桌面快捷方式"
    fi
}

# 清理未使用的运行时
cleanup_unused_runtimes() {
    if [ "$REMOVE_RUNTIMES" != "1" ]; then
        return 0
    fi
    
    log "清理未使用的运行时..."
    
    local runtimes=(
        "org.freedesktop.Platform//23.08"
        "org.freedesktop.Sdk//23.08"
        "org.freedesktop.Sdk.Extension.node18//23.08"
        "org.electronjs.Electron2.BaseApp//23.08"
    )
    
    for runtime in "${runtimes[@]}"; do
        # 检查是否有其他应用程序使用此运行时
        local apps_using_runtime=$(flatpak list --app --columns=runtime | grep -c "$runtime" || echo "0")
        
        if [ "$apps_using_runtime" -eq 0 ]; then
            if flatpak list --runtime | grep -q "$runtime"; then
                log "删除未使用的运行时: $runtime"
                flatpak uninstall --user -y "$runtime" 2>/dev/null || {
                    warning "无法删除运行时: $runtime"
                }
            fi
        else
            log "保留运行时 $runtime (被 $apps_using_runtime 个应用程序使用)"
        fi
    done
    
    success "运行时清理完成"
}

# 清理构建文件
cleanup_build_files() {
    if [ "$REMOVE_BUILD_FILES" != "1" ]; then
        return 0
    fi
    
    log "清理构建文件..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local build_dir="$script_dir/build"
    local repo_dir="$script_dir/repo"
    
    if [ -d "$build_dir" ]; then
        rm -rf "$build_dir"
        success "构建目录已删除: $build_dir"
    fi
    
    if [ -d "$repo_dir" ]; then
        rm -rf "$repo_dir"
        success "仓库目录已删除: $repo_dir"
    fi
    
    # 清理生成的源文件
    if [ -f "$script_dir/generated-sources.json" ]; then
        rm -f "$script_dir/generated-sources.json"
        success "生成的源文件已删除"
    fi
}

# 验证卸载
verify_uninstall() {
    log "验证卸载..."
    
    if flatpak list --app | grep -q "$APP_ID"; then
        error "应用程序仍然存在，卸载可能未完成"
        return 1
    fi
    
    success "应用程序已完全卸载"
}

# 显示卸载完成信息
show_completion_info() {
    echo ""
    success "卸载完成！"
    echo ""
    
    if [ "$REMOVE_DATA" = "1" ]; then
        echo "已删除的内容:"
        echo "  ✓ 应用程序"
        echo "  ✓ 应用程序数据和配置"
        echo "  ✓ 桌面快捷方式"
        
        if [ "$REMOVE_RUNTIMES" = "1" ]; then
            echo "  ✓ 未使用的运行时"
        fi
        
        if [ "$REMOVE_BUILD_FILES" = "1" ]; then
            echo "  ✓ 构建文件"
        fi
    else
        echo "已删除的内容:"
        echo "  ✓ 应用程序"
        echo ""
        echo "保留的内容:"
        echo "  - 应用程序数据和配置 (位于 ~/.var/app/$APP_ID)"
        echo "  - 运行时依赖"
        echo ""
        echo "如需完全清理，请使用: $0 --purge"
    fi
    
    echo ""
    echo "如需重新安装，请运行: ./install.sh"
}

# 显示帮助信息
show_help() {
    cat << EOF
lvory Flatpak 卸载脚本

用法: $0 [选项]

选项:
  -h, --help              显示此帮助信息
  -f, --force             强制卸载，不询问确认
  -d, --remove-data       删除应用程序数据和配置
  -r, --remove-runtimes   删除未使用的运行时
  -b, --remove-build      删除构建文件
  --purge                 完全清理（等同于 -d -r -b）

卸载级别:
  基本卸载（默认）:
    $0
    仅删除应用程序，保留数据和运行时
    
  完全卸载:
    $0 --purge
    删除应用程序、数据、未使用的运行时和构建文件
    
  自定义卸载:
    $0 -d -r
    删除应用程序和数据，清理未使用的运行时

EOF
}

# 主函数
main() {
    log "lvory Flatpak 卸载脚本启动"
    
    check_app_installed
    confirm_uninstall
    stop_running_app
    uninstall_app
    cleanup_desktop_shortcut
    cleanup_app_data
    cleanup_unused_runtimes
    cleanup_build_files
    verify_uninstall
    show_completion_info
}

# 参数解析
FORCE_UNINSTALL=0
REMOVE_DATA=0
REMOVE_RUNTIMES=0
REMOVE_BUILD_FILES=0

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE_UNINSTALL=1
            shift
            ;;
        -d|--remove-data)
            REMOVE_DATA=1
            shift
            ;;
        -r|--remove-runtimes)
            REMOVE_RUNTIMES=1
            shift
            ;;
        -b|--remove-build)
            REMOVE_BUILD_FILES=1
            shift
            ;;
        --purge)
            REMOVE_DATA=1
            REMOVE_RUNTIMES=1
            REMOVE_BUILD_FILES=1
            shift
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
