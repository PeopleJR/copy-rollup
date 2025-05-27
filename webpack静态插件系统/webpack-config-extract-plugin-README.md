# WebpackConfigExtractPlugin

一个用于在编译完成后提取webpack配置的webpack插件。

## 功能

- 在webpack编译完成后提取webpack配置
- 可配置输出到文件或控制台
- 支持配置过滤，只包含或排除特定字段
- 支持自定义格式化配置输出
- 可选择只在生产环境下执行

## 安装

```bash
npm install --save-dev webpack-config-extract-plugin
```

或者，将`webpack-config-extract-plugin.js`文件直接复制到您的项目中。

## 基本用法

```javascript
// webpack.config.js
const WebpackConfigExtractPlugin = require('webpack-config-extract-plugin');

module.exports = {
  // ... 其他webpack配置
  plugins: [
    new WebpackConfigExtractPlugin()
  ]
};
```

## 高级配置

```javascript
// webpack.config.js
const WebpackConfigExtractPlugin = require('webpack-config-extract-plugin');

module.exports = {
  // ... 其他webpack配置
  plugins: [
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
    })
  ]
};
```

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|-------|------|
| `outputToFile` | `boolean` | `true` | 是否将配置输出到文件 |
| `outputPath` | `string` | `'./webpack-config.json'` | 输出文件路径 |
| `outputToConsole` | `boolean` | `false` | 是否将配置输出到控制台 |
| `includeFields` | `Array<string>` | `[]` | 要包含的配置字段 |
| `excludeFields` | `Array<string>` | `[]` | 要排除的配置字段 |
| `productionOnly` | `boolean` | `false` | 是否仅在生产环境下执行 |
| `customFormatter` | `Function` | `null` | 自定义格式化函数 |

## 使用场景

- 调试webpack配置
- 将配置导出用于文档或分析
- 在CI/CD流程中验证webpack配置
- 调试插件和loader之间的交互

## 示例

参见 `webpack-config-extract-plugin-example.js` 文件获取更多使用示例。

## 许可证

MIT 