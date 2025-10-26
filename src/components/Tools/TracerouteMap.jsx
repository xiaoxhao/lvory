import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts/core';
import { ScatterChart, LinesChart, EffectScatterChart } from 'echarts/charts';
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import IPService from '../../services/ip/IPService';
import TracerouteService from '../../services/network/TracerouteService';

echarts.use([
  ScatterChart,
  LinesChart,
  EffectScatterChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  CanvasRenderer
]);

const TracerouteMap = forwardRef(({ targetHost, setTargetHost, setIsTracing, onTraceComplete, existingData, onBackToTable }, ref) => {
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

  useEffect(() => {
    if (existingData && existingData.length > 0 && chart) {
      console.log('TracerouteMap: Received existing data:', existingData);
      setTracerouteData(existingData);

      // 过滤掉无效的经纬度数据
      const validData = existingData.filter(hop => {
        const isValid = hop.latitude != null && hop.longitude != null &&
          hop.latitude !== 0 && hop.longitude !== 0 &&
          hop.ip !== '*' && hop.ip !== undefined &&
          typeof hop.latitude === 'number' && typeof hop.longitude === 'number';

        if (!isValid) {
          console.log('TracerouteMap: Filtering out invalid hop:', hop);
        }
        return isValid;
      });

      console.log('TracerouteMap: Valid data for mapping:', validData);

      if (validData.length === 0) {
        console.log('TracerouteMap: No valid data to display on map');
        return;
      }

      // 构建连线数据
      let allLines = [];
      for (let i = 1; i < validData.length; i++) {
        const prevHop = validData[i - 1];
        const currentHop = validData[i];

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

      console.log('TracerouteMap: Lines data:', allLines);
      setTimeout(() => {
        updateChart(validData, allLines);
      }, 200);
    }
  }, [existingData, chart]);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化ECharts实例
    const chartInstance = echarts.init(chartRef.current);

    // 注册世界地图
    fetch('https://cdn.jsdelivr.net/npm/echarts@latest/map/json/world.json')
      .then(response => {
        console.log('TracerouteMap: World map response received');
        return response.json();
      })
      .then(worldMapData => {
        console.log('TracerouteMap: World map data loaded successfully', worldMapData ? 'Data exists' : 'No data');
        echarts.registerMap('world', worldMapData);
        initializeChart(chartInstance);
        // 在图表完全初始化后设置chart状态
        setChart(chartInstance);
      })
      .catch(error => {
        console.error('TracerouteMap: 加载世界地图数据失败:', error);
        console.log('TracerouteMap: Initializing chart without world map data');
        initializeChart(chartInstance);
        // 在图表完全初始化后设置chart状态
        setChart(chartInstance);
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

        // 创建连线 - 只有当坐标有效时才创建
        if (i === 0 && sourceInfo && 
            sourceInfo.longitude != null && sourceInfo.latitude != null &&
            hop.longitude != null && hop.latitude != null &&
            hop.longitude !== 0 && hop.latitude !== 0) {
          // 从源点到第一跳
          allLines.push({
            coords: [
              [sourceInfo.longitude, sourceInfo.latitude],
              [hop.longitude, hop.latitude]
            ],
            fromName: sourceInfo.ip,
            toName: hop.ip,
            rtt: hop.rtt
          });
        } else if (i > 0) {
          // 跳之间的连线
          const prevHop = hops[i - 1];
          if (prevHop.longitude != null && prevHop.latitude != null &&
              hop.longitude != null && hop.latitude != null &&
              prevHop.longitude !== 0 && prevHop.latitude !== 0 &&
              hop.longitude !== 0 && hop.latitude !== 0) {
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
    console.log('TracerouteMap: Initializing chart');
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
                    ${hopData.type === 'source' ? `${t('tools.source')}` : hopData.type === 'destination' ? `${t('tools.destination')}` : `${t('tools.hop')} ${hopData.hop}`}
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
                  <div style="color: #3182ce; font-weight: bold; margin-bottom: 4px;">${t('tools.routeConnection')}</div>
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
    console.log('TracerouteMap: Chart initialized successfully');

    // 验证初始化后的配置
    const verifyOption = chartInstance.getOption();
    console.log('TracerouteMap: Geo config after init:', verifyOption.geo ? 'Present' : 'Missing');
    console.log('TracerouteMap: Series config after init:', verifyOption.series ? verifyOption.series.length : 0, 'series');
  };


  const updateChart = (points, lines) => {
    if (!chart) {
      console.log('TracerouteMap: Chart not initialized');
      return;
    }

    if (!points || points.length === 0) {
      console.log('TracerouteMap: No valid points to display');
      return;
    }

    // 检查geo坐标系是否已经初始化
    try {
      const currentOption = chart.getOption();
      if (!currentOption || !currentOption.geo || !currentOption.geo[0]) {
        console.log('TracerouteMap: Geo coordinate system not initialized, retrying...');
        setTimeout(() => updateChart(points, lines), 100);
        return;
      }
    } catch (error) {
      console.log('TracerouteMap: Error checking chart option, retrying...', error);
      setTimeout(() => updateChart(points, lines), 100);
      return;
    }

    const scatterData = points.map(point => [
      point.longitude,
      point.latitude,
      point.type,
      point
    ]);

    console.log('TracerouteMap: Updating chart with scatter data:', scatterData);
    console.log('TracerouteMap: Updating chart with lines data:', lines);

    const validLines = lines || [];

    // 完整更新series配置，确保coordinateSystem正确设置
    const option = {
      series: [
        {
          name: 'Route Points',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
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
          data: validLines,
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

    chart.setOption(option, false);
    console.log('TracerouteMap: Chart updated successfully');
  };

  return (
    <div className="traceroute-map-container">
      <div className="map-header">
        {onBackToTable && (
          <button
            className="back-to-table-button"
            onClick={onBackToTable}
          >
            {t('tools.backToTable')}
          </button>
        )}
      </div>
      <div className="map-container" ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

TracerouteMap.displayName = 'TracerouteMap';

export default TracerouteMap; 