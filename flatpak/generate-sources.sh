#!/bin/bash
# Flatpak Node.js 依赖源生成脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "正在生成 Flatpak Node.js 依赖源文件..."

# 检查是否存在 flatpak-node-generator
if ! command -v flatpak-node-generator &> /dev/null; then
    echo "错误: 未找到 flatpak-node-generator"
    echo "请安装 flatpak-node-generator:"
    echo "  pip3 install flatpak-node-generator"
    echo "  或者从 https://github.com/flatpak/flatpak-builder-tools 获取"
    exit 1
fi

# 检查 package-lock.json 是否存在
if [ ! -f "$PROJECT_ROOT/package-lock.json" ]; then
    echo "错误: 未找到 package-lock.json 文件"
    echo "请先在项目根目录运行 'npm install' 生成 package-lock.json"
    exit 1
fi

# 进入项目根目录
cd "$PROJECT_ROOT"

# 生成 Flatpak 源文件
echo "正在分析 package-lock.json..."
flatpak-node-generator npm package-lock.json

# 移动生成的文件到 flatpak 目录
if [ -f "generated-sources.json" ]; then
    mv generated-sources.json "$SCRIPT_DIR/"
    echo "✓ 已生成 generated-sources.json"
else
    echo "错误: 生成 generated-sources.json 失败"
    exit 1
fi

# 验证生成的文件
if [ -f "$SCRIPT_DIR/generated-sources.json" ]; then
    SOURCE_COUNT=$(jq length "$SCRIPT_DIR/generated-sources.json")
    echo "✓ 成功生成 $SOURCE_COUNT 个 NPM 包源"
    echo "✓ 文件保存在: $SCRIPT_DIR/generated-sources.json"
else
    echo "错误: 生成的源文件验证失败"
    exit 1
fi

echo ""
echo "Node.js 依赖源生成完成！"
echo "现在可以使用以下命令构建 Flatpak 包:"
echo "  cd $SCRIPT_DIR"
echo "  flatpak-builder build com.lvory.app.yml --force-clean --install-deps-from=flathub"
