import React, { useState, useEffect } from 'react';

const NodeList = ({ profileData, testResults, privateMode }) => {
  const [ruleSets, setRuleSets] = useState([]);
  const [selectedTab, setSelectedTab] = useState('nodes'); // 'nodes' 或 'rules'
  const [nodeGroups, setNodeGroups] = useState([]); // 节点组数据
  const [nodes, setNodes] = useState([]); // 包含组信息的节点数据
  const [selectedGroup, setSelectedGroup] = useState('all'); // 当前选中的节点组，'all'表示全部
  const [isOverflow, setIsOverflow] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const tabsRef = React.useRef(null);

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

    const loadNodeGroups = async () => {
      if (window.electron && window.electron.getNodeGroups) {
        try {
          const result = await window.electron.getNodeGroups();
          if (result.success) {
            setNodeGroups(result.nodeGroups || []);
            setNodes(result.nodes || []);
          }
        } catch (error) {
          console.error('获取节点组信息失败:', error);
        }
      }
    };

    // 加载规则集数据
    loadRuleSets();
    // 加载节点组数据
    loadNodeGroups();
  }, []);

  // 检查选项卡是否溢出
  useEffect(() => {
    const checkOverflow = () => {
      if (tabsRef.current) {
        const isTabsOverflow = tabsRef.current.scrollWidth > tabsRef.current.clientWidth;
        setIsOverflow(isTabsOverflow);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [nodeGroups]);

  // 在组件顶部添加一个useEffect来注入自定义CSS样式
  useEffect(() => {
    // 添加自定义样式表以隐藏所有滚动条
    const style = document.createElement('style');
    style.textContent = `
      /* 隐藏webkit基础的浏览器滚动条 */
      ::-webkit-scrollbar {
        display: none;
      }
      
      /* 确保所有元素都不显示滚动条但允许滚动 */
      * {
        -ms-overflow-style: none; /* IE 和 Edge */
        scrollbar-width: none; /* Firefox */
      }
      
      /* 确保在Electron环境中隐藏滚动条 */
      html, body, div {
        scrollbar-color: transparent transparent; /* Firefox */
        scrollbar-width: none; /* Firefox */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 根据当前选中的组筛选节点
  const getFilteredNodes = () => {
    if (selectedGroup === 'all') {
      // 显示所有普通节点，但不包括节点组
      return profileData.filter(node => {
        // 检查该节点是否为节点组的outbound
        const isNodeGroup = nodeGroups.some(group => group.tag === node.tag);
        return !isNodeGroup;
      });
    } else if (selectedGroup === 'uncategorized') {
      // 筛选未归属于任何组的节点
      return nodes.filter(node => !node.groups || node.groups.length === 0)
                 .map(node => {
                   // 从profileData中找到对应的节点数据
                   return profileData.find(p => p.tag === node.tag) || node;
                 });
    } else {
      // 筛选属于指定组的节点
      const group = nodeGroups.find(g => g.tag === selectedGroup);
      if (group && group.outbounds) {
        return group.outbounds.map(outboundTag => {
          // 从profileData中找到对应的节点数据
          return profileData.find(node => node.tag === outboundTag) || 
                 { tag: outboundTag, type: 'unknown', server: 'unknown' };
        });
      }
      return [];
    }
  };

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

  // 获取节点组类型的颜色
  const getNodeGroupTypeColor = (type) => {
    switch (type) {
      case 'urltest':
        return '#1890ff'; // 蓝色
      case 'selector':
        return '#722ed1'; // 紫色
      case 'direct':
        return '#52c41a'; // 绿色
      case 'reject':
        return '#f5222d'; // 红色
      default:
        return '#8c8c8c'; // 灰色
    }
  };

  // 渲染节点卡片
  const renderNodes = () => {
    const filteredNodes = getFilteredNodes();
    
    return (
      <div className="customer-cards" style={{ minHeight: '300px' }}>
        {filteredNodes && filteredNodes.length > 0 ? (
          <div className="profile-tags-container" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px', 
            padding: '10px 0',
            width: '100%'
          }}>
            {filteredNodes.map((profile, index) => (
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
  };

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

  // 渲染节点组选择条
  const renderGroupTabs = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      width: '100%',
      marginTop: '-10px',
      marginBottom: '10px',
      position: 'relative'
    }}>
      <div className="node-group-tabs" 
        ref={tabsRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'transparent',
          borderRadius: '0',
          padding: '0',
          width: '90%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #eaeaea',
          position: 'relative'
        }}>
        <div 
          className={`group-tab ${selectedGroup === 'all' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('all')}
          style={{
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: selectedGroup === 'all' ? '600' : '400',
            color: selectedGroup === 'all' ? '#1677ff' : '#606266',
            backgroundColor: 'transparent',
            marginRight: '8px',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            borderBottom: selectedGroup === 'all' ? '2px solid #1677ff' : 'none'
          }}
        >
          All
        </div>
        
        {nodeGroups.slice(0, isOverflow ? 6 : nodeGroups.length).map((group, index) => (
          <div 
            key={index}
            className={`group-tab ${selectedGroup === group.tag ? 'selected' : ''}`}
            onClick={() => setSelectedGroup(group.tag)}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: selectedGroup === group.tag ? '600' : '400',
              color: selectedGroup === group.tag ? '#1677ff' : '#606266',
              backgroundColor: 'transparent',
              marginRight: '8px',
              transition: 'all 0.2s ease',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              borderBottom: selectedGroup === group.tag ? '2px solid #1677ff' : 'none'
            }}
          >
            {group.tag}
          </div>
        ))}
        
        {isOverflow && !showMore && (
          <div 
            className="more-groups"
            onClick={() => setShowMore(true)}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '400',
              color: '#1677ff',
              backgroundColor: 'transparent',
              marginRight: '8px',
              transition: 'all 0.2s ease',
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            More
            <span style={{
              marginLeft: '3px',
              fontSize: '10px',
              transform: 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}>▼</span>
          </div>
        )}
        
        <div 
          className={`group-tab ${selectedGroup === 'uncategorized' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('uncategorized')}
          style={{
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: selectedGroup === 'uncategorized' ? '600' : '400',
            color: selectedGroup === 'uncategorized' ? '#1677ff' : '#606266',
            backgroundColor: 'transparent',
            marginLeft: 'auto',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            borderBottom: selectedGroup === 'uncategorized' ? '2px solid #1677ff' : 'none'
          }}
        >
          Uncategorized
        </div>
      </div>
      
      {/* 添加淡化边缘效果 */}
      {isOverflow && (
        <div style={{
          position: 'absolute',
          right: '5%',
          top: 0,
          bottom: 0,
          width: '40px',
          background: 'linear-gradient(to right, transparent, white 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }}></div>
      )}
    </div>
  );

  {/* 如果展开了更多选项，渲染二级选项卡 */}
  const renderSecondaryTabs = () => {
    if (!showMore || !isOverflow) return null;
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        marginBottom: '15px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '90%',
          padding: '10px',
          backgroundColor: '#f9f9f9',
          borderRadius: '6px',
          gap: '8px',
          position: 'relative'
        }}>
          {nodeGroups.slice(6).map((group, index) => (
            <div 
              key={index}
              className={`group-tab ${selectedGroup === group.tag ? 'selected' : ''}`}
              onClick={() => setSelectedGroup(group.tag)}
              style={{
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: selectedGroup === group.tag ? '600' : '400',
                color: selectedGroup === group.tag ? '#1677ff' : '#606266',
                backgroundColor: selectedGroup === group.tag ? '#e6f7ff' : 'transparent',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
              {group.tag}
            </div>
          ))}
          
          {/* Less按钮 */}
          <div
            onClick={() => setShowMore(false)}
            style={{
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#1677ff',
              backgroundColor: 'rgba(22, 119, 255, 0.08)',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              display: 'flex',
              alignItems: 'center',
              position: 'absolute',
              right: '10px',
              top: '10px'
            }}
          >
            Less
            <span style={{
              marginLeft: '3px',
              fontSize: '10px',
              transform: 'rotate(180deg)'
            }}>▼</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pipeline-stage" style={{ 
      overflow: 'hidden',
      maxHeight: '100%'
    }}>
      <div className="stage-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        position: 'relative'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '24px',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div 
            className={`tab ${selectedTab === 'nodes' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('nodes')}
            style={{
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              color: selectedTab === 'nodes' ? '#3a6df0' : '#808191',
              fontWeight: selectedTab === 'nodes' ? '600' : '400',
              fontSize: '18px',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              borderBottom: selectedTab === 'nodes' ? '2px solid #3a6df0' : 'none',
              transition: 'all 0.25s ease',
              letterSpacing: '0.5px'
            }}
          >
            ServiceNodes
            {selectedTab === 'nodes' && <div style={{
              position: 'absolute',
              bottom: '-2px',
              left: '0',
              width: '100%',
              height: '2px',
              background: 'linear-gradient(90deg, #3a6df0 0%, #5d8efb 100%)',
              borderRadius: '2px 2px 0 0'
            }}></div>}
          </div>
          <div 
            className={`tab ${selectedTab === 'rules' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('rules')}
            style={{
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              color: selectedTab === 'rules' ? '#3a6df0' : '#808191',
              fontWeight: selectedTab === 'rules' ? '600' : '400',
              fontSize: '18px',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              borderBottom: selectedTab === 'rules' ? '2px solid #3a6df0' : 'none',
              transition: 'all 0.25s ease',
              letterSpacing: '0.5px'
            }}
          >
            RulesCollection
            {selectedTab === 'rules' && <div style={{
              position: 'absolute',
              bottom: '-2px',
              left: '0',
              width: '100%',
              height: '2px',
              background: 'linear-gradient(90deg, #3a6df0 0%, #5d8efb 100%)',
              borderRadius: '2px 2px 0 0'
            }}></div>}
          </div>
        </div>
        <div className="count" style={{
          background: 'rgba(58, 109, 240, 0.08)',
          color: '#3a6df0',
          borderRadius: '20px',
          padding: '2px 10px',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {selectedTab === 'nodes' 
            ? (profileData && profileData.length || 0) 
            : (ruleSets && ruleSets.length || 0)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke="#3a6df0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {selectedTab === 'nodes' && renderGroupTabs()}
      {selectedTab === 'nodes' && renderSecondaryTabs()}

      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
        {selectedTab === 'nodes' ? renderNodes() : renderRuleSets()}
      </div>
    </div>
  );
};

export default NodeList;