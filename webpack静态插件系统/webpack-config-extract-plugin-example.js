/**
 * webpack-config-extract-plugin-example.js
 * 展示如何在webpack配置中使用WebpackConfigExtractPlugin插件
 */

// 引入插件
const WebpackConfigExtractPlugin = require('./webpack-config-extract-plugin');
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
    // 基本用法 - 使用默认配置
    new WebpackConfigExtractPlugin(),
    
    // 高级用法 - 自定义配置
    new WebpackConfigExtractPlugin({
      outputToFile: true,
      outputPath: './extracted-webpack-config.json', // 自定义输出路径
      outputToConsole: true, // 同时输出到控制台
      includeFields: ['entry', 'output', 'module'], // 只提取这些字段
      excludeFields: [], // 与includeFields不能同时使用
      productionOnly: false, // 在所有环境下执行
      customFormatter: (config) => {
        // 自定义格式化，例如添加注释或修改格式
        return JSON.stringify(config, null, 4) + '\n// Generated at: ' + new Date().toISOString();
      },
    }),
    
    // 只提取部分配置
    new WebpackConfigExtractPlugin({
      outputPath: './webpack-plugins-config.json',
      includeFields: ['plugins'],
    }),
    
    // 排除某些字段
    new WebpackConfigExtractPlugin({
      outputPath: './webpack-minimal-config.json',
      excludeFields: ['node', 'optimization', 'performance'],
    }),
    
    // 只在生产环境下输出
    new WebpackConfigExtractPlugin({
      outputPath: './webpack-prod-config.json',
      productionOnly: true,
    }),
  ],
};

/**
 * 注意：在实际使用中，您可能只需要使用一个WebpackConfigExtractPlugin实例。
 * 上面的示例展示了多种可能的配置选项。
 */ 