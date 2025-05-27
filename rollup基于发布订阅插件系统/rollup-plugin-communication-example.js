/**
 * rollup-plugin-communication-example.js
 * 
 * 展示如何在Rollup配置中使用事件总线进行插件通信的完整示例
 */
const path = require('path');
const { eventBus } = require('./rollup-plugin-event-bus');
const configExtractorPlugin = require('./rollup-plugin-config-extractor');
const readmeGeneratorPlugin = require('./rollup-plugin-readme-generator');

/**
 * 自定义插件 - 配置分析插件
 * 监听configExtracted事件并分析配置
 */
function configAnalyzerPlugin(options = {}) {
  // 默认配置
  const config = {
    analyzeBundle: true,
    analyzePlugins: true,
    reportFile: './rollup-config-analysis.json',
    ...options
  };

  // 存储分析结果
  let analysisResult = null;

  // 注册事件监听
  eventBus.on('configExtracted', 'rollup-config-analyzer', (extractedConfig) => {
    console.log('[rollup-config-analyzer] 开始分析Rollup配置');
    
    // 分析配置
    const analysis = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {}
    };
    
    // 分析输入
    if (extractedConfig.input) {
      const inputFiles = typeof extractedConfig.input === 'string'
        ? [extractedConfig.input]
        : Array.isArray(extractedConfig.input)
          ? extractedConfig.input
          : Object.values(extractedConfig.input);
          
      analysis.summary.entryCount = inputFiles.length;
      analysis.details.entries = inputFiles;
    }
    
    // 分析输出
    if (extractedConfig.output) {
      const outputs = Array.isArray(extractedConfig.output)
        ? extractedConfig.output
        : [extractedConfig.output];
        
      analysis.summary.outputCount = outputs.length;
      analysis.summary.formats = outputs.map(out => out.format);
      analysis.details.outputs = outputs.map(out => ({
        format: out.format,
        file: out.file,
        dir: out.dir
      }));
    }
    
    // 分析插件
    if (extractedConfig.plugins && config.analyzePlugins) {
      const plugins = extractedConfig.plugins || [];
      analysis.summary.pluginCount = plugins.length;
      analysis.details.plugins = plugins.map(plugin => {
        return {
          name: plugin.name || '匿名插件',
          hooks: Object.keys(plugin).filter(key => 
            typeof plugin[key] === 'function' && !key.startsWith('_')
          )
        };
      });
    }
    
    // 保存分析结果
    analysisResult = analysis;
    console.log('[rollup-config-analyzer] 配置分析完成');
  });

  return {
    name: 'rollup-config-analyzer',
    
    /**
     * 输出分析结果到文件
     */
    _outputAnalysis() {
      if (!analysisResult) {
        console.warn('[rollup-config-analyzer] 没有分析结果可输出');
        return;
      }
      
      try {
        const fs = require('fs');
        const outputPath = config.reportFile;
        const content = JSON.stringify(analysisResult, null, 2);
        
        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, content, 'utf-8');
        console.log(`[rollup-config-analyzer] 分析报告已保存: ${outputPath}`);
      } catch (error) {
        console.error('[rollup-config-analyzer] 输出分析结果时出错:', error);
      }
    },
    
    /**
     * 分析打包结果
     */
    generateBundle(outputOptions, bundle) {
      if (!config.analyzeBundle) return;
      
      // 分析打包结果
      const bundleAnalysis = {
        chunkCount: Object.keys(bundle).length,
        totalSize: 0,
        chunks: []
      };
      
      // 分析每个块
      for (const [fileName, chunk] of Object.entries(bundle)) {
        const chunkInfo = {
          fileName,
          size: chunk.code ? chunk.code.length : 0,
          type: chunk.type,
          isEntry: !!chunk.isEntry
        };
        
        bundleAnalysis.chunks.push(chunkInfo);
        bundleAnalysis.totalSize += chunkInfo.size;
      }
      
      // 更新分析结果
      if (analysisResult) {
        analysisResult.bundleAnalysis = bundleAnalysis;
      } else {
        analysisResult = { bundleAnalysis };
      }
    },
    
    /**
     * 输出分析报告
     */
    closeBundle() {
      this._outputAnalysis();
    }
  };
}

/**
 * 自定义插件 - 执行一次性通信演示
 */
function oneTimeListenerPlugin() {
  // 注册一次性监听器
  eventBus.once('configExtracted', 'one-time-listener', (config) => {
    console.log('[one-time-listener] 首次接收到配置，此监听器将被移除');
    console.log('[one-time-listener] 配置包含以下字段:', Object.keys(config));
  });
  
  return {
    name: 'one-time-listener',
    
    buildStart() {
      console.log('[one-time-listener] 构建开始');
    }
  };
}

/**
 * Rollup配置示例
 */
module.exports = {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    // 配置提取插件 - 提取并发出配置事件
    configExtractorPlugin({
      outputToFile: true,
      outputPath: './extracted-rollup-config.json',
      outputToConsole: true,
      includeFields: ['input', 'output', 'plugins'],
      emitEvent: true
    }),
    
    // README生成器插件 - 监听配置事件并生成README
    readmeGeneratorPlugin({
      outputPath: './README.md',
      includeConfig: true,
      templateVariables: {
        projectName: 'Rollup插件通信示例',
        description: '展示如何在Rollup插件间使用事件总线进行通信',
        author: 'AI助手',
        version: '1.0.0'
      }
    }),
    
    // 配置分析插件 - 分析配置并生成报告
    configAnalyzerPlugin({
      analyzeBundle: true,
      analyzePlugins: true,
      reportFile: './rollup-analysis.json'
    }),
    
    // 一次性监听器插件
    oneTimeListenerPlugin(),
    
    // 自定义匿名插件 - 直接在插件对象中使用事件总线
    {
      name: 'inline-event-listener',
      
      buildStart() {
        console.log('[inline-event-listener] 注册事件监听器');
        
        // 注册事件监听器
        eventBus.on('configExtracted', 'inline-event-listener', (config) => {
          console.log('[inline-event-listener] 接收到配置提取事件');
          console.log('[inline-event-listener] 输入文件:', config.input);
        });
      },
      
      // 在构建结束时发送自定义事件
      buildEnd() {
        console.log('[inline-event-listener] 发送自定义事件');
        
        // 触发自定义事件
        eventBus.emit('buildCompleted', {
          time: new Date().toISOString(),
          success: true
        });
      }
    }
  ]
}; 