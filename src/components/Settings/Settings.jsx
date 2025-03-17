import React, { useState } from 'react';
import SettingsSidebar from './SettingsSidebar';
import SettingsContent from './SettingsContent';

const Settings = () => {
  const [selectedSection, setSelectedSection] = useState('basic');

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <SettingsSidebar 
        selectedSection={selectedSection} 
        onSectionChange={setSelectedSection} 
      />
      <SettingsContent section={selectedSection} />
    </div>
  );
};

export default Settings; 