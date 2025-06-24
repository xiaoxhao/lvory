const path = require('path');
const fs = require('fs');
const LvorySyncProcessor = require('../src/main/adapters/lvory-sync-processor');

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    configPath: null,
    showConfig: false,
    testMode: 'full',
    outputFile: null,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
      case '-c':
        options.configPath = args[++i];
        break;
      case '--show-config':
      case '-s':
        options.showConfig = true;
        break;
      case '--test-mode':
      case '-t':
        options.testMode = args[++i]; // basic, full, config-only
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
Lvory 同步协议测试工具

用法: node test-lvory-sync.js [选项]

选项:
  -c, --config <path>      指定配置文件路径 (默认: ../real/lvory-pro.yaml)
  -s, --show-config        显示最终生成的配置内容
  -t, --test-mode <mode>   测试模式: basic, full, config-only (默认: full)
  -o, --output <file>      将最终配置保存到文件
  -v, --verbose            显示详细信息
  -h, --help               显示此帮助信息

测试模式说明:
  basic       - 仅进行基础功能测试
  full        - 完整测试 (包括配置处理)
  config-only - 仅处理配置并显示结果

示例:
  node test-lvory-sync.js --config ../real/lvory-pro.yaml --show-config
  node test-lvory-sync.js -t config-only -s -o output.json
  `);
}

/**
 * 基础功能测试
 */
async function runBasicTests() {
  console.log('=== 基础功能测试 ===\n');

  // 测试配置类型检测
  console.log('1. 测试配置类型检测...');
  const testConfigs = [
    { content: '{"outbounds": []}', expected: 'singbox' },
    { content: 'proxies:\n  - name: test', expected: 'clash' },
    { content: '{"inbounds": [], "routing": {}}', expected: 'v2ray' },
    { content: 'server: "example.com:443"', expected: 'hysteria' }
  ];

  for (const test of testConfigs) {
    const detected = LvorySyncProcessor.detectConfigType(test.content);
    console.log(`  ${test.expected}: ${detected === test.expected ? '✓' : '✗'} (检测到: ${detected})`);
  }

  // 测试 Clash 到 SingBox 转换
  console.log('\n2. 测试 Clash 到 SingBox 转换...');
  const clashProxy = {
    name: 'test-ss',
    type: 'ss',
    server: 'example.com',
    port: 8388,
    cipher: 'aes-256-gcm',
    password: 'password123'
  };

  const singboxConfig = LvorySyncProcessor.convertClashToSingBox(clashProxy);
  console.log('✓ Clash 转换成功');
  console.log(`  原类型: ${clashProxy.type} -> 新类型: ${singboxConfig.type}`);

  // 测试节点过滤
  console.log('\n3. 测试节点过滤...');
  const testNodes = [
    { tag: 'node1', type: 'shadowsocks' },
    { tag: 'node2', type: 'vmess' },
    { tag: 'node3', type: 'trojan' }
  ];

  const filterRules = {
    include_types: ['shadowsocks', 'vmess']
  };

  const filteredNodes = LvorySyncProcessor.applyNodeFilter(testNodes, filterRules);
  console.log(`✓ 过滤完成: ${testNodes.length} -> ${filteredNodes.length} 个节点`);

  // 测试节点映射应用
  console.log('\n4. 测试节点映射应用...');
  const nodesWithSource = [
    { tag: 'original-name', source: 'source1' },
    { tag: 'another-node', source: 'source1' }
  ];

  const sources = [{
    name: 'source1',
    node_maps: {
      'target-node': 'original-name'
    }
  }];

  const selectedNodes = LvorySyncProcessor.selectNodesByMode(nodesWithSource, sources[0]);
  console.log('✓ 节点映射应用成功');
  console.log(`  映射模式: mapped_only，选择了 ${selectedNodes.length} 个节点`);
}

/**
 * 配置处理测试
 */
async function runConfigTest(options) {
  console.log('=== 配置处理测试 ===\n');

  try {
    // 确定配置文件路径
    const configPath = options.configPath || path.join(__dirname, '..', 'real', 'lvory-pro.yaml');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }

    console.log(`使用配置文件: ${configPath}\n`);

    // 1. 解析配置文件
    console.log('1. 解析配置文件...');
    const config = await LvorySyncProcessor.parseConfig(configPath);
    console.log('✓ 配置解析成功');
    console.log(`  版本: ${config.lvory_sync.version}`);
    console.log(`  主配置源: ${config.lvory_sync.master_config.source}`);
    console.log(`  副源数量: ${config.lvory_sync.secondary_sources?.length || 0}`);

    if (options.verbose) {
      console.log('\n配置详情:');
      console.log(JSON.stringify(config, null, 2));
    }

    // 2. 处理同步配置，生成最终配置
    console.log('\n2. 处理同步配置...');
    const finalConfig = await LvorySyncProcessor.processSync(configPath);
    console.log('✓ 配置处理成功');
    console.log(`  生成节点数量: ${finalConfig.outbounds?.length || 0}`);
    console.log(`  入站规则数量: ${finalConfig.inbounds?.length || 0}`);
    console.log(`  路由规则数量: ${finalConfig.route?.rules?.length || 0}`);

    // 3. 显示最终配置
    if (options.showConfig) {
      console.log('\n=== 最终配置内容 ===');
      console.log(JSON.stringify(finalConfig, null, 2));
    }

    // 4. 保存配置到文件
    if (options.outputFile) {
      fs.writeFileSync(options.outputFile, JSON.stringify(finalConfig, null, 2), 'utf8');
      console.log(`\n✓ 配置已保存到: ${options.outputFile}`);
    }

    // 5. 配置统计信息
    console.log('\n=== 配置统计 ===');
    if (finalConfig.outbounds) {
      const nodeTypes = {};
      finalConfig.outbounds.forEach(node => {
        if (node.type !== 'direct' && node.type !== 'block') {
          nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
        }
      });
      
      console.log('节点类型分布:');
      Object.entries(nodeTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} 个`);
      });
    }

    return finalConfig;

  } catch (error) {
    console.error(`\n✗ 配置处理失败: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * 主测试函数
 */
async function testLvorySyncProcessor() {
  const options = parseArguments();

  console.log('=== Lvory 同步协议处理器测试 ===\n');
  console.log(`测试模式: ${options.testMode}`);
  console.log(`配置文件: ${options.configPath || '默认'}`);
  console.log(`显示配置: ${options.showConfig ? '是' : '否'}`);
  if (options.outputFile) {
    console.log(`输出文件: ${options.outputFile}`);
  }
  console.log('');

  try {
    let finalConfig = null;

    switch (options.testMode) {
      case 'basic':
        await runBasicTests();
        break;
      
      case 'config-only':
        finalConfig = await runConfigTest(options);
        break;
      
      case 'full':
      default:
        await runBasicTests();
        console.log('\n');
        finalConfig = await runConfigTest(options);
        break;
    }

    console.log('\n=== 测试完成 ===');
    return finalConfig;

  } catch (error) {
    console.error('\n=== 测试失败 ===');
    console.error(`错误: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testLvorySyncProcessor();
}

module.exports = { 
  testLvorySyncProcessor,
  runBasicTests,
  runConfigTest,
  parseArguments
}; 