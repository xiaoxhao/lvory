import React from 'react';

const NodeDetailModal = ({ node, isOpen, onClose, testResult, privateMode }) => {
  if (!isOpen || !node) return null;

  // 获取节点类型对应的颜色
  const getNodeTypeColor = (type) => {
    switch (type) {
      case 'direct':
        return '#47c9a2';
      case 'shadowsocks':
        return '#f7b731';
      case 'vmess':
        return '#7166f9';
      case 'trojan':
        return '#ff5e62';
      default:
        return '#abb3c0';
    }
  };

  // 获取延迟状态颜色
  const getLatencyColor = (latency) => {
    if (latency === 'timeout') return '#e74c3c';
    if (latency < 100) return '#2ecc71';
    if (latency < 200) return '#f39c12';
    if (latency < 300) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div className="node-detail-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="node-detail-modal" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '90vh',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 弹窗头部 */}
        <div className="node-detail-header" style={{
          padding: '20px',
          borderBottom: '1px solid #eaeaea',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: getNodeTypeColor(node.type)
            }}></div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              color: '#2c3e50',
              fontWeight: '600',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
            }}>
              {privateMode ? '********' : node.tag || 'Unknown Node'}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f1f1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            ×
          </button>
        </div>
        
        {/* 弹窗内容 */}
        <div className="node-detail-content" style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* 基本信息 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '16px',
              marginBottom: '15px',
              color: '#333',
              fontWeight: '600',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              基本信息
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', fontSize: '14px' }}>
              <div style={{ color: '#666', fontWeight: '500' }}>节点类型:</div>
              <div style={{ color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getNodeTypeColor(node.type)
                }}></span>
                {node.type || 'Unknown'}
              </div>

              <div style={{ color: '#666', fontWeight: '500' }}>服务器地址:</div>
              <div style={{ color: '#333', wordBreak: 'break-all' }}>
                {privateMode ? '********' : (node.server || 'N/A')}
              </div>

              <div style={{ color: '#666', fontWeight: '500' }}>端口:</div>
              <div style={{ color: '#333' }}>
                {privateMode ? '****' : (node.port || 'N/A')}
              </div>

              <div style={{ color: '#666', fontWeight: '500' }}>测速结果:</div>
              <div style={{ 
                color: testResult ? getLatencyColor(testResult) : '#999',
                fontWeight: '500'
              }}>
                {testResult ? (testResult === 'timeout' ? '连接超时' : `${testResult} ms`) : '未测试'}
              </div>
            </div>
          </div>

          {/* 配置详情 */}
          <div>
            <h3 style={{
              fontSize: '16px',
              marginBottom: '15px',
              color: '#333',
              fontWeight: '600',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              配置详情
            </h3>
            
            {privateMode ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                私密模式下无法显示详细配置信息
              </div>
            ) : (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f5f7f9', 
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {Object.entries(node).map(([key, value]) => {
                  // 跳过已经在基本信息中显示的字段
                  if (['tag', 'type', 'server', 'port'].includes(key)) return null;
                  
                  return (
                    <div key={key} style={{ marginBottom: '6px' }}>
                      <span style={{ color: '#2980b9', fontWeight: '600' }}>{key}: </span>
                      <span style={{ color: '#333' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* 弹窗底部 */}
        <div className="node-detail-footer" style={{
          padding: '15px 20px',
          borderTop: '1px solid #eaeaea',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8f9fa'
        }}>
          <button onClick={onClose} style={{
            backgroundColor: '#3a6df0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2954c8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3a6df0';
          }}>
            关闭
          </button>
        </div>
      </div>
      
      {/* 弹窗动画样式 */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from { 
              opacity: 0;
              transform: translateY(-20px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default NodeDetailModal; 