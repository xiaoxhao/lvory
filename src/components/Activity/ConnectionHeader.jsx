import React from 'react';

const ConnectionHeader = () => {
  return (
    <div className="connection-header">
      <div className="connection-header-time">TIME</div>
      <div className="connection-header-direction">DIR</div>
      <div className="connection-header-address">ADDRESS</div>
      <div className="connection-header-proxy">PROXY</div>
      <div className="connection-header-protocol">PROTOCOL</div>
    </div>
  );
};

export default ConnectionHeader; 