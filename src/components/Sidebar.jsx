import React from 'react';
import '../assets/css/sidebar.css';
import SystemStatus from './SystemStatus';
import logoSvg from '../../resource/icon/logo.svg';

const Sidebar = ({ activeItem, onItemClick, profilesCount, isMinimized }) => {
  return (
    <div className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
      <div className="logo">
        <img src={logoSvg} alt="LVORY Logo" className="logo-image" />
        {!isMinimized && <h2>LVORY</h2>}
      </div>
      
      <div className="main-menu">
        <ul>
          <li 
            className={`menu-item ${activeItem === 'dashboard' ? 'active' : ''}`}
            onClick={() => onItemClick('dashboard')}
            title={isMinimized ? 'Dashboard' : ''}
          >
            <span className="icon home-icon"></span>
            {!isMinimized && <span>Dashboard</span>}
          </li>
          <li 
            className={`menu-item ${activeItem === 'activity' ? 'active' : ''}`}
            onClick={() => onItemClick('activity')}
            title={isMinimized ? 'Activity' : ''}
          >
            <span className="icon activity-icon"></span>
            {!isMinimized && <span>Activity</span>}
          </li>
          <li 
            className={`menu-item ${activeItem === 'profiles' ? 'active' : ''}`}
            onClick={() => onItemClick('profiles')}
            title={isMinimized ? `Profiles (${profilesCount || 0})` : ''}
          >
            <span className="icon profiles-icon"></span>
            {!isMinimized && <span>Profiles</span>}
            {!isMinimized && <span className="badge">{profilesCount || 0}</span>}
            {isMinimized && <span className="badge minimized-badge">{profilesCount || 0}</span>}
          </li>
          <li 
            className={`menu-item ${activeItem === 'settings' ? 'active' : ''}`}
            onClick={() => onItemClick('settings')}
            title={isMinimized ? 'Settings' : ''}
          >
            <span className="icon settings-icon"></span>
            {!isMinimized && <span>Settings</span>}
          </li>
        </ul>
      </div>

      {!isMinimized && <SystemStatus />}
    </div>
  );
};

export default Sidebar; 