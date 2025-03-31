import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import '../../assets/css/stats-overview.css';
import IPService from '../../services/ip/IPService';

// 流量数据缓存
const trafficData = {
  upload: Array(60).fill(0),
  download: Array(60).fill(0),
  timestamps: Array(60).fill(0)
};

// 延迟数据缓存
const latencyData = {
  values: Array(60).fill(null),
  timestamps: Array(60).fill(0)
};

// 延迟聚合数据（1分钟一个点）
const aggregatedLatencyData = {
  values: Array(15).fill(null), // 存储15个时间点的数据
  timestamps: Array(15).fill(''),
  // 每个点存储的数据结构：{avg: 平均值, min: 最小值, max: 最大值, loss: 丢包率}
  details: Array(15).fill(null).map(() => ({ avg: null, min: null, max: null, loss: 0 }))
};

// 当前分钟的延迟测量集合
const currentMinuteData = {
  values: [],
  failures: 0,
  total: 0,
  lastUpdate: null
};

const StatsOverview = ({ apiAddress }) => {
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0); // 添加丢包率状态
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [totalTraffic, setTotalTraffic] = useState({ up: 0, down: 0 });
  const [cumulativeTraffic, setCumulativeTraffic] = useState({ up: 0, down: 0 });
  const [ipLocation, setIpLocation] = useState(''); // 添加IP地理位置状态
  
  const trafficChartRef = useRef(null);
  const trafficChartInstance = useRef(null);
  const gaugeChartRef = useRef(null);
  const gaugeChartInstance = useRef(null);
  
  // 使用一个计数器来记录成功和失败次数，计算丢包率
  const pingCounter = useRef({ total: 0, failed: 0 });
  
  // 更新聚合数据
  const updateAggregatedData = (currentTime) => {
    // 如果是新的一分钟，则计算聚合数据并更新
    if (!currentMinuteData.lastUpdate || 
        currentTime.getMinutes() !== currentMinuteData.lastUpdate.getMinutes() || 
        currentTime.getHours() !== currentMinuteData.lastUpdate.getHours()) {
      
      if (currentMinuteData.values.length > 0 || currentMinuteData.failures > 0) {
        // 计算聚合数据
        const validValues = currentMinuteData.values.filter(v => v !== null && v !== undefined);
        const totalTests = currentMinuteData.total;
        
        // 计算统计值
        const newPoint = {
          avg: validValues.length ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null,
          min: validValues.length ? Math.min(...validValues) : null,
          max: validValues.length ? Math.max(...validValues) : null,
          loss: totalTests ? (currentMinuteData.failures / totalTests) * 100 : 0
        };
        
        // 生成时间戳标签 (HH:MM格式)
        const timestamp = currentMinuteData.lastUpdate ? 
                          currentMinuteData.lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                          '';
        
        // 更新聚合数据数组 (FIFO)
        aggregatedLatencyData.values.shift();
        aggregatedLatencyData.timestamps.shift();
        aggregatedLatencyData.details.shift();
        
        aggregatedLatencyData.values.push(newPoint.avg);
        aggregatedLatencyData.timestamps.push(timestamp);
        aggregatedLatencyData.details.push(newPoint);
        
        // 重置当前分钟数据
        currentMinuteData.values = [];
        currentMinuteData.failures = 0;
        currentMinuteData.total = 0;
      }
    }
    
    // 更新最后更新时间
    currentMinuteData.lastUpdate = currentTime;
  };
  
  // 前端简单的延迟测试函数
  const testLatency = async () => {
    // 检查内核是否运行
    if (window.electron && window.electron.singbox && window.electron.singbox.getStatus) {
      try {
        const status = await window.electron.singbox.getStatus();
        if (!status.isRunning) {
          console.log('内核未运行，不执行延迟测试');
          return;
        }
      } catch (error) {
        console.error('获取内核状态失败:', error);
        return;
      }
    }
    
    // 更新全局计数器
    pingCounter.current.total++;
    
    // 更新当前分钟计数器
    currentMinuteData.total++;
    
    const currentTime = new Date();
    
    try {
      const startTime = currentTime.getTime();
      
      // 使用fetch API发送请求到Google并测量响应时间
      const response = await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',  // 使用no-cors模式
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const endTime = new Date().getTime();
      const pingTime = endTime - startTime;
      
      setLatency(pingTime);
      setConnectionStatus('connected');
      
      // 更新原始散点图数据
      latencyData.values.shift();
      latencyData.timestamps.shift();
      latencyData.values.push(pingTime);
      latencyData.timestamps.push(currentTime.toLocaleTimeString('en-US', { hour12: false }));
      
      // 添加到当前分钟数据集合
      currentMinuteData.values.push(pingTime);
      
      // 更新聚合数据
      updateAggregatedData(currentTime);
      
      // 更新图表
      updateLatencyChart();
      
    } catch (error) {
      console.error('延迟测试失败:', error);
      // 如果测试失败，显示无连接状态
      setConnectionStatus('disconnected');
      pingCounter.current.failed++;
      currentMinuteData.failures++;
      
      // 更新原始散点图数据
      latencyData.values.shift();
      latencyData.timestamps.shift();
      latencyData.values.push(null);
      latencyData.timestamps.push(currentTime.toLocaleTimeString('en-US', { hour12: false }));
      
      // 更新聚合数据
      updateAggregatedData(currentTime);
      
      // 更新图表
      updateLatencyChart();
    }
    
    // 计算丢包率
    const lossRate = (pingCounter.current.failed / pingCounter.current.total) * 100;
    setPacketLoss(Math.round(lossRate * 10) / 10); // 保留一位小数
  };
  
  // 获取流量数据
  const fetchTrafficData = async () => {
    try {
      // 使用fetch API创建流式连接
      const response = await fetch(`http://${apiAddress}/traffic`);
      
      // 创建流式数据读取器
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 开始流式读取
      const processStream = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            
            if (done) {
              console.log('流量数据流已关闭');
              break;
            }
            
            // 解码二进制数据为文本
            const chunk = decoder.decode(value, { stream: true });
            
            try {
              // 处理JSON数据
              const data = JSON.parse(chunk);
              
              // 更新流量数据数组 (FIFO)
              trafficData.upload.shift();
              trafficData.download.shift();
              trafficData.timestamps.shift();
              
              // 添加新数据
              trafficData.upload.push(data.up / 1024); // 转换为KB
              trafficData.download.push(data.down / 1024); // 转换为KB
              trafficData.timestamps.push(new Date().toLocaleTimeString('en-US', { hour12: false }));
              
              // 更新总流量
              setTotalTraffic({
                up: data.up,
                down: data.down
              });
              
              // 更新累计流量
              setCumulativeTraffic(prev => ({
                up: prev.up + data.up,
                down: prev.down + data.down
              }));
              
              // 更新图表
              updateTrafficChart();
            } catch (parseError) {
              console.error('JSON解析错误:', parseError);
            }
          }
        } catch (streamError) {
          console.error('流数据读取错误:', streamError);
          setConnectionStatus('disconnected');
          // 一旦连接断开，尝试重新连接
          setTimeout(fetchTrafficData, 3000);
        }
      };
      
      // 开始处理流
      processStream();
      
    } catch (error) {
      console.error('获取流量数据失败:', error);
      // 如果获取失败，设置断开连接状态
      setConnectionStatus('disconnected');
      // 尝试重新连接
      setTimeout(fetchTrafficData, 3000);
    }
  };
  
  // 获取IP地理位置信息
  const fetchIpLocation = async (retryCount = 0) => {
    try {
      const locationString = await IPService.getLocationString();
      if (locationString && locationString !== '未知位置' && !locationString.includes('未知')) {
        setIpLocation(locationString);
        return;
      }
      
      // 如果获取失败或结果不完整，且重试次数小于3，则重试
      if (retryCount < 3) {
        console.log(`IP地理位置信息不完整，${retryCount + 1}秒后重试...`);
        setTimeout(() => fetchIpLocation(retryCount + 1), (retryCount + 1) * 1000);
      } else {
        console.error('多次获取IP地理位置失败');
        setIpLocation('未能获取出口IP位置信息');
      }
    } catch (error) {
      console.error('获取IP地理位置失败:', error);
      // 如果获取失败且重试次数小于3，则重试
      if (retryCount < 3) {
        console.log(`获取IP地理位置失败，${retryCount + 1}秒后重试...`);
        setTimeout(() => fetchIpLocation(retryCount + 1), (retryCount + 1) * 1000);
      } else {
        setIpLocation('未能获取出口IP位置信息');
      }
    }
  };
  
  // 初始化流量图表
  const initTrafficChart = () => {
    if (trafficChartRef.current) {
      // 如果已存在实例，则销毁
      if (trafficChartInstance.current) {
        trafficChartInstance.current.dispose();
      }
      
      // 创建新实例
      const chart = echarts.init(trafficChartRef.current);
      trafficChartInstance.current = chart;
      
      // 设置图表选项
      const option = {
        grid: {
          top: 30,
          bottom: 30,
          left: 50,
          right: 15
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            const time = params[0].axisValue;
            let result = `${time}<br>`;
            params.forEach(param => {
              result += `${param.seriesName}: ${param.value.toFixed(2)} KB/s<br>`;
            });
            return result;
          }
        },
        legend: {
          data: ['上传', '下载'],
          right: 10,
          top: 0
        },
        xAxis: {
          type: 'category',
          data: trafficData.timestamps,
          axisLabel: {
            fontSize: 10,
            showMaxLabel: true
          }
        },
        yAxis: {
          type: 'value',
          name: 'KB/s',
          nameTextStyle: {
            fontSize: 10
          },
          axisLabel: {
            fontSize: 10
          }
        },
        series: [
          {
            name: '上传',
            type: 'line',
            data: trafficData.upload,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              width: 2,
              color: '#f56c6c'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245, 108, 108, 0.3)' },
                { offset: 1, color: 'rgba(245, 108, 108, 0.1)' }
              ])
            }
          },
          {
            name: '下载',
            type: 'line',
            data: trafficData.download,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              width: 2,
              color: '#409eff'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
              ])
            }
          }
        ]
      };
      
      // 应用选项
      chart.setOption(option);
      
      // 响应窗口大小变化
      window.addEventListener('resize', () => chart.resize());
    }
  };
  
  // 初始化延迟散点图
  const initGaugeChart = () => {
    if (gaugeChartRef.current) {
      // 如果已存在实例，则销毁
      if (gaugeChartInstance.current) {
        gaugeChartInstance.current.dispose();
      }
      
      // 创建新实例
      const chart = echarts.init(gaugeChartRef.current);
      gaugeChartInstance.current = chart;
      
      // 准备数据
      const data = aggregatedLatencyData.values.map((val, index) => {
        const detail = aggregatedLatencyData.details[index];
        return [index, val, detail]; // [x坐标(索引), y坐标(平均延迟), 详细信息]
      });
      
      // 设置图表选项 - 散点图
      const option = {
        grid: {
          left: 30,    // 减小左边距
          right: 10,   // 减小右边距
          top: 25,     // 增加顶部边距为标题留出空间
          bottom: 10,  // 保持一定的底部边距
          containLabel: true
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            const detail = params.data[2];
            if (!detail || detail.avg === null) return '无数据';
            
            return `
              时间: ${aggregatedLatencyData.timestamps[params.dataIndex]}<br>
              平均延迟: ${detail.avg.toFixed(0)} ms<br>
              最小值: ${detail.min.toFixed(0)} ms<br>
              最大值: ${detail.max.toFixed(0)} ms<br>
              丢包率: ${detail.loss.toFixed(1)}%
            `;
          }
        },
        xAxis: {
          type: 'category',
          show: true, // 显示X轴
          boundaryGap: false,
          axisLine: {
            show: true,
            lineStyle: {
              color: '#ccc',
              width: 1
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: false // 不显示X轴标签
          },
          splitLine: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: function(value) {
            return value.max < 100 ? 100 : Math.ceil(value.max / 50) * 50;
          },
          axisLine: {
            show: true,  // 显示Y轴线
            lineStyle: {
              color: '#ccc',
              width: 1
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            fontSize: 9,
            color: '#999',
            formatter: function(value, index) {
              // 只显示第一个和最后一个标签
              if (index === 0 || index === 5) {  // 使用固定值5代替this.yAxis.ticksLength-1
                return value + ' ms';
              }
              return '';
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#eee',
              width: 0.5,
              type: 'dashed'
            }
          },
          nameTextStyle: {
            fontSize: 9,
            padding: [0, 0, 0, 0]
          }
        },
        series: [
          {
            type: 'scatter',
            symbolSize: function(value) {
              // 缩小点的大小
              const detail = value[2];
              if (!detail || detail.avg === null) return 3;
              return 5 + Math.min(detail.loss, 50) / 10; // 减小基础大小和增量
            },
            data: data,
            itemStyle: {
              color: function(params) {
                const detail = params.data[2];
                if (!detail || detail.avg === null) return '#ccc'; // 无数据
                
                // 颜色根据丢包率和平均延迟综合计算
                if (detail.loss > 20) return '#f56c6c'; // 高丢包率
                if (detail.avg < 30) return '#67c23a';  // 良好延迟
                if (detail.avg < 70) return '#e6a23c';  // 中等延迟
                return '#f56c6c';                    // 较差延迟
              }
            }
          },
          // 添加连线
          {
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: aggregatedLatencyData.values.map((val, index) => [index, val]),
            lineStyle: {
              width: 0.8, // 减小线宽
              color: '#909399',
              opacity: 0.5
            },
            z: 1 // 确保线在散点下面
          }
        ]
      };
      
      // 应用选项
      chart.setOption(option);
      
      // 响应窗口大小变化
      window.addEventListener('resize', () => chart.resize());
    }
  };
  
  // 更新延迟散点图
  const updateLatencyChart = () => {
    if (gaugeChartInstance.current) {
      // 准备数据
      const data = aggregatedLatencyData.values.map((val, index) => {
        const detail = aggregatedLatencyData.details[index];
        return [index, val, detail]; // [x坐标(索引), y坐标(平均延迟), 详细信息]
      });
      
      gaugeChartInstance.current.setOption({
        series: [
          {
            type: 'scatter',
            data: data
          },
          {
            type: 'line',
            data: aggregatedLatencyData.values.map((val, index) => [index, val])
          }
        ]
      });
    }
  };
  
  // 更新流量图表
  const updateTrafficChart = () => {
    if (trafficChartInstance.current) {
      trafficChartInstance.current.setOption({
        xAxis: {
          data: trafficData.timestamps
        },
        series: [
          {
            name: '上传',
            data: trafficData.upload
          },
          {
            name: '下载',
            data: trafficData.download
          }
        ]
      });
    }
  };
  
  // 格式化实时速率显示
  const formatTraffic = (bytes) => {
    if (bytes < 1024) return { value: Math.round(bytes), unit: 'B/s' };
    if (bytes < 1024 * 1024) return { value: Math.round(bytes / 1024), unit: 'KB/s' };
    return { value: Math.round(bytes / (1024 * 1024)), unit: 'MB/s' };
  };
  
  // 格式化累计流量显示
  const formatTotalTraffic = (bytes) => {
    if (bytes < 1024) return { value: Math.round(bytes), unit: 'B' };
    if (bytes < 1024 * 1024) return { value: Math.round(bytes / 1024), unit: 'KB' };
    if (bytes < 1024 * 1024 * 1024) return { value: Math.round(bytes / (1024 * 1024)), unit: 'MB' };
    return { value: Math.round(bytes / (1024 * 1024 * 1024)), unit: 'GB' };
  };

  // 自动进行单位换算，确保数值不超过3位数
  const formatWithOptimalUnit = (formatResult) => {
    let { value, unit } = formatResult;
    const unitMap = {
      'B/s': ['B/s', 'KB/s', 'MB/s', 'GB/s'],
      'KB/s': ['KB/s', 'MB/s', 'GB/s'],
      'MB/s': ['MB/s', 'GB/s'],
      'B': ['B', 'KB', 'MB', 'GB', 'TB'],
      'KB': ['KB', 'MB', 'GB', 'TB'],
      'MB': ['MB', 'GB', 'TB'],
      'GB': ['GB', 'TB']
    };
    
    const units = unitMap[unit] || [unit];
    let unitIndex = 0;
    
    // 如果数值大于999，进行单位换算
    while (value > 999 && unitIndex < units.length - 1) {
      value = value / 1024;
      unitIndex++;
    }
    
    // 处理小数，如果数值大于100显示整数，否则保留一位小数
    value = value > 100 ? Math.round(value) : Math.round(value * 10) / 10;
    
    return { value, unit: units[unitIndex] };
  };
  
  // 组件挂载时初始化
  useEffect(() => {
    // 初始化图表
    initTrafficChart();
    initGaugeChart();
    
    // 设置延迟测试定时器（3分钟一次）
    const latencyTimer = setInterval(testLatency, 180000);
    
    // 首次获取数据
    fetchTrafficData();
    testLatency();
    
    // 获取IP地理位置信息
    fetchIpLocation();
    
    // 监听内核状态变化
    let statusListener = null;
    if (window.electron && window.electron.singbox) {
      // 监听内核退出事件，内核退出后清空IP地理位置信息
      statusListener = window.electron.singbox.onExit(() => {
        setIpLocation('');
      });
      
      // 检查当前内核是否正在运行，如果正在运行则获取IP地理位置
      window.electron.singbox.getStatus().then(status => {
        if (status.isRunning) {
          // 给内核一点时间建立连接后再检查IP
          setTimeout(fetchIpLocation, 2000);
        }
      });
    }
    
    // 组件卸载时清理
    return () => {
      clearInterval(latencyTimer);
      
      if (trafficChartInstance.current) {
        trafficChartInstance.current.dispose();
      }
      
      if (gaugeChartInstance.current) {
        gaugeChartInstance.current.dispose();
      }
      
      if (statusListener) {
        statusListener();
      }
    };
  }, [apiAddress]);
  
  // 添加内核启动后的IP检测
  useEffect(() => {
    // 监听内核启动事件
    if (window.electron && window.electron.singbox) {
      // 订阅内核输出事件，通过检测内核输出判断内核是否启动成功
      const outputListener = window.electron.singbox.onOutput(data => {
        // 当内核输出包含启动成功的信息时，获取IP地理位置
        if (data && typeof data === 'string' && 
            (data.includes('server started') || data.includes('starting tun interface'))) {
          // 延迟几秒钟等待连接稳定
          setTimeout(fetchIpLocation, 3000);
        }
      });
      
      return () => {
        if (outputListener) {
          outputListener();
        }
      };
    }
  }, []);
  
  return (
    <div id="stats-overview-container" className="stats-overview-container">
      {/* 主要内容区域：左侧标题和监控指标，右侧仪表盘 */}
      <div id="stats-content" className="stats-content">
        {/* 左侧标题和统计信息 */}
        <div id="stats-metrics" className="stats-metrics">
          {/* 标题和日期 */}
          <div id="stats-header" className="stats-header">
            <h2 id="stats-title" className="stats-title">
              Network Stats
            </h2>
            <div id="stats-date" className="stats-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          
          {/* IP地理位置信息 */}
          {ipLocation && (
            <div id="ip-location" className="ip-location">
              <span>IP：{ipLocation}</span>
            </div>
          )}
          
          {/* 监控指标行 - 水平排列 */}
          <div id="metrics-row" className="metrics-row">
            {/* 上传速率 */}
            <div id="upload-metric" className="metric-item">
              <div className="metric-value">
                {(() => {
                  const formatted = formatWithOptimalUnit(formatTraffic(totalTraffic.up));
                  return (
                    <>
                      {formatted.value}
                      <span className="metric-unit">{formatted.unit}</span>
                    </>
                  );
                })()}
              </div>
              <div className="metric-label-container">
                <span className="metric-label">
                  Upload
                </span>
              </div>
            </div>
            
            {/* 下载速率 */}
            <div id="download-metric" className="metric-item">
              <div className="metric-value">
                {(() => {
                  const formatted = formatWithOptimalUnit(formatTraffic(totalTraffic.down));
                  return (
                    <>
                      {formatted.value}
                      <span className="metric-unit">{formatted.unit}</span>
                    </>
                  );
                })()}
              </div>
              <div className="metric-label-container">
                <span className="metric-label">
                  Download
                </span>
              </div>
            </div>
            
            {/* 总流量 */}
            <div id="total-metric" className="metric-item">
              <div className="metric-value">
                {(() => {
                  const formatted = formatWithOptimalUnit(formatTotalTraffic(cumulativeTraffic.down + cumulativeTraffic.up));
                  return (
                    <>
                      {formatted.value}
                      <span className="metric-unit">{formatted.unit}</span>
                    </>
                  );
                })()}
              </div>
              <div className="metric-label-container">
                <span className="metric-label">
                  Total
                </span>
              </div>
            </div>
            
            {/* 丢包率 (原延迟状态) */}
            <div id="latency-metric" className="metric-item">
              <div className="metric-value">
                {Math.round(packetLoss)}
                <span className="metric-unit">%</span>
              </div>
              <div className="metric-label-container">
                <span className="metric-label">
                  Packet Loss
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧延迟散点图 */}
        <div id="gauge-container" className="gauge-container">
          {/* 将Network Latency移到顶部 */}
          <div id="gauge-label" className="gauge-label" style={{ 
            position: 'relative', 
            top: '0', 
            marginBottom: '5px', 
            fontSize: '13px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: '600',
            color: '#444',
            letterSpacing: '0.5px'
          }}>
            Network Latency
          </div>
          <div id="gauge-wrapper" className="gauge-wrapper">
            <div 
              id="gauge-chart"
              ref={gaugeChartRef} 
              className="gauge-chart"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview; 