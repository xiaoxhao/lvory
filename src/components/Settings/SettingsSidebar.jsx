import React from 'react';
import { useTranslation } from 'react-i18next';

const SettingsSidebar = ({ selectedSection, onSectionChange }) => {
  const { t } = useTranslation();
  
  const sections = {
    GENERAL: [
      { id: 'basic', label: t('settings.basicSettings') },
      { id: 'nodes', label: t('settings.nodesSettings') },
      { id: 'advanced', label: t('settings.advancedSettings') },
    ],
    OTHERS: [
      { id: 'about', label: t('settings.about') },
    ],
  };

  return (
    <div style={{
      width: '240px',
      borderRight: '1px solid #e5e7eb',
      padding: '16px',
      backgroundColor: '#f8fafc',
      height: '100%',
    }}>
      {Object.entries(sections).map(([category, items]) => (
        <div key={category} style={{ marginBottom: '16px' }}>
          <div 
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 500,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'default',
            }}
          >
            {category}
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: selectedSection === item.id ? '#e2e8f0' : 'transparent',
                color: selectedSection === item.id ? '#334155' : '#64748b',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontWeight: selectedSection === item.id ? '500' : '400',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (selectedSection !== item.id) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSection !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SettingsSidebar; 