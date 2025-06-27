import React, { useState, useEffect } from 'react';

const customStyles = {
  eyeIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease'
  }
};

const ControlPanel = ({ 
  isRunning, 
  onTogglePrivate, 
  onSpeedTest, 
  onToggleSingBox,
  privateMode, 
  isTesting,
  isStarting, 
  isStopping,
  onOpenProfileModal,
  coreExists,
  isDownloadingCore,
  downloadProgress,
  downloadMessage,
  onSwitchToActivity // 添加切换到Activity的回调
}) => {
  const [showProxyConfigModal, setShowProxyConfigModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    powershell: true,
    git: false,
    npm: false,
    curl: false,
    docker: false
  });
  const [copiedState, setCopiedState] = useState({});
  const [proxyPort, setProxyPort] = useState('7890');
  const [proxyAddress, setProxyAddress] = useState('127.0.0.1:7890');
  const [showNetworkAddresses, setShowNetworkAddresses] = useState(false);
  const [networkAddresses, setNetworkAddresses] = useState([
    { label: 'Local Loopback', address: '127.0.0.1:7890' }
  ]);

  // 获取网络接口地址
  useEffect(() => {
    if (window.electron && window.electron.getNetworkInterfaces) {
      window.electron.getNetworkInterfaces().then(interfaces => {
        if (interfaces && interfaces.length > 0) {
          const formattedAddresses = [
            { label: 'Local Loopback', address: `127.0.0.1:${proxyPort}` },
            ...interfaces.map(iface => ({
              label: `${iface.name || 'Unknown'} (${iface.address})`,
              address: `${iface.address}:${proxyPort}`
            }))
          ];
          setNetworkAddresses(formattedAddresses);
        }
      }).catch(err => {
        console.error('Failed to get network interfaces:', err);
      });
    }
  }, [proxyPort]);

  // 复制到剪贴板函数
  const copyToClipboard = (text, id, section) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // 设置复制成功状态
        setCopiedState({
          ...copiedState,
          [`${id}-${section}`]: true
        });
        
        // 3秒后重置复制状态
        setTimeout(() => {
          setCopiedState(prevState => ({
            ...prevState,
            [`${id}-${section}`]: false
          }));
        }, 3000);
      })
      .catch(err => console.error('复制失败:', err));
  };

  // 切换折叠状态
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 获取代码中使用当前选择的代理地址
  const getCodeWithAddress = (codeTemplate) => {
    return codeTemplate.replace(/127\.0\.0\.1:7890/g, proxyAddress);
  };

  // 渲染终端图标
  const renderTerminalIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: showProxyConfigModal ? '#f5f7f9' : 'transparent',
          transition: 'transform 0.2s ease-in-out, background-color 0.2s ease'
        }}
        onClick={() => setShowProxyConfigModal(true)}
        title="View proxy configuration methods"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#f0f4ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = showProxyConfigModal ? '#f5f7f9' : 'transparent';
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </div>
    );
  };

  // 代理配置对话框
  const renderProxyConfigModal = () => {
    if (!showProxyConfigModal) return null;

    const proxyConfigSections = [
      {
        id: 'powershell',
        title: 'PowerShell',
        sections: [
          {
            title: 'Set HTTP Proxy',
            code: `$env:http_proxy="http://${proxyAddress}"
$env:https_proxy="http://${proxyAddress}"`
          },
          {
            title: 'View Current Proxy Settings',
            code: `$env:http_proxy
$env:https_proxy`
          },
          {
            title: 'Remove Proxy Settings',
            code: `$env:http_proxy=""
$env:https_proxy=""`
          }
        ]
      },
      {
        id: 'git',
        title: 'Git',
        sections: [
          {
            title: 'Set HTTP Proxy',
            code: `git config --global http.proxy http://${proxyAddress}
git config --global https.proxy http://${proxyAddress}`
          },
          {
            title: 'View Current Proxy Settings',
            code: `git config --global --get http.proxy
git config --global --get https.proxy`
          },
          {
            title: 'Remove Proxy Settings',
            code: `git config --global --unset http.proxy
git config --global --unset https.proxy`
          }
        ]
      },
      {
        id: 'npm',
        title: 'npm',
        sections: [
          {
            title: 'Set HTTP Proxy',
            code: `npm config set proxy http://${proxyAddress}
npm config set https-proxy http://${proxyAddress}`
          },
          {
            title: 'View Current Proxy Settings',
            code: `npm config get proxy
npm config get https-proxy`
          },
          {
            title: 'Remove Proxy Settings',
            code: `npm config delete proxy
npm config delete https-proxy`
          }
        ]
      },
      {
        id: 'curl',
        title: 'curl',
        sections: [
          {
            title: 'Use Proxy',
            code: `curl -x http://${proxyAddress} https://www.google.com`
          }
        ]
      },
      {
        id: 'docker',
        title: 'Docker',
        sections: [
          {
            title: 'Edit ~/.docker/config.json on Windows',
            code: `{
  "proxies": {
    "default": {
      "httpProxy": "http://${proxyAddress}",
      "httpsProxy": "http://${proxyAddress}",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}`
          }
        ]
      },
      {
        id: 'linux',
        title: 'Linux Environment',
        sections: [
          {
            title: 'GNOME/Ubuntu (gsettings)',
            code: `# Set HTTP Proxy
gsettings set org.gnome.system.proxy.http host "${proxyAddress.split(':')[0]}"
gsettings set org.gnome.system.proxy.http port ${proxyAddress.split(':')[1]}

# Set HTTPS Proxy
gsettings set org.gnome.system.proxy.https host "${proxyAddress.split(':')[0]}"
gsettings set org.gnome.system.proxy.https port ${proxyAddress.split(':')[1]}

# Enable Manual Proxy
gsettings set org.gnome.system.proxy mode 'manual'

# View Current Settings
gsettings get org.gnome.system.proxy mode

# Disable Proxy
gsettings set org.gnome.system.proxy mode 'none'`
          },
          {
            title: 'KDE (kwriteconfig5)',
            code: `# Set HTTP Proxy
kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 1
kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key httpProxy "http://${proxyAddress}"
kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key httpsProxy "http://${proxyAddress}"

# Apply settings
dbus-send --type=signal /KIO/Scheduler org.kde.KIO.Scheduler.reparseSlaveConfiguration string:""

# Disable Proxy
kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 0`
          },
          {
            title: 'Environment Variables',
            code: `# Set for current session
export http_proxy=http://${proxyAddress}
export https_proxy=http://${proxyAddress}
export HTTP_PROXY=http://${proxyAddress}
export HTTPS_PROXY=http://${proxyAddress}
export no_proxy=localhost,127.0.0.1,::1

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export http_proxy=http://${proxyAddress}' >> ~/.bashrc
echo 'export https_proxy=http://${proxyAddress}' >> ~/.bashrc
echo 'export no_proxy=localhost,127.0.0.1,::1' >> ~/.bashrc

# Unset proxy
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy`
          },
          {
            title: 'APT Package Manager',
            code: `# Create proxy config file
sudo bash -c 'cat > /etc/apt/apt.conf.d/95proxies << EOF
Acquire::http::proxy "http://${proxyAddress}";
Acquire::https::proxy "http://${proxyAddress}";
EOF'

# Or add to ~/.aptrc for user-specific
echo 'Acquire::http::proxy "http://${proxyAddress}";' >> ~/.aptrc
echo 'Acquire::https::proxy "http://${proxyAddress}";' >> ~/.aptrc

# Remove proxy settings
sudo rm /etc/apt/apt.conf.d/95proxies`
          }
        ]
      }
    ];

    // 渲染地址选择下拉框
    const renderAddressSelector = () => {
      return (
        <div style={{
          marginBottom: '16px',
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '12px' 
          }}>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>
              Select Proxy Address
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: '8px', fontSize: '14px' }}>Port:</div>
              <input
                type="text"
                value={proxyPort}
                onChange={(e) => {
                  const newPort = e.target.value;
                  setProxyPort(newPort);
                  // 更新当前选中的地址，保持IP不变，只更新端口
                  const currentIp = proxyAddress.split(':')[0];
                  setProxyAddress(`${currentIp}:${newPort}`);
                }}
                style={{
                  width: '60px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowNetworkAddresses(!showNetworkAddresses)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              <span>{proxyAddress}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
                   fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" 
                   strokeLinejoin="round" style={{ 
                     transform: showNetworkAddresses ? 'rotate(180deg)' : 'rotate(0)', 
                     transition: 'transform 0.3s' 
                   }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            {showNetworkAddresses && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 10,
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginTop: '4px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {networkAddresses.map((address, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      setProxyAddress(address.address);
                      setShowNetworkAddresses(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: index < networkAddresses.length - 1 ? '1px solid #eee' : 'none',
                      cursor: 'pointer',
                      backgroundColor: proxyAddress === address.address ? '#f0f4ff' : '#fff',
                      transition: 'background-color 0.2s',
                      hover: {
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                  >
                    {address.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '80%',
          maxWidth: '800px',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            borderBottom: '1px solid #eee',
            paddingBottom: '16px'
          }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '22px', fontWeight: '600' }}>Common Software Proxy Configuration Methods</h2>
            <div 
              onClick={() => setShowProxyConfigModal(false)}
              style={{ 
                cursor: 'pointer', 
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                transition: 'background-color 0.2s',
                hover: {
                  backgroundColor: '#e0e0e0'
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>

          {renderAddressSelector()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {proxyConfigSections.map((config) => (
              <div key={config.id} style={{ 
                border: '1px solid #eee', 
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div 
                  onClick={() => toggleSection(config.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: expandedSections[config.id] ? '1px solid #eee' : 'none'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#444' }}>{config.title}</h3>
                  <div style={{ transform: expandedSections[config.id] ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                
                {expandedSections[config.id] && (
                  <div style={{ padding: '16px' }}>
                    {config.sections.map((section, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: idx < config.sections.length - 1 ? '24px' : 0,
                        backgroundColor: '#fff',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <h4 style={{ 
                            margin: 0, 
                            fontSize: '15px', 
                            fontWeight: '500', 
                            color: '#333',
                            paddingLeft: '4px'
                          }}>
                            {section.title}
                          </h4>
                          <div 
                            className="copy-button"
                            onClick={() => copyToClipboard(section.code, config.id, idx)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: copiedState[`${config.id}-${idx}`] ? '#e1f5e1' : '#f0f0f0',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12px',
                              color: copiedState[`${config.id}-${idx}`] ? '#2e7d32' : '#505a6b',
                              transition: 'all 0.2s'
                            }}
                          >
                            {copiedState[`${config.id}-${idx}`] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            )}
                            {copiedState[`${config.id}-${idx}`] ? 'Copied' : 'Copy'}
                          </div>
                        </div>
                        <pre style={{ 
                          margin: 0,
                          backgroundColor: '#f9f9f9', 
                          padding: '16px', 
                          borderRadius: '4px',
                          overflowX: 'auto',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          <code>{section.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染眼睛图标
  const renderEyeIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: privateMode ? '#f5f7f9' : 'transparent',
          transition: 'transform 0.2s ease-in-out, background-color 0.2s ease'
        }}
        onClick={onTogglePrivate}
        title={privateMode ? "Click to show sensitive information" : "Click to hide sensitive information"}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = privateMode ? '#e9ecf1' : '#f0f4ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = privateMode ? '#f5f7f9' : 'transparent';
        }}
      >
        {privateMode ? (
          // 闭眼图标
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          // 睁眼图标
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </div>
    );
  };
  
  // 修改测速图标函数
  const renderSpeedTestIcon = () => {
    const isDisabled = !isRunning; // 当SingBox未运行时禁用测速按钮
    
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: isTesting ? '#f0f4ff' : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? 'not-allowed' : (isTesting ? 'default' : 'pointer'),
          transition: 'transform 0.2s ease-in-out, background-color 0.2s ease'
        }}
        onClick={isDisabled || isTesting ? null : onSpeedTest}
        title={isDisabled ? "Please start the core to enable speed testing" : "Test node speed"}
        onMouseEnter={(e) => {
          if (!isDisabled && !isTesting) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = '#f0f4ff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && !isTesting) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <svg 
          className={isTesting ? "lightning-spinning" : ""} 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#505a6b" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        {isTesting && <span style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'nowrap'
        }}>Testing...</span>}
      </div>
    );
  };
  
  // 渲染目录图标
  const renderFolderIcon = () => {
    return (
      <div 
        style={{
          ...customStyles.eyeIcon,
          backgroundColor: 'transparent',
          transition: 'transform 0.2s ease-in-out, background-color 0.2s ease'
        }}
        onClick={() => {
          if (window.electron && window.electron.openConfigDir) {
            window.electron.openConfigDir()
              .catch(err => console.error('Failed to open config directory:', err));
          }
        }}
        title="Open configuration directory"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#f0f4ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#505a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
    );
  };

  const renderRunStopButton = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '5px',
        height: '100%',
        width: '100%',
        position: 'relative'
      }}>
        <button
          onClick={onToggleSingBox}
          disabled={isStarting || isStopping}
          onMouseEnter={(e) => {
            if (!isStarting && !isStopping && !isDownloadingCore) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isStarting && !isStopping && !isDownloadingCore) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            }
          }}
          style={{
            backgroundColor: !coreExists ? '#3498db' : (isRunning ? '#e74c3c' : '#2ecc71'),
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 15px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: (isStarting || isStopping || isDownloadingCore) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
            width: '85px',  
            height: '32px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          {isDownloadingCore ? '下载中...' :
           isStarting ? '启动中...' : 
           isStopping ? '停止中...' : 
           !coreExists ? '安装内核' :
           isRunning ? 'STOP' : 'RUN'}
          
          {(isStarting || isStopping) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'loading-shimmer 1.5s infinite',
            }}></div>
          )}
          
          {isDownloadingCore && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${downloadProgress}%`,
              height: '100%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s ease'
            }}></div>
          )}
        </button>
        
        {/* 下载进度提示 */}
        {isDownloadingCore && downloadMessage && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '200px',
            textAlign: 'center',
            zIndex: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {downloadMessage} ({downloadProgress}%)
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="header" style={{
      background: 'transparent',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between'
    }}>
      <div className="search-bar">
        <span className="search-icon"></span>
        <input type="text" placeholder="Search settings..." />
      </div>
      <div className="header-actions" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {renderTerminalIcon()}
          {renderEyeIcon()}
          {renderSpeedTestIcon()}
          {renderFolderIcon()}
          <div className="action-separator" style={{ margin: '0 10px' }}></div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              className="add-customer-btn" 
              onClick={isRunning ? onSwitchToActivity : onOpenProfileModal} 
              style={{ 
                padding: '6px 12px', 
                height: '28px',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              }}
            >
              {!isRunning && <span className="plus-icon"></span>}
              <span>{isRunning ? 'ACTIVITY' : 'PROFILE'}</span>
            </button>
            <div style={{ marginLeft: '10px' }}>
              {renderRunStopButton()}
            </div>
          </div>
        </div>
      </div>

      {renderProxyConfigModal()}

      <style>{`
        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .lightning-spinning {
          animation: lightning-flash 1.2s ease-in-out infinite;
        }
        
        @keyframes lightning-flash {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

      `}</style>
    </div>
  );
};

export default ControlPanel;