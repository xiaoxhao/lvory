/**
 * Flatpak 便携模式兼容性补丁
 * 此文件用于在 Flatpak 环境中模拟便携模式的行为
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Flatpak 环境检测
function isFlatpakEnvironment() {
    return process.env.FLATPAK_ID === 'com.lvory.app' || 
           process.env.container === 'flatpak' ||
           fs.existsSync('/.flatpak-info');
}

// 获取 Flatpak 应用数据目录
function getFlatpakDataDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.var', 'app', 'com.lvory.app', 'data', 'lvory');
}

// 获取 Flatpak 配置目录
function getFlatpakConfigDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.var', 'app', 'com.lvory.app', 'config', 'lvory');
}

// 便携模式路径映射
function getPortablePaths() {
    if (!isFlatpakEnvironment()) {
        return null;
    }

    const flatpakDataDir = getFlatpakDataDir();
    const flatpakConfigDir = getFlatpakConfigDir();

    return {
        // 数据目录映射
        dataDir: flatpakDataDir,
        configDir: flatpakConfigDir,
        
        // 核心文件目录
        coresDir: path.join(flatpakDataDir, 'cores'),
        binDir: path.join(flatpakDataDir, 'bin'),
        
        // 日志目录
        logsDir: path.join(flatpakDataDir, 'logs'),
        
        // 配置文件路径
        settingsPath: path.join(flatpakConfigDir, 'settings.json'),
        storePath: path.join(flatpakDataDir, 'store.json'),
        
        // sing-box 相关路径
        singboxConfig: path.join(flatpakConfigDir, 'sing-box.json'),
        singboxBinary: path.join(flatpakDataDir, 'cores', 'sing-box'),
        
        // 便携模式标识
        isPortable: true,
        isFlatpak: true
    };
}

// 创建必要的目录结构
function ensureDirectoryStructure() {
    if (!isFlatpakEnvironment()) {
        return;
    }

    const paths = getPortablePaths();
    const dirsToCreate = [
        paths.dataDir,
        paths.configDir,
        paths.coresDir,
        paths.binDir,
        paths.logsDir
    ];

    dirsToCreate.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[Flatpak] 创建目录: ${dir}`);
            } catch (error) {
                console.error(`[Flatpak] 创建目录失败 ${dir}:`, error.message);
            }
        }
    });
}

// 环境变量设置
function setupEnvironmentVariables() {
    if (!isFlatpakEnvironment()) {
        return;
    }

    const paths = getPortablePaths();
    
    // 设置应用程序可以识别的环境变量
    process.env.LVORY_PORTABLE_MODE = 'true';
    process.env.LVORY_FLATPAK_MODE = 'true';
    process.env.LVORY_DATA_DIR = paths.dataDir;
    process.env.LVORY_CONFIG_DIR = paths.configDir;
    process.env.LVORY_CORES_DIR = paths.coresDir;
    process.env.LVORY_BIN_DIR = paths.binDir;
    process.env.LVORY_LOGS_DIR = paths.logsDir;

    console.log('[Flatpak] 便携模式环境变量已设置');
}

// 路径重写函数
function rewritePaths(originalPaths) {
    if (!isFlatpakEnvironment()) {
        return originalPaths;
    }

    const flatpakPaths = getPortablePaths();
    
    // 重写路径映射
    const pathMappings = {
        // 将原始的便携模式路径映射到 Flatpak 路径
        './data': flatpakPaths.dataDir,
        './cores': flatpakPaths.coresDir,
        './bin': flatpakPaths.binDir,
        './logs': flatpakPaths.logsDir,
        './config': flatpakPaths.configDir,
        
        // 处理绝对路径
        [path.resolve('./data')]: flatpakPaths.dataDir,
        [path.resolve('./cores')]: flatpakPaths.coresDir,
        [path.resolve('./bin')]: flatpakPaths.binDir,
        [path.resolve('./logs')]: flatpakPaths.logsDir,
        [path.resolve('./config')]: flatpakPaths.configDir
    };

    // 应用路径映射
    let rewrittenPaths = { ...originalPaths };
    
    Object.keys(pathMappings).forEach(originalPath => {
        const newPath = pathMappings[originalPath];
        
        // 递归替换所有匹配的路径
        function replaceInObject(obj) {
            if (typeof obj === 'string') {
                return obj.replace(originalPath, newPath);
            } else if (Array.isArray(obj)) {
                return obj.map(replaceInObject);
            } else if (obj && typeof obj === 'object') {
                const result = {};
                Object.keys(obj).forEach(key => {
                    result[key] = replaceInObject(obj[key]);
                });
                return result;
            }
            return obj;
        }
        
        rewrittenPaths = replaceInObject(rewrittenPaths);
    });

    return rewrittenPaths;
}

// 配置文件迁移
function migrateConfigFiles() {
    if (!isFlatpakEnvironment()) {
        return;
    }

    const paths = getPortablePaths();
    
    // 检查是否需要迁移配置文件
    const legacyConfigPaths = [
        './settings.json',
        './store.json',
        './sing-box.json'
    ];

    legacyConfigPaths.forEach(legacyPath => {
        if (fs.existsSync(legacyPath)) {
            const filename = path.basename(legacyPath);
            let targetPath;
            
            if (filename === 'sing-box.json') {
                targetPath = paths.singboxConfig;
            } else if (filename === 'settings.json') {
                targetPath = paths.settingsPath;
            } else if (filename === 'store.json') {
                targetPath = paths.storePath;
            }
            
            if (targetPath && !fs.existsSync(targetPath)) {
                try {
                    fs.copyFileSync(legacyPath, targetPath);
                    console.log(`[Flatpak] 迁移配置文件: ${legacyPath} -> ${targetPath}`);
                } catch (error) {
                    console.error(`[Flatpak] 配置文件迁移失败:`, error.message);
                }
            }
        }
    });
}

// 初始化 Flatpak 便携模式
function initializeFlatpakPortableMode() {
    if (!isFlatpakEnvironment()) {
        console.log('[Flatpak] 非 Flatpak 环境，跳过便携模式初始化');
        return false;
    }

    console.log('[Flatpak] 初始化便携模式兼容性...');
    
    try {
        ensureDirectoryStructure();
        setupEnvironmentVariables();
        migrateConfigFiles();
        
        console.log('[Flatpak] 便携模式初始化完成');
        return true;
    } catch (error) {
        console.error('[Flatpak] 便携模式初始化失败:', error.message);
        return false;
    }
}

// 导出模块
module.exports = {
    isFlatpakEnvironment,
    getFlatpakDataDir,
    getFlatpakConfigDir,
    getPortablePaths,
    rewritePaths,
    initializeFlatpakPortableMode,
    ensureDirectoryStructure,
    setupEnvironmentVariables,
    migrateConfigFiles
};

// 如果直接运行此文件，执行初始化
if (require.main === module) {
    initializeFlatpakPortableMode();
}
