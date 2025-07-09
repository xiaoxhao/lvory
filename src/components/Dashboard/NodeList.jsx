import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import NodeDetailModal from './NodeDetailModal';

// 路由规则组卡片组件
const RouteRuleGroupCard = ({ group, index }) => {
  const getRouteTypeColor = (type) => {
    switch (type) {
      case 'ip_is_private': return '#5a6c57';
      case 'domain': return '#4a6b6b';
      case 'domain_keyword': return '#8b7a4a';
      case 'rule_set': return '#8b5a4a';
      case 'domain_suffix': return '#6b5a8b';
      case 'geoip': return '#8b6b5a';
      case 'geosite': return '#5a8b6b';
      case 'ip_cidr': return '#7a5a6c';
      case 'port': return '#6c7a5a';
      case 'port_range': return '#5a7a6c';
      case 'process_name': return '#6c5a7a';
      default: return '#666666';
    }
  };

  const getOutboundColor = (outbound) => {
    if (outbound === 'DIRECT') return '#81a684'; // 降低饱和度的绿色
    if (outbound === 'REJECT') return '#c97171'; // 降低饱和度的红色
    return '#7ba3d3'; // 降低饱和度的蓝色
  };

  const getOutboundBackgroundColor = (outbound) => {
    if (outbound === 'DIRECT') return 'rgba(46, 125, 50, 0.08)';
    if (outbound === 'REJECT') return 'rgba(211, 47, 47, 0.08)';
    return 'rgba(25, 118, 210, 0.08)';
  };

  return (
    <div 
      className="route-rule-group-card" 
      style={{ 
        backgroundColor: getOutboundBackgroundColor(group.proxy), 
        borderRadius: '8px', 
        padding: '16px', 
        width: '100%',
        margin: '8px 0',
        height: 'auto',
        minHeight: 'auto',
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'visible',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxShadow: 'none',
        border: 'none'
      }}
    >      
      {/* 卡片标题：出站规则 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '12px'
      }}>
        <div style={{
          padding: '6px 12px',
          backgroundColor: getOutboundColor(group.proxy),
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '700',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          {group.proxy}
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#999999',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '4px',
          padding: '3px 8px',
          marginLeft: 'auto'
        }}>
          {group.rules.length} rule{group.rules.length > 1 ? 's' : ''}
        </div>
      </div>
      
      {/* 规则列表 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {group.rules.map((rule, ruleIndex) => (
          <div key={ruleIndex} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '6px',
            border: 'none'
          }}>
            {/* 规则类型标签 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getRouteTypeColor(rule.type),
                flexShrink: 0
              }}></div>
                             <div style={{
                 padding: '3px 8px',
                 backgroundColor: 'rgba(255, 255, 255, 0.8)',
                 borderRadius: '4px',
                 fontSize: '11px',
                 fontWeight: '600',
                 color: getRouteTypeColor(rule.type),
                 textTransform: 'uppercase',
                 letterSpacing: '0.3px',
                 minWidth: '120px',
                 width: '120px',
                 textAlign: 'center',
                 overflow: 'hidden',
                 textOverflow: 'ellipsis',
                 whiteSpace: 'nowrap'
               }}>
                 {rule.type.replace('_', ' ')}
               </div>
            </div>
            
            {/* 分隔符 */}
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#cccccc'
            }}>
              :
            </div>
            
            {/* 规则值 */}
            <div style={{
              flex: 1,
              minWidth: 0
            }}>
              {rule.values && rule.values.length > 0 ? (
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#333333',
                  lineHeight: '18px',
                  wordWrap: 'break-word',
                  overflow: 'visible',
                  whiteSpace: 'normal'
                }}>
                  {rule.values.slice(0, 8).map((value, idx) => (
                    <span key={idx}>
                      {value}
                      {idx < Math.min(rule.values.length - 1, 7) && (
                        <span style={{ 
                          color: '#cccccc', 
                          margin: '0 6px',
                          fontSize: '11px',
                          fontWeight: '400'
                        }}>
                          /
                        </span>
                      )}
                    </span>
                  ))}
                  {rule.values.length > 8 && (
                    <span style={{ 
                      color: '#999999', 
                      fontStyle: 'italic',
                      fontSize: '11px',
                      fontWeight: '400'
                    }}>
                      {' '}... +{rule.values.length - 8} more
                    </span>
                  )}
                </div>
              ) : (
                <div style={{
                  fontSize: '13px',
                  fontWeight: '400',
                  color: '#999999',
                  fontStyle: 'italic'
                }}>
                  No specific values
                </div>
              )}
            </div>
            
            {/* 规则序号 */}
            <div style={{
              fontSize: '10px',
              fontWeight: '500',
              color: '#999999',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '3px',
              padding: '2px 6px',
              flexShrink: 0
            }}>
              #{rule.originalIndex + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Material 3 风格的节点卡片组件
const NodeCard = ({ profile, testResults, privateMode, onClick }) => {
  // 根据节点质量获取圆点颜色
  const getNodeQualityColor = (latency) => {
    if (latency === 'timeout' || latency === undefined || latency === null) {
      return '#8b4a4a'; // 红色 - 无法连接或未测试
    }
    if (latency < 100) return '#5a6c57'; // 绿色 - 优秀
    if (latency < 200) return '#4a6b6b'; // 青色 - 良好  
    if (latency < 300) return '#8b7a4a'; // 黄色 - 一般
    return '#8b4a4a'; // 红色 - 较差
  };

  // 获取节点类型对应的背景色 - 统一为更淡雅的背景
  const getNodeTypeBackgroundColor = (type) => {
    switch (type) {
      case 'direct': return 'rgba(246, 247, 237, 1)'; // 淡绿背景
      case 'shadowsocks': return 'rgba(240, 245, 248, 1)'; // 淡蓝背景
      case 'vmess': return 'rgba(240, 248, 248, 1)'; // 淡青背景
      case 'trojan': return 'rgba(248, 245, 240, 1)'; // 淡棕背景
      default: return 'rgba(246, 247, 237, 1)'; // 默认淡绿背景
    }
  };

  // 更丰富的节点类型配色 - 调整为更柔和的色调
  const getNodeTypeColor = (type) => {
    switch (type) {
      case 'direct': return '#5a6c57'; // 深绿灰色
      case 'shadowsocks': return '#6b7885'; // 蓝灰色
      case 'vmess': return '#4a6b6b'; // 青绿色
      case 'trojan': return '#8b5a4a'; // 棕色
      default: return '#666666'; // 中性灰
    }
  };

  const latency = testResults[profile.tag];
  const qualityColor = getNodeQualityColor(latency);
  const typeBackgroundColor = getNodeTypeBackgroundColor(profile.type);

  return (
    <button
      className="node-list-card"
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(90, 108, 87, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      style={{
        backgroundColor: typeBackgroundColor,
        borderRadius: '8px',
        padding: '12px',
        width: 'calc(25% - 12px)',
        margin: '5px 0 8px 0',
        height: 'auto',
        minHeight: '92px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxShadow: 'none',
        border: 'none', /* 移除默认按钮边框 */
        outline: 'none' /* 移除聚焦时的轮廓 */
      }}
    >
      {/* 卡片顶部：标题和延迟 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        minHeight: '16px'
      }}>
        {/* 左侧：状态点和节点名称 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: qualityColor,
            marginRight: '8px',
            flexShrink: 0
          }}></div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#333333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '16px'
          }}>
            {privateMode ? '********' : (profile.tag || 'Unknown')}
          </div>
        </div>
        
        {/* 右侧：延迟显示 */}
        {latency !== undefined && (
          <div style={{
            fontSize: '10px',
            fontWeight: '500',
            color: latency === 'timeout' ? '#d32f2f' : '#2e7d32',
            backgroundColor: latency === 'timeout' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(46, 125, 50, 0.1)',
            borderRadius: '3px',
            padding: '2px 6px',
            marginLeft: '8px',
            flexShrink: 0,
            lineHeight: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {latency === 'timeout' ? '超时' : `${latency}ms`}
          </div>
        )}
      </div>
      
      {/* 卡片底部：协议类型和IP地址 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '8px'
      }}>
        {/* 左侧：协议类型 */}
        <div style={{
          padding: '3px 8px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '500',
          color: getNodeTypeColor(profile.type),
          border: `1px solid ${getNodeTypeColor(profile.type)}20`,
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          {profile.type || 'Unknown'}
        </div>
        
        {/* 右侧：IP地址/服务器地址 */}
        <div style={{
          fontSize: '10px',
          fontWeight: '400',
          color: '#666666',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '60%',
          textAlign: 'right'
        }}>
          {privateMode ? '****' : (profile.server || 'N/A')}
        </div>
      </div>
    </button>
  );
};

const NodeList = ({ profileData, testResults, privateMode, isExpandedView, onToggleExpandedView }) => {
  const { t } = useTranslation();
  const [nodeGroups, setNodeGroups] = useState([]); // 节点组数据
  const [nodes, setNodes] = useState([]); // 包含组信息的节点数据
  const [selectedGroup, setSelectedGroup] = useState('all'); // 当前选中的节点组，'all'表示全部
  const [isOverflow, setIsOverflow] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const tabsRef = React.useRef(null);
  
  // 节点详情弹窗状态
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodeDetail, setShowNodeDetail] = useState(false);

  // 添加定时测量状态
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const testInterval = 3600000; // 默认1小时 (3600000毫秒)

  // 添加视图切换状态
  const [showRouteRules, setShowRouteRules] = useState(false);
  const [routeRules, setRouteRules] = useState([]);

  // 解析规则内容，提取具体的值
  const parseRuleContent = (rule) => {
    let values = [];
    
    // 从payload中提取具体值
    if (rule.payload) {
      const match = rule.payload.match(/=(.+)$/);
      if (match) {
        let content = match[1];
        
        // 处理数组格式 [item1 item2 item3]
        if (content.startsWith('[') && content.endsWith(']')) {
          content = content.slice(1, -1);
          values = content.split(/\s+/).filter(v => v.trim());
        } else if (content === 'true') {
          // 处理布尔值
          values = ['Private IP addresses'];
        } else {
          values = [content];
        }
      }
    }
    
    return values;
  };

  // 将路由规则按出站规则分组
  const groupRouteRules = (rules) => {
    const groups = {};
    
    rules.forEach((rule, index) => {
      const proxy = rule.proxy;
      if (!groups[proxy]) {
        groups[proxy] = {
          proxy: proxy,
          rules: []
        };
      }
      
      groups[proxy].rules.push({
        ...rule,
        values: parseRuleContent(rule),
        originalIndex: index
      });
    });
    
    return Object.values(groups);
  };

  // 加载路由规则
  const loadRouteRules = async () => {
    if (window.electron && window.electron.getRouteRules) {
      try {
        const result = await window.electron.getRouteRules();
        if (result.success) {
          const groupedRules = groupRouteRules(result.rules || []);
          setRouteRules(groupedRules);
        }
      } catch (error) {
        console.error('获取路由规则失败:', error);
        setRouteRules([]);
      }
    }
  };

  useEffect(() => {
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

    const refreshData = () => {
      loadNodeGroups();
      loadRouteRules();
      // 重置选中的组为"all"
      setSelectedGroup('all');
    };

    // 初始加载
    refreshData();

    // 监听配置文件变更事件
    let unsubscribeProfiles, unsubscribeConfig, unsubscribeDashboard;

    if (window.electron && window.electron.profiles && window.electron.profiles.onChanged) {
      unsubscribeProfiles = window.electron.profiles.onChanged(() => {
        console.log('配置文件已变更，刷新节点组数据');
        refreshData();
      });
    }
    
    // 监听配置变更事件
    if (window.electron && window.electron.onConfigChanged) {
      unsubscribeConfig = window.electron.onConfigChanged(() => {
        console.log('配置已切换，刷新Dashboard数据');
        refreshData();
      });
    }
    
    // 监听Dashboard刷新事件
    if (window.electron && window.electron.onDashboardRefresh) {
      unsubscribeDashboard = window.electron.onDashboardRefresh(() => {
        console.log('Dashboard刷新事件触发');
        refreshData();
      });
    }

    // 组件卸载时清理事件监听
    return () => {
      if (unsubscribeProfiles && typeof unsubscribeProfiles === 'function') {
        unsubscribeProfiles();
      }
      if (unsubscribeConfig && typeof unsubscribeConfig === 'function') {
        unsubscribeConfig();
      }
      if (unsubscribeDashboard && typeof unsubscribeDashboard === 'function') {
        unsubscribeDashboard();
      }
    };
  }, []);

  // 定时测量节点功能
  useEffect(() => {
    let intervalId;
    
    const performBackgroundTest = async () => {
      if (window.electron && window.electron.testNodes && profileData && profileData.length > 0) {
        try {
          // 静默测试，不显示加载状态
          await window.electron.testNodes(profileData.map(node => node.tag), false);
        } catch (error) {
          console.error('后台节点测试失败:', error);
        }
      }
    };

    // 启动自动测试
    const startAutoTest = () => {
      if (isAutoTesting) {
        // 立即执行一次测试
        performBackgroundTest();
        // 设置定时器
        intervalId = setInterval(performBackgroundTest, testInterval);
      }
    };

    startAutoTest();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoTesting, testInterval, profileData]);

  // 组件挂载时自动启动定时测量
  useEffect(() => {
    setIsAutoTesting(true);
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
    // 添加自定义样式表以隐藏特定区域的滚动条，但保留Activity日志容器的滚动条
    const style = document.createElement('style');
    style.textContent = `
      /* 隐藏NodeList组件内的滚动条 */
      .customer-cards::-webkit-scrollbar,
      .profile-tags-container::-webkit-scrollbar,
      .material-rule-card::-webkit-scrollbar,
      .node-group-card::-webkit-scrollbar {
        display: none;
      }
      
      .customer-cards,
      .profile-tags-container,
      .material-rule-card,
      .node-group-card {
        -ms-overflow-style: none; /* IE 和 Edge */
        scrollbar-width: none; /* Firefox */
        scrollbar-color: transparent transparent; /* Firefox */
      }
      
      /* 隐藏主体区域滚动条，但保留Activity组件的滚动条 */
      body::-webkit-scrollbar {
        display: none;
      }
      
      body {
        -ms-overflow-style: none; /* IE 和 Edge */
        scrollbar-width: none; /* Firefox */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const filteredNodes = useMemo(() => {
    if (selectedGroup === 'all') {
      return profileData.filter(node => {
        const isNodeGroup = nodeGroups.some(group => group.tag === node.tag);
        return !isNodeGroup;
      });
    } else if (selectedGroup === 'uncategorized') {
      return nodes.filter(node => !node.groups || node.groups.length === 0)
                 .map(node => {
                   return profileData.find(p => p.tag === node.tag) || node;
                 });
    } else {
      const group = nodeGroups.find(g => g.tag === selectedGroup);
      if (group && group.outbounds) {
        return group.outbounds.map(outboundTag => {
          return profileData.find(node => node.tag === outboundTag) ||
                 { tag: outboundTag, type: 'unknown', server: 'unknown' };
        });
      }
      return [];
    }
  }, [selectedGroup, profileData, nodeGroups, nodes]);

  const openNodeDetail = useCallback((node) => {
    setSelectedNode(node);
    setShowNodeDetail(true);
  }, []);

  const closeNodeDetail = useCallback(() => {
    setShowNodeDetail(false);
  }, []);

  // 渲染路由规则列表函数
  const renderRouteRules = () => {
    return (
      <div className="customer-cards" style={{ 
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {routeRules && routeRules.length > 0 ? (
          <div className="profile-tags-container" style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '8px', 
            width: '100%',
            overflow: 'auto',
            scrollBehavior: 'smooth'
          }}>
            {routeRules.map((group, index) => (
              <RouteRuleGroupCard
                key={index}
                group={group}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: '#666666', 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            height: '100%'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15 13H17V16H15V13Z" fill="#666666"/>
            </svg>
            No route rules found. Please check your configuration.
          </div>
        )}
      </div>
    );
  };

  const renderNodes = useCallback(() => {
    
    return (
      <div className="customer-cards" style={{ 
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {filteredNodes && filteredNodes.length > 0 ? (
          <div className="profile-tags-container" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px', 
            padding: '10px 0',
            width: '100%',
            overflow: 'auto', // 只有这个容器可以滚动
            scrollBehavior: 'smooth'
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
            color: '#666666', 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            height: '100%'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15 13H17V16H15V13Z" fill="#666666"/>
            </svg>
            No service nodes found. Please click "+ Profiles" to add configuration file.
          </div>
        )}
      </div>
    );
  }, [filteredNodes, testResults, privateMode]);

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
        <button
          className={`material-chip ${selectedGroup === 'all' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('all')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            color: selectedGroup === 'all' ? '#ffffff' : '#5a6c57',
            backgroundColor: selectedGroup === 'all' ? '#7a9070' : 'rgba(246, 247, 237, 0.8)',
            marginRight: '8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            border: 'none',
            outline: 'none'
          }}
        >
          All
        </button>
        
        {nodeGroups.slice(0, isOverflow ? 6 : nodeGroups.length).map((group, index) => (
          <button
            key={index}
            className={`material-chip ${selectedGroup === group.tag ? 'selected' : ''}`}
            onClick={() => setSelectedGroup(group.tag)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: selectedGroup === group.tag ? '#ffffff' : '#5a6c57',
              backgroundColor: selectedGroup === group.tag ? '#7a9070' : 'rgba(246, 247, 237, 0.8)',
              marginRight: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              border: 'none',
              outline: 'none'
            }}
          >
            {group.tag}
          </button>
        ))}
        
        <button
          className={`material-chip ${selectedGroup === 'uncategorized' ? 'selected' : ''}`}
          onClick={() => setSelectedGroup('uncategorized')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            color: selectedGroup === 'uncategorized' ? '#ffffff' : '#5a6c57',
            backgroundColor: selectedGroup === 'uncategorized' ? '#7a9070' : 'rgba(246, 247, 237, 0.8)',
            marginRight: '8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            border: 'none',
            outline: 'none'
          }}
        >
          Uncategorized
        </button>
        
        {isOverflow && !showMore && (
          <button
            className="material-chip more"
            onClick={() => setShowMore(true)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#5a6c57',
              backgroundColor: 'rgba(246, 247, 237, 0.8)',
              marginRight: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              outline: 'none'
            }}
          >
            More
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="#5a6c57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
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

  // 如果展开了更多选项，渲染二级选项卡
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
          backgroundColor: 'rgba(246, 247, 237, 0.5)',
          borderRadius: '8px',
          gap: '8px',
          position: 'relative',
          boxShadow: 'none',
          border: '1px solid rgba(90, 108, 87, 0.15)'
        }}>
          {nodeGroups.slice(6).map((group, index) => (
            <button
              key={group.tag}
              className="material-chip-secondary"
              onClick={() => setSelectedGroup(group.tag)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                color: selectedGroup === group.tag ? '#ffffff' : '#5a6c57',
                backgroundColor: selectedGroup === group.tag ? '#7a9070' : 'rgba(246, 247, 237, 0.8)',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                border: 'none', /* 移除默认按钮边框 */
                outline: 'none' /* 移除聚焦时的轮廓 */
              }}
            >
              {group.tag}
            </button>
          ))}
          
          {/* Less按钮 */}
          <button
            onClick={() => setShowMore(false)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: '#5a6c57',
              backgroundColor: 'rgba(246, 247, 237, 0.8)',
              borderRadius: '6px',
              border: 'none',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
              <path d="M7 14L12 9L17 14" stroke="#5a6c57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      padding: '20px 20px 10px 20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      border: '1px solid rgba(246, 247, 237, 0.3)'
    }}>
      <div className="node-list-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <button
          style={{
            fontSize: '18px',
            fontWeight: '400',
            color: '#333333',
            padding: '0 0 0 5px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            background: 'none', /* 移除背景 */
            border: 'none', /* 移除边框 */
            outline: 'none', /* 移除聚焦时的轮廓 */
            textAlign: 'left' /* 保持文本左对齐 */
          }}
          onClick={() => setShowRouteRules(!showRouteRules)}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1976d2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#333333';
          }}
        >
          {t('nodeList.title')}
        </button>
        <button
          className="material-button"
          style={{
            backgroundColor: 'rgba(246, 247, 237, 0.5)',
            color: '#666666',
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
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            outline: 'none'
          }}
          onClick={onToggleExpandedView}
          title={isExpandedView ? "点击返回正常视图" : "点击展开全屏视图"}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(246, 247, 237, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(246, 247, 237, 0.5)';
          }}
        >
          <span>{profileData && profileData.length || 0}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isExpandedView ? (
              <path d="M12 20V4M12 20L6 14M12 20L18 14" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>
      
      {!showRouteRules && renderGroupTabs()}
      {!showRouteRules && renderSecondaryTabs()}

      <div style={{ 
        overflow: 'hidden', // 外层容器不滚动
        flex: '1 1 auto',
        padding: '4px',
        borderRadius: '8px',
        minHeight: 0 // 确保flex子元素可以正确收缩
      }}>
        {showRouteRules ? renderRouteRules() : renderNodes()}
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