import React from 'react';
import '../assets/css/modal.css';

const Modal = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  // 根据className判断是否为成功状态
  const isSuccess = className && className.includes('success-state');

  return (
    <div className="modal-overlay">
      <div className={`modal-container ${className || ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            style={isSuccess ? { opacity: 1, pointerEvents: 'auto' } : {}}
          >
            ×
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 