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

// 使用ref来存储持久化数据
const persistentData = {
  trafficData,
  latencyData,
  aggregatedLatencyData,
  currentMinuteData,
  cumulativeTraffic: { up: 0, down: 0 }
};

const StatsOverview = ({ apiAddress }) => {
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [totalTraffic, setTotalTraffic] = useState({ up: 0, down: 0 });
  const [cumulativeTraffic, setCumulativeTraffic] = useState(persistentData.cumulativeTraffic);
  const [ipLocation, setIpLocation] = useState('');
  const [showAsnInfo, setShowAsnInfo] = useState(false);
  const [asnInfo, setAsnInfo] = useState('');
  const [kernelRunning, setKernelRunning] = useState(false);
  
  const trafficChartRef = useRef(null);
  const trafficChartInstance = useRef(null);
  const gaugeChartRef = useRef(null);
  const gaugeChartInstance = useRef(null);
  const isInitialized = useRef(false);
  
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
              persistentData.trafficData.upload.shift();
              persistentData.trafficData.download.shift();
              persistentData.trafficData.timestamps.shift();
              
              persistentData.trafficData.upload.push(data.up / 1024);
              persistentData.trafficData.download.push(data.down / 1024);
              persistentData.trafficData.timestamps.push(new Date().toLocaleTimeString('en-US', { hour12: false }));
              
              // 更新总流量
              setTotalTraffic({
                up: data.up,
                down: data.down
              });
              
              // 更新累计流量
              persistentData.cumulativeTraffic.up += data.up;
              persistentData.cumulativeTraffic.down += data.down;
              setCumulativeTraffic({
                up: persistentData.cumulativeTraffic.up,
                down: persistentData.cumulativeTraffic.down
              });
              
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
      
      processStream();
      
    } catch (error) {
      console.error('Get traffic data failed:', error);
      setConnectionStatus('disconnected');
      setTimeout(fetchTrafficData, 3000);
    }
  };
  
  // 获取IP地理位置信息
  const fetchIpLocation = async (retryCount = 0) => {
    try {
      const locationString = await IPService.getLocationString();
      const asnString = await IPService.getAsnString();
      
      // 检查返回的位置信息是否有效
      const isValidLocation = locationString && 
                            locationString !== 'Unknown' && 
                            !locationString.includes('Unknown');
      
      if (isValidLocation) {
        setIpLocation(locationString);
        setAsnInfo(asnString);
        return;
      }
      
      throw new Error('无效的位置信息');
      
    } catch (error) {
      const errorMsg = error.message === '无效的位置信息' 
        ? 'IP地理位置信息不完整' 
        : 'IP地理位置获取失败';
      
      console.error(`${errorMsg}:`, error);
      
      // 如果重试次数小于3，则重试
      if (retryCount < 3) {
        const nextRetryDelay = (retryCount + 1) * 1000;
        console.log(`${errorMsg}，${retryCount + 1}秒后重试...`);
        setTimeout(() => fetchIpLocation(retryCount + 1), nextRetryDelay);
      } else {
        setIpLocation('Failed to get exit IP location information');
        setAsnInfo('');
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
              color: '#6750A4' // MD3 主色
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(103, 80, 164, 0.3)' }, // MD3 主色透明度
                { offset: 1, color: 'rgba(103, 80, 164, 0.1)' }
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
              color: '#7D5260' // MD3 第三色
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(125, 82, 96, 0.3)' }, // MD3 第三色透明度
                { offset: 1, color: 'rgba(125, 82, 96, 0.1)' }
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
      
      const option = {
        grid: {
          left: 30,    // 减小左边距
          right: 15,   // 略微增加右边距
          top: 20,     // 调整顶部边距
          bottom: 15,  // 调整底部边距
          containLabel: true
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            const detail = params.data[2];
            if (!detail || detail.avg === null) return 'no data';
            
            return `<div style="font-weight:600;margin-bottom:3px;font-size:12px">Network Delay</div>` +
                   `<div style="display:flex;justify-content:space-between"><span>Delay:</span><span style="font-weight:600">${detail.avg.toFixed(0)}ms</span></div>` +
                   `<div style="display:flex;justify-content:space-between"><span>Loss:</span><span style="font-weight:600">${detail.loss.toFixed(1)}%</span></div>`;
          },
          textStyle: {
            fontSize: 12,
            lineHeight: 18
          },
          padding: [8, 10],
          backgroundColor: 'rgba(28, 27, 31, 0.8)', // 更深的背景色增加对比度
          borderColor: 'rgba(103, 80, 164, 0.3)',
          borderWidth: 1,
          borderRadius: 6,
          extraCssText: 'box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);'
        },
        xAxis: {
          type: 'category',
          show: true, // 显示X轴
          boundaryGap: false,
          axisLine: {
            show: true,
            lineStyle: {
              color: 'rgba(103, 80, 164, 0.4)', // MD3 主色带透明度
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
              color: 'rgba(103, 80, 164, 0.4)', // MD3 主色带透明度
              width: 1
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            fontSize: 10,
            fontFamily: 'Roboto, Arial, sans-serif',
            color: '#49454F', // MD3 on-surface-variant 颜色
            formatter: function(value, index) {
              // 只显示部分标签
              if (index === 0 || index === 2 || index === 4) {
                return value + ' ms';
              }
              return '';
            },
            margin: 8
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(103, 80, 164, 0.15)', // 降低分割线的透明度使其更柔和
              width: 0.5,
              type: 'dashed'
            }
          },
          nameTextStyle: {
            fontSize: 10,
            padding: [0, 0, 0, 0]
          }
        },
        series: [
          {
            type: 'line',
            smooth: true,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: function(value) {
              const detail = value[2];
              if (!detail || detail.avg === null) return 3;
              // 调整点的大小，使其更美观
              return 5 + Math.min(detail.loss, 40) / 8;
            },
            data: data,
            lineStyle: {
              width: 2.5, // 增加线宽
              color: '#6750A4', // MD3 主色
              shadowColor: 'rgba(103, 80, 164, 0.3)',
              shadowBlur: 5,
              shadowOffsetY: 2,
              cap: 'round',
              join: 'round'
            },
            itemStyle: {
              color: function(params) {
                const detail = params.data[2];
                if (!detail || detail.avg === null) return '#CAC4D0'; // MD3 outline 颜色
                
                // 增强颜色渐变效果
                if (detail.loss > 20) return '#B3261E'; // MD3 错误色
                if (detail.avg < 30) return '#1E6E5A';  // 更饱和的绿色
                if (detail.avg < 70) return '#9C6D00';  // 更饱和的黄色
                if (detail.avg < 120) return '#BF4A30';  // 轻度错误橙色
                return '#B3261E';                      // MD3 错误色
              },
              borderColor: '#FFF',
              borderWidth: 1.5,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
              shadowBlur: 3
            },
            // 美化波浪填充
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(103, 80, 164, 0.5)' }, // 更高透明度，增强视觉效果
                { offset: 0.5, color: 'rgba(103, 80, 164, 0.2)' },
                { offset: 1, color: 'rgba(103, 80, 164, 0.05)' }
              ]),
              // 加强波浪效果
              shadowColor: 'rgba(103, 80, 164, 0.3)', // MD3 主色带透明度
              shadowBlur: 15,
              opacity: 0.8
            },
            z: 2 // 确保线在最上面
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
      
      // 更新为波浪图
      gaugeChartInstance.current.setOption({
        yAxis: {
          axisLabel: {
            formatter: function(value, index) {
              if (index === 0 || index === 2 || index === 4) {
                return value + ' ms';
              }
              return '';
            }
          }
        },
        series: [
          {
            type: 'line',
            data: data,
            smooth: true,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: function(value) {
              const detail = value[2];
              if (!detail || detail.avg === null) return 3;
              return 5 + Math.min(detail.loss, 40) / 8;
            },
            lineStyle: {
              width: 2.5,
              color: '#6750A4',
              shadowColor: 'rgba(103, 80, 164, 0.3)',
              shadowBlur: 5,
              shadowOffsetY: 2
            },
            itemStyle: {
              color: function(params) {
                const detail = params.data[2];
                if (!detail || detail.avg === null) return '#CAC4D0';
                
                if (detail.loss > 20) return '#B3261E';
                if (detail.avg < 30) return '#1E6E5A';
                if (detail.avg < 70) return '#9C6D00';
                if (detail.avg < 120) return '#BF4A30';
                return '#B3261E';
              },
              borderColor: '#FFF',
              borderWidth: 1.5,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
              shadowBlur: 3
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(103, 80, 164, 0.5)' },
                { offset: 0.5, color: 'rgba(103, 80, 164, 0.2)' },
                { offset: 1, color: 'rgba(103, 80, 164, 0.05)' }
              ]),
              shadowColor: 'rgba(103, 80, 164, 0.3)',
              shadowBlur: 15,
              opacity: 0.8
            }
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
  
  // 处理IP信息点击事件，切换显示内容
  const handleIpInfoClick = () => {
    setShowAsnInfo(!showAsnInfo);
  };
  
  // 组件挂载时初始化
  useEffect(() => {
    // 避免重复初始化
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    initTrafficChart();
    initGaugeChart();
    
    const latencyTimer = setInterval(testLatency, 180000);
    
    // 首次获取数据
    fetchTrafficData();
    testLatency();
    
    // 组件卸载时清理
    return () => {
      clearInterval(latencyTimer);
      
      if (trafficChartInstance.current) {
        trafficChartInstance.current.dispose();
      }
      
      if (gaugeChartInstance.current) {
        gaugeChartInstance.current.dispose();
      }
    };
  }, [apiAddress]);
  
  // 监听内核状态变化
  useEffect(() => {
    // 监听内核启动和停止事件
    if (window.electron && window.electron.singbox) {
      let prevStatus = false;
      
      // 定期检查内核状态
      const checkStatus = async () => {
        try {
          const status = await window.electron.singbox.getStatus();
          // 更新内核运行状态
          setKernelRunning(status.isRunning);
          
          if (!prevStatus && status.isRunning) {
            // 内核从停止到启动，获取IP信息
            setTimeout(fetchIpLocation, 3000);
            // 确保图表能够正确显示
            setTimeout(() => {
              if (gaugeChartInstance.current) {
                gaugeChartInstance.current.resize();
              }
            }, 100);
          } else if (prevStatus && !status.isRunning) {
            // 内核从启动到停止，清空IP信息
            setIpLocation('');
            setAsnInfo('');
          }
          prevStatus = status.isRunning;
        } catch (error) {
          console.error('获取内核状态失败:', error);
          setKernelRunning(false);
        }
      };

      // 每2秒检查一次状态，提高响应速度
      const statusInterval = setInterval(checkStatus, 2000);
      
      // 初始检查一次
      checkStatus();
      
      return () => {
        clearInterval(statusInterval);
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
              {kernelRunning && (ipLocation || asnInfo) ? (
              <span onClick={handleIpInfoClick} style={{ cursor: 'pointer' }}>
                  Node IP: {showAsnInfo && asnInfo ? asnInfo : ipLocation}
              </span>
              ) : (
                new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              )}
            </div>
          </div>
          
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
            marginBottom: '8px', 
            fontSize: '14px',
            fontFamily: 'Roboto, Arial, sans-serif',
            fontWeight: '500',
            color: '#6750A4',
            letterSpacing: '0.5px',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(103, 80, 164, 0.1)',
            visibility: kernelRunning ? 'visible' : 'hidden'  // 内核未运行时隐藏标题但保留占位
          }}>
            Network Latency
          </div>
          <div id="gauge-wrapper" className="gauge-wrapper">
            <div 
              id="gauge-chart"
              ref={gaugeChartRef} 
              className="gauge-chart"
              style={{ visibility: kernelRunning ? 'visible' : 'hidden' }} // 内核未运行时隐藏图表但保留占位
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview; 