import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TracerouteMap from './TracerouteMap';
import '../../assets/css/tools.css';

const Tools = () => {
  const { t } = useTranslation();
  const [selectedTool, setSelectedTool] = useState('traceroute');
  const [targetHost, setTargetHost] = useState('');
  const [isTracing, setIsTracing] = useState(false);
  const [viewMode, setViewMode] = useState('text');
  const [tracerouteData, setTracerouteData] = useState([]);
  const [traceStats, setTraceStats] = useState(null);
  const tracerouteRef = useRef(null);

  const tools = [
    {
      id: 'traceroute',
      name: t('tools.traceroute'),
      description: t('tools.tracerouteDescription'),
      component: TracerouteMap
    }
  ];

  const selectedToolData = tools.find(tool => tool.id === selectedTool);
  const ToolComponent = selectedToolData?.component;

  const handleStartTrace = () => {
    if (selectedTool === 'traceroute') {
      // 开始 trace 时切换到 text 模式，清空之前的数据
      setViewMode('text');
      setTracerouteData([]);
      setTraceStats(null);
      
      if (tracerouteRef.current) {
        tracerouteRef.current.performTraceroute();
      }
    }
  };

  const onTraceComplete = (data) => {
    setTracerouteData(data);
    if (data.length > 0) {
      const avgRtt = data.reduce((sum, hop) => sum + (hop.rtt || 0), 0) / data.length;
      const maxRtt = Math.max(...data.map(hop => hop.rtt || 0));
      const minRtt = Math.min(...data.filter(hop => hop.rtt > 0).map(hop => hop.rtt || Infinity));
      
      setTraceStats({
        hopCount: data.length,
        avgRtt: avgRtt.toFixed(2),
        maxRtt: maxRtt.toFixed(2),
        minRtt: minRtt === Infinity ? '0' : minRtt.toFixed(2),
        target: targetHost,
        timestamp: new Date().toLocaleString()
      });

      // 文本输出完成后，自动切换到地图模式
      setTimeout(() => {
        setViewMode('map');
      }, 1000);
    }
  };

  const renderTextView = () => (
    <div className="traceroute-text-view">
      <div className="trace-header">
        <h3>Traceroute to {targetHost}</h3>
        {traceStats && (
          <div className="trace-stats">
            <span className="stat-item">Hops: {traceStats.hopCount}</span>
            <span className="stat-item">Avg RTT: {traceStats.avgRtt}ms</span>
            <span className="stat-item">Min: {traceStats.minRtt}ms</span>
            <span className="stat-item">Max: {traceStats.maxRtt}ms</span>
            <span className="stat-item">Time: {traceStats.timestamp}</span>
          </div>
        )}
      </div>
      
      <div className="hop-table">
        <div className="hop-table-header">
          <div className="hop-col-num">#</div>
          <div className="hop-col-ip">IP Address</div>
          <div className="hop-col-location">Location</div>
          <div className="hop-col-rtt">RTT (ms)</div>
          <div className="hop-col-status">Status</div>
        </div>
        
        <div className="hop-table-body">
          {tracerouteData.map((hop, index) => (
            <div key={index} className={`hop-table-row ${hop.type}`}>
              <div className="hop-col-num">
                {hop.type === 'source' ? '🏠' : hop.type === 'destination' ? '🎯' : hop.hop}
              </div>
              <div className="hop-col-ip" title={hop.ip}>{hop.ip}</div>
              <div className="hop-col-location" title={`${hop.country}, ${hop.city}`}>
                {hop.country === 'Unknown' ? '-' : `${hop.country}, ${hop.city}`}
              </div>
              <div className="hop-col-rtt">
                {hop.rtt ? hop.rtt.toFixed(2) : '-'}
              </div>
              <div className="hop-col-status">
                <span className={`status-dot ${hop.rtt ? 'status-ok' : 'status-timeout'}`}></span>
                {hop.rtt ? 'OK' : 'Timeout'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="tools-container">
      <div className="tools-content">
        <div className="tool-control-panel">
          <div className="tool-main-controls">
            <div className="control-group">
              <select 
                id="tool-select"
                value={selectedTool} 
                onChange={(e) => setSelectedTool(e.target.value)}
                className="tool-select"
              >
                {tools.map(tool => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="control-group target-group">
              <label htmlFor="target-host">{t('tools.targetHost')}:</label>
              <input
                id="target-host"
                type="text"
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                placeholder={t('tools.targetPlaceholder')}
                disabled={isTracing}
                className="target-input"
              />
            </div>
            
            <button
              onClick={handleStartTrace}
              disabled={isTracing || !targetHost.trim()}
              className={`trace-button ${isTracing ? 'tracing' : ''}`}
            >
              {isTracing ? t('tools.tracing') : t('tools.startTrace')}
            </button>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              disabled={isTracing}
            >
              🗺️ Map
            </button>
            <button
              className={`view-btn ${viewMode === 'text' ? 'active' : ''}`}
              onClick={() => setViewMode('text')}
              disabled={isTracing}
            >
              📋 Text
            </button>
          </div>
        </div>
        
        <div className="tool-view-area">
          {viewMode === 'map' ? (
            ToolComponent && (
              <ToolComponent 
                ref={tracerouteRef}
                targetHost={targetHost} 
                setTargetHost={setTargetHost} 
                setIsTracing={setIsTracing}
                onTraceComplete={onTraceComplete}
                existingData={tracerouteData}
              />
            )
          ) : (
            renderTextView()
          )}
        </div>
      </div>
    </div>
  );
};

export default Tools; 