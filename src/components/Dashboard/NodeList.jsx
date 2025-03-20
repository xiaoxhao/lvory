import React, { useState, useEffect } from 'react';

const NodeList = ({ profileData, testResults, privateMode }) => {
  const [ruleSets, setRuleSets] = useState([]);
  const [selectedTab, setSelectedTab] = useState('nodes'); // 'nodes' 或 'rules'

  useEffect(() => {
    const loadRuleSets = async () => {
      if (window.electron && window.electron.getRuleSets) {
        try {
          const ruleSetResult = await window.electron.getRuleSets();
          if (ruleSetResult.success && Array.isArray(ruleSetResult.ruleSets)) {
            setRuleSets(ruleSetResult.ruleSets);
          }
        } catch (error) {
          console.error('获取规则集失败:', error);
        }
      }
    };

    // 加载规则集数据
    loadRuleSets();
  }, []);

  // 获取规则集类型的颜色
  const getRuleSetTypeColor = (type) => {
    switch (type) {
      case 'remote':
        return '#9254de'; // 紫色
      case 'local':
        return '#52c41a'; // 绿色
      case 'source':
        return '#1890ff'; // 蓝色
      case 'binary':
        return '#fa8c16'; // 橙色
      default:
        return '#8c8c8c'; // 灰色
    }
  };

  // 渲染节点卡片
  const renderNodes = () => (
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
  );

  // 渲染规则集卡片
  const renderRuleSets = () => (
    <div className="customer-cards">
      {ruleSets.length > 0 ? (
        <div className="profile-tags-container" style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          padding: '10px 0',
          width: '100%'
        }}>
          {ruleSets.map((ruleSet, index) => (
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
              <div style={{ 
                fontWeight: '600', 
                fontSize: '14px', 
                marginBottom: '6px', 
                color: '#2e3b52',
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getRuleSetTypeColor(ruleSet.format || ruleSet.type)
                }}></span>
                {ruleSet.tag}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#505a6b',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 6px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  {ruleSet.format || ruleSet.type}
                </span>
              </div>
              {ruleSet.url && (
                <div style={{
                  fontSize: '11px',
                  color: '#505a6b',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={ruleSet.url}>
                  {ruleSet.url.length > 40 ? ruleSet.url.substring(0, 37) + '...' : ruleSet.url}
                </div>
              )}
              {ruleSet.update_interval && (
                <div style={{
                  fontSize: '11px',
                  color: '#505a6b',
                  marginTop: '4px'
                }}>
                  更新间隔: {ruleSet.update_interval}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8896ab', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          No rule sets found.
        </div>
      )}
    </div>
  );

  return (
    <div className="pipeline-stage">
      <div className="stage-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          alignItems: 'center'
        }}>
          <div 
            className={`tab ${selectedTab === 'nodes' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('nodes')}
            style={{
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              color: selectedTab === 'nodes' ? '#3f51b5' : '#666',
              fontWeight: selectedTab === 'nodes' ? '600' : '500',
              fontSize: '20px',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              borderBottom: selectedTab === 'nodes' ? '2px solid #3f51b5' : 'none'
            }}
          >
            ServiceNodes
          </div>
          <div 
            className={`tab ${selectedTab === 'rules' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('rules')}
            style={{
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              color: selectedTab === 'rules' ? '#3f51b5' : '#666',
              fontWeight: selectedTab === 'rules' ? '600' : '500',
              fontSize: '20px',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              borderBottom: selectedTab === 'rules' ? '2px solid #3f51b5' : 'none'
            }}
          >
            RulesCollection
          </div>
        </div>
        <div className="count">
          {selectedTab === 'nodes' 
            ? (profileData && profileData.length || 0) 
            : (ruleSets && ruleSets.length || 0)}
          <span className="up-arrow-icon"></span>
        </div>
      </div>
      
      {selectedTab === 'nodes' ? renderNodes() : renderRuleSets()}
    </div>
  );
};

export default NodeList;