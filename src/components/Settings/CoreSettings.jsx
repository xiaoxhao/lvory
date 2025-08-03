/**
 * 内核设置组件
 * 提供内核类型选择和相关配置
 */

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { showMessage } from '../../utils/messageBox';
import SimpleCoreDownloader from './SimpleCoreDownloader';

const CoreSettings = () => {
  const [coreTypes, setCoreTypes] = useState([]);
  const [currentCoreType, setCurrentCoreType] = useState('');
  const [selectedCoreType, setSelectedCoreType] = useState(''); // 用户选择的内核类型
  const [coreConfig, setCoreConfig] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);



  // 加载支持的内核类型
  useEffect(() => {
    loadSupportedCoreTypes();
    loadCurrentCoreType();
    loadCoreConfig();
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
        
        {/* 内核类型选择 */}
        <div className="setting-item">
          <label className="setting-label">
            内核类型
            <span className="setting-description">
              选择要使用的代理内核类型
            </span>
          </label>
          <div className="setting-control">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={selectedCoreType}
                onChange={(e) => handleCoreTypeChange(e.target.value)}
                disabled={isSwitching}
                className="setting-select"
                style={{ flex: 1 }}
              >
                {coreTypes.map(coreType => (
                  <option key={coreType.value} value={coreType.value}>
                    {coreType.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyCoreTypeChange}
                disabled={isSwitching || selectedCoreType === currentCoreType}
                className="btn btn-primary"
                style={{
                  minWidth: '80px',
                  opacity: selectedCoreType === currentCoreType ? 0.5 : 1
                }}
              >
                {isSwitching ? '切换中...' : '应用'}
              </button>
            </div>
            {currentCoreType && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>当前内核:</span>
                <span style={{
                  fontWeight: '500',
                  color: '#10b981'
                }}>{coreTypes.find(t => t.value === currentCoreType)?.label || currentCoreType}</span>
              </div>
            )}
          </div>
        </div>

        {/* 当前内核信息 - 简化版 */}
        {coreConfig && (
          <div className="setting-item">
            <label className="setting-label">当前内核信息</label>
            <div className="core-info-simple">
              <div className="info-row">
                <span className="info-label">名称:</span>
                <span className="info-value">{coreConfig.displayName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">配置格式:</span>
                <span className="info-value">{coreConfig.configFormat.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {/* 内核管理操作 - 使用独立组件 */}
        <div className="setting-item">
          <label className="setting-label">内核管理</label>
          <div className="setting-actions">
            <SimpleCoreDownloader
              coreType={currentCoreType}
              onDownloadComplete={loadCoreConfig}
            />
          </div>
        </div>

        {/* 注意事项 - 简化版 */}
        <div className="setting-item">
          <div className="setting-notice">
            <p>切换内核类型会停止当前运行的内核，不同内核使用不同的配置格式。</p>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#1e293b',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              确认切换内核
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              您确定要从 <strong>{coreTypes.find(t => t.value === currentCoreType)?.label || currentCoreType}</strong> 切换到 <strong>{coreTypes.find(t => t.value === selectedCoreType)?.label || selectedCoreType}</strong> 内核吗？
              <br /><br />
              切换内核会停止当前运行的服务，不同内核使用不同的配置格式。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelCoreTypeSwitch}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                }}
              >
                取消
              </button>
              <button
                onClick={confirmCoreTypeSwitch}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                }}
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .core-settings {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .settings-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .section-title {
          margin: 0 0 24px 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .setting-item {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .setting-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .setting-label {
          display: block;
          margin-bottom: 12px;
          color: #1e293b;
          font-weight: 600;
          font-size: 15px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .setting-description {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: normal;
          margin-top: 4px;
        }

        .setting-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .setting-select {
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #1e293b;
          min-width: 220px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .setting-select:focus {
          outline: none;
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
        }

        .loading-indicator {
          color: var(--text-secondary);
          font-size: 12px;
        }

        .core-info-simple {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-label {
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
        }

        .info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 14px;
        }



        .setting-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #64748b;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #475569;
        }

        .btn-secondary {
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f1f5f9;
        }

        .setting-notice {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 18px;
        }

        .setting-notice p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 500;
        }


      `}</style>
    </div>
  );
};

export default CoreSettings;
