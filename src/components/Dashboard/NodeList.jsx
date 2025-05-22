import React, { useState, useEffect } from 'react';
import NodeDetailModal from './NodeDetailModal';

// Material 3 风格的节点卡片组件
const NodeCard = ({ profile, testResults, privateMode, onClick }) => {
  const getNodeTypeColor = (type) => {
    switch (type) {
      case 'direct': return '#4CAF50'; // Material Green
      case 'shadowsocks': return '#FF9800'; // Material Orange
      case 'vmess': return '#673AB7'; // Material Deep Purple
      case 'trojan': return '#F44336'; // Material Red
      default: return '#607D8B'; // Material Blue Grey
    }
  };

  // 测试结果状态和颜色
  const getLatencyStatus = (latency) => {
    if (latency === 'timeout') return { color: '#F44336', text: '超时' };
    if (latency < 100) return { color: '#4CAF50', text: `${latency}ms` }; // 很好
    if (latency < 200) return { color: '#8BC34A', text: `${latency}ms` }; // 好
    if (latency < 300) return { color: '#FFC107', text: `${latency}ms` }; // 一般
    return { color: '#F44336', text: `${latency}ms` }; // 差
  };

  const latencyStatus = testResults[profile.tag] ? getLatencyStatus(testResults[profile.tag]) : null;

  return (
    <div 
      className="material-card" 
      style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '12px', 
        padding: '10px', 
        width: 'calc(25% - 12px)',
        margin: '0 0 12px 0',
        height: '64%',
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.12)'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-0.5px)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
      }}
    >
      {latencyStatus && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '11px',
          fontWeight: '500',
          backgroundColor: `${latencyStatus.color}08`,
          color: latencyStatus.color,
          padding: '1px 6px',
          borderRadius: '12px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: latencyStatus.color
          }}></span>
          {latencyStatus.text}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: getNodeTypeColor(profile.type),
          marginRight: '6px'
        }}></div>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: '500', 
          color: 'rgba(0,0,0,0.78)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {privateMode ? '********' : (profile.tag || 'Unknown')}
        </div>
      </div>
      
      <div style={{
        padding: '3px 6px',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: '400',
        color: 'rgba(0,0,0,0.6)',
        alignSelf: 'flex-start',
        marginBottom: '6px'
      }}>
        {profile.type || 'Unknown'}
      </div>
      
      <div style={{
        fontSize: '11px',
        color: 'rgba(0,0,0,0.54)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {privateMode ? '********' : (profile.server || 'N/A')}
      </div>
    </div>
  );
};

const NodeList = ({ profileData, testResults, privateMode, isExpandedView, onToggleExpandedView }) => {
  const [ruleSets, setRuleSets] = useState([]);
  const [selectedTab, setSelectedTab] = useState('nodes'); // 'nodes' 或 'rules'
  const [nodeGroups, setNodeGroups] = useState([]); // 节点组数据
  const [nodes, setNodes] = useState([]); // 包含组信息的节点数据
  const [selectedGroup, setSelectedGroup] = useState('all'); // 当前选中的节点组，'all'表示全部
  const [isOverflow, setIsOverflow] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const tabsRef = React.useRef(null);
  
  // 节点详情弹窗状态
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodeDetail, setShowNodeDetail] = useState(false);

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

  // 打开节点详情弹窗
  const openNodeDetail = (node) => {
    setSelectedNode(node);
    setShowNodeDetail(true);
  };

  // 关闭节点详情弹窗
  const closeNodeDetail = () => {
    setShowNodeDetail(false);
  };

  // 渲染节点列表函数
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
              <NodeCard
                key={index}
                profile={profile}
                testResults={testResults}
                privateMode={privateMode}
                onClick={() => openNodeDetail(profile)}
              />
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'rgba(0,0,0,0.54)', 
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM18 12.5H13.5V17H10.5V12.5H6V9.5H10.5V5H13.5V9.5H18V12.5Z" fill="rgba(0,0,0,0.26)"/>
            </svg>
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
            <div key={index} className="material-rule-card" style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px',
              padding: '10px', 
              width: 'calc(25% - 12px)',
              margin: '0 0 12px 0',
              height: '64%',
              display: 'flex', 
              flexDirection: 'column', 
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.12)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-0.5px)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
            >
              <div style={{ 
                fontWeight: '500', 
                fontSize: '13px', 
                marginBottom: '8px', 
                color: 'rgba(0,0,0,0.78)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: getRuleSetTypeColor(ruleSet.format || ruleSet.type),
                  flexShrink: 0
                }}></span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ruleSet.tag}
                </span>
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 6px',
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  borderRadius: '3px',
                  fontSize: '11px'
                }}>
                  {ruleSet.format || ruleSet.type}
                </span>
              </div>
              {ruleSet.url && (
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(0,0,0,0.54)',
                  marginTop: '6px',
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
                  color: 'rgba(0,0,0,0.54)',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="rgba(0,0,0,0.45)"/>
                  </svg>
                  更新间隔: {ruleSet.update_interval}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center', 
          color: 'rgba(0,0,0,0.54)', 
          fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15 13H17V16H15V13Z" fill="rgba(0,0,0,0.26)"/>
          </svg>
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
      marginTop: '0',
      position: 'relative'
    }}>
      <div className="material-chip-group" 
        ref={tabsRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'transparent',
          padding: '4px 0',
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          position: 'relative'
        }}>
        <div 
          className={`material-chip ${selectedGroup === 'all' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('all')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            color: selectedGroup === 'all' ? '#ffffff' : 'rgba(0,0,0,0.4)',
            backgroundColor: selectedGroup === 'all' ? '#9f94e8' : 'rgba(0,0,0,0.08)',
            marginRight: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          All
        </div>
        
        {nodeGroups.slice(0, isOverflow ? 6 : nodeGroups.length).map((group, index) => (
          <div 
            key={index}
            className={`material-chip ${selectedGroup === group.tag ? 'selected' : ''}`}
            onClick={() => setSelectedGroup(group.tag)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: selectedGroup === group.tag ? '#ffffff' : 'rgba(0,0,0,0.4)',
              backgroundColor: selectedGroup === group.tag ? '#9f94e8' : 'rgba(0,0,0,0.08)',
              marginRight: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
          >
            {group.tag}
          </div>
        ))}
        
        <div 
          className={`material-chip ${selectedGroup === 'uncategorized' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('uncategorized')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            color: selectedGroup === 'uncategorized' ? '#ffffff' : 'rgba(0,0,0,0.4)',
            backgroundColor: selectedGroup === 'uncategorized' ? '#9f94e8' : 'rgba(0,0,0,0.08)',
            marginRight: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          Uncategorized
        </div>
        
        {isOverflow && !showMore && (
          <div 
            className="material-chip more"
            onClick={() => setShowMore(true)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#9f94e8',
              backgroundColor: 'rgba(103, 80, 164, 0.08)',
              marginRight: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            More
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="#9f94e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        
        
      </div>
      
      {/* 添加淡化边缘效果 */}
      {isOverflow && (
        <div style={{
          position: 'absolute',
          right: '2.5%',
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
        marginBottom: '20px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '95%',
          padding: '16px',
          backgroundColor: 'rgba(103, 80, 164, 0.05)',
          borderRadius: '12px',
          gap: '8px',
          position: 'relative',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
        }}>
          {nodeGroups.slice(6).map((group, index) => (
            <div 
              key={index}
              className="material-chip-secondary"
              onClick={() => setSelectedGroup(group.tag)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: selectedGroup === group.tag ? '#ffffff' : 'rgba(0,0,0,0.87)',
                backgroundColor: selectedGroup === group.tag ? '#9f94e8' : 'rgba(0,0,0,0.08)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
              }}
            >
              {group.tag}
            </div>
          ))}
          
          {/* Less按钮 */}
          <button
            onClick={() => setShowMore(false)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#9f94e8',
              backgroundColor: 'rgba(103, 80, 164, 0.08)',
              borderRadius: '8px',
              border: 'none',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              position: 'absolute',
              right: '16px',
              top: '16px'
            }}
          >
            Less
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 14L12 9L17 14" stroke="#9f94e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="node-list-container" style={{
      width: '100%',
      height: '100%',
      borderRadius: '16px',
      background: '#fff',
      padding: '10px 10px 10px 10px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}>
      <div className="node-list-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <div className="material-tabs" style={{
          display: 'flex',
          gap: '24px'
        }}>
          <div 
            className={`material-tab ${selectedTab === 'nodes' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('nodes')}
            style={{
              cursor: 'pointer',
              padding: '8px 0',
              position: 'relative',
              color: selectedTab === 'nodes' ? '#9f94e8' : 'rgba(0,0,0,0.6)',
              fontWeight: selectedTab === 'nodes' ? '500' : '400',
              fontSize: '16px',
              fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: 'all 0.2s ease',
            }}
          >
            Nodes
            {selectedTab === 'nodes' && (
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '100%',
                height: '3px',
                backgroundColor: '#9f94e8',
                borderRadius: '3px 3px 0 0'
              }}></div>
            )}
          </div>
          <div 
            className={`material-tab ${selectedTab === 'rules' ? 'active-tab' : ''}`}
            onClick={() => setSelectedTab('rules')}
            style={{
              cursor: 'pointer',
              padding: '8px 0',
              position: 'relative',
              color: selectedTab === 'rules' ? '#9f94e8' : 'rgba(0,0,0,0.6)',
              fontWeight: selectedTab === 'rules' ? '500' : '400',
              fontSize: '16px',
              fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: 'all 0.2s ease',
            }}
          >
            Rules
            {selectedTab === 'rules' && (
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '100%',
                height: '3px',
                backgroundColor: '#9f94e8',
                borderRadius: '3px 3px 0 0'
              }}></div>
            )}
          </div>
        </div>
        <button 
          className="material-button" 
          style={{
            backgroundColor: isExpandedView ? 'rgba(103, 80, 164, 0.08)' : 'rgba(103, 80, 164, 0.08)',
            color: '#9f94e8',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            outline: 'none'
          }}
          onClick={onToggleExpandedView}
          title={isExpandedView ? "点击返回正常视图" : "点击展开全屏视图"}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(103, 80, 164, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(103, 80, 164, 0.08)';
          }}
        >
          <span>{selectedTab === 'nodes' 
            ? (profileData && profileData.length || 0) 
            : (ruleSets && ruleSets.length || 0)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isExpandedView ? (
              <path d="M12 20V4M12 20L6 14M12 20L18 14" stroke="#9f94e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke="#9f94e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>
      
      {selectedTab === 'nodes' && renderGroupTabs()}
      {selectedTab === 'nodes' && renderSecondaryTabs()}

      <div style={{ 
        overflow: 'auto', 
        maxHeight: isExpandedView ? 'calc(100vh - 100px)' : 'calc(100vh - 300px)',
        flex: '1 1 auto',
        padding: '4px',
        scrollBehavior: 'smooth',
        borderRadius: '8px'
      }}>
        {selectedTab === 'nodes' ? renderNodes() : renderRuleSets()}
      </div>
      
      {/* 节点详情弹窗 */}
      {showNodeDetail && selectedNode && (
        <NodeDetailModal 
          node={selectedNode} 
          isOpen={showNodeDetail} 
          onClose={closeNodeDetail}
          testResult={testResults[selectedNode.tag]}
          privateMode={privateMode}
        />
      )}
    </div>
  );
};

export default NodeList;