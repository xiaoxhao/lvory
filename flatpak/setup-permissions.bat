@echo off
REM Windows 批处理文件 - 设置 Flatpak 脚本权限
REM 在 Linux 环境中运行时，这些脚本将自动获得执行权限

echo 设置 Flatpak 脚本权限...
echo.
echo 注意: 此批处理文件仅用于 Windows 环境下的文件管理
echo 在 Linux 环境中，请运行以下命令设置执行权限:
echo.
echo   chmod +x flatpak/*.sh
echo.
echo 或者单独设置每个脚本的权限:
echo   chmod +x flatpak/build.sh
echo   chmod +x flatpak/install.sh
echo   chmod +x flatpak/uninstall.sh
echo   chmod +x flatpak/test.sh
echo   chmod +x flatpak/generate-sources.sh
echo   chmod +x flatpak/download-singbox.sh
echo   chmod +x flatpak/lvory-wrapper.sh
echo.
echo 脚本文件列表:
dir /b flatpak\*.sh
echo.
echo 完成！
pause
