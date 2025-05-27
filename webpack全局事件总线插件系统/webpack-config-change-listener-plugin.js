/**
 * webpack-config-change-listener-plugin.js
 * 
 * 一个用于监听webpack配置变化的插件，当配置发生变化时生成变化报告
 */
const fs = require('fs');
const path = require('path');
const { eventBus } = require('./webpack-plugin-event-bus');

/**
 * WebpackConfigChangeListenerPlugin - 监听配置变化并生成报告
 */
class WebpackConfigChangeListenerPlugin {
  /**
   * @param {Object} options - 插件配置选项
   * @param {boolean} options.generateReport - 是否生成变化报告
   * @param {string} options.reportPath - 报告输出路径
   * @param {boolean} options.notifyOnChange - 是否在配置变化时输出通知
   * @param {Array<string>} options.watchPaths - 要监听变化的特定配置路径
   * @param {Function} options.onConfigChange - 配置变化时的回调函数
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      generateReport: true,
      reportPath: './webpack-config-changes.md',
      notifyOnChange: true,
      watchPaths: [],
      onConfigChange: null,
      ...options
    };
    
    this.pluginName = 'WebpackConfigChangeListenerPlugin';
    this.lastConfig = null;
    this.changes = [];
    
    // 注册事件监听器
    this.setupEventListeners();
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听配置提取事件
    eventBus.on('configExtracted', 'sync', this.pluginName, (config, formattedConfig) => {
      console.log(`[${this.pluginName}] 接收到提取的配置`);
      this.lastConfig = config;
    });
    
    // 监听配置变化事件
    eventBus.on('configDiffDetected', 'sync', this.pluginName, (diff, oldConfig, newConfig) => {
      console.log(`[${this.pluginName}] 检测到配置变化`);
      
      // 记录变化
      this.recordChange(diff, oldConfig, newConfig);
      
      // 生成变化报告
      if (this.options.generateReport) {
        this.generateChangeReport();
      }
      
      // 如果配置了回调函数，调用它
      if (typeof this.options.onConfigChange === 'function') {
        this.options.onConfigChange(diff, oldConfig, newConfig);
      }
    });
    
    // 参与配置增强过程，添加变化历史记录
    eventBus.on('enhanceConfig', 'syncWaterfall', this.pluginName, (configData) => {
      // 如果有变化历史，添加到配置中
      if (this.changes.length > 0) {
        return {
          ...configData,
          changeHistory: {
            totalChanges: this.changes.length,
            recentChanges: this.changes.slice(-5) // 只保留最近5个变化
          }
        };
      }
      
      return configData;
    });
  }
  
  /**
   * 记录配置变化
   * @param {Object} diff - 配置差异对象
   * @param {Object} oldConfig - 旧配置
   * @param {Object} newConfig - 新配置
   */
  recordChange(diff, oldConfig, newConfig) {
    // 监听特定路径的变化
    let relevantChanges = {};
    const watchPaths = this.options.watchPaths;
    
    if (watchPaths.length > 0) {
      // 只关注特定路径的变化
      relevantChanges = {
        added: {},
        changed: {},
        removed: {}
      };
      
      // 检查添加的配置
      for (const path in diff.added) {
        if (this.isWatchedPath(path, watchPaths)) {
          relevantChanges.added[path] = diff.added[path];
        }
      }
      
      // 检查更改的配置
      for (const path in diff.changed) {
        if (this.isWatchedPath(path, watchPaths)) {
          relevantChanges.changed[path] = diff.changed[path];
        }
      }
      
      // 检查删除的配置
      for (const path in diff.removed) {
        if (this.isWatchedPath(path, watchPaths)) {
          relevantChanges.removed[path] = diff.removed[path];
        }
      }
    } else {
      // 监听所有变化
      relevantChanges = diff;
    }
    
    // 检查是否有相关变化
    const hasRelevantChanges = (
      Object.keys(relevantChanges.added).length > 0 || 
      Object.keys(relevantChanges.changed).length > 0 || 
      Object.keys(relevantChanges.removed).length > 0
    );
    
    if (hasRelevantChanges) {
      // 记录变化
      const change = {
        timestamp: new Date().toISOString(),
        diff: relevantChanges,
        summary: this.generateChangeSummary(relevantChanges)
      };
      
      this.changes.push(change);
      
      // 如果启用通知，输出变化通知
      if (this.options.notifyOnChange) {
        console.log(`[${this.pluginName}] 配置变化摘要:`);
        console.log(change.summary);
      }
    }
  }
  
  /**
   * 检查路径是否在监听列表中
   * @param {string} path - 配置路径
   * @param {Array<string>} watchPaths - 要监听的路径列表
   * @returns {boolean} - 是否监听该路径
   */
  isWatchedPath(path, watchPaths) {
    return watchPaths.some(watchPath => {
      // 完全匹配
      if (path === watchPath) return true;
      
      // 前缀匹配（父路径监听）
      if (path.startsWith(watchPath + '.')) return true;
      
      return false;
    });
  }
  
  /**
   * 生成变化摘要
   * @param {Object} diff - 配置差异对象
   * @returns {string} - 变化摘要
   */
  generateChangeSummary(diff) {
    const addedCount = Object.keys(diff.added).length;
    const changedCount = Object.keys(diff.changed).length;
    const removedCount = Object.keys(diff.removed).length;
    
    let summary = `共 ${addedCount + changedCount + removedCount} 处变化: `;
    summary += `${addedCount} 处新增, ${changedCount} 处修改, ${removedCount} 处删除\n`;
    
    // 添加一些重要变化的详细信息
    const MAX_DETAILS = 3; // 最多显示3个详细变化
    
    // 添加的配置
    if (addedCount > 0) {
      summary += "\n新增配置:\n";
      Object.keys(diff.added).slice(0, MAX_DETAILS).forEach(path => {
        summary += `- ${path}: ${this.formatValue(diff.added[path])}\n`;
      });
      if (addedCount > MAX_DETAILS) {
        summary += `... 以及另外 ${addedCount - MAX_DETAILS} 处新增\n`;
      }
    }
    
    // 更改的配置
    if (changedCount > 0) {
      summary += "\n修改配置:\n";
      Object.keys(diff.changed).slice(0, MAX_DETAILS).forEach(path => {
        summary += `- ${path}: ${this.formatValue(diff.changed[path].from)} -> ${this.formatValue(diff.changed[path].to)}\n`;
      });
      if (changedCount > MAX_DETAILS) {
        summary += `... 以及另外 ${changedCount - MAX_DETAILS} 处修改\n`;
      }
    }
    
    // 删除的配置
    if (removedCount > 0) {
      summary += "\n删除配置:\n";
      Object.keys(diff.removed).slice(0, MAX_DETAILS).forEach(path => {
        summary += `- ${path}: ${this.formatValue(diff.removed[path])}\n`;
      });
      if (removedCount > MAX_DETAILS) {
        summary += `... 以及另外 ${removedCount - MAX_DETAILS} 处删除\n`;
      }
    }
    
    return summary;
  }
  
  /**
   * 格式化配置值，用于摘要显示
   * @param {any} value - 配置值
   * @returns {string} - 格式化后的字符串
   */
  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'object') {
      const isArray = Array.isArray(value);
      const size = isArray ? value.length : Object.keys(value).length;
      return isArray ? `Array(${size})` : `Object(${size})`;
    }
    
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'string') {
      // 截断长字符串
      if (value.length > 30) {
        return `"${value.substring(0, 27)}..."`;
      }
      return `"${value}"`;
    }
    
    return String(value);
  }
  
  /**
   * 生成变化报告
   */
  generateChangeReport() {
    if (!this.options.generateReport || this.changes.length === 0) return;
    
    try {
      // 创建报告内容
      let reportContent = `# Webpack配置变化报告\n\n`;
      reportContent += `生成时间: ${new Date().toISOString()}\n\n`;
      reportContent += `共检测到 ${this.changes.length} 次配置变化\n\n`;
      
      // 添加变化历史
      reportContent += `## 变化历史\n\n`;
      
      // 按时间倒序显示变化
      const reversedChanges = [...this.changes].reverse();
      
      reversedChanges.forEach((change, index) => {
        reportContent += `### 变化 #${this.changes.length - index} (${change.timestamp})\n\n`;
        reportContent += `${change.summary}\n\n`;
        
        // 为最近的几次变化添加详细信息
        if (index < 3) {
          reportContent += `#### 详细变化\n\n`;
          
          // 添加的配置
          if (Object.keys(change.diff.added).length > 0) {
            reportContent += `**新增配置:**\n\n`;
            reportContent += `\`\`\`json\n${JSON.stringify(change.diff.added, null, 2)}\n\`\`\`\n\n`;
          }
          
          // 更改的配置
          if (Object.keys(change.diff.changed).length > 0) {
            reportContent += `**修改配置:**\n\n`;
            reportContent += `\`\`\`json\n${JSON.stringify(change.diff.changed, null, 2)}\n\`\`\`\n\n`;
          }
          
          // 删除的配置
          if (Object.keys(change.diff.removed).length > 0) {
            reportContent += `**删除配置:**\n\n`;
            reportContent += `\`\`\`json\n${JSON.stringify(change.diff.removed, null, 2)}\n\`\`\`\n\n`;
          }
        }
      });
      
      // 写入报告文件
      const reportPath = this.options.reportPath;
      const reportDir = path.dirname(reportPath);
      
      // 确保目录存在
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, reportContent, 'utf-8');
      console.log(`[${this.pluginName}] 配置变化报告已生成: ${reportPath}`);
    } catch (error) {
      console.error(`[${this.pluginName}] 生成配置变化报告失败:`, error);
    }
  }

  /**
   * 应用插件
   * @param {import('webpack').Compiler} compiler - webpack编译器实例
   */
  apply(compiler) {
    // 编译完成钩子
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      console.log(`[${this.pluginName}] 编译完成`);
      
      // 这里不需要额外逻辑，因为我们通过事件监听器接收配置
    });
  }
}

module.exports = WebpackConfigChangeListenerPlugin; 