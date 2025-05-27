/**
 * enhanced-plugins-integration-example.js
 * 
 * 这个文件展示了如何在webpack配置中集成使用基于EventBus的增强插件系统
 */

const path = require('path');
const EnhancedWebpackConfigExtractPlugin = require('./enhanced-webpack-config-extract-plugin');
const WebpackConfigChangeListenerPlugin = require('./webpack-config-change-listener-plugin');
const { eventBus } = require('./webpack-plugin-event-bus');

/**
 * 示例插件 - 配置元数据增强器
 * 使用EventBus监听和增强配置
 */
class ConfigMetadataEnhancerPlugin {
  constructor(options = {}) {
    this.options = {
      addBuildInfo: true,
      addEnvInfo: true,
      addSystemInfo: true,
      ...options
    };
    
    this.pluginName = 'ConfigMetadataEnhancerPlugin';
    
    // 注册事件监听器
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 参与配置增强过程
    eventBus.on('enhanceConfig', 'syncWaterfall', this.pluginName, (configData) => {
      console.log(`[${this.pluginName}] 增强配置数据`);
      
      // 深拷贝配置以避免修改原始对象
      const enhancedConfig = JSON.parse(JSON.stringify(configData));
      
      // 添加元数据
      enhancedConfig.metadata = enhancedConfig.metadata || {};
      
      // 添加构建信息
      if (this.options.addBuildInfo) {
        enhancedConfig.metadata.buildInfo = {
          timestamp: new Date().toISOString(),
          buildId: `build-${Date.now()}`,
          version: process.env.npm_package_version || '1.0.0'
        };
      }
      
      // 添加环境信息
      if (this.options.addEnvInfo) {
        enhancedConfig.metadata.environment = {
          nodeVersion: process.version,
          platform: process.platform,
          env: process.env.NODE_ENV || 'development'
        };
      }
      
      // 添加系统信息
      if (this.options.addSystemInfo) {
        enhancedConfig.metadata.system = {
          arch: process.arch,
          cpus: require('os').cpus().length,
          memory: Math.round(require('os').totalmem() / (1024 * 1024 * 1024)) + 'GB'
        };
      }
      
      return enhancedConfig;
    });
    
    // 监听配置变化事件
    eventBus.on('configDiffDetected', 'sync', this.pluginName, (diff) => {
      const hasMetadataChanges = Object.keys(diff.added).some(path => path.startsWith('metadata')) ||
                                Object.keys(diff.changed).some(path => path.startsWith('metadata')) ||
                                Object.keys(diff.removed).some(path => path.startsWith('metadata'));
      
      if (hasMetadataChanges) {
        console.log(`[${this.pluginName}] 检测到元数据变化`);
      }
    });
  }
  
  apply(compiler) {
    // 注册编译完成事件处理程序
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      console.log(`[${this.pluginName}] 编译完成`);
    });
  }
}

/**
 * 示例插件 - 一次性配置处理器
 * 演示使用EventBus的一次性事件监听
 */
class OneTimeConfigProcessor {
  constructor() {
    this.pluginName = 'OneTimeConfigProcessor';
    
    // 注册一次性事件监听器
    eventBus.once('configExtracted', 'sync', this.pluginName, (config) => {
      console.log(`[${this.pluginName}] 首次接收到配置，执行一次性处理`);
      this.processConfig(config);
    });
  }
  
  processConfig(config) {
    // 示例：简单地记录配置结构
    console.log(`[${this.pluginName}] 配置结构:`, Object.keys(config));
    console.log(`[${this.pluginName}] 一次性处理完成，后续配置提取将被忽略`);
  }
  
  apply(compiler) {
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      console.log(`[${this.pluginName}] 编译完成`);
    });
  }
}

/**
 * 示例插件 - 异步配置验证器
 * 演示使用EventBus的异步事件
 */
class AsyncConfigValidator {
  constructor() {
    this.pluginName = 'AsyncConfigValidator';
    
    // 创建异步钩子
    eventBus.getOrCreateHook('validateConfig', 'asyncSeries', ['config']);
    
    // 注册配置提取事件处理程序
    eventBus.on('configExtracted', 'sync', this.pluginName, (config) => {
      // 异步验证配置
      this.validateConfigAsync(config).catch(error => {
        console.error(`[${this.pluginName}] 配置验证失败:`, error);
      });
    });
    
    // 注册异步配置验证处理程序
    eventBus.on('validateConfig', 'asyncSeries', this.pluginName, async (config, callback) => {
      try {
        // 模拟异步验证过程
        console.log(`[${this.pluginName}] 开始异步验证配置...`);
        
        // 检查必要的配置字段
        await this.checkRequiredFields(config);
        
        // 检查其他规则...
        
        console.log(`[${this.pluginName}] 配置验证通过`);
        callback(null, { valid: true, config });
      } catch (error) {
        console.error(`[${this.pluginName}] 验证错误:`, error);
        callback(error);
      }
    });
  }
  
  // 异步验证配置
  async validateConfigAsync(config) {
    console.log(`[${this.pluginName}] 触发异步配置验证`);
    
    try {
      const result = await eventBus.emitAsync('validateConfig', 'asyncSeries', config);
      console.log(`[${this.pluginName}] 验证结果:`, result ? '通过' : '未完成');
      return result;
    } catch (error) {
      console.error(`[${this.pluginName}] 验证过程中出错:`, error);
      throw error;
    }
  }
  
  // 模拟异步字段检查
  async checkRequiredFields(config) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const requiredFields = ['entry', 'output'];
        
        for (const field of requiredFields) {
          if (!config[field]) {
            reject(new Error(`缺少必要配置: ${field}`));
            return;
          }
        }
        
        resolve(true);
      }, 500); // 模拟网络延迟
    });
  }
  
  apply(compiler) {
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      console.log(`[${this.pluginName}] 编译完成`);
    });
  }
}

// Webpack配置
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    // 增强型配置提取插件 - 提供丰富的配置提取和过滤功能
    new EnhancedWebpackConfigExtractPlugin({
      outputToFile: true,
      outputPath: './enhanced-webpack-config.json',
      outputToConsole: false,
      // 使用深层路径过滤
      includePaths: [
        'entry',
        'output',
        'module.rules',
        'plugins'
      ],
      // 保存配置历史
      saveHistory: true,
      historyPath: './config-history',
      maxHistoryItems: 10
    }),
    
    // 配置变化监听器 - 监听配置变化并生成报告
    new WebpackConfigChangeListenerPlugin({
      generateReport: true,
      reportPath: './webpack-config-changes.md',
      notifyOnChange: true,
      // 只监听特定路径的变化
      watchPaths: [
        'module.rules',
        'plugins',
        'optimization'
      ],
      // 配置变化时的回调函数
      onConfigChange: (diff, oldConfig, newConfig) => {
        console.log('配置变化检测到，可以在这里执行自定义逻辑');
      }
    }),
    
    // 配置元数据增强器 - 添加构建和环境信息
    new ConfigMetadataEnhancerPlugin({
      addBuildInfo: true,
      addEnvInfo: true,
      addSystemInfo: true
    }),
    
    // 一次性配置处理器 - 只在首次配置提取时处理
    new OneTimeConfigProcessor(),
    
    // 异步配置验证器 - 异步验证配置有效性
    new AsyncConfigValidator()
  ],
  
  // 其他webpack配置...
  optimization: {
    minimize: false
  },
  devtool: 'source-map'
}; 