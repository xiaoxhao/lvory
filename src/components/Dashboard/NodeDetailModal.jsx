import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';

const NodeDetailModal = ({ node, isOpen, onClose, testResult, privateMode }) => {
  if (!isOpen || !node) return null;
  
  const { showAnimations } = useAppContext();
  const canvasRef = useRef(null);

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

  // 基于当前小时生成随机种子
  const getRandomSeed = () => {
    const hour = new Date().getHours();
    return hour;
  };

  // 创建科幻背景动画
  useEffect(() => {
    if (!isOpen || !showAnimations) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const seed = getRandomSeed();
    
    // 设置canvas大小为窗口大小
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 创建线段对象
    const linesCount = 50 + seed * 2;
    const lines = [];
    
    for (let i = 0; i < linesCount; i++) {
      const randomFactor = Math.sin(seed * i) * 0.5 + 0.5;
      lines.push({
        x1: Math.random() * canvas.width,
        y1: Math.random() * canvas.height,
        x2: Math.random() * canvas.width,
        y2: Math.random() * canvas.height,
        width: Math.random() * 2 + 0.5,
        color: `rgba(${80 + randomFactor * 100}, ${150 + randomFactor * 50}, ${200 + randomFactor * 55}, ${0.1 + randomFactor * 0.3})`,
        speed: {
          x1: (Math.random() - 0.5) * 0.5,
          y1: (Math.random() - 0.5) * 0.5,
          x2: (Math.random() - 0.5) * 0.5,
          y2: (Math.random() - 0.5) * 0.5
        }
      });
    }
    
    // 动画循环
    const animate = () => {
      if (!canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制和更新线段
      lines.forEach(line => {
        // 更新位置
        line.x1 += line.speed.x1;
        line.y1 += line.speed.y1;
        line.x2 += line.speed.x2;
        line.y2 += line.speed.y2;
        
        // 边界检测
        if (line.x1 < 0 || line.x1 > canvas.width) line.speed.x1 *= -1;
        if (line.y1 < 0 || line.y1 > canvas.height) line.speed.y1 *= -1;
        if (line.x2 < 0 || line.x2 > canvas.width) line.speed.x2 *= -1;
        if (line.y2 < 0 || line.y2 > canvas.height) line.speed.y2 *= -1;
        
        // 绘制线段
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.lineWidth = line.width;
        ctx.strokeStyle = line.color;
        ctx.stroke();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    let animationId = requestAnimationFrame(animate);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, showAnimations]);

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
      backgroundColor: 'rgba(10, 15, 30, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* 科幻背景动画 - 只在启用动画时显示 */}
      {showAnimations && (
        <canvas 
          ref={canvasRef} 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1
          }}
        />
      )}
      
      <div className="node-detail-modal" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '3px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.12), 0 0 0 3px rgba(80, 140, 240, 0.1)',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '90vh',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* 弹窗头部 */}
        <div className="node-detail-header" style={{
          padding: '20px',
          borderBottom: '1px solid rgba(220, 230, 240, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(248, 249, 250, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '2px',
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
            e.currentTarget.style.backgroundColor = 'rgba(241, 241, 241, 0.7)';
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
              borderBottom: '1px solid rgba(220, 230, 240, 0.5)',
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
                  borderRadius: '2px',
                  backgroundColor: getNodeTypeColor(node.type)
                }}></span>
                {node.type || 'Unknown'}
              </div>

              <div style={{ color: '#666', fontWeight: '500' }}>服务器地址:</div>
              <div style={{ color: '#333', wordBreak: 'break-all' }}>
                {privateMode ? '********' : (node.server || 'N/A')}
              </div>
            </div>
          </div>
        </div>
        
        {/* 弹窗底部 */}
        <div className="node-detail-footer" style={{
          padding: '15px 20px',
          borderTop: '1px solid rgba(220, 230, 240, 0.5)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(248, 249, 250, 0.7)'
        }}>
          <button onClick={onClose} style={{
            backgroundColor: '#3a6df0',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 5px rgba(58, 109, 240, 0.2)'
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