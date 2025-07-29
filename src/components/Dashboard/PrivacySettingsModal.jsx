import React, { useState, useEffect } from 'react';

const PrivacySettingsModal = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState({
    hideNodeNames: false,
    hideNodeIPs: false,
    hideNodeTypes: false,
    hidePersonalIP: 'none', // 'none', 'partial', 'full'
  });

  // 当模态弹窗打开时，初始化设置
  useEffect(() => {
    if (isOpen && currentSettings) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleCancel = () => {
    // 重置为当前设置
    if (currentSettings) {
      setSettings(currentSettings);
    }
    onClose();
  };

  if (!isOpen) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '480px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        {/* 标题 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            敏感信息隐藏设置
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* 设置内容 */}
        <div style={{ marginBottom: '24px' }}>
          {/* 节点信息隐藏选项 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151'
            }}>
              节点信息隐藏
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 隐藏节点名称 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.hideNodeNames}
                  onChange={(e) => handleSettingChange('hideNodeNames', e.target.checked)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  隐藏节点名称
                </span>
              </label>

              {/* 隐藏节点IP地址 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.hideNodeIPs}
                  onChange={(e) => handleSettingChange('hideNodeIPs', e.target.checked)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  隐藏节点IP地址
                </span>
              </label>

              {/* 隐藏节点类型 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={settings.hideNodeTypes}
                  onChange={(e) => handleSettingChange('hideNodeTypes', e.target.checked)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  隐藏节点类型
                </span>
              </label>
            </div>
          </div>

          {/* 个人IP隐藏选项 */}
          <div>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151'
            }}>
              个人IP隐藏
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 不隐藏 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="radio"
                  name="personalIP"
                  value="none"
                  checked={settings.hidePersonalIP === 'none'}
                  onChange={(e) => handleSettingChange('hidePersonalIP', e.target.value)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  不隐藏个人IP
                </span>
              </label>

              {/* 部分隐藏 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="radio"
                  name="personalIP"
                  value="partial"
                  checked={settings.hidePersonalIP === 'partial'}
                  onChange={(e) => handleSettingChange('hidePersonalIP', e.target.value)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    部分隐藏个人IP
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    例如：192.168.1.***
                  </span>
                </div>
              </label>

              {/* 完全隐藏 */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="radio"
                  name="personalIP"
                  value="full"
                  checked={settings.hidePersonalIP === 'full'}
                  onChange={(e) => handleSettingChange('hidePersonalIP', e.target.value)}
                  style={{
                    marginRight: '12px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  完全隐藏个人IP
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettingsModal;
