import React from 'react';

const NodeList = ({ profileData, testResults, privateMode }) => {
  return (
    <div className="pipeline-stage">
      <div className="stage-header">
        <h3 style={{ fontSize: '20px', fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>Service Nodes</h3>
        <div className="count">{profileData && profileData.length || 0} <span className="up-arrow-icon"></span></div>
      </div>
      <div className="customer-cards">
        {profileData && profileData.length > 0 ? (
          <div className="profile-tags-container" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px', 
            padding: '10px 0',
            width: '100%'
          }}>
            {profileData.map((profile, index) => (
              <div key={index} className="profile-tag-card" style={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #d9dde3', 
                borderRadius: '6px', 
                padding: '12px', 
                width: 'calc(25% - 12px)',
                margin: '0 0 8px 0',
                display: 'flex', 
                flexDirection: 'column', 
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#b3b7bd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d9dde3';
              }}
              >
                {/* 测速结果 - 右上角显示 */}
                {testResults[profile.tag] && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: testResults[profile.tag] === 'timeout' ? '#e74c3c' : 
                                      (testResults[profile.tag] < 100 ? '#2ecc71' : 
                                       testResults[profile.tag] < 200 ? '#f39c12' : 
                                       testResults[profile.tag] < 300 ? '#e67e22' : '#e74c3c')
                    }}></span>
                    <span style={{
                      color: testResults[profile.tag] === 'timeout' ? '#e74c3c' : 
                             (testResults[profile.tag] < 100 ? '#2ecc71' : 
                              testResults[profile.tag] < 200 ? '#f39c12' : 
                              testResults[profile.tag] < 300 ? '#e67e22' : '#e74c3c')
                    }}>
                      {testResults[profile.tag] === 'timeout' ? '超时' : `${testResults[profile.tag]}ms`}
                    </span>
                  </div>
                )}
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px', 
                  marginBottom: '6px', 
                  color: '#2e3b52',
                  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}>
                  {privateMode ? '********' : (profile.tag || 'Unknown')}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#505a6b',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: profile.type === 'direct' ? '#47c9a2' : 
                                     profile.type === 'shadowsocks' ? '#f7b731' : 
                                     profile.type === 'vmess' ? '#7166f9' : 
                                     profile.type === 'trojan' ? '#ff5e62' : '#abb3c0',
                    marginRight: '6px'
                  }}></span>
                  {profile.type || 'Unknown'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#505a6b',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {privateMode ? '********' : (profile.server || 'N/A')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8896ab', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            No service nodes found. Please click "+ Profiles" to add configuration file.
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeList;