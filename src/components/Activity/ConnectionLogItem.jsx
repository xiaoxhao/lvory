import React from 'react';

const logColors = {
  info: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  debug: '#2196F3',
  INFO: '#4CAF50',
  WARN: '#FF9800', 
  ERROR: '#F44336',
  DEBUG: '#2196F3',
};

const directionIcons = {
  inbound: '⬇️',
  outbound: '⬆️'
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '--:--:--';
  try {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return timestamp.toString();
  }
};

// 解析连接日志格式
const parseConnectionLog = (payload) => {
  if (!payload) return null;
  
  // 解析格式: [sessionId delay] direction/networkType[nodeGroup]: connection info
  const logMatch = payload.match(/\[(\d+)\s+([^\]]+)\]\s+(inbound|outbound)\/(\w+)\[([^\]]+)\]:\s+(.+)/);
  
  if (!logMatch) {
    return {
      sessionId: '',
      delay: '',
      direction: '',
      networkType: '',
      nodeGroup: '',
      connectionInfo: payload,
      domain: '',
      originalPayload: payload
    };
  }

  const [, sessionId, delay, direction, networkType, nodeGroup, connectionInfo] = logMatch;
  
  // 提取地址信息
  let address = '';
  if (connectionInfo.includes('connection to')) {
    const addressMatch = connectionInfo.match(/connection to\s+([^\s]+)/);
    if (addressMatch) {
      address = addressMatch[1];
    }
  } else if (connectionInfo.includes('connection from')) {
    const addressMatch = connectionInfo.match(/connection from\s+([^\s]+)/);
    if (addressMatch) {
      address = addressMatch[1];
    }
  }

  return {
    sessionId,
    delay,
    direction,
    networkType,
    nodeGroup,
    connectionInfo,
    address,
    originalPayload: payload
  };
};

const ConnectionLogItem = ({ log, index }) => {
  if (!log) return null;
  
  const type = (log.type || 'info').toLowerCase();
  const payload = log.payload || log.originalPayload || '';
  
  // 解析连接日志
  const parsed = parseConnectionLog(payload);
  if (!parsed) return null;

  const { sessionId, delay, direction, networkType, nodeGroup, address } = parsed;
  
  // 过滤掉地址为空的连接日志
  if (!address || address.trim() === '') {
    return null;
  }
  
  const getDirectionDisplay = (dir) => {
    if (dir === 'inbound') return <span style={{ color: '#4CAF50' }}>↓</span>;
    if (dir === 'outbound') return <span style={{ color: '#FF5722' }}>↑</span>;
    return <span style={{ color: '#757575' }}>·</span>;
  };
  
  return (
    <div className={`connection-row connection-${direction}`}>
      <div className="connection-time">
        {formatTimestamp(log.timestamp)}
      </div>
      <div className="connection-direction">
        {getDirectionDisplay(direction)}
      </div>
      <div className="connection-address" title={address}>
        {address}
      </div>
      <div className="connection-proxy" title={`${networkType}[${nodeGroup}]`}>
        {nodeGroup}
      </div>
      <div className="connection-protocol" title={`延迟: ${delay}`}>
        {networkType}
      </div>
    </div>
  );
};

export default ConnectionLogItem; 