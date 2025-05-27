/**
 * enhanced-webpack-config-extract-plugin.js
 * 
 * 一个用于在编译完成后提取webpack配置的插件，使用EventBus进行插件通信
 * 增强版本支持高级路径过滤和配置比较
 */
const fs = require('fs');
const path = require('path');
const { eventBus } = require('./webpack-plugin-event-bus');

/**
 * 路径过滤器 - 用于处理深层路径查询
 */
class PathFilter {
  /**
   * 解析路径表达式
   * @param {string} pathExpr - 路径表达式，如 "entry.main" 或 "plugins[0].options"
   * @returns {Array} - 解析后的路径段
   */
  static parsePath(pathExpr) {
    if (!pathExpr) return [];
    
    // 分割路径段并处理数组索引
    const segments = [];
    let currentSegment = '';
    let inBrackets = false;
    
    for (let i = 0; i < pathExpr.length; i++) {
      const char = pathExpr[i];
      
      if (char === '.' && !inBrackets) {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
      } else if (char === '[') {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
        inBrackets = true;
      } else if (char === ']') {
        if (inBrackets) {
          segments.push(parseInt(currentSegment, 10));
          currentSegment = '';
          inBrackets = false;
        }
      } else {
        currentSegment += char;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }
  
  /**
   * 根据路径获取对象中的值
   * @param {Object} obj - 要获取值的对象
   * @param {string|Array} path - 路径表达式或已解析的路径段
   * @returns {any} - 找到的值或undefined
   */
  static getValue(obj, path) {
    const segments = Array.isArray(path) ? path : this.parsePath(path);
    
    if (!segments.length) return obj;
    
    let current = obj;
    
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[segment];
    }
    
    return current;
  }
  
  /**
   * 设置对象中的值
   * @param {Object} obj - 要设置值的对象
   * @param {string|Array} path - 路径表达式或已解析的路径段
   * @param {any} value - 要设置的值
   * @returns {Object} - 修改后的对象
   */
  static setValue(obj, path, value) {
    const segments = Array.isArray(path) ? path : this.parsePath(path);
    
    if (!segments.length) return value;
    
    const result = this._deepClone(obj);
    let current = result;
    
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      
      if (current[segment] === undefined) {
        // 根据下一个段的类型创建适当的空容器
        const nextSegment = segments[i + 1];
        current[segment] = typeof nextSegment === 'number' ? [] : {};
      }
      
      current = current[segment];
    }
    
    const lastSegment = segments[segments.length - 1];
    current[lastSegment] = value;
    
    return result;
  }
  
  /**
   * 深度克隆对象（简化版，处理基本情况）
   * @param {any} obj - 要克隆的对象
   * @returns {any} - 克隆后的对象
   * @private
   */
  static _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._deepClone(item));
    }
    
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this._deepClone(obj[key]);
      }
    }
    
    return result;
  }
}

/**
 * EnhancedWebpackConfigExtractPlugin - 提取webpack配置的增强插件
 * 使用EventBus进行通信，支持高级路径过滤和配置比较
 */
class EnhancedWebpackConfigExtractPlugin {
  /**
   * @param {Object} options - 插件配置选项
   * @param {boolean} options.outputToFile - 是否将配置输出到文件
   * @param {string} options.outputPath - 输出文件路径
   * @param {boolean} options.outputToConsole - 是否将配置输出到控制台
   * @param {Array<string>} options.includeFields - 要包含的配置字段
   * @param {Array<string>} options.excludeFields - 要排除的配置字段
   * @param {Array<string>} options.includePaths - 要包含的配置路径，支持深层路径如 "module.rules[0]"
   * @param {Array<string>} options.excludePaths - 要排除的配置路径
   * @param {boolean} options.productionOnly - 是否仅在生产环境下执行
   * @param {boolean} options.saveHistory - 是否保存配置历史记录
   * @param {number} options.maxHistoryItems - 最大历史记录数量
   * @param {string} options.historyPath - 历史记录保存路径
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
      includePaths: [],
      excludePaths: [],
      productionOnly: false,
      saveHistory: false,
      maxHistoryItems: 10,
      historyPath: './webpack-config-history',
      customFormatter: null,
      ...options
    };
    
    this.pluginName = 'EnhancedWebpackConfigExtractPlugin';
    this.history = [];
    this.previousConfig = null;
    
    // 注册事件钩子
    this._registerEventHooks();
  }
  
  /**
   * 注册事件钩子
   * @private
   */
  _registerEventHooks() {
    // 预先注册常用钩子和参数
    eventBus.getOrCreateHook('configExtracted', 'sync', ['config', 'formattedConfig']);
    eventBus.getOrCreateHook('configDiffDetected', 'sync', ['diff', 'oldConfig', 'newConfig']);
    eventBus.getOrCreateHook('enhanceConfig', 'syncWaterfall', ['config']);
  }

  /**
   * 过滤配置对象，根据includeFields、excludeFields、includePaths和excludePaths
   * @param {Object} config - 完整的webpack配置对象
   * @returns {Object} - 过滤后的配置对象
   */
  filterConfig(config) {
    const { 
      includeFields, excludeFields, 
      includePaths, excludePaths 
    } = this.options;
    
    // 如果没有指定过滤条件，返回完整配置的深拷贝
    if (includeFields.length === 0 && 
        excludeFields.length === 0 && 
        includePaths.length === 0 && 
        excludePaths.length === 0) {
      return this._deepClone(config);
    }
    
    // 创建结果对象
    let result = {};
    
    // 处理字段级过滤（顶层字段）
    if (includeFields.length > 0) {
      // 只包含指定字段
      for (const field of includeFields) {
        if (field in config) {
          result[field] = this._deepClone(config[field]);
        }
      }
    } else if (excludeFields.length > 0) {
      // 排除指定字段
      result = this._deepClone(config);
      for (const field of excludeFields) {
        delete result[field];
      }
    } else {
      // 如果没有字段级过滤，先拷贝整个配置
      result = this._deepClone(config);
    }
    
    // 处理路径级过滤（支持深层路径）
    if (includePaths.length > 0) {
      // 只包含指定路径
      const pathResult = {};
      
      for (const pathExpr of includePaths) {
        const value = PathFilter.getValue(config, pathExpr);
        if (value !== undefined) {
          PathFilter.setValue(pathResult, pathExpr, this._deepClone(value));
        }
      }
      
      result = pathResult;
    } else if (excludePaths.length > 0) {
      // 排除指定路径
      for (const pathExpr of excludePaths) {
        const segments = PathFilter.parsePath(pathExpr);
        
        if (segments.length > 0) {
          // 获取最后一个段的父对象
          const parentSegments = segments.slice(0, -1);
          const lastSegment = segments[segments.length - 1];
          
          const parent = parentSegments.length > 0 
            ? PathFilter.getValue(result, parentSegments) 
            : result;
          
          if (parent && typeof parent === 'object') {
            if (Array.isArray(parent)) {
              // 如果父对象是数组，则删除指定索引
              if (typeof lastSegment === 'number' && lastSegment < parent.length) {
                parent.splice(lastSegment, 1);
              }
            } else {
              // 否则删除指定属性
              delete parent[lastSegment];
            }
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * 比较两个配置对象，找出差异
   * @param {Object} oldConfig - 旧配置
   * @param {Object} newConfig - 新配置
   * @returns {Object} - 差异对象
   */
  compareConfigs(oldConfig, newConfig) {
    if (!oldConfig) return { added: newConfig, changed: {}, removed: {} };
    
    const diff = {
      added: {},
      changed: {},
      removed: {}
    };
    
    // 查找添加和更改的部分
    this._findAddedAndChanged(oldConfig, newConfig, diff, []);
    
    // 查找删除的部分
    this._findRemoved(oldConfig, newConfig, diff, []);
    
    return diff;
  }
  
  /**
   * 查找添加和更改的配置
   * @param {Object} oldConfig - 旧配置
   * @param {Object} newConfig - 新配置
   * @param {Object} diff - 差异对象
   * @param {Array} path - 当前路径
   * @private
   */
  _findAddedAndChanged(oldConfig, newConfig, diff, path) {
    for (const key in newConfig) {
      const newPath = [...path, key];
      const pathStr = newPath.join('.');
      
      if (!(key in oldConfig)) {
        // 新添加的属性
        diff.added[pathStr] = newConfig[key];
      } else if (
        typeof newConfig[key] === 'object' && 
        newConfig[key] !== null &&
        typeof oldConfig[key] === 'object' && 
        oldConfig[key] !== null &&
        !Array.isArray(newConfig[key]) &&
        !Array.isArray(oldConfig[key])
      ) {
        // 递归检查嵌套对象
        this._findAddedAndChanged(oldConfig[key], newConfig[key], diff, newPath);
      } else if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        // 改变的属性
        diff.changed[pathStr] = {
          from: oldConfig[key],
          to: newConfig[key]
        };
      }
    }
  }
  
  /**
   * 查找删除的配置
   * @param {Object} oldConfig - 旧配置
   * @param {Object} newConfig - 新配置
   * @param {Object} diff - 差异对象
   * @param {Array} path - 当前路径
   * @private
   */
  _findRemoved(oldConfig, newConfig, diff, path) {
    for (const key in oldConfig) {
      const newPath = [...path, key];
      const pathStr = newPath.join('.');
      
      if (!(key in newConfig)) {
        // 删除的属性
        diff.removed[pathStr] = oldConfig[key];
      } else if (
        typeof oldConfig[key] === 'object' && 
        oldConfig[key] !== null &&
        typeof newConfig[key] === 'object' && 
        newConfig[key] !== null &&
        !Array.isArray(oldConfig[key]) &&
        !Array.isArray(newConfig[key])
      ) {
        // 递归检查嵌套对象
        this._findRemoved(oldConfig[key], newConfig[key], diff, newPath);
      }
    }
  }
  
  /**
   * 深拷贝对象
   * @param {any} obj - 需要深拷贝的对象
   * @returns {any} - 深拷贝结果
   * @private
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
   * 保存配置历史记录
   * @param {Object} config - 配置对象
   * @private
   */
  _saveConfigHistory(config) {
    if (!this.options.saveHistory) return;
    
    // 创建历史记录项
    const historyItem = {
      timestamp: new Date().toISOString(),
      config: this._deepClone(config)
    };
    
    // 添加到历史记录
    this.history.push(historyItem);
    
    // 限制历史记录大小
    if (this.history.length > this.options.maxHistoryItems) {
      this.history.shift(); // 移除最旧的记录
    }
    
    // 如果指定了历史记录保存路径，则保存到文件
    if (this.options.historyPath) {
      try {
        const historyDir = this.options.historyPath;
        
        // 确保目录存在
        if (!fs.existsSync(historyDir)) {
          fs.mkdirSync(historyDir, { recursive: true });
        }
        
        // 为每个历史记录项创建唯一文件名
        const fileName = `config-${historyItem.timestamp.replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(historyDir, fileName);
        
        // 写入历史记录
        fs.writeFileSync(filePath, this.formatConfig(historyItem.config), 'utf-8');
        console.log(`[${this.pluginName}] 配置历史记录已保存到: ${filePath}`);
      } catch (error) {
        console.error(`[${this.pluginName}] 保存配置历史记录失败:`, error);
      }
    }
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
      
      // 检测配置变化
      const configDiff = this.compareConfigs(this.previousConfig, filteredConfig);
      const hasChanges = (
        Object.keys(configDiff.added).length > 0 || 
        Object.keys(configDiff.changed).length > 0 || 
        Object.keys(configDiff.removed).length > 0
      );
      
      // 如果配置有变化，触发事件
      if (hasChanges && this.previousConfig !== null) {
        console.log(`[${this.pluginName}] 检测到配置变化，触发configDiffDetected事件`);
        eventBus.emit('configDiffDetected', 'sync', configDiff, this.previousConfig, filteredConfig);
      }
      
      // 保存当前配置作为下一次比较的基准
      this.previousConfig = this._deepClone(filteredConfig);
      
      // 保存配置历史记录
      this._saveConfigHistory(filteredConfig);
      
      // 通过事件总线发出配置提取完成事件
      console.log(`[${this.pluginName}] 配置提取完成，触发configExtracted事件`);
      eventBus.emit('configExtracted', 'sync', filteredConfig, formattedConfig);
      
      // 允许其他插件增强配置（使用瀑布流钩子）
      const enhancedConfig = eventBus.emit('enhanceConfig', 'syncWaterfall', {
        config: filteredConfig,
        format: 'json',
        extractTime: new Date().toISOString()
      });
      
      if (enhancedConfig && enhancedConfig !== filteredConfig) {
        console.log(`[${this.pluginName}] 配置已被其他插件增强`);
      }
    });
  }
}

module.exports = EnhancedWebpackConfigExtractPlugin; 