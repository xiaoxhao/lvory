import React, { useState, useEffect } from 'react';
import '../assets/css/profiles.css';
import { showMessage } from '../utils/messageBox';

const Profiles = () => {
  const [profileFiles, setProfileFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeProfile, setActiveProfile] = useState('');
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // 加载配置文件列表和当前活跃配置
  useEffect(() => {
    loadProfileFiles();
    
    // 获取当前活跃的配置文件
    if (window.electron && window.electron.getConfigPath) {
      window.electron.getConfigPath().then(configPath => {
        if (configPath) {
          // 从路径中提取文件名
          const fileName = configPath.split(/[/\\]/).pop();
          setActiveProfile(fileName || '');
        }
      }).catch(err => {
        console.error('获取当前配置文件失败:', err);
      });
    }
    
    // 监听配置文件更新事件
    if (window.electron && window.electron.onProfileUpdated) {
      window.electron.onProfileUpdated((data) => {
        if (data.success) {
          console.log(`配置文件已更新: ${data.fileName}`);
        } else {
          console.error(`更新失败: ${data.fileName}, 错误: ${data.error}`);
        }
      });
    }
    
    // 监听配置文件变更事件
    if (window.electron && window.electron.onProfilesChanged) {
      window.electron.onProfilesChanged(() => {
        loadProfileFiles();
      });
    }
  }, []);

  const loadProfileFiles = async () => {
    setIsLoading(true);
    if (window.electron && window.electron.getProfileFiles) {
      try {
        const result = await window.electron.getProfileFiles();
        if (result && result.success && Array.isArray(result.files)) {
          setProfileFiles(result.files);
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
      console.error('getProfileFiles API不可用');
      setIsLoading(false);
    }
  };

  // 激活配置文件
  const activateProfile = async (fileName) => {
    try {
      // 从文件列表中查找完整路径
      const result = await window.electron.getProfileFiles();
      if (result && result.success && Array.isArray(result.files)) {
        const fileInfo = result.files.find(f => f.name === fileName);
        if (fileInfo && fileInfo.path) {
          // 使用setConfigPath设置为当前活跃配置
          const setResult = await window.electron.setConfigPath(fileInfo.path);
          if (setResult && setResult.success) {
            setActiveProfile(fileName);
            // 成功切换配置，移除成功通知
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
    
    if (window.electron && window.electron.updateAllProfiles) {
      try {
        const result = await window.electron.updateAllProfiles();
        if (result.success) {
          showMessage(result.message || '所有配置文件已更新');
          loadProfileFiles(); // 刷新列表
        } else {
          showMessage(`更新失败: ${result.error || '未知错误'}`);
        }
      } catch (error) {
        showMessage(`更新错误: ${error.message || '未知错误'}`);
        console.error('批量更新配置文件失败:', error);
      } finally {
        setIsUpdatingAll(false);
      }
    } else {
      showMessage('更新API不可用');
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
      showMessage(`Copied filename: ${fileName}`);
    }).catch(err => {
      console.error('复制失败:', err);
      showMessage('Failed to copy filename');
    });
  };

  // 处理导出文件
  const handleExport = (fileName) => {
    closeDropdown();
    if (window.electron && window.electron.exportProfile) {
      window.electron.exportProfile(fileName)
        .then(result => {
          if (result.success) {
            showMessage(`Successfully exported file: ${fileName}`);
          } else {
            showMessage(`Export failed: ${result.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          showMessage(`Export error: ${error.message || 'Unknown error'}`);
        });
    }
  };

  // 处理重命名文件
  const handleRename = (oldName) => {
    closeDropdown();
    const newName = prompt('Enter new filename:', oldName);
    if (newName && newName !== oldName) {
      if (window.electron && window.electron.renameProfile) {
        window.electron.renameProfile({ oldName, newName })
          .then(result => {
            if (result.success) {
              // 更新文件列表
              setProfileFiles(prev => 
                prev.map(file => file.name === oldName ? { ...file, name: newName } : file)
              );
              // 如果重命名的是当前活跃的配置文件，更新activeProfile
              if (activeProfile === oldName) {
                setActiveProfile(newName);
              }
              showMessage(`Successfully renamed file: ${oldName} to ${newName}`);
            } else {
              showMessage(`Rename failed: ${result.error || 'Unknown error'}`);
            }
          })
          .catch(error => {
            showMessage(`Rename error: ${error.message || 'Unknown error'}`);
          });
      }
    }
  };

  // 处理编辑文件
  const handleEdit = (fileName) => {
    closeDropdown();
    if (window.electron && window.electron.openFileInEditor) {
      window.electron.openFileInEditor(fileName)
        .catch(error => {
          showMessage(`Failed to open editor: ${error.message || 'Unknown error'}`);
        });
    } else {
      showMessage('Edit function not available');
    }
  };

  // 处理更新
  const handleUpdate = (fileName) => {
    closeDropdown();
    
    if (window.electron && window.electron.updateProfile) {
      window.electron.updateProfile(fileName)
        .then(result => {
          if (result.success) {
            showMessage(`成功更新配置文件: ${fileName}`);
            loadProfileFiles(); // 刷新列表
          } else {
            showMessage(`更新失败: ${result.error || '未知错误'}`);
          }
        })
        .catch(error => {
          showMessage(`更新错误: ${error.message || '未知错误'}`);
        });
    } else {
      showMessage('更新API不可用，请检查应用是否需要升级');
    }
  };

  // 处理删除文件
  const handleDelete = (fileName) => {
    closeDropdown();
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      if (window.electron && window.electron.deleteProfile) {
        window.electron.deleteProfile(fileName)
          .then(result => {
            if (result.success) {
              // 从列表中移除
              setProfileFiles(prev => prev.filter(file => file.name !== fileName));
              // 如果删除的是当前活跃的配置文件，清空activeProfile
              if (activeProfile === fileName) {
                setActiveProfile('');
              }
              showMessage(`Successfully deleted file: ${fileName}`);
            } else {
              showMessage(`Delete failed: ${result.error || 'Unknown error'}`);
            }
          })
          .catch(error => {
            showMessage(`Delete error: ${error.message || 'Unknown error'}`);
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
        <h2>All Files</h2>
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
              Updating...
            </>
          ) : (
            <>
              <span style={{ marginRight: '6px' }}>↻</span>
              Update All
            </>
          )}
        </button>
      </div>

      <div className="profiles-table-container">
        <table className="profiles-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Create Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" className="loading-row">
                  <div className="loading-spinner"></div>
                  <div>Loading profiles...</div>
                </td>
              </tr>
            ) : profileFiles.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-row">
                  <div className="empty-state">
                    <div className="empty-icon"></div>
                    <div>NO PROFILES FOUND</div>
                  </div>
                </td>
              </tr>
            ) : (
              profileFiles.map((file, index) => (
                <tr key={index}>
                  <td>
                    <div 
                      className={`file-name-cell ${activeProfile === file.name ? 'active-profile' : ''}`}
                      onClick={() => activateProfile(file.name)}
                    >
                      {file.name}
                      {file.status === 'failed' && (
                        <span style={{ 
                          display: 'inline-block',
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          backgroundColor: '#ffebee',
                          color: '#e53935',
                          borderRadius: '3px',
                          fontWeight: 'normal'
                        }}>
                          已失效
                        </span>
                      )}
                      {activeProfile === file.name && <span className="active-label">ACTIVE</span>}
                    </div>
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
                            <span>Link</span>
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleRename(file.name)}
                          >
                            <span className="dropdown-icon rename-icon"></span>
                            <span>Rename</span>
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleEdit(file.name)}
                          >
                            <span className="dropdown-icon edit-icon"></span>
                            <span>Edit</span>
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleExport(file.name)}
                          >
                            <span className="dropdown-icon export-icon"></span>
                            <span>Export</span>
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleUpdate(file.name)}
                          >
                            <span className="dropdown-icon refresh-icon"></span>
                            <span>Update</span>
                          </button>
                          <div className="dropdown-divider"></div>
                          <button 
                            className="dropdown-item delete-item"
                            onClick={() => handleDelete(file.name)}
                          >
                            <span className="dropdown-icon delete-icon"></span>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Profiles; 