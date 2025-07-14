import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../assets/css/profiles.css';
import { showMessage } from '../utils/messageBox';

const Profiles = () => {
  const { t } = useTranslation();
  const [profileFiles, setProfileFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeProfile, setActiveProfile] = useState('');
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);


  // 获取当前活跃的配置文件
  const getCurrentActiveProfile = async () => {
    try {
      if (window.electron && window.electron.config && window.electron.config.getPath) {
        const configPath = await window.electron.config.getPath();
        if (configPath) {
          const fileName = configPath.split(/[/\\]/).pop();
          console.log('当前配置文件名:', fileName);
          
          if (fileName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i.test(fileName)) {
            console.log('检测到UUID缓存文件:', fileName);
            const filesResult = await window.electron.profiles.getFiles();
            if (filesResult && filesResult.success && Array.isArray(filesResult.files)) {
              const originalFile = filesResult.files.find(file => 
                file.hasCache && file.cacheInfo && file.cacheInfo.fileName === fileName
              );
              if (originalFile) {
                console.log('找到对应的原始文件:', originalFile.name);
                setActiveProfile(originalFile.name);
                return;
              } else {
                console.log('未找到对应的原始文件');
              }
            }
          }
          
          console.log('使用直接文件名作为活跃配置:', fileName);
          setActiveProfile(fileName || '');
        }
      }
    } catch (err) {
      console.error('获取当前配置文件失败:', err);
    }
  };

  // 加载配置文件列表和当前活跃配置
  useEffect(() => {
    loadProfileFiles();
    getCurrentActiveProfile();
    
    if (window.electron && window.electron.profiles && window.electron.profiles.onUpdated) {
      window.electron.profiles.onUpdated((data) => {
        if (data.success) {
          console.log(`配置文件已更新: ${data.fileName}`);
        } else {
          console.error(`更新失败: ${data.fileName}, 错误: ${data.error}`);
        }
      });
    }
    
    if (window.electron && window.electron.profiles && window.electron.profiles.onChanged) {
      window.electron.profiles.onChanged(() => {
        loadProfileFiles();
      });
    }
  }, []);

  const loadProfileFiles = async () => {
    setIsLoading(true);
    if (window.electron && window.electron.profiles && window.electron.profiles.getFiles) {
      try {
        const result = await window.electron.profiles.getFiles();
        if (result && result.success && Array.isArray(result.files)) {
          setProfileFiles(result.files);
          
          await getCurrentActiveProfile();
        } else {
          console.error('获取配置文件格式不正确:', result);
          setProfileFiles([]);
        }
      } catch (error) {
        console.error('加载配置文件列表失败:', error);
        setProfileFiles([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error('profiles.getFiles API不可用');
      setIsLoading(false);
    }
  };



  // 激活配置文件
  const activateProfile = async (fileName) => {
    try {
      const result = await window.electron.profiles.getFiles();
      if (result && result.success && Array.isArray(result.files)) {
        const fileInfo = result.files.find(f => f.name === fileName);
        if (fileInfo && fileInfo.path) {
          const targetFilePath = fileInfo.path;
          
          console.log(`激活配置文件: ${fileName} (${fileInfo.protocol || 'singbox'}), 路径: ${targetFilePath}`);
          
          const setResult = await window.electron.config.setPath(targetFilePath);
          if (setResult && setResult.success) {
            setActiveProfile(fileName);
            if (fileInfo.protocol === 'lvory') {
              showMessage(`${t('profiles.lvoryConfigActivated')}${fileName}`);
            } else {
              showMessage(`${t('profiles.configActivated')}${fileName}`);
            }
          } else {
            console.error('切换配置失败:', setResult ? setResult.error : '未知错误');
            showMessage(`切换配置失败: ${setResult ? setResult.error : '未知错误'}`);
          }
        } else {
          console.error('未找到文件:', fileName);
          showMessage(`未找到文件: ${fileName}`);
        }
      } else {
        console.error('获取文件列表失败');
        showMessage('获取文件列表失败');
      }
    } catch (err) {
      console.error('切换配置文件失败:', err);
      showMessage(`切换配置文件失败: ${err.message || '未知错误'}`);
    }
  };

  // 更新所有配置文件
  const handleUpdateAll = async () => {
    if (isUpdatingAll) {
      return;
    }
    
    setIsUpdatingAll(true);
    
    if (window.electron && window.electron.profiles && window.electron.profiles.updateAll) {
      try {
        const result = await window.electron.profiles.updateAll();
        if (result.success) {
          showMessage(result.message || t('profiles.updateSuccess'));
          loadProfileFiles(); // 刷新列表
        } else {
          showMessage(`${t('profiles.updateFailed')} ${result.error || '未知错误'}`);
        }
      } catch (error) {
        showMessage(`${t('profiles.updateFailed')} ${error.message || '未知错误'}`);
        console.error('批量更新配置文件失败:', error);
      } finally {
        setIsUpdatingAll(false);
      }
    } else {
      showMessage(t('profiles.updateNotAvailable'));
      setIsUpdatingAll(false);
    }
  };

  // 切换下拉菜单
  const toggleDropdown = (index) => {
    if (activeDropdown === index) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(index);
    }
  };

  // 关闭下拉菜单
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // 处理链接
  const handleLink = (fileName) => {
    closeDropdown();
    navigator.clipboard.writeText(fileName).then(() => {
      showMessage(`${t('profiles.copied')}${fileName}`);
    }).catch(err => {
      console.error('复制失败:', err);
      showMessage(t('profiles.failedToCopy'));
    });
  };

  // 处理编辑文件
  const handleEdit = (fileName) => {
    closeDropdown();
    if (window.electron && window.electron.profiles && window.electron.profiles.openInEditor) {
      window.electron.profiles.openInEditor(fileName)
        .catch(error => {
          showMessage(`${t('profiles.editNotAvailable')}: ${error.message || 'Unknown error'}`);
        });
    } else {
      showMessage(t('profiles.editNotAvailable'));
    }
  };

  // 处理更新
  const handleUpdate = (fileName) => {
    closeDropdown();
    
    if (window.electron && window.electron.profiles && window.electron.profiles.update) {
      window.electron.profiles.update(fileName)
        .then(result => {
          if (result.success) {
            showMessage(`${t('profiles.updateSuccess')}${fileName}`);
            loadProfileFiles(); // 刷新列表
          } else {
            showMessage(`${t('profiles.updateFailed')} ${result.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          showMessage(`${t('profiles.updateFailed')} ${error.message || 'Unknown error'}`);
        });
    } else {
      showMessage(t('profiles.updateNotAvailable'));
    }
  };

  // 处理修复文件
  const handleFix = (fileName) => {
    closeDropdown();
    
    if (window.electron && window.electron.fixProfile) {
      window.electron.fixProfile(fileName)
        .then(result => {
          if (result.success) {
            showMessage(`${t('profiles.fixSuccess')}${fileName}`);
            loadProfileFiles(); // 刷新列表
          } else {
            showMessage(`${t('profiles.fixFailed')} ${result.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          showMessage(`${t('profiles.fixFailed')} ${error.message || 'Unknown error'}`);
        });
    } else {
      showMessage(t('profiles.fixNotAvailable'));
    }
  };

  // 渲染表格行内容
  const renderTableRows = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan="5" className="loading-row">
            <div className="loading-spinner"></div>
            <div>{t('profiles.loadingProfiles')}</div>
          </td>
        </tr>
      );
    }

    if (profileFiles.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="empty-row">
            <div className="empty-state">
              <div className="empty-icon"></div>
              <div>{t('profiles.noProfilesFound')}</div>
            </div>
          </td>
        </tr>
      );
    }

    return profileFiles.map((file, index) => (
      <tr key={`profile-${file.name}-${index}`}>
        <td>
          <div
            className={`file-name-cell ${activeProfile === file.name ? 'active-profile' : ''}`}
            onClick={() => activateProfile(file.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateProfile(file.name);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`激活配置文件 ${file.name}`}
          >
            {file.name}

            {/* 状态标识 */}
            {file.status === 'failed' && (
              <span className="status-badge expired">
                {t('profiles.expired')}
              </span>
            )}
            {!file.isComplete && (
              <span className="status-badge incomplete">
                {t('profiles.incomplete')}
              </span>
            )}
            {file.hasCache && (
              <span className="status-badge cached" title={`缓存文件: ${file.cacheInfo?.fileName}`}>
                {t('profiles.cached')}
              </span>
            )}
            {activeProfile === file.name && <span className="active-label">{t('profiles.active')}</span>}
          </div>
        </td>
        <td className="protocol-column">
          <span className={`protocol-badge ${file.protocol}`}>
            {file.protocol === 'lvory' ? t('profiles.lvoryProtocol') : t('profiles.singboxProtocol')}
          </span>
        </td>
        <td>{file.size || 'Unknown'}</td>
        <td>{file.createDate || 'Unknown'}</td>
        <td className="action-column">
          <div className="dropdown">
            <button
              className="action-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown(index);
              }}
            >
              <span className="action-dots">⋮</span>
            </button>

            {activeDropdown === index && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => handleLink(file.name)}
                >
                  <span className="dropdown-icon link-icon"></span>
                  <span>{t('profiles.copyFileName')}</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleEdit(file.name)}
                >
                  <span className="dropdown-icon edit-icon"></span>
                  <span>{t('profiles.editFile')}</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleUpdate(file.name)}
                >
                  <span className="dropdown-icon refresh-icon"></span>
                  <span>{t('profiles.updateProfile')}</span>
                </button>
                {file.protocol === 'lvory' && (
                  <button
                    className="dropdown-item"
                    onClick={() => handleRefreshLvoryCache(file.name)}
                  >
                    <span className="dropdown-icon refresh-icon"></span>
                    <span>{t('profiles.refreshLvoryCache')}</span>
                  </button>
                )}
                {!file.isComplete && (
                  <button
                    className="dropdown-item"
                    onClick={() => handleFix(file.name)}
                  >
                    <span className="dropdown-icon refresh-icon"></span>
                    <span>{t('profiles.fixProfile')}</span>
                  </button>
                )}
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item delete-item"
                  onClick={() => handleDelete(file.name)}
                >
                  <span className="dropdown-icon delete-icon"></span>
                  <span>{t('profiles.deleteProfile')}</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    ));
  };

  // 处理刷新Lvory缓存
  const handleRefreshLvoryCache = (fileName) => {
    closeDropdown();
    
    if (window.electron && window.electron.profiles && window.electron.profiles.refreshLvorySync) {
      window.electron.profiles.refreshLvorySync()
        .then(result => {
          if (result.success) {
            showMessage(`${t('profiles.refreshLvoryCacheSuccess')}`);
            loadProfileFiles(); // 刷新列表
          } else {
            showMessage(`${t('profiles.refreshLvoryCacheFailed')} ${result.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          showMessage(`${t('profiles.refreshLvoryCacheFailed')} ${error.message || 'Unknown error'}`);
        });
    } else {
      showMessage(t('profiles.refreshLvoryCacheNotAvailable'));
    }
  };

  // 处理删除文件
  const handleDelete = (fileName) => {
    closeDropdown();
    if (confirm(t('profiles.confirmDelete').replace('{fileName}', fileName))) {
      if (window.electron && window.electron.profiles && window.electron.profiles.delete) {
        window.electron.profiles.delete(fileName)
          .then(result => {
            if (result.success) {
              // 从列表中移除
              setProfileFiles(prev => prev.filter(file => file.name !== fileName));
              // 如果删除的是当前活跃的配置文件，清空activeProfile
              if (activeProfile === fileName) {
                setActiveProfile('');
              }
              showMessage(`${t('profiles.deleteSuccess')}${fileName}`);
            } else {
              showMessage(`${t('profiles.deleteFailed')} ${result.error || 'Unknown error'}`);
            }
          })
          .catch(error => {
            showMessage(`${t('profiles.deleteFailed')} ${error.message || 'Unknown error'}`);
          });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown !== null && !event.target.closest('.dropdown-menu') && !event.target.closest('.action-button')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdown]);

  return (
    <div className="profiles-container">
      <div className="profiles-header">
        <h2>{t('profiles.allFiles')}</h2>
        <div style={{ flexGrow: 1 }}></div>
        
        <button 
          className="update-all-button" 
          onClick={handleUpdateAll} 
          disabled={isUpdatingAll}
          style={{
            padding: '6px 12px',
            backgroundColor: isUpdatingAll ? '#cccccc' : '#50b2d0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdatingAll ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '13px',
            transition: 'background-color 0.2s'
          }}
        >
          {isUpdatingAll ? (
            <>
              <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #ffffff', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
              {t('profiles.updating')}
            </>
          ) : (
            <>
              <span style={{ marginRight: '6px' }}>↻</span>
              {t('profiles.updateAll')}
            </>
          )}
        </button>
      </div>

      <div className="profiles-table-container">
        <table className="profiles-table">
          <thead>
            <tr>
              <th>{t('profiles.fileName')}</th>
              <th>{t('profiles.protocol')}</th>
              <th>{t('profiles.size')}</th>
              <th>{t('profiles.createDate')}</th>
              <th>{t('profiles.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows()}
          </tbody>
        </table>
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

export default Profiles; 