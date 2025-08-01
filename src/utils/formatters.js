/**
 * 通用格式化工具函数
 */

/**
 * @param {number} bytes - 字节数
 * @param {string} suffix - 后缀 (如 '/s' 表示速率)
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
export const formatBytes = (bytes, suffix = '', decimals = 2) => {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return `0 B${suffix}`;
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // 如果数值大于100显示整数，否则保留指定小数位
  const formattedValue = value > 100 ? Math.round(value) : parseFloat(value.toFixed(dm));

  return `${formattedValue} ${sizes[i]}${suffix}`;
};

/**
 * 格式化字节数为对象格式 (用于复杂显示)
 * @param {number} bytes - 字节数
 * @param {string} suffix - 后缀 (如 '/s' 表示速率)
 * @returns {object} {value: number, unit: string}
 */
export const formatBytesToObject = (bytes, suffix = '') => {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return { value: 0, unit: `B${suffix}` };
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // 如果数值大于100显示整数，否则保留一位小数
  const formattedValue = value > 100 ? Math.round(value) : Math.round(value * 10) / 10;

  return {
    value: formattedValue,
    unit: `${sizes[i]}${suffix}`
  };
};

/**
 * 自动进行单位换算，确保数值不超过3位数
 * @param {object} formatResult - {value: number, unit: string}
 * @returns {object} {value: number, unit: string}
 */
export const formatWithOptimalUnit = (formatResult) => {
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

/**
 * 格式化时间戳为 HH:MM:SS 格式
 * @param {string|number|Date} timestamp - 时间戳
 * @param {boolean} includeMilliseconds - 是否包含毫秒
 * @returns {string} 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp, includeMilliseconds = false) => {
  if (!timestamp) return '--:--:--';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '--:--:--';
    }
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    if (includeMilliseconds) {
      const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
      return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    
    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return timestamp.toString();
  }
};

/**
 * 格式化延迟时间
 * @param {number} latency - 延迟时间 (毫秒)
 * @returns {string} 格式化后的延迟字符串
 */
export const formatLatency = (latency) => {
  if (latency === 'timeout' || latency === undefined || latency === null) {
    return 'timeout';
  }
  
  if (typeof latency === 'number') {
    return `${latency}ms`;
  }
  
  return latency.toString();
};

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  
  return `${parseFloat(value.toFixed(decimals))}%`;
};
