import React from 'react';
import '../assets/css/sidebar.css';
import SystemStatus from './SystemStatus';

const Sidebar = ({ activeItem, onItemClick }) => {
  return (
    <div className="sidebar">
      <div className="logo">
        <h2>LVORY</h2>
      </div>
      
      <div className="main-menu">
        <ul>
          <li 
            className={`menu-item ${activeItem === 'dashboard' ? 'active' : ''}`}
            onClick={() => onItemClick('dashboard')}
          >
            <span className="icon home-icon"></span>
            <span>Dashboard</span>
          </li>
          <li 
            className={`menu-item ${activeItem === 'activity' ? 'active' : ''}`}
            onClick={() => onItemClick('activity')}
          >
            <span className="icon activity-icon"></span>
            <span>Activity</span>
          </li>
          <li className="menu-item">
            <span className="icon tasks-icon"></span>
            <span>Tasks</span>
            <span className="badge">2</span>
          </li>
          <li className="menu-item">
            <span className="icon settings-icon"></span>
            <span>Settings</span>
          </li>
        </ul>
      </div>

      <SystemStatus />
    </div>
  );
};

export default Sidebar; 