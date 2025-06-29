import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import IPService from '../../services/ip/IPService';
import TracerouteService from '../../services/network/TracerouteService';

const TracerouteMap = forwardRef(({ targetHost, setTargetHost, setIsTracing, onTraceComplete, existingData }, ref) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const [tracerouteData, setTracerouteData] = useState([]);
  const [sourceInfo, setSourceInfo] = useState(null);

  useEffect(() => {
    // 获取本地IP信息
    const getSourceInfo = async () => {
      try {
        const ipInfo = await IPService.getIPInfo();
        setSourceInfo(ipInfo);
      } catch (error) {
        console.error('获取本地IP信息失败:', error);
      }
    };

    getSourceInfo();
  }, []);

  // 当接收到现有数据时，直接绘制地图
  useEffect(() => {
    if (existingData && existingData.length > 0 && chart) {
      setTracerouteData(existingData);
      
      // 构建连线数据
      let allLines = [];
      for (let i = 1; i < existingData.length; i++) {
        const prevHop = existingData[i - 1];
        const currentHop = existingData[i];
        
        allLines.push({
          coords: [
            [prevHop.longitude, prevHop.latitude],
            [currentHop.longitude, currentHop.latitude]
          ],
          fromName: prevHop.ip,
          toName: currentHop.ip,
          rtt: currentHop.rtt
        });
      }
      
      updateChart(existingData, allLines);
    }
  }, [existingData, chart]);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化ECharts实例
    const chartInstance = echarts.init(chartRef.current);
    setChart(chartInstance);

    // 注册世界地图
    fetch('https://cdn.jsdelivr.net/npm/echarts@latest/map/json/world.json')
      .then(response => response.json())
      .then(worldMapData => {
        echarts.registerMap('world', worldMapData);
        initializeChart(chartInstance);
      })
      .catch(error => {
        console.error('加载世界地图数据失败:', error);
        // 如果网络加载失败，使用简化的初始化
        initializeChart(chartInstance);
      });

    // 清理函数
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, []);

  // 执行traceroute功能
  const performTraceroute = async () => {
    // 验证目标地址
    if (!TracerouteService.isValidTarget(targetHost)) {
      alert('请输入有效的IP地址或域名');
      return;
    }
    
    setIsTracing(true);
    setTracerouteData([]);

    // 禁用地图拖动
    setMapRoam(false);

    try {
      let allPoints = [];
      
      if (sourceInfo) {
        const sourcePoint = {
          ip: sourceInfo.ip,
          country: sourceInfo.country,
          city: sourceInfo.city,
          longitude: sourceInfo.longitude || 0,
          latitude: sourceInfo.latitude || 0,
          hop: 0,
          type: 'source'
        };
        allPoints.push(sourcePoint);
        setTracerouteData([sourcePoint]);
        updateChart([sourcePoint], []);
      }

      // 执行traceroute
      const hops = await TracerouteService.trace(targetHost);
      
      let allLines = [];

      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        allPoints.push(hop);

        // 创建连线
        if (i === 0 && sourceInfo) {
          // 从源点到第一跳
          allLines.push({
            coords: [
              [sourceInfo.longitude || 0, sourceInfo.latitude || 0],
              [hop.longitude, hop.latitude]
            ],
            fromName: sourceInfo.ip,
            toName: hop.ip,
            rtt: hop.rtt
          });
        } else if (i > 0) {
          // 跳之间的连线
          const prevHop = hops[i - 1];
          allLines.push({
            coords: [
              [prevHop.longitude, prevHop.latitude],
              [hop.longitude, hop.latitude]
            ],
            fromName: prevHop.ip,
            toName: hop.ip,
            rtt: hop.rtt
          });
        }

        // 更新图表
        updateChart(allPoints, allLines);
        
        // 延迟显示效果
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTracerouteData(allPoints);
      if (onTraceComplete) {
        onTraceComplete(allPoints);
      }
    } catch (error) {
      console.error('Traceroute failed:', error);
      alert('Traceroute 执行失败: ' + error.message);
    } finally {
      setIsTracing(false);
      // 重新启用地图拖动
      setMapRoam(true);
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    performTraceroute
  }));

  const setMapRoam = (enabled) => {
    if (!chart) return;
    
    chart.setOption({
      geo: {
        roam: enabled
      }
    });
  };

  const initializeChart = (chartInstance) => {
    const option = {
      backgroundColor: '#ffffff',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#2d3748',
          fontSize: 12
        },
        formatter: function(params) {
          if (params.componentType === 'series') {
            if (params.seriesType === 'scatter') {
              const hopData = params.data[3];
              if (!hopData) return '';
              
              return `
                <div style="text-align: left; padding: 8px;">
                  <div style="color: #3182ce; font-weight: bold; margin-bottom: 4px;">
                    ${hopData.type === 'source' ? `🏠 ${t('tools.source')}` : hopData.type === 'destination' ? `🎯 ${t('tools.destination')}` : `🌐 ${t('tools.hop')} ${hopData.hop}`}
                  </div>
                  <div style="margin-bottom: 2px;">
                    <span style="color: #718096;">IP:</span> 
                    <span style="color: #2d3748; font-family: monospace;">${hopData.ip}</span>
                  </div>
                  <div style="margin-bottom: 2px;">
                    <span style="color: #718096;">${t('tools.location')}:</span> 
                    <span style="color: #2d3748;">${hopData.country}${hopData.city ? `, ${hopData.city}` : ''}</span>
                  </div>
                  ${hopData.rtt ? `
                    <div>
                      <span style="color: #718096;">${t('tools.rtt')}:</span> 
                      <span style="color: #38a169; font-weight: bold;">${Math.round(hopData.rtt * 100) / 100}ms</span>
                    </div>
                  ` : ''}
                </div>
              `;
            } else if (params.seriesType === 'lines') {
              const lineData = params.data;
              return `
                <div style="text-align: left; padding: 8px;">
                  <div style="color: #3182ce; font-weight: bold; margin-bottom: 4px;">🔗 ${t('tools.routeConnection')}</div>
                  <div style="margin-bottom: 2px;">
                    <span style="color: #718096;">${t('tools.from')}:</span> 
                    <span style="color: #2d3748; font-family: monospace;">${lineData.fromName}</span>
                  </div>
                  <div style="margin-bottom: 2px;">
                    <span style="color: #718096;">${t('tools.to')}:</span> 
                    <span style="color: #2d3748; font-family: monospace;">${lineData.toName}</span>
                  </div>
                  ${lineData.rtt ? `
                    <div>
                      <span style="color: #718096;">${t('tools.latency')}:</span> 
                      <span style="color: #ed8936; font-weight: bold;">${Math.round(lineData.rtt * 100) / 100}ms</span>
                    </div>
                  ` : ''}
                </div>
              `;
            }
          }
          return '';
        }
      },
      geo: {
        type: 'map',
        map: 'world',
        roam: true,
        zoom: 1.2,
        itemStyle: {
          areaColor: '#f7fafc',
          borderColor: '#e2e8f0'
        },
        emphasis: {
          itemStyle: {
            areaColor: '#edf2f7'
          }
        }
      },
      series: [
        {
          name: 'Route Points',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: [],
          symbolSize: function(val) {
            return val[2] === 'source' ? 12 : 8;
          },
          itemStyle: {
            color: function(params) {
              const data = params.data;
              if (data[2] === 'source') return '#38a169';
              if (data[2] === 'destination') return '#e53e3e';
              return '#3182ce';
            }
          },
          label: {
            show: false,
            position: 'right',
            fontSize: 12,
            color: '#2d3748'
          }
        },
        {
          name: 'Route Lines',
          type: 'lines',
          coordinateSystem: 'geo',
          data: [],
          lineStyle: {
            color: function(params) {
              const colors = ['#38a169', '#3182ce', '#ed8936', '#805ad5', '#319795'];
              return colors[params.dataIndex % colors.length];
            },
            width: 2,
            curveness: 0.2,
            opacity: 0.8
          },
          effect: {
            show: true,
            period: 6,
            trailLength: 0.2,
            color: '#2d3748',
            symbolSize: 3
          }
        }
      ]
    };

    chartInstance.setOption(option);
  };

  const updateChart = (points, lines) => {
    if (!chart) return;

    const scatterData = points.map(point => [
      point.longitude,
      point.latitude,
      point.type,
      point
    ]);

    const option = {
      series: [
        {
          name: 'Route Points',
          data: scatterData
        },
        {
          name: 'Route Lines',
          data: lines
        }
      ]
    };

    chart.setOption(option, false);
  };

  return (
    <div className="traceroute-map-container">
      <div className="map-container" ref={chartRef} style={{ width: '100%', height: '500px' }} />

      {tracerouteData.length > 0 && (
        <div className="traceroute-info">
          <h4>{t('tools.routeInfo')} ({tracerouteData.length} {t('tools.hopCount')})</h4>
          <div className="hop-list">
            {tracerouteData.map((hop, index) => (
              <div key={index} className={`hop-item ${hop.type}`}>
                <span className="hop-number">
                  {hop.type === 'source' ? '🏠' : hop.type === 'destination' ? '🎯' : hop.hop}
                </span>
                <span className="hop-ip">{hop.ip}</span>
                <span className="hop-location">
                  {hop.country}
                  {hop.city && hop.city !== hop.country ? `, ${hop.city}` : ''}
                </span>
                {hop.rtt && (
                  <span className="hop-rtt">
                    {Math.round(hop.rtt * 100) / 100}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TracerouteMap.displayName = 'TracerouteMap';

export default TracerouteMap; 