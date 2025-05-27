/**
 * rollup-plugin-config-extractor.js
 * 
 * 用于提取Rollup配置并通过事件总线通知其他插件的Rollup插件
 */
const fs = require('fs');
const path = require('path');
const { eventBus } = require('./rollup-plugin-event-bus');

/**
 * 提取和输出Rollup配置的插件
 * @param {Object} options - 插件配置选项 
 * @returns {Object} Rollup插件对象
 */
function configExtractorPlugin(options = {}) {
  // 默认配置
  const config = {
    outputToFile: true,
    outputPath: './rollup-config.json',
    outputToConsole: false,
    includeFields: [],
    excludeFields: [],
    formatJson: true,
    emitEvent: true,
    ...options
  };

  // 存储提取的配置
  let extractedConfig = null;
  let rollupConfig = null;

  return {
    name: 'rollup-config-extractor',

    /**
     * 选项钩子 - 在这里捕获Rollup配置
     * @param {Object} inputOptions - Rollup输入选项
     * @returns {Object} - 可能被修改的选项
     */
    options(inputOptions) {
      // 存储原始配置以便后续处理
      rollupConfig = { ...inputOptions };
      console.log('[rollup-config-extractor] 捕获Rollup配置');
      
      // 总是返回原始选项，不做修改
      return inputOptions;
    },

    /**
     * 过滤配置，根据includeFields和excludeFields
     * @param {Object} config - 配置对象
     * @returns {Object} - 过滤后的配置
     */
    _filterConfig(config) {
      if (!config) return {};
      
      // 创建配置副本
      const configCopy = JSON.parse(JSON.stringify(config, (key, value) => {
        // 处理函数和循环引用
        if (typeof value === 'function') return '[Function]';
        return value;
      }));
      
      // 如果没有指定过滤字段，返回完整配置
      if (this.options.includeFields.length === 0 && 
          this.options.excludeFields.length === 0) {
        return configCopy;
      }
      
      // 创建结果对象
      let result = {};
      
      // 如果指定了includeFields，只保留这些字段
      if (this.options.includeFields.length > 0) {
        for (const field of this.options.includeFields) {
          if (field in configCopy) {
            result[field] = configCopy[field];
          }
        }
        return result;
      }
      
      // 如果指定了excludeFields，排除这些字段
      if (this.options.excludeFields.length > 0) {
        result = { ...configCopy };
        for (const field of this.options.excludeFields) {
          delete result[field];
        }
        return result;
      }
      
      return configCopy;
    },

    /**
     * 输出配置到文件
     * @param {Object} config - 配置对象
     * @param {string} outputPath - 输出路径
     */
    _outputToFile(config, outputPath) {
      try {
        const outputDir = path.dirname(outputPath);
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 格式化并写入文件
        const content = this.options.formatJson 
          ? JSON.stringify(config, null, 2) 
          : JSON.stringify(config);
          
        fs.writeFileSync(outputPath, content, 'utf-8');
        console.log(`[rollup-config-extractor] 配置已写入: ${outputPath}`);
      } catch (error) {
        console.error('[rollup-config-extractor] 写入配置文件时出错:', error);
      }
    },

    /**
     * 输出配置到控制台
     * @param {Object} config - 配置对象
     */
    _outputToConsole(config) {
      console.log('[rollup-config-extractor] Rollup配置:');
      console.log(JSON.stringify(config, null, 2));
    },

    /**
     * 生成钩子 - 收集输出相关信息
     * @param {Object} outputOptions - 输出选项
     * @param {Object} bundle - 产物包信息
     */
    generateBundle(outputOptions, bundle) {
      // 如果已经提取过配置，无需重复提取
      if (extractedConfig) return;
      
      // 合并输入和输出配置
      const fullConfig = {
        ...rollupConfig,
        output: outputOptions
      };
      
      // 过滤配置
      extractedConfig = this._filterConfig(fullConfig);
      
      console.log('[rollup-config-extractor] 提取Rollup配置完成');
    },

    /**
     * 编译结束钩子 - 处理提取的配置
     */
    closeBundle() {
      if (!extractedConfig) {
        console.warn('[rollup-config-extractor] 没有从Rollup配置中提取信息');
        return;
      }
      
      // 输出到文件
      if (this.options.outputToFile) {
        this._outputToFile(extractedConfig, this.options.outputPath);
      }
      
      // 输出到控制台
      if (this.options.outputToConsole) {
        this._outputToConsole(extractedConfig);
      }
      
      // 触发事件
      if (this.options.emitEvent) {
        // 格式化配置用于事件
        const formattedConfig = this.options.formatJson 
          ? JSON.stringify(extractedConfig, null, 2) 
          : JSON.stringify(extractedConfig);
        
        console.log('[rollup-config-extractor] 触发configExtracted事件');
        
        // 触发事件，传递提取的配置和格式化的配置
        eventBus.emit('configExtracted', extractedConfig, formattedConfig);
      }
    },

    // 访问插件选项
    get options() {
      return config;
    }
  };
}

module.exports = configExtractorPlugin; 