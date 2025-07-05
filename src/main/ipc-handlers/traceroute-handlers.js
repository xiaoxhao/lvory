const { ipcMain } = require('electron');
const Traceroute = require('nodejs-traceroute');
const http = require('http');
const logger = require('../../utils/logger');

class TracerouteHandlers {
  static currentTracer = null;
  static isValidTarget(target) {
    if (!target || typeof target !== 'string' || target.trim().length === 0) {
      return false;
    }
    
    const trimmedTarget = target.trim();
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return ipv4Regex.test(trimmedTarget) || domainRegex.test(trimmedTarget);
  }

  static async getLocationInfo(ip) {
    return new Promise((resolve) => {
      const url = `http://ip-api.com/json/${ip}?lang=zh-CN`;

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            logger.info(`Location API response for ${ip}:`, parsed);

            if (parsed.status === 'success') {
              const result = {
                country: parsed.country || 'Unknown',
                city: parsed.city || parsed.regionName || 'Unknown',
                latitude: parsed.lat || null,
                longitude: parsed.lon || null,
                isp: parsed.isp || '',
                org: parsed.org || '',
                timezone: parsed.timezone || ''
              };
              logger.info(`Resolved location for ${ip}:`, result);
              resolve(result);
            } else {
              logger.warn(`Location API failed for ${ip}:`, parsed);
              resolve({
                country: 'Unknown',
                city: 'Unknown',
                latitude: null,
                longitude: null,
                isp: '',
                org: '',
                timezone: ''
              });
            }
          } catch (error) {
            logger.warn(`Failed to parse location data for ${ip}:`, error);
            resolve({
              country: 'Unknown',
              city: 'Unknown',
              latitude: null,
              longitude: null,
              isp: '',
              org: '',
              timezone: ''
            });
          }
        });
      }).on('error', (error) => {
        logger.warn(`Failed to get location for ${ip}:`, error);
        resolve({
          country: 'Unknown',
          city: 'Unknown',
          latitude: null,
          longitude: null,
          isp: '',
          org: '',
          timezone: ''
        });
      });
    });
  }

  static async executeTraceroute(target) {
    return new Promise((resolve, reject) => {
      logger.info(`Starting traceroute to ${target} using nodejs-traceroute`);

      const hops = [];
      const tracer = new Traceroute();
      let hopTimeouts = new Map(); // 存储每个hop的超时计时器
      const HOP_TIMEOUT = 100000; // 每个hop的超时时间：100秒
      const MAX_TOTAL_TIME = 300000; // 最大总时间：5分钟

      // 设置全局超时机制作为最后保障
      const globalTimeout = setTimeout(() => {
        logger.warn(`Traceroute to ${target} reached maximum time limit`);
        hopTimeouts.forEach(timeout => clearTimeout(timeout));
        hopTimeouts.clear();
        if (hops.length > 0) {
          resolve(hops);
        } else {
          reject(new Error('Traceroute timed out'));
        }
      }, MAX_TOTAL_TIME);

      // 为当前hop设置超时
      const setHopTimeout = (hopNumber) => {
        // 清除之前的hop超时
        if (hopTimeouts.has(hopNumber - 1)) {
          clearTimeout(hopTimeouts.get(hopNumber - 1));
          hopTimeouts.delete(hopNumber - 1);
        }

        const timeout = setTimeout(() => {
          logger.warn(`Hop ${hopNumber} timed out after ${HOP_TIMEOUT}ms`);
          // 添加超时的hop数据
          const timeoutHopData = {
            hop: hopNumber,
            ip: '*',
            rtt: null,
            type: 'hop',
            country: 'Unknown',
            city: 'Unknown',
            latitude: null,
            longitude: null,
            timeout: true
          };
          hops.push(timeoutHopData);
          hopTimeouts.delete(hopNumber);
        }, HOP_TIMEOUT);

        hopTimeouts.set(hopNumber, timeout);
      };

      tracer
        .on('pid', (pid) => {
          logger.info(`Traceroute process started with PID: ${pid}`);
          // 为第一个hop设置超时
          setHopTimeout(1);
        })
        .on('destination', (destination) => {
          logger.info(`Traceroute destination: ${destination}`);
        })
        .on('hop', async (hop) => {
          logger.info(`Received hop: ${JSON.stringify(hop)}`);

          // 清除当前hop的超时计时器
          if (hopTimeouts.has(hop.hop)) {
            clearTimeout(hopTimeouts.get(hop.hop));
            hopTimeouts.delete(hop.hop);
          }

          // 为下一个hop设置超时
          setHopTimeout(hop.hop + 1);

          try {
            // 跳过空IP或星号
            if (!hop.ip || hop.ip === '*' || hop.ip.trim() === '') {
              const hopData = {
                hop: hop.hop,
                ip: '*',
                rtt: null,
                type: 'hop',
                country: 'Unknown',
                city: 'Unknown',
                latitude: null,
                longitude: null
              };
              hops.push(hopData);
              return;
            }

            const locationInfo = await this.getLocationInfo(hop.ip);

            // 解析RTT值，支持多种格式
            let rtt = null;
            if (hop.rtt1 && hop.rtt1 !== '*') {
              rtt = parseFloat(hop.rtt1.replace(/[^\d.]/g, ''));
            } else if (hop.rtt2 && hop.rtt2 !== '*') {
              rtt = parseFloat(hop.rtt2.replace(/[^\d.]/g, ''));
            } else if (hop.rtt3 && hop.rtt3 !== '*') {
              rtt = parseFloat(hop.rtt3.replace(/[^\d.]/g, ''));
            }

            const hopData = {
              hop: hop.hop,
              ip: hop.ip,
              rtt: isNaN(rtt) ? null : rtt,
              type: 'hop',
              ...locationInfo
            };

            hops.push(hopData);
          } catch (error) {
            logger.warn(`Failed to process hop ${hop.hop} (${hop.ip}):`, error);
            hops.push({
              hop: hop.hop,
              ip: hop.ip || '*',
              rtt: null,
              type: 'hop',
              country: 'Unknown',
              city: 'Unknown',
              latitude: null,
              longitude: null
            });
          }
        })
        .on('close', (code) => {
          logger.info(`Traceroute process closed with code: ${code}`);
          clearTimeout(globalTimeout);
          hopTimeouts.forEach(timeout => clearTimeout(timeout));
          hopTimeouts.clear();

          if (hops.length > 0) {
            hops[hops.length - 1].type = 'destination';
          }

          resolve(hops);
        })
        .on('error', (error) => {
          logger.error('Traceroute error:', error);
          clearTimeout(globalTimeout);
          hopTimeouts.forEach(timeout => clearTimeout(timeout));
          hopTimeouts.clear();
          reject(new Error(`Traceroute failed: ${error.message}`));
        });

      try {
        tracer.trace(target);
      } catch (error) {
        clearTimeout(globalTimeout);
        hopTimeouts.forEach(timeout => clearTimeout(timeout));
        hopTimeouts.clear();
        reject(new Error(`Failed to start traceroute: ${error.message}`));
      }
    });
  }

  static async executeTracerouteRealtime(event, target) {
    return new Promise((resolve, reject) => {
      logger.info(`Starting realtime traceroute to ${target} using nodejs-traceroute`);

      const tracer = new Traceroute();
      TracerouteHandlers.currentTracer = tracer;
      let sourceAdded = false;
      let hopTimeouts = new Map(); // 存储每个hop的超时计时器
      const HOP_TIMEOUT = 10000; // 每个hop的超时时间：10秒
      const MAX_TOTAL_TIME = 300000; // 最大总时间：5分钟

      // 设置全局超时机制作为最后保障
      const globalTimeout = setTimeout(() => {
        logger.warn(`Realtime traceroute to ${target} reached maximum time limit`);
        hopTimeouts.forEach(timeout => clearTimeout(timeout));
        hopTimeouts.clear();
        event.sender.send('traceroute:timeout', { target });
        resolve();
      }, MAX_TOTAL_TIME);

      // 为当前hop设置超时
      const setHopTimeout = (hopNumber) => {
        // 清除之前的hop超时
        if (hopTimeouts.has(hopNumber - 1)) {
          clearTimeout(hopTimeouts.get(hopNumber - 1));
          hopTimeouts.delete(hopNumber - 1);
        }

        const timeout = setTimeout(() => {
          logger.warn(`Hop ${hopNumber} timed out after ${HOP_TIMEOUT}ms`);
          // 发送超时的hop数据
          const timeoutHopData = {
            hop: hopNumber,
            ip: '*',
            rtt: null,
            type: 'hop',
            country: 'Unknown',
            city: 'Unknown',
            latitude: null,
            longitude: null,
            timeout: true
          };
          event.sender.send('traceroute:hop', timeoutHopData);
          hopTimeouts.delete(hopNumber);
        }, HOP_TIMEOUT);

        hopTimeouts.set(hopNumber, timeout);
      };

      tracer
        .on('pid', (pid) => {
          logger.info(`Traceroute process started with PID: ${pid}`);
          event.sender.send('traceroute:started', { pid, target });
          setHopTimeout(1);
        })
        .on('destination', (destination) => {
          logger.info(`Traceroute destination: ${destination}`);
          event.sender.send('traceroute:destination', { destination });
        })
        .on('hop', async (hop) => {
          logger.info(`Received hop: ${JSON.stringify(hop)}`);

          if (hopTimeouts.has(hop.hop)) {
            clearTimeout(hopTimeouts.get(hop.hop));
            hopTimeouts.delete(hop.hop);
          }

          // 为下一个hop设置超时
          setHopTimeout(hop.hop + 1);

          try {
            // 如果是第一跳且还没有添加源点信息，先添加源点
            if (hop.hop === 1 && !sourceAdded) {
              try {
                const sourceInfo = await this.getLocationInfo();
                const sourceData = {
                  hop: 0,
                  ip: sourceInfo.ip || 'localhost',
                  rtt: 0,
                  type: 'source',
                  country: sourceInfo.country || 'Unknown',
                  city: sourceInfo.city || 'Unknown',
                  latitude: sourceInfo.latitude || null,
                  longitude: sourceInfo.longitude || null
                };
                event.sender.send('traceroute:hop', sourceData);
                sourceAdded = true;
              } catch (sourceError) {
                logger.warn('Failed to get source IP info:', sourceError);
              }
            }

            // 跳过空IP或星号
            if (!hop.ip || hop.ip === '*' || hop.ip.trim() === '') {
              const hopData = {
                hop: hop.hop,
                ip: '*',
                rtt: null,
                type: 'hop',
                country: 'Unknown',
                city: 'Unknown',
                latitude: null,
                longitude: null
              };
              event.sender.send('traceroute:hop', hopData);
              return;
            }

            // 获取当前跳的IP地理位置信息
            const locationInfo = await this.getLocationInfo(hop.ip);

            // 解析RTT值，支持多种格式
            let rtt = null;
            if (hop.rtt1 && hop.rtt1 !== '*') {
              rtt = parseFloat(hop.rtt1.replace(/[^\d.]/g, ''));
            } else if (hop.rtt2 && hop.rtt2 !== '*') {
              rtt = parseFloat(hop.rtt2.replace(/[^\d.]/g, ''));
            } else if (hop.rtt3 && hop.rtt3 !== '*') {
              rtt = parseFloat(hop.rtt3.replace(/[^\d.]/g, ''));
            }

            const hopData = {
              hop: hop.hop,
              ip: hop.ip,
              rtt: isNaN(rtt) ? null : rtt,
              type: 'hop',
              ...locationInfo
            };

            // 发送实时跳点数据
            event.sender.send('traceroute:hop', hopData);
          } catch (error) {
            logger.warn(`Failed to process hop ${hop.hop} (${hop.ip}):`, error);
            const hopData = {
              hop: hop.hop,
              ip: hop.ip || '*',
              rtt: null,
              type: 'hop',
              country: 'Unknown',
              city: 'Unknown',
              latitude: null,
              longitude: null
            };
            event.sender.send('traceroute:hop', hopData);
          }
        })
        .on('close', (code) => {
          logger.info(`Traceroute process closed with code: ${code}`);
          clearTimeout(globalTimeout);
          hopTimeouts.forEach(timeout => clearTimeout(timeout));
          hopTimeouts.clear();
          TracerouteHandlers.currentTracer = null;
          event.sender.send('traceroute:complete', { code });
          resolve();
        })
        .on('error', (error) => {
          logger.error('Traceroute error:', error);
          clearTimeout(globalTimeout);
          hopTimeouts.forEach(timeout => clearTimeout(timeout));
          hopTimeouts.clear();
          TracerouteHandlers.currentTracer = null;
          event.sender.send('traceroute:error', { error: error.message });
          reject(new Error(`Traceroute failed: ${error.message}`));
        });

      try {
        tracer.trace(target);
      } catch (error) {
        clearTimeout(globalTimeout);
        hopTimeouts.forEach(timeout => clearTimeout(timeout));
        hopTimeouts.clear();
        TracerouteHandlers.currentTracer = null;
        reject(new Error(`Failed to start traceroute: ${error.message}`));
      }
    });
  }

  static stopTraceroute() {
    if (TracerouteHandlers.currentTracer) {
      try {
        logger.info('Stopping current traceroute process');
        TracerouteHandlers.currentTracer.kill();
        TracerouteHandlers.currentTracer = null;
        return { success: true, message: 'Traceroute stopped' };
      } catch (error) {
        logger.error('Failed to stop traceroute:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No active traceroute process' };
  }

}

function registerTracerouteHandlers() {
  ipcMain.handle('traceroute:execute', async (event, target) => {
    try {
      if (!TracerouteHandlers.isValidTarget(target)) {
        throw new Error('Invalid target address');
      }

      const hops = await TracerouteHandlers.executeTraceroute(target);
      return { success: true, hops };
    } catch (error) {
      logger.error('Traceroute execution failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traceroute:executeRealtime', async (event, target) => {
    try {
      if (!TracerouteHandlers.isValidTarget(target)) {
        throw new Error('Invalid target address');
      }

      await TracerouteHandlers.executeTracerouteRealtime(event, target);
      return { success: true };
    } catch (error) {
      logger.error('Realtime traceroute execution failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traceroute:validate', async (event, target) => {
    return TracerouteHandlers.isValidTarget(target);
  });

  ipcMain.handle('traceroute:stop', async (event) => {
    return TracerouteHandlers.stopTraceroute();
  });
}

module.exports = {
  registerTracerouteHandlers
}; 