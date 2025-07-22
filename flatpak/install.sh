#!/bin/bash
# lvory Flatpak 安装脚本

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"

# 检查 Flatpak 是否已安装
check_flatpak() {
    if ! command -v flatpak &> /dev/null; then
        error "Flatpak 未安装"
        echo ""
        echo "请先安装 Flatpak:"
        echo "  Ubuntu/Debian: sudo apt install flatpak"
        echo "  Fedora: sudo dnf install flatpak"
        echo "  Arch: sudo pacman -S flatpak"
        echo ""
        echo "安装后请重启系统或重新登录"
        exit 1
    fi
    
    success "Flatpak 已安装"
}

# 检查 Flathub 仓库
check_flathub() {
    if ! flatpak remotes | grep -q flathub; then
        warning "Flathub 仓库未添加，正在添加..."
        flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
        success "Flathub 仓库已添加"
    else
        success "Flathub 仓库已存在"
    fi
}

# 安装运行时依赖
install_runtimes() {
    log "检查并安装运行时依赖..."
    
    local runtimes=(
        "org.freedesktop.Platform//23.08"
        "org.freedesktop.Sdk//23.08"
        "org.freedesktop.Sdk.Extension.node18//23.08"
        "org.electronjs.Electron2.BaseApp//23.08"
    )
    
    for runtime in "${runtimes[@]}"; do
        if ! flatpak list --runtime | grep -q "$runtime"; then
            log "安装运行时: $runtime"
            flatpak install --user -y flathub "$runtime"
        else
            log "运行时已存在: $runtime"
        fi
    done
    
    success "所有运行时依赖已安装"
}

# 从本地仓库安装
install_from_local_repo() {
    if [ ! -d "$REPO_DIR" ]; then
        error "本地仓库不存在: $REPO_DIR"
        echo "请先运行构建脚本创建本地仓库:"
        echo "  ./build.sh -r"
        return 1
    fi
    
    log "从本地仓库安装应用程序..."
    flatpak install --user -y "$REPO_DIR" "$APP_ID"
    success "应用程序已从本地仓库安装"
}

# 从构建目录安装
install_from_build() {
    log "从构建目录安装应用程序..."
    
    if [ ! -f "$SCRIPT_DIR/build.sh" ]; then
        error "未找到构建脚本"
        return 1
    fi
    
    # 运行构建脚本并安装
    bash "$SCRIPT_DIR/build.sh" -i
    success "应用程序已构建并安装"
}

# 验证安装
verify_installation() {
    log "验证安装..."
    
    if ! flatpak list --app | grep -q "$APP_ID"; then
        error "应用程序未正确安装"
        return 1
    fi
    
    # 检查应用程序信息
    local app_info=$(flatpak info "$APP_ID" 2>/dev/null)
    if [ -z "$app_info" ]; then
        error "无法获取应用程序信息"
        return 1
    fi
    
    success "应用程序安装验证成功"
    
    # 显示应用程序信息
    echo ""
    echo "应用程序信息:"
    echo "$app_info"
}

# 创建桌面快捷方式
create_desktop_shortcut() {
    if [ "$CREATE_SHORTCUT" = "1" ]; then
        log "创建桌面快捷方式..."
        
        local desktop_dir="$HOME/Desktop"
        local shortcut_file="$desktop_dir/$APP_ID.desktop"
        
        if [ -d "$desktop_dir" ]; then
            cat > "$shortcut_file" << EOF
[Desktop Entry]
Type=Application
Name=lvory
Icon=$APP_ID
Exec=flatpak run $APP_ID
Terminal=false
Categories=Network;Utility;
EOF
            chmod +x "$shortcut_file"
            success "桌面快捷方式已创建: $shortcut_file"
        else
            warning "桌面目录不存在，跳过创建快捷方式"
        fi
    fi
}

# 显示使用说明
show_usage_info() {
    echo ""
    success "安装完成！"
    echo ""
    echo "使用方法:"
    echo "  启动应用程序:"
    echo "    flatpak run $APP_ID"
    echo ""
    echo "  进入应用程序沙盒:"
    echo "    flatpak run --command=sh $APP_ID"
    echo ""
    echo "  查看应用程序信息:"
    echo "    flatpak info $APP_ID"
    echo ""
    echo "  卸载应用程序:"
    echo "    flatpak uninstall --user $APP_ID"
    echo "    或运行: ./uninstall.sh"
    echo ""
    echo "  更新应用程序:"
    echo "    重新运行此安装脚本"
    echo ""
    
    if [ -f "$HOME/Desktop/$APP_ID.desktop" ]; then
        echo "  桌面快捷方式已创建，您也可以从应用程序菜单启动"
        echo ""
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
lvory Flatpak 安装脚本

用法: $0 [选项]

选项:
  -h, --help              显示此帮助信息
  -l, --local             从本地仓库安装（需要先运行 build.sh -r）
  -b, --build             构建并安装（默认行为）
  -s, --shortcut          创建桌面快捷方式
  -f, --force             强制重新安装
  -u, --user              用户级安装（默认）
  --system                系统级安装

安装方式:
  1. 从本地仓库安装（推荐用于分发）:
     $0 -l
     
  2. 构建并安装（推荐用于开发）:
     $0 -b
     
  3. 默认安装:
     $0

EOF
}

# 主函数
main() {
    log "lvory Flatpak 安装脚本启动"
    
    # 检查是否已安装
    if flatpak list --app | grep -q "$APP_ID"; then
        if [ "$FORCE_INSTALL" != "1" ]; then
            warning "应用程序已安装"
            echo ""
            echo "当前安装的版本:"
            flatpak info "$APP_ID" | grep -E "(ID|Version|Branch)"
            echo ""
            echo "如需重新安装，请使用 -f 参数"
            echo "如需卸载，请运行: ./uninstall.sh"
            exit 0
        else
            log "强制重新安装..."
            flatpak uninstall --user -y "$APP_ID" 2>/dev/null || true
        fi
    fi
    
    # 执行安装流程
    check_flatpak
    check_flathub
    install_runtimes
    
    # 根据安装方式执行不同的安装流程
    if [ "$INSTALL_FROM_LOCAL" = "1" ]; then
        install_from_local_repo
    else
        install_from_build
    fi
    
    verify_installation
    create_desktop_shortcut
    show_usage_info
}

# 参数解析
INSTALL_FROM_LOCAL=0
FORCE_INSTALL=0
CREATE_SHORTCUT=0
USER_INSTALL=1

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--local)
            INSTALL_FROM_LOCAL=1
            shift
            ;;
        -b|--build)
            INSTALL_FROM_LOCAL=0
            shift
            ;;
        -s|--shortcut)
            CREATE_SHORTCUT=1
            shift
            ;;
        -f|--force)
            FORCE_INSTALL=1
            shift
            ;;
        -u|--user)
            USER_INSTALL=1
            shift
            ;;
        --system)
            USER_INSTALL=0
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
