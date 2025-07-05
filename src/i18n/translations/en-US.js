export default {
  settings: {
    // Basic settings
    basicSettings: 'Basic Settings',
    configureBasic: 'Configure basic program settings and behavior.',
    proxyPort: 'Proxy Port',
    enterProxyPort: 'Enter proxy port (e.g. 7890)',
    apiAddress: 'API Address',
    enterApiAddress: 'Enter API address (e.g. 127.0.0.1:9090)',
    apiAddressWarning: '*Note: This value is automatically read from the active configuration file',
    allowLan: 'Allow LAN Connections',

    autoStart: 'Auto Start on Boot',
    tunMode: 'TUN Mode Support',
    tunModeDesc: 'When enabled, kernel will run with administrator privileges for system-level traffic takeover',
    checkUpdates: 'Check for Updates on Startup',
    
    // System settings
    systemSettings: 'System Settings',
    configureSystem: 'Configure system-related settings and preferences',
    animationEffect: 'Animation effect',
    animationDescription: 'Enable or disable animation effects in the interface (e.g. sci-fi background in node details)',
    language: 'Language',
    
    // Advanced settings
    advancedSettings: 'Advanced Settings',
    configureAdvanced: 'Configure advanced settings and features',
    kernelWatchdog: 'Kernel Watchdog',
    kernelWatchdogDesc: 'Automatically restart the core if it crashes or stops responding',
    foregroundOnly: 'Foreground Only',
    foregroundOnlyDesc: 'When enabled, closing the window will exit the program instead of hiding to tray',
    logSettings: 'Log Settings',
    logRotation: 'Log Rotation Period (Days)',
    
    // SingBox log settings
    singboxLogLevel: 'SingBox Log Level',
    singboxLogOutput: 'SingBox Log Output File',
    logOutputPlaceholder: 'Leave empty for console output (e.g. box.log)',
    logOutputDesc: 'Specify log file path, leave empty for console output',
    singboxLogDisabled: 'Disable SingBox Logs',
    
    // Nodes settings
    nodesSettings: 'Nodes Settings',
    configureNodes: 'Configure node monitoring and management settings',
    ipDetailsApi: 'IP Details API',
    advancedNodeMonitoring: 'Advanced Node Monitoring',
    keepNodeTraffic: 'Keep Node Traffic History',
    keepNodeTrafficDesc: 'Store node traffic data for up to one month',
    nodeExitStatus: 'Node Exit Status Monitoring',
    nodeExitIpPurity: 'Node Exit IP Purity Check',
    
    // Cloud connection
    cloudConnection: 'Cloud Connection',
    cloudDescription: 'When multiple clients use the same configuration, data can be saved to the cloud for global monitoring and node optimization',
    connectionMode: 'Connection Mode',
    backendAddress: 'Backend Address',
    enterBackendAddress: 'Enter backend service address',
    
    
    // About section
    about: 'About',
    aboutDescription: 'lvory application information and version details',
    appVersion: 'App Version',
    coreVersion: 'Core Version',
    license: 'License',
    projectUrl: 'Project URL',
    aboutDisclaimer: 'lvory is a universal desktop GUI client based on the Sing-Box core, designed to provide high-performance, flexible and user-friendly network proxy services.',
    
    // Developer Tools
    developerTools: 'Developer Tools',
    developerToolsDesc: 'Development and debugging related tools and features',
    versionManager: 'Version Manager',
    versionManagerDesc: 'Manage application and core versions',
    clearCache: 'Reset Cache',
    clearCacheDesc: 'Clear all application cache data, log files and temporary files',
    clearCacheConfirm: 'Are you sure you want to clear all cache data? This will delete log files, application data storage and configuration cache.',
    clearCacheSuccess: 'Cache cleared successfully',
    clearCacheFailed: 'Failed to clear cache',
    clearing: 'Clearing...',
    
    // Buttons
    reset: 'Reset',
    apply: 'Apply',
    
    // Notifications
    settingsApplied: 'Settings applied successfully',
    settingsReset: 'Settings reset successfully',

    // Status and tooltips
    featureUnderDevelopment: 'Feature under development',
    downloadCore: 'Download Core',
    coreNotInstalled: 'Core Not Installed'
  },
  
  // Profiles page related
  profiles: {
    allFiles: 'All Files',
    updateAll: 'Update All',
    updating: 'Updating...',
    fileName: 'File Name',
    size: 'Size',
    createDate: 'Create Date',
    protocol: 'Protocol',
    actions: 'Actions',
    loadingProfiles: 'Loading profiles...',
    noProfilesFound: 'No profiles found',
    active: 'ACTIVE',
    expired: 'Expired',
    incomplete: 'INCOMPLETE',
    cached: 'CACHED',
    lvoryProtocol: 'Lvory',
    singboxProtocol: 'SingBox',
    loadLocalFile: 'Load Local File',
    selectConfigFile: 'Select Config File',
    loadSuccess: 'Successfully loaded config file: ',
    loadFailed: 'Failed to load config file: ',
    invalidFileType: 'Unsupported file type. Please select .json or .yaml/.yml files',
    // Action menu
    copyFileName: 'Copy Filename',
    editFile: 'Edit File',
    updateProfile: 'Update Profile',
    fixProfile: 'Fix Profile',
    deleteProfile: 'Delete Profile',
    copied: 'Copied: ',
    failedToCopy: 'Failed to copy',
    confirmDelete: 'Are you sure you want to delete {fileName}?',
    deleteSuccess: 'Successfully deleted file: ',
    deleteFailed: 'Delete failed: ',
    updateSuccess: 'Successfully updated profile: ',
    updateFailed: 'Update failed: ',
    fixSuccess: 'Successfully fixed profile: ',
    fixFailed: 'Fix failed: ',
    editNotAvailable: 'Edit function not available',
    updateNotAvailable: 'Update API not available, please check if the application needs an update',
    fixNotAvailable: 'Fix API not available, please check if the application needs an update',
    configActivated: 'Configuration file switched: ',
    lvoryConfigActivated: 'Lvory config activated and parsed to SingBox: ',
    refreshLvoryCache: 'Refresh Cache',
    refreshLvoryCacheSuccess: 'Lvory cache refreshed successfully',
    refreshLvoryCacheFailed: 'Failed to refresh Lvory cache:',
    refreshLvoryCacheNotAvailable: 'Refresh cache feature not available'
  },

  // Profile download modal related
  profileModal: {
    downloadTitle: 'Download Profile',
    loadTitle: 'Load Local Profile',
    // Mode selection
    downloadMode: 'Download',
    localMode: 'Local File',
    // Protocol selection
    protocolSelection: 'Protocol Type',
    singboxProtocol: 'SingBox Native',
    singboxDescription: 'Standard SingBox configuration format with full proxy features and routing rules',
    lvoryProtocol: 'Lvory Protocol',
    lvoryDescription: 'Lvory smart sync protocol with multi-source configuration merging and auto-updates',
    // Input fields
    enterUrl: 'Enter URL to download profile:',
    urlPlaceholder: 'https://example.com/profile.config',
    customFileName: 'Custom filename (optional):',
    fileNamePlaceholder: 'my_profile.config',
    // Local file selection
    selectFile: 'Select Local File:',
    chooseFile: 'Choose File',
    // Update settings
    autoUpdateInterval: 'Auto Update Interval:',
    noAutoUpdate: 'No Auto Update',
    interval12h: '12 Hours',
    interval24h: '24 Hours',
    interval72h: '72 Hours',
    interval7d: '7 Days',
    interval21d: '21 Days',

    // Buttons
    cancel: 'Cancel',
    download: 'Download',
    loadFile: 'Load File',
    tryAgain: 'Try Again',
    // Status messages
    downloading: 'Downloading profile...',
    loadingFile: 'Loading file...',
    downloadSuccess: 'Profile successfully downloaded!',
    loadSuccess: 'File successfully loaded!',
    successTitle: 'Complete',

    autoUpdateSet: 'Auto update set to every {interval}',
    downloadFailed: 'Download failed. Please try again.',
    loadFailed: 'Load failed. Please try again.',
    showErrorDetails: 'Show Error Details',
    hideErrorDetails: 'Hide Error Details',
    // Validation messages
    pleaseEnterUrl: 'Please enter a URL',
    pleaseSelectFile: 'Please select a file',
    invalidFileType: 'Unsupported file type. Please select .json, .yaml, or .yml files',
    invalidUrlFormat: 'Invalid URL format. Please enter a valid URL, including http:// or https://',
    // Time unit conversion
    hours: 'hours',
    days: 'days'
  },
  
  // Tools page related
  tools: {
    networkTools: 'Network Tools',
    toolsDescription: 'Network diagnostic and visualization tools',
    selectTool: 'Select Tool',
    traceroute: 'Traceroute',
    tracerouteDescription: 'Visual network path tracing',
    targetHost: 'Target Host',
    targetPlaceholder: 'Enter domain or IP address',
    startTrace: 'Start Trace',
    stopTrace: 'Stop Trace',
    tracing: 'Tracing...',
    routeInfo: 'Route Hop Information',
    hopCount: 'hops',
    networkTracerouteVisualization: 'Network Traceroute Visualization',
    source: 'Source',
    destination: 'Destination',
    hop: 'Hop',
    routeConnection: 'Route Connection',
    from: 'From',
    to: 'To',
    latency: 'Latency',
    location: 'Location',
    rtt: 'RTT',
    viewMap: 'View Map',
    backToTable: 'Back to Table'
  },

  // Update Related
  update: {
    newVersionAvailable: 'New Version Available',
    newVersionMessage: 'A new version of lvory is available. We recommend updating to get the latest features and fixes.',
    currentVersion: 'Current Version',
    newVersion: 'New Version',
    viewUpdate: 'View Update',
    later: 'Remind Me Later',
    downloading: 'Downloading...',
    downloadComplete: 'Download Complete',
    downloadFailed: 'Download Failed',
    developmentBuild: 'Development Build',
    developmentMessage: 'You are running a development build which may contain unstable features. Visit the GitHub repository for stable releases.',
    gotIt: 'Got It',
    version: 'Version',
    development: 'dev',
    releaseNotes: 'Release Notes',
    information: 'Information',
    skipVersion: 'Skip This Version',
    remindLater: 'Remind Later',
    versionManager: 'Version Manager',
    allVersions: 'All Versions',
    stableVersions: 'Stable',
    nightlyVersions: 'Nightly',
    prereleaseVersions: 'Prerelease',
    loading: 'Loading...',
    refresh: 'Refresh',

    publishedAt: 'Published',
    viewDetails: 'View Details',
    downloadFiles: 'Download Files',
    currentVersionLabel: 'Current Version',
    noVersionsFound: 'No matching versions found'
  },
  
  // Activity page related
  activity: {
    retryConnection: 'Retry Connection',
    retrying: 'Retrying',
    clearLogs: 'Clear Logs',
    autoScrolling: 'Auto-Scrolling',
    keepOldConnections: 'Keep History',
    realTimeLogs: 'Real-time Logs',
    connectionStatus: 'Connection Status',
    searchConnections: 'search connections...',
    searchLogs: 'search logs...',
    connectionHelp: 'Connection Help'
  }
}; 