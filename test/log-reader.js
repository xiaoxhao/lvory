#!/usr/bin/env node

const http = require('http');
const { EventEmitter } = require('events');

class LogReader extends EventEmitter {
  constructor(host = '127.0.0.1', port = 9090) {
    super();
    this.host = host;
    this.port = port;
    this.baseUrl = `http://${host}:${port}`;
  }

  start(logLevel = 'info') {
    console.log('CLASH 日志读取器启动');
    console.log(`API 地址: ${this.baseUrl}`);
    console.log(`日志级别: ${logLevel}`);
    console.log('开始获取实时日志...');

    this.connectToLogStream(logLevel);
  }

  connectToLogStream(level) {
    const url = `${this.baseUrl}/logs?level=${level}`;
    
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(`HTTP 错误: ${res.statusCode}`);
        return;
      }

      res.setEncoding('utf8');
      
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        lines.forEach(line => {
          if (line.trim()) {
            try {
              const logData = JSON.parse(line);
              this.displayLog(logData);
            } catch (error) {
              console.log(line);
            }
          }
        });
      });

      res.on('end', () => {
        console.log('日志流已断开');
        setTimeout(() => {
          console.log('重新连接...');
          this.connectToLogStream(level);
        }, 3000);
      });
    });

    req.on('error', (error) => {
      console.error(`连接错误: ${error.message}`);
      setTimeout(() => {
        console.log('重新连接...');
        this.connectToLogStream(level);
      }, 3000);
    });

    req.setTimeout(0);
  }

  displayLog(logData) {
    if (logData.type && logData.payload) {
      console.log(`[${logData.type.toUpperCase()}] ${logData.payload}`);
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  stop() {
    console.log('停止日志监控...');
    process.exit(0);
  }
}

function printUsage() {
  console.log(`
使用方法:
  node log-reader.js [选项]

选项:
  -h, --help     显示帮助信息
  -H, --host     API 主机地址 (默认: 127.0.0.1)
  -p, --port     API 端口 (默认: 9090)
  -l, --level    日志级别 (error|warning|info|debug, 默认: info)

示例:
  node log-reader.js
  node log-reader.js --level debug
  node log-reader.js --host 192.168.1.100 --port 9090
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    return;
  }

  let host = '127.0.0.1';
  let port = 9090;
  let level = 'info';

  const hostIndex = args.findIndex(arg => arg === '-H' || arg === '--host');
  if (hostIndex !== -1 && args[hostIndex + 1]) {
    host = args[hostIndex + 1];
  }

  const portIndex = args.findIndex(arg => arg === '-p' || arg === '--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1]);
  }

  const levelIndex = args.findIndex(arg => arg === '-l' || arg === '--level');
  if (levelIndex !== -1 && args[levelIndex + 1]) {
    level = args[levelIndex + 1];
  }

  const reader = new LogReader(host, port);

  process.on('SIGINT', () => {
    reader.stop();
  });

  process.on('SIGTERM', () => {
    reader.stop();
  });

  try {
    reader.start(level);
  } catch (error) {
    console.error(`启动失败: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LogReader;