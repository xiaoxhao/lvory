export default {
  settings: {
    // 基本设置
    basicSettings: '基本设置',
    configureBasic: '配置程序的基本设置和行为。',
    proxyPort: '代理端口',
    enterProxyPort: '输入代理端口（例如 7890）',
    apiAddress: 'API 地址',
    enterApiAddress: '输入 API 地址（例如 127.0.0.1:9090）',
    apiAddressWarning: '*注意：此值从当前活跃的配置文件中自动读取',
    allowLan: '允许局域网连接',

    autoStart: '开机自启动',
    tunMode: 'TUN 模式支持',
    tunModeDesc: '启用后内核将以管理员权限运行，支持系统级流量接管',
    checkUpdates: '启动时检查更新',
    
    // 系统设置
    systemSettings: '系统设置',
    configureSystem: '配置系统相关设置和偏好',
    animationEffect: '动画效果',
    animationDescription: '启用或禁用界面中的动画效果（例如节点详情中的科幻背景）',
    language: '语言',
    
    // 高级设置
    advancedSettings: '高级设置',
    configureAdvanced: '配置高级设置和功能',
    kernelWatchdog: '内核看门狗',
    kernelWatchdogDesc: '当内核崩溃或停止响应时自动重启',
    usePrivateProtocol: '使用 lvory 私有协议',
    usePrivateProtocolDesc: '使用 lvory 私有协议以实现扩展功能',
    logSettings: '日志设置',
    logRotation: '日志轮转周期（天）',
    extraLogSaving: '额外日志保存',
    
    // SingBox 日志设置
    singboxLogLevel: 'SingBox 日志等级',
    singboxLogOutput: 'SingBox 日志输出文件',
    logOutputPlaceholder: '留空则输出到控制台（如: box.log）',
    logOutputDesc: '指定日志文件路径，留空则输出到控制台',
    singboxLogDisabled: '禁用 SingBox 日志',
    logDisabledDesc: '启用后 SingBox 内核将不输出任何日志',
    singboxLogTimestamp: 'SingBox 日志时间戳',
    logTimestampDesc: '在每行日志前添加时间戳信息',
    
    // 节点设置
    nodesSettings: '节点设置',
    configureNodes: '配置节点监控和管理设置',
    ipDetailsApi: 'IP 详情 API',
    advancedNodeMonitoring: '节点高级监控',
    keepNodeTraffic: '保留节点流量历史数据',
    keepNodeTrafficDesc: '存储节点流量数据最多一个月',
    nodeExitStatus: '节点出口状态监控',
    nodeExitIpPurity: '节点出口 IP 纯净度检查',
    
    // 云连接
    cloudConnection: '多云互联',
    cloudDescription: '当多个客户端使用相同配置时，数据可以保存到云端以进行全局监控和节点优化',
    connectionMode: '互联模式',
    backendAddress: '后端地址',
    enterBackendAddress: '输入后端服务地址',
    
    
    // 关于部分
    about: '关于',
    aboutDescription: 'lvory 应用程序信息及版本详情',
    appVersion: '应用版本',
    coreVersion: '内核版本',
    license: '许可证',
    projectUrl: '项目地址',
    aboutDisclaimer: 'lvory 是一个基于 Sing-Box 内核的通用桌面GUI客户端，旨在提供高性能、灵活且易用的网络代理服务。',
    
    // 按钮
    reset: '重置',
    apply: '应用',
    
    // 通知
    settingsApplied: '设置已成功应用',
    settingsReset: '设置已成功重置',
    
    // 功能状态
    featureUnderDevelopment: '此功能正在开发中',
    downloadCore: '下载内核',
    coreNotInstalled: '内核未安装'
  },
  
  // Profiles页面相关
  profiles: {
    allFiles: '所有文件',
    updateAll: '全部更新',
    updating: '更新中...',
    fileName: '文件名',
    size: '大小',
    createDate: '创建日期',
    protocol: '协议',
    actions: '操作',
    loadingProfiles: '加载配置文件中...',
    noProfilesFound: '未发现配置文件',
    active: '当前使用',
    expired: '已过期',
    incomplete: '不完整',
    cached: '已缓存',
    lvoryProtocol: 'Lvory',
    singboxProtocol: 'SingBox',
    loadLocalFile: '本地文件',
    selectConfigFile: '选择配置文件',
    loadSuccess: '成功载入配置文件: ',
    loadFailed: '载入配置文件失败: ',
    invalidFileType: '不支持的文件类型。请选择 .json 或 .yaml/.yml 文件',
    // 操作菜单
    copyFileName: '复制文件名',
    editFile: '编辑文件',
    updateProfile: '更新配置',
    fixProfile: '修复配置',
    deleteProfile: '删除配置',
    copied: '已复制: ',
    failedToCopy: '复制失败',
    confirmDelete: '确定要删除 {fileName} 吗？',
    deleteSuccess: '成功删除文件: ',
    deleteFailed: '删除失败: ',
    updateSuccess: '成功更新配置文件: ',
    updateFailed: '更新失败: ',
    fixSuccess: '成功修复配置文件: ',
    fixFailed: '修复失败: ',
    editNotAvailable: '编辑功能不可用',
    updateNotAvailable: '更新API不可用，请检查应用是否需要更新',
    fixNotAvailable: '修复API不可用，请检查应用是否需要更新',
    configActivated: '配置文件已切换: ',
    lvoryConfigActivated: 'Lvory配置已激活并解析为SingBox: ',
    refreshLvoryCache: '刷新缓存',
    refreshLvoryCacheSuccess: 'Lvory缓存已刷新',
    refreshLvoryCacheFailed: 'Lvory缓存刷新失败:',
    refreshLvoryCacheNotAvailable: '刷新缓存功能不可用'
  },

  // 配置文件下载对话框相关
  profileModal: {
    title: '添加配置文件',
    // 协议选择
    protocolSelection: '协议类型',
    singboxProtocol: 'SingBox 原生',
    singboxDescription: 'SingBox 标准配置格式，支持完整的代理功能和路由规则',
    lvoryProtocol: 'Lvory 协议',
    lvoryDescription: 'Lvory 智能同步协议，支持多源配置合并和自动更新',
    // 输入字段
    enterUrl: '输入要下载配置文件的URL：',
    urlPlaceholder: 'https://example.com/profile.config',
    customFileName: '自定义文件名（可选）：',
    fileNamePlaceholder: 'my_profile.config',
    // 更新设置
    autoUpdateInterval: '自动更新间隔：',
    noAutoUpdate: '不自动更新',
    interval12h: '12小时',
    interval24h: '24小时', 
    interval72h: '72小时',
    interval7d: '7天',
    interval21d: '21天',

    // 按钮
    cancel: '取消',
    download: '下载',
    tryAgain: '重试',
    // 状态信息
    downloading: '正在下载配置文件...',
    downloadSuccess: '配置文件下载成功！',
    successTitle: '下载完成',

    autoUpdateSet: '自动更新已设置为每 {interval} 一次',
    downloadFailed: '下载失败，请重试。',
    showErrorDetails: '显示错误详情',
    hideErrorDetails: '隐藏错误详情',
    // 验证信息
    pleaseEnterUrl: '请输入URL',
    invalidUrlFormat: 'URL格式无效，请输入有效的URL，包括 http:// 或 https://',
    // 时间单位转换
    hours: '小时',
    days: '天'
  },
  
  // 更新相关
  update: {
    newVersionAvailable: '发现新版本',
    newVersionMessage: '有新版本的 lvory 可供下载，建议更新以获得最新功能和修复',
    currentVersion: '当前版本',
    newVersion: '新版本',
    viewUpdate: '查看更新',
    later: '稍后提醒',
    downloading: '正在下载...',
    downloadComplete: '下载完成',
    downloadFailed: '下载失败',
    developmentBuild: '开发版本',
    developmentMessage: '当前运行的是开发版本，可能包含不稳定功能。前往 GitHub 仓库获取正式发布版',
    gotIt: '我知道了',
    version: '版本',
    development: '开发版',
    releaseNotes: '更新说明',
    information: '提示信息',
    skipVersion: '跳过此版本',
    remindLater: '下次提醒',
    versionManager: '版本管理',
    allVersions: '所有版本',
    stableVersions: '正式版',
    nightlyVersions: '夜间构建',
    prereleaseVersions: '预发布版',
    loading: '加载中...',
    refresh: '刷新',

    publishedAt: '发布时间',
    viewDetails: '查看详情',
    downloadFiles: '下载文件',
    currentVersionLabel: '当前版本',
    noVersionsFound: '没有找到匹配的版本'
  },
  
  // 活动页面相关
  activity: {
    retryConnection: '重试连接',
    retrying: '重试中',
    clearLogs: '清除日志',
    autoScrolling: '自动滚动',
    keepOldConnections: '保留历史',
    realTimeLogs: '实时日志',
    connectionStatus: '连接状态',
    searchConnections: '搜索连接...',
    searchLogs: '搜索日志...',
    connectionHelp: '疑惑解答'
  }
}; 