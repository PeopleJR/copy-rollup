/**
 * webpack-plugin-event-bus-example.js
 * 
 * 这个文件展示了如何使用WebpackPluginEventBus进行插件间通信
 */

const { eventBus } = require('./webpack-plugin-event-bus');
const WebpackConfigExtractPlugin = require('../webpack静态插件系统/webpack-config-extract-plugin');
const path = require('path');

/**
 * 示例插件1 - 配置提取者
 * 使用EventBus触发事件
 */
class EnhancedConfigExtractPlugin {
  constructor(options = {}) {
    this.options = {
      outputToFile: true,
      outputPath: './enhanced-webpack-config.json',
      includeFields: [],
      excludeFields: [],
      ...options
    };
    
    this.pluginName = 'EnhancedConfigExtractPlugin';
  }
  
  apply(compiler) {
    // 在编译完成时
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      // 获取webpack配置
      const webpackConfig = compiler.options;
      
      // 提取配置并格式化
      const filteredConfig = this.filterConfig(webpackConfig);
      const formattedConfig = JSON.stringify(filteredConfig, null, 2);
      
      // 输出到文件
      if (this.options.outputToFile) {
        this.outputToFile(formattedConfig);
      }
      
      // 使用EventBus发出配置提取完成事件
      console.log(`[${this.pluginName}] 触发配置提取完成事件`);
      
      // 同步钩子 - 基本事件通知
      eventBus.emit('configExtracted', 'sync', filteredConfig, formattedConfig);
      
      // 瀑布流钩子 - 允许后续处理修改配置
      const enhancedConfig = eventBus.emit('enhanceConfig', 'syncWaterfall', {
        config: filteredConfig,
        format: 'json',
        extractTime: new Date().toISOString()
      });
      
      console.log(`[${this.pluginName}] 配置已增强:`, enhancedConfig ? '是' : '否');
    });
  }
  
  // 简化实现，实际代码应使用WebpackConfigExtractPlugin的完整实现
  filterConfig(config) {
    const { includeFields, excludeFields } = this.options;
    
    // 简单深拷贝
    const clonedConfig = JSON.parse(JSON.stringify(config, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (value instanceof RegExp) return value.toString();
      return value;
    }));
    
    // 如果指定了includeFields，只保留这些字段
    if (includeFields.length > 0) {
      const result = {};
      for (const field of includeFields) {
        if (field in clonedConfig) {
          result[field] = clonedConfig[field];
        }
      }
      return result;
    }
    
    // 如果指定了excludeFields，排除这些字段
    if (excludeFields.length > 0) {
      const result = { ...clonedConfig };
      for (const field of excludeFields) {
        delete result[field];
      }
      return result;
    }
    
    return clonedConfig;
  }
  
  outputToFile(formattedConfig) {
    console.log(`[${this.pluginName}] 配置已保存到: ${this.options.outputPath}`);
    // 实际代码应当使用fs模块写入文件
  }
}

/**
 * 示例插件2 - 配置消费者
 * 监听EventBus事件
 */
class ConfigConsumerPlugin {
  constructor(options = {}) {
    this.options = {
      logToConsole: true,
      ...options
    };
    
    this.pluginName = 'ConfigConsumerPlugin';
    this.extractedConfig = null;
    
    // 注册事件监听器
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 监听配置提取事件
    eventBus.on('configExtracted', 'sync', this.pluginName, (config, formattedConfig) => {
      console.log(`[${this.pluginName}] 接收到提取的配置`);
      this.extractedConfig = config;
      
      if (this.options.logToConsole) {
        console.log(`[${this.pluginName}] 配置内容概览:`, 
          Object.keys(config).length > 0 ? Object.keys(config) : '空配置');
      }
    });
    
    // 参与配置增强过程
    eventBus.on('enhanceConfig', 'syncWaterfall', this.pluginName, (configData) => {
      console.log(`[${this.pluginName}] 增强配置`);
      
      // 添加一些元数据
      return {
        ...configData,
        meta: {
          processedBy: this.pluginName,
          timestamp: Date.now()
        }
      };
    });
  }
  
  apply(compiler) {
    // 在编译完成时
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      if (this.extractedConfig) {
        console.log(`[${this.pluginName}] 编译完成，已获取配置`);
        // 在这里可以使用提取的配置做一些事情
      } else {
        console.log(`[${this.pluginName}] 编译完成，但未获取配置`);
      }
    });
  }
}

/**
 * 示例插件3 - 一次性事件监听器
 */
class OneTimeListenerPlugin {
  constructor() {
    this.pluginName = 'OneTimeListenerPlugin';
    
    // 注册一次性事件监听器
    eventBus.once('configExtracted', 'sync', this.pluginName, (config, formattedConfig) => {
      console.log(`[${this.pluginName}] 一次性接收到提取的配置，此监听器将被移除`);
    });
  }
  
  apply(compiler) {
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      console.log(`[${this.pluginName}] 编译完成`);
    });
  }
}

/**
 * 示例插件4 - 异步事件监听器
 */
class AsyncListenerPlugin {
  constructor() {
    this.pluginName = 'AsyncListenerPlugin';
    
    // 注册异步事件监听器
    // 首先创建异步钩子
    eventBus.getOrCreateHook('asyncProcess', 'asyncSeries', ['data']);
    
    // 然后添加监听器
    eventBus.on('asyncProcess', 'asyncSeries', this.pluginName, (data, callback) => {
      console.log(`[${this.pluginName}] 开始异步处理`, data);
      
      // 模拟异步操作
      setTimeout(() => {
        console.log(`[${this.pluginName}] 异步处理完成`);
        callback(null, { processed: true, data });
      }, 1000);
    });
  }
  
  apply(compiler) {
    compiler.hooks.done.tap(this.pluginName, async (stats) => {
      console.log(`[${this.pluginName}] 触发异步事件`);
      
      // 触发异步钩子
      try {
        const result = await eventBus.emitAsync('asyncProcess', 'asyncSeries', { time: Date.now() });
        console.log(`[${this.pluginName}] 异步处理结果:`, result);
      } catch (error) {
        console.error(`[${this.pluginName}] 异步处理错误:`, error);
      }
    });
  }
}

// webpack配置示例
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  plugins: [
    // 在最开始配置EnhancedConfigExtractPlugin
    new EnhancedConfigExtractPlugin({
      includeFields: ['entry', 'output', 'module', 'plugins'],
    }),
    
    // 消费配置的插件
    new ConfigConsumerPlugin(),
    
    // 一次性监听器插件
    new OneTimeListenerPlugin(),
    
    // 异步监听器插件
    new AsyncListenerPlugin(),
  ],
}; 