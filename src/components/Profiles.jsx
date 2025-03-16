import React, { useState, useEffect } from 'react';
import '../assets/css/profiles.css';
import { showMessage } from '../utils/messageBox';

const Profiles = () => {
  const [profileFiles, setProfileFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeProfile, setActiveProfile] = useState('');

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

  // 处理刷新
  const handleRefresh = () => {
    closeDropdown();
    loadProfileFiles();
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
                            onClick={() => handleRefresh()}
                          >
                            <span className="dropdown-icon refresh-icon"></span>
                            <span>Refresh</span>
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
    </div>
  );
};

export default Profiles; 