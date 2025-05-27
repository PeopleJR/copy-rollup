/**
 * webpack-config-extract-plugin
 * 一个用于在编译完成后提取webpack配置的插件
 */
const fs = require('fs');
const path = require('path');
const { SyncHook } = require('tapable');

/**
 * WebpackConfigExtractPlugin - 提取webpack配置的插件
 * 提供静态钩子供其他插件使用
 */
class WebpackConfigExtractPlugin {
  /**
   * 静态钩子，供其他插件使用
   * 当配置提取完成时触发
   */
  static hooks = {
    // 配置提取完成的钩子，接收两个参数：配置对象和格式化后的配置字符串
    configExtracted: new SyncHook(['config', 'formattedConfig'])
  };

  /**
   * @param {Object} options - 插件配置选项
   * @param {boolean} options.outputToFile - 是否将配置输出到文件
   * @param {string} options.outputPath - 输出文件路径
   * @param {boolean} options.outputToConsole - 是否将配置输出到控制台
   * @param {Array<string>} options.includeFields - 要包含的配置字段
   * @param {Array<string>} options.excludeFields - 要排除的配置字段
   * @param {boolean} options.productionOnly - 是否仅在生产环境下执行
   * @param {Function} options.customFormatter - 自定义格式化函数
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      outputToFile: true,
      outputPath: './webpack-config.json',
      outputToConsole: false,
      includeFields: [],
      excludeFields: [],
      productionOnly: false,
      customFormatter: null,
      ...options
    };
    
    this.pluginName = 'WebpackConfigExtractPlugin';
  }

  /**
   * 过滤配置对象，根据includeFields和excludeFields
   * @param {Object} config - 完整的webpack配置对象
   * @returns {Object} - 过滤后的配置对象
   */
  filterConfig(config) {
    const { includeFields, excludeFields } = this.options;
    
    // 如果没有指定过滤条件，返回完整配置的深拷贝
    if (includeFields.length === 0 && excludeFields.length === 0) {
      return this._deepClone(config);
    }
    
    // 创建结果对象
    const result = {};
    
    // 如果指定了includeFields，只保留这些字段
    if (includeFields.length > 0) {
      for (const field of includeFields) {
        if (field in config) {
          result[field] = this._deepClone(config[field]);
        }
      }
      return result;
    }
    
    // 如果指定了excludeFields，排除这些字段
    if (excludeFields.length > 0) {
      for (const key in config) {
        if (!excludeFields.includes(key)) {
          result[key] = this._deepClone(config[key]);
        }
      }
      return result;
    }
    
    return result;
  }
  
  /**
   * 深拷贝对象
   * @param {any} obj - 需要深拷贝的对象
   * @returns {any} - 深拷贝结果
   */
  _deepClone(obj) {
    // 处理循环引用和复杂对象
    try {
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        // 处理函数、正则表达式等不能被JSON序列化的对象
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (value instanceof RegExp) {
          return value.toString();
        }
        // 处理循环引用
        if (typeof value === 'object' && value !== null) {
          if (this._seen === undefined) {
            this._seen = new WeakSet();
          }
          if (this._seen.has(value)) {
            return '[Circular]';
          }
          this._seen.add(value);
        }
        return value;
      }));
    } catch (error) {
      // 如果JSON.stringify失败，返回简单对象
      console.warn(`[${this.pluginName}] 配置深拷贝失败，返回简化版本`, error);
      
      // 对于非对象类型，直接返回
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // 处理数组
      if (Array.isArray(obj)) {
        return obj.map(item => '[Complex Value]');
      }
      
      // 处理对象
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = '[Complex Value]';
        }
      }
      return result;
    } finally {
      // 清理
      this._seen = undefined;
    }
  }

  /**
   * 格式化配置对象
   * @param {Object} config - 配置对象
   * @returns {string} - 格式化后的JSON字符串
   */
  formatConfig(config) {
    const { customFormatter } = this.options;
    
    // 使用自定义格式化程序（如果提供）
    if (typeof customFormatter === 'function') {
      try {
        return customFormatter(config);
      } catch (error) {
        console.warn(`[${this.pluginName}] 自定义格式化失败，使用默认格式化`, error);
      }
    }
    
    // 默认格式化为美化的JSON
    return JSON.stringify(config, null, 2);
  }

  /**
   * 输出配置到文件
   * @param {string} formattedConfig - 格式化后的配置
   * @param {string} outputPath - 输出路径
   */
  outputToFile(formattedConfig, outputPath) {
    try {
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(outputPath, formattedConfig, 'utf-8');
      console.log(`[${this.pluginName}] 配置已保存到: ${outputPath}`);
    } catch (error) {
      console.error(`[${this.pluginName}] 写入配置到文件失败:`, error);
    }
  }

  /**
   * 输出配置到控制台
   * @param {string} formattedConfig - 格式化后的配置
   */
  outputToConsole(formattedConfig) {
    console.log(`[${this.pluginName}] Webpack配置:`);
    console.log(formattedConfig);
  }

  /**
   * 应用插件
   * @param {import('webpack').Compiler} compiler - webpack编译器实例
   */
  apply(compiler) {
    // 仅在生产环境执行的检查
    if (this.options.productionOnly && compiler.options.mode !== 'production') {
      return;
    }
    
    // 编译完成钩子
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      // 获取webpack配置
      const webpackConfig = compiler.options;
      
      // 过滤配置
      const filteredConfig = this.filterConfig(webpackConfig);
      
      // 格式化配置
      const formattedConfig = this.formatConfig(filteredConfig);
      
      // 输出到文件
      if (this.options.outputToFile) {
        this.outputToFile(formattedConfig, this.options.outputPath);
      }
      
      // 输出到控制台
      if (this.options.outputToConsole) {
        this.outputToConsole(formattedConfig);
      }
      
      // 触发配置提取完成钩子
      WebpackConfigExtractPlugin.hooks.configExtracted.call(filteredConfig, formattedConfig);
      
      console.log(`[${this.pluginName}] 配置提取完成，已触发configExtracted钩子`);
    });
  }
}

module.exports = WebpackConfigExtractPlugin; 