/**
 * 通用下载按钮组件
 * 提供统一的下载UI和动效
 */

import React from 'react';

const DownloadButton = ({
  isDownloading = false,
  progress = 0,
  message = '',
  onClick,
  disabled = false,
  children = '下载',
  variant = 'primary', // 'primary', 'secondary', 'success', 'danger'
  size = 'medium', // 'small', 'medium', 'large'
  showProgress = true,
  className = ''
}) => {
  const getVariantStyles = () => {
    const variants = {
      primary: {
        background: '#3b82f6',
        hover: '#2563eb',
        downloading: '#10b981'
      },
      secondary: {
        background: '#6b7280',
        hover: '#4b5563',
        downloading: '#10b981'
      },
      success: {
        background: '#10b981',
        hover: '#059669',
        downloading: '#10b981'
      },
      danger: {
        background: '#ef4444',
        hover: '#dc2626',
        downloading: '#10b981'
      }
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        padding: '6px 12px',
        fontSize: '12px',
        minWidth: '80px',
        height: '28px'
      },
      medium: {
        padding: '10px 20px',
        fontSize: '14px',
        minWidth: '120px',
        height: '36px'
      },
      large: {
        padding: '12px 24px',
        fontSize: '16px',
        minWidth: '140px',
        height: '44px'
      }
    };
    return sizes[size] || sizes.medium;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <div className={`download-button-container ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled || isDownloading}
        className={`download-button ${isDownloading ? 'downloading' : ''}`}
        style={{
          ...sizeStyles,
          background: isDownloading ? variantStyles.downloading : variantStyles.background,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '500',
          cursor: (disabled || isDownloading) ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isDownloading ? (
          <span className="download-content">
            <span className="spinner"></span>
            {showProgress && progress > 0 ? `${progress}%` : '下载中...'}
          </span>
        ) : (
          children
        )}
        
        {/* 进度条背景 */}
        {isDownloading && showProgress && progress > 0 && (
          <div 
            className="progress-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${progress}%`,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.2)',
              transition: 'width 0.3s ease'
            }}
          />
        )}
        
        {/* 加载动效 */}
        {isDownloading && (
          <div 
            className="loading-shimmer"
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }}
          />
        )}
      </button>
      
      {/* 下载消息提示 */}
      {isDownloading && message && (
        <div className="download-message">
          {message}
        </div>
      )}

      <style>{`
        .download-button-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .download-button {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .download-button:hover:not(:disabled) {
          background: ${variantStyles.hover} !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .download-button:disabled {
          transform: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .download-button.downloading {
          animation: pulse 2s infinite;
        }

        .download-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .download-message {
          font-size: 12px;
          color: #6b7280;
          text-align: center;
          padding: 4px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          animation: fadeIn 0.3s ease;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DownloadButton;
