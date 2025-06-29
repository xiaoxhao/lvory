const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const os = require('os');
const http = require('http');
const logger = require('../../utils/logger');

class TracerouteHandlers {
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
      const url = `http://ip-api.com/json/${ip}`;
      
      http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === 'success') {
              resolve({
                country: parsed.country || 'Unknown',
                city: parsed.city || parsed.regionName || 'Unknown',
                latitude: parsed.lat || 0,
                longitude: parsed.lon || 0
              });
            } else {
              resolve({
                country: 'Unknown',
                city: 'Unknown',
                latitude: 0,
                longitude: 0
              });
            }
          } catch (error) {
            logger.warn(`Failed to parse location data for ${ip}:`, error);
            resolve({
              country: 'Unknown',
              city: 'Unknown',
              latitude: 0,
              longitude: 0
            });
          }
        });
      }).on('error', (error) => {
        logger.warn(`Failed to get location for ${ip}:`, error);
        resolve({
          country: 'Unknown',
          city: 'Unknown',
          latitude: 0,
          longitude: 0
        });
      });
    });
  }

  static async executeTraceroute(target) {
    return new Promise((resolve, reject) => {
      const isWindows = os.platform() === 'win32';
      const command = isWindows ? 'tracert' : 'traceroute';
      const args = isWindows ? ['-d', '-h', '30', target] : ['-n', '-m', '30', target];
      
      logger.info(`Starting traceroute to ${target} with command: ${command} ${args.join(' ')}`);
      
      const tracerouteProcess = spawn(command, args);
      let outputBuffer = '';

      tracerouteProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
      });

      tracerouteProcess.stderr.on('data', (data) => {
        logger.error('Traceroute stderr:', data.toString());
      });

      tracerouteProcess.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Traceroute process exited with code ${code}`));
          return;
        }

        try {
          const parsedHops = await this.parseTracerouteOutput(outputBuffer, isWindows);
          resolve(parsedHops);
        } catch (error) {
          reject(error);
        }
      });

      tracerouteProcess.on('error', (error) => {
        reject(new Error(`Failed to start traceroute: ${error.message}`));
      });
    });
  }

  static async parseTracerouteOutput(output, isWindows) {
    const lines = output.split('\n');
    const hops = [];
    const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
    const timeRegex = /(\d+(?:\.\d+)?)\s*ms/g;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine || trimmedLine.includes('Tracing route') || 
          trimmedLine.includes('over a maximum') || trimmedLine.includes('Trace complete')) {
        continue;
      }

      const hopMatch = isWindows ? 
        trimmedLine.match(/^\s*(\d+)\s+(.+)/) :
        trimmedLine.match(/^\s*(\d+)\s+(.+)/);

      if (hopMatch) {
        const hopNumber = parseInt(hopMatch[1]);
        const hopData = hopMatch[2];
        
        const ipMatch = hopData.match(ipRegex);
        if (ipMatch) {
          const ip = ipMatch[1];
          
          const times = [];
          let timeMatch;
          const timeRegexCopy = new RegExp(timeRegex.source, timeRegex.flags);
          while ((timeMatch = timeRegexCopy.exec(hopData)) !== null) {
            times.push(parseFloat(timeMatch[1]));
          }
          
          const avgTime = times.length > 0 ? times.reduce((a, b) => a + b) / times.length : 0;
          
          try {
            const locationInfo = await this.getLocationInfo(ip);
            
            hops.push({
              hop: hopNumber,
              ip: ip,
              rtt: avgTime,
              type: hopNumber === 1 ? 'hop' : 'hop',
              ...locationInfo
            });
          } catch (error) {
            logger.warn(`Failed to get location for hop ${hopNumber} (${ip}):`, error);
            hops.push({
              hop: hopNumber,
              ip: ip,
              rtt: avgTime,
              type: 'hop',
              country: 'Unknown',
              city: 'Unknown',
              latitude: 0,
              longitude: 0
            });
          }
        }
      }
    }

    if (hops.length > 0) {
      hops[hops.length - 1].type = 'destination';
    }

    return hops;
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
  
  ipcMain.handle('traceroute:validate', async (event, target) => {
    return TracerouteHandlers.isValidTarget(target);
  });
}

module.exports = {
  registerTracerouteHandlers
}; 