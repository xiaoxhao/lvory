/**
 * 内核设置组件
 * 提供内核类型选择和相关配置
 */

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { showMessage } from '../../utils/messageBox';
import SimpleCoreDownloader from './SimpleCoreDownloader';
import './CoreSettings.css';

const CoreSettings = () => {
  const [coreTypes, setCoreTypes] = useState([]);
  const [currentCoreType, setCurrentCoreType] = useState('');
  const [selectedCoreType, setSelectedCoreType] = useState(''); // 用户选择的内核类型
  const [coreConfig, setCoreConfig] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [coreStatusMap, setCoreStatusMap] = useState({}); // 存储各内核的状态信息
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // 加载支持的内核类型
  useEffect(() => {
    loadSupportedCoreTypes();
    loadCurrentCoreType();
    loadCoreConfig();
    loadAllCoreStatus();
  }, []);

  const loadSupportedCoreTypes = async () => {
    try {
      if (window.electron && window.electron.core) {
        const result = await window.electron.core.getSupportedTypes();
        if (result.success) {
          setCoreTypes(result.coreTypes);
        }
      }
    } catch (error) {
      console.error('加载支持的内核类型失败:', error);
    }
  };

  // 加载所有内核的状态信息
  const loadAllCoreStatus = async () => {
    setIsLoadingStatus(true);
    try {
      if (window.electron && window.electron.core) {
        const supportedTypesResult = await window.electron.core.getSupportedTypes();
        if (supportedTypesResult.success) {
          const statusMap = {};

          // 并行检查所有内核类型的安装状态
          const statusPromises = supportedTypesResult.coreTypes.map(async (coreType) => {
            try {
              const installResult = await window.electron.core.checkTypeInstalled(coreType.value);
              statusMap[coreType.value] = {
                installed: installResult.success ? installResult.installed : false,
                version: installResult.version || null,
                path: installResult.path || null,
                error: installResult.error || null
              };
            } catch (error) {
              console.error(`检查 ${coreType.value} 状态失败:`, error);
              statusMap[coreType.value] = {
                installed: false,
                version: null,
                path: null,
                error: error.message
              };
            }
          });

          await Promise.all(statusPromises);
          setCoreStatusMap(statusMap);

          // 更新内核类型列表，添加安装状态信息
          const updatedCoreTypes = supportedTypesResult.coreTypes.map(coreType => ({
            ...coreType,
            installed: statusMap[coreType.value]?.installed || false,
            version: statusMap[coreType.value]?.version || null
          }));
          setCoreTypes(updatedCoreTypes);
        }
      }
    } catch (error) {
      console.error('加载内核状态失败:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadCurrentCoreType = async () => {
    try {
      if (window.electron && window.electron.core) {
        const result = await window.electron.core.getCurrentType();
        if (result.success) {
          setCurrentCoreType(result.coreType);
          setSelectedCoreType(result.coreType); // 同时设置选择的内核类型
        }
      }
    } catch (error) {
      console.error('加载当前内核类型失败:', error);
    }
  };

  const loadCoreConfig = async () => {
    try {
      if (window.electron && window.electron.core) {
        const result = await window.electron.core.getConfigInfo();
        if (result.success) {
          setCoreConfig(result.config);
        }
      }
    } catch (error) {
      console.error('加载内核配置信息失败:', error);
    }
  };

  const handleCoreTypeChange = (newCoreType) => {
    setSelectedCoreType(newCoreType);
  };

  const handleApplyCoreTypeChange = async () => {
    if (selectedCoreType === currentCoreType) {
      return;
    }

    // 直接显示确认对话框，允许切换到未安装的内核
    setShowConfirmDialog(true);
  };

  const confirmCoreTypeSwitch = async () => {
    setShowConfirmDialog(false);
    setIsSwitching(true);

    try {
      if (window.electron && window.electron.core) {
        const result = await window.electron.core.switchType(selectedCoreType);
        if (result.success) {
          setCurrentCoreType(selectedCoreType);
          await loadCoreConfig(); // 重新加载配置信息
          await loadAllCoreStatus(); // 重新加载所有内核状态

          if (result.warning) {
            // 切换成功但有警告（如内核未安装）
            showMessage(`已切换到 ${selectedCoreType} 内核，但内核文件未安装。请在内核管理中下载安装`, 'warning');
          } else {
            showMessage(`成功切换到 ${selectedCoreType} 内核`, 'success');
          }
        } else {
          // 检查是否是内核未安装的错误（兼容旧版本）
          if (result.error && result.error.includes('not installed')) {
            // 内核未安装时，仍然允许切换，但给出提示
            setCurrentCoreType(selectedCoreType);
            await loadCoreConfig(); // 重新加载配置信息
            showMessage(`已切换到 ${selectedCoreType} 内核，但内核文件未安装。请在内核管理中下载安装`, 'warning');
          } else if (result.error && result.error.includes('is not a constructor')) {
            showMessage(`内核初始化失败，请检查内核文件是否完整`, 'error');
            setSelectedCoreType(currentCoreType); // 恢复选择
          } else {
            showMessage(`切换内核失败: ${result.error}`, 'error');
            setSelectedCoreType(currentCoreType); // 恢复选择
          }
        }
      }
    } catch (error) {
      console.error('切换内核类型失败:', error);
      if (error.message && error.message.includes('is not a constructor')) {
        showMessage('内核初始化失败，请检查内核文件是否完整', 'error');
      } else {
        showMessage(`切换内核失败: ${error.message}`, 'error');
      }
      setSelectedCoreType(currentCoreType); // 恢复选择
    } finally {
      setIsSwitching(false);
    }
  };

  const cancelCoreTypeSwitch = () => {
    setShowConfirmDialog(false);
    setSelectedCoreType(currentCoreType); // 恢复选择
  };





  return (
    <div className="core-settings">
      <div className="settings-section">
        <h3 className="section-title">内核设置</h3>

        {/* 内核概览卡片 */}
        <div className="core-overview-card">
          <div className="core-overview-header">
            <div className="core-status-indicator">
              <div className={`status-dot ${currentCoreType ? 'active' : 'inactive'}`}></div>
              <span className="status-text">
                {currentCoreType ? '内核已配置' : '未配置内核'}
              </span>
            </div>
            <div className="core-type-badge">
              {coreTypes.find(t => t.value === currentCoreType)?.label || '未知类型'}
            </div>
          </div>

          {coreConfig && (
            <div className="core-overview-details">
              <div className="detail-item">
                <span className="detail-label">内核名称</span>
                <span className="detail-value">{coreConfig.displayName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">配置格式</span>
                <span className="detail-value">{coreConfig.configFormat.toUpperCase()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">版本信息</span>
                <span className="detail-value">
                  {coreStatusMap[currentCoreType]?.version || coreConfig.version || '未知版本'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">安装状态</span>
                <span className="detail-value">
                  {isLoadingStatus ? '检查中...' :
                   (coreStatusMap[currentCoreType]?.installed ? '已安装' : '未安装')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 内核选择与切换 */}
        <div className="setting-item">
          <label className="setting-label">
            内核类型选择
            <span className="setting-description">
              选择要使用的代理内核类型，不同内核支持不同的功能特性
            </span>
          </label>

          <div className="core-selection-container">
            {/* 内核类型网格 */}
            <div className="core-types-grid">
              {coreTypes.map(coreType => (
                <div
                  key={coreType.value}
                  className={`core-type-card ${selectedCoreType === coreType.value ? 'selected' : ''} ${currentCoreType === coreType.value ? 'current' : ''}`}
                  onClick={() => handleCoreTypeChange(coreType.value)}
                >
                  <div className="core-type-header">
                    <div className="core-type-icon">
                      {coreType.value === 'sing-box' ? (
                        <img
                          src="./resource/icon/kernel/sing-box.webp"
                          alt="Sing-box"
                          className="kernel-logo"
                        />
                      ) : coreType.value === 'mihomo' ? (
                        <img
                          src="./resource/icon/kernel/mihomo.png"
                          alt="Mihomo"
                          className="kernel-logo"
                        />
                      ) : (
                        <div className="default-kernel-icon">Core</div>
                      )}
                    </div>
                    <div className="core-type-info">
                      <div className="core-type-name">{coreType.label}</div>
                      <div className="core-type-desc">
                        {coreType.value === 'sing-box' ? '现代化代理工具' :
                         coreType.value === 'mihomo' ? '高性能代理内核' : '通用代理内核'}
                      </div>
                    </div>
                  </div>

                  {currentCoreType === coreType.value && (
                    <div className="current-indicator">
                      <span className="current-badge">当前使用</span>
                    </div>
                  )}

                  <div className="core-type-status">
                    <span className={`status-indicator ${coreType.installed ? 'installed' : 'not-installed'}`}>
                      {isLoadingStatus ? '检查中...' : (coreType.installed ? '已安装' : '未安装')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 操作按钮组 */}
            <div className="core-actions">
              <button
                onClick={handleApplyCoreTypeChange}
                disabled={isSwitching || selectedCoreType === currentCoreType}
                className="btn btn-primary btn-switch"
              >
                {isSwitching ? (
                  <>
                    <span className="btn-spinner"></span>
                    切换中...
                  </>
                ) : (
                  selectedCoreType === currentCoreType ? '已选择' : '切换内核'
                )}
              </button>

              <div className="secondary-actions">
                <SimpleCoreDownloader
                  coreType={selectedCoreType || currentCoreType}
                  onDownloadComplete={() => {
                    loadCoreConfig();
                    loadAllCoreStatus();
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h3 className="dialog-title">
              确认切换内核
            </h3>
            <p className="dialog-message">
              您确定要从 <strong>{coreTypes.find(t => t.value === currentCoreType)?.label || currentCoreType}</strong> 切换到 <strong>{coreTypes.find(t => t.value === selectedCoreType)?.label || selectedCoreType}</strong> 内核吗？
              <br /><br />
              切换内核会停止当前运行的服务，不同内核使用不同的配置格式。
            </p>
            <div className="dialog-actions">
              <button
                onClick={cancelCoreTypeSwitch}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button
                onClick={confirmCoreTypeSwitch}
                className="btn btn-danger"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreSettings;


