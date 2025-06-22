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
    tunMode: 'TUN Mode',
    autoStart: 'Auto Start on Boot',
    autoRestart: 'Auto Restart Core',
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
    usePrivateProtocol: 'Use lvory Private Protocol',
    usePrivateProtocolDesc: 'Use lvory private protocol for improved security and performance',
    logSettings: 'Log Settings',
    logRotation: 'Log Rotation Period (Days)',
    extraLogSaving: 'Extra Log Saving',
    
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