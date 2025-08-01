import { createRoot } from 'react-dom/client';
import React, { useState, useEffect } from 'react';
import MessageBox from '../components/MessageBox';

// 创建一个容器并挂载到DOM
let messageBoxRoot = null;
let messageBoxContainer = null;

// 确保只初始化一次
function ensureContainer() {
  if (!messageBoxContainer) {
    messageBoxContainer = document.createElement('div');
    messageBoxContainer.id = 'message-box-container';
    messageBoxContainer.style.position = 'absolute';
    messageBoxContainer.style.top = '0';
    messageBoxContainer.style.left = '0';
    messageBoxContainer.style.right = '0';
    messageBoxContainer.style.bottom = '0';
    messageBoxContainer.style.pointerEvents = 'none';
    messageBoxContainer.style.zIndex = '100';

    // 将容器添加到 body，但样式会让它定位到 main-content
    document.body.appendChild(messageBoxContainer);
    messageBoxRoot = createRoot(messageBoxContainer);
  }

  // 每次调用时检查是否需要重新定位到 main-content
  const mainContent = document.querySelector('.main-content');
  if (mainContent && messageBoxContainer.parentNode !== mainContent) {
    mainContent.appendChild(messageBoxContainer);
  }
}

// MessageBox状态管理组件
const MessageBoxManager = () => {
  const [state, setState] = useState({
    isOpen: false,
    message: '',
    onClose: null,
    queue: []
  });

  // 显示下一个消息
  const showNextMessage = () => {
    if (state.queue.length > 0) {
      const nextMessage = state.queue[0];
      const newQueue = state.queue.slice(1);
      setState({
        ...state,
        isOpen: true,
        message: nextMessage.message,
        onClose: () => {
          if (nextMessage.onClose) {
            nextMessage.onClose();
          }
          handleClose(newQueue);
        },
        queue: newQueue
      });
    }
  };

  // 关闭当前消息
  const handleClose = (newQueue) => {
    setState({
      ...state,
      isOpen: false,
      message: '',
      onClose: null,
      queue: newQueue || state.queue
    });

    // 设置延迟以确保关闭动画完成后再显示下一个消息
    setTimeout(() => {
      if ((newQueue || state.queue).length > 0) {
        showNextMessage();
      }
    }, 300);
  };

  // 添加新消息到队列
  window.showMessage = (message, onClose) => {
    const newMessage = { message, onClose };
    
    if (!state.isOpen) {
      setState({
        ...state,
        isOpen: true,
        message: newMessage.message,
        onClose: () => {
          if (newMessage.onClose) {
            newMessage.onClose();
          }
          handleClose();
        }
      });
    } else {
      setState({
        ...state,
        queue: [...state.queue, newMessage]
      });
    }
  };

  return (
    <MessageBox
      isOpen={state.isOpen}
      message={state.message}
      onClose={state.onClose}
    />
  );
};

// 初始化并渲染MessageBoxManager
export function initMessageBox() {
  ensureContainer();
  messageBoxRoot.render(<MessageBoxManager />);
}

// 显示消息的全局方法
export function showMessage(message, onClose) {
  ensureContainer();
  if (window.showMessage) {
    window.showMessage(message, onClose);
  } else {
    setTimeout(() => {
      if (window.showMessage) {
        window.showMessage(message, onClose);
      } else {
        console.warn('MessageBox not initialized properly');
        alert(message);
      }
    }, 100);
  }
} 