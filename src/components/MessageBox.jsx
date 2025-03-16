import React from 'react';
import '../assets/css/messagebox.css';

const MessageBox = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="messagebox-overlay">
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