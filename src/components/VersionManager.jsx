import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const VersionManager = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState('');
  const [filter, setFilter] = useState('all'); // all, stable, nightly, prerelease

  useEffect(() => {
    if (isVisible) {
      loadVersions();
      getCurrentVersion();
    }
  }, [isVisible]);

  const getCurrentVersion = async () => {
    try {
      if (window.electron && window.electron.invoke) {
        const version = await window.electron.invoke('get-app-version');
        setCurrentVersion(version || '0.1.7');
      }
    } catch (error) {
      console.error('获取当前版本失败:', error);
    }
  };

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
          if (window.electron && window.electron.version && window.electron.version.getAll) {
      const result = await window.electron.version.getAll();
        if (result.success) {
          setReleases(result.releases);
        } else {
          setError(result.error || '获取版本信息失败');
        }
      } else {
        setError('API不可用');
      }
    } catch (error) {
      console.error('加载版本信息失败:', error);
      setError(error.message || '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (asset) => {
    if (window.electron && window.electron.openExternal) {
      window.electron.openExternal(asset.browser_download_url);
    } else {
      window.open(asset.browser_download_url, '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVersionTypeDisplay = (type) => {
    const typeMap = {
      stable: '正式版',
      nightly: '夜间构建',
      prerelease: '预发布版'
    };
    return typeMap[type] || type;
  };

  const getVersionTypeBadgeColor = (type) => {
    const colorMap = {
      stable: '#10b981',
      nightly: '#f59e0b',
      prerelease: '#8b5cf6'
    };
    return colorMap[type] || '#6b7280';
  };

  const isCurrentVersion = (release) => {
    return release.version === currentVersion || 
           release.tag_name === `v${currentVersion}`;
  };

  const filteredReleases = releases.filter(release => {
    if (filter === 'all') return true;
    return release.type === filter;
  });

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(90, 108, 87, 0.15)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#f8faf9',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '1000px',
        height: '80%',
        maxHeight: '800px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(90, 108, 87, 0.2)',
        overflow: 'hidden',
        border: '1px solid rgba(90, 108, 87, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(90, 108, 87, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(246, 247, 237, 0.5)'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: '600',
              color: '#1e293b',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}>
              版本管理
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#5a6c57',
              fontWeight: '400'
            }}>
              查看所有可用版本并下载安装包
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(90, 108, 87, 0.1)',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#5a6c57',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(90, 108, 87, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(90, 108, 87, 0.1)'}
          >
            ×
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(90, 108, 87, 0.15)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.5)'
        }}>
          <span style={{ fontSize: '14px', color: '#5a6c57', fontWeight: '600' }}>筛选:</span>
          {[
            { key: 'all', label: '全部' },
            { key: 'stable', label: '正式版' },
            { key: 'nightly', label: '夜间构建' },
            { key: 'prerelease', label: '预发布版' }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(90, 108, 87, 0.2)',
                backgroundColor: filter === item.key ? '#5a6c57' : 'rgba(255, 255, 255, 0.8)',
                color: filter === item.key ? '#ffffff' : '#5a6c57',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (filter !== item.key) {
                  e.target.style.backgroundColor = 'rgba(90, 108, 87, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== item.key) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                }
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={loadVersions}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(90, 108, 87, 0.2)',
              backgroundColor: 'rgba(246, 247, 237, 0.8)',
              color: '#5a6c57',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(90, 108, 87, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(246, 247, 237, 0.8)';
              }
            }}
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px',
          backgroundColor: '#f8faf9'
        }}>
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(90, 108, 87, 0.2)',
                borderTopColor: '#5a6c57',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ color: '#5a6c57', fontWeight: '500' }}>正在加载版本信息...</span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              color: '#b91c1c',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>加载失败</p>
              <p style={{ margin: '8px 0 16px 0', fontSize: '14px', color: '#dc2626' }}>{error}</p>
              <button
                onClick={loadVersions}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && filteredReleases.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 40px',
              color: '#64748b',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '12px',
              border: '1px solid rgba(90, 108, 87, 0.1)'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.5
              }}>📦</div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>没有找到匹配的版本</p>
            </div>
          )}

          {!loading && !error && filteredReleases.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredReleases.map(release => (
                <div
                  key={release.id}
                  style={{
                    border: isCurrentVersion(release) ? '2px solid #5a6c57' : '1px solid rgba(90, 108, 87, 0.15)',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: isCurrentVersion(release) ? 'rgba(90, 108, 87, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentVersion(release)) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(90, 108, 87, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentVersion(release)) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1e293b',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                        }}>
                          {release.name}
                        </h3>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: getVersionTypeBadgeColor(release.type),
                          color: 'white'
                        }}>
                          {getVersionTypeDisplay(release.type)}
                        </span>
                        {isCurrentVersion(release) && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: '#5a6c57',
                            color: 'white'
                          }}>
                            当前版本
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#64748b',
                        fontWeight: '400'
                      }}>
                        发布时间: {formatDate(release.published_at)}
                      </p>
                    </div>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.electron && window.electron.openExternal) {
                          window.electron.openExternal(release.html_url);
                        }
                      }}
                      style={{
                        color: '#5a6c57',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#4a5c4f'}
                      onMouseLeave={(e) => e.target.style.color = '#5a6c57'}
                    >
                      查看详情 →
                    </a>
                  </div>

                  {release.body && (
                    <div style={{
                      backgroundColor: 'rgba(246, 247, 237, 0.5)',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid rgba(90, 108, 87, 0.15)'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#475569',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontWeight: '400'
                      }}>
                        {release.body.length > 300 ? 
                          release.body.substring(0, 300) + '...' : 
                          release.body
                        }
                      </p>
                    </div>
                  )}

                  {release.assets && release.assets.length > 0 && (
                    <div>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#1e293b',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                      }}>
                        下载文件:
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {release.assets.map(asset => (
                          <div
                            key={asset.name}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '8px',
                              border: '1px solid rgba(90, 108, 87, 0.15)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                              e.currentTarget.style.borderColor = 'rgba(90, 108, 87, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                              e.currentTarget.style.borderColor = 'rgba(90, 108, 87, 0.15)';
                            }}
                          >
                            <div>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#1e293b'
                              }}>
                                {asset.name}
                              </span>
                              <span style={{
                                 marginLeft: '12px',
                                 fontSize: '12px',
                                 color: '#64748b'
                               }}>
                                 {formatFileSize(asset.size)}
                               </span>
                            </div>
                            <button
                              onClick={() => handleDownload(asset)}
                              style={{
                                padding: '6px 16px',
                                backgroundColor: '#5a6c57',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#4a5c4f'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#5a6c57'}
                            >
                              下载
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VersionManager; 