import React, { useEffect } from 'react';
import '../assets/css/messagebox.css';

const MessageBox = ({ isOpen, onClose, message }) => {
  // TODO: 这部分需要使用 Recet Protal 来进行重构
  useEffect(() => {
    if (isOpen) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        // 为 main-content 添加一个类来标识有模态弹窗
        mainContent.classList.add('has-modal');
      }
    }

    return () => {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.classList.remove('has-modal');
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="messagebox-overlay main-content-modal">
      <div className="messagebox-container">
        <div className="messagebox-content">
          <p>{message}</p>
        </div>
        <div className="messagebox-footer">
          <button className="messagebox-button" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;