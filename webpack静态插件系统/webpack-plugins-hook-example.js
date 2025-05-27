/**
 * webpack-plugins-hook-example.js
 * 展示如何使用自定义钩子系统实现WebpackConfigExtractPlugin和ReadmeGeneratorPlugin之间的通信
 */

// 引入插件
const WebpackConfigExtractPlugin = require('./webpack-config-extract-plugin');
const WebpackReadmeGeneratorPlugin = require('./webpack-readme-generator-plugin');
const path = require('path');

// webpack配置示例
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
    // 配置提取插件 - 必须在README生成插件之前注册，因为它会触发钩子事件
    new WebpackConfigExtractPlugin({
      outputToFile: true,
      outputPath: './extracted-webpack-config.json',
      outputToConsole: false,
      // 只提取部分关键配置以保持README简洁
      includeFields: ['entry', 'output', 'module', 'plugins', 'mode'],
    }),
    
    // README生成插件 - 会在构造函数中监听WebpackConfigExtractPlugin的钩子
    new WebpackReadmeGeneratorPlugin({
      outputPath: './README.md',
      includeConfig: true, // 包含webpack配置
      templateVariables: {
        projectName: '自定义钩子通信示例',
        description: '展示webpack插件之间如何通过自定义钩子系统通信',
        author: 'Your Name',
        version: '1.0.0',
        license: 'MIT'
      }
    }),
  ],
};

/**
 * 插件通信工作原理：
 * 
 * 1. WebpackConfigExtractPlugin定义了静态钩子：
 *    static hooks = {
 *      configExtracted: new SyncHook(['config', 'formattedConfig'])
 *    };
 * 
 * 2. WebpackConfigExtractPlugin在提取完配置后触发钩子：
 *    WebpackConfigExtractPlugin.hooks.configExtracted.call(filteredConfig, formattedConfig);
 * 
 * 3. WebpackReadmeGeneratorPlugin在构造函数中监听这个钩子：
 *    WebpackConfigExtractPlugin.hooks.configExtracted.tap(
 *      this.pluginName, 
 *      (config, formattedConfig) => {
 *        // 存储提取的配置
 *      }
 *    );
 * 
 * 4. WebpackReadmeGeneratorPlugin在webpack编译完成后使用存储的配置生成README：
 *    compiler.hooks.done.tap(this.pluginName, (stats) => {
 *      this.generateReadme();
 *    });
 * 
 * 这个实现遵循webpack的插件设计模式，使用tapable库来处理事件和钩子。
 * 通过静态钩子，插件之间实现了松耦合通信，不需要直接依赖对方的实例。
 */ 