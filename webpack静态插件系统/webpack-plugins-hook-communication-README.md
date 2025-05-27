# Webpack插件自定义钩子通信

本项目展示了如何使用webpack的自定义钩子系统实现两个插件之间的通信，具体是`WebpackConfigExtractPlugin`和`WebpackReadmeGeneratorPlugin`之间的通信。

## 通信机制概述

通过使用webpack的Tapable库提供的钩子系统，一个插件可以暴露自定义钩子，其他插件可以监听和响应这些钩子。这种方式实现了插件间的松耦合通信，不需要插件之间直接依赖对方的实例。

## 实现原理

### 1. 创建并暴露静态钩子

在`WebpackConfigExtractPlugin`中，我们定义了静态钩子：

```javascript
const { SyncHook } = require('tapable');

class WebpackConfigExtractPlugin {
  // 定义静态钩子，供其他插件使用
  static hooks = {
    configExtracted: new SyncHook(['config', 'formattedConfig'])
  };
  
  // ...其他代码
}
```

钩子的类型选择：
- `SyncHook`: 同步钩子，不关心监听器的返回值
- 其他类型包括：`SyncBailHook`、`SyncWaterfallHook`、`AsyncSeriesHook`等，适用于不同的使用场景

### 2. 触发钩子事件

在插件的功能完成后，触发相应的钩子：

```javascript
// 提取配置后触发钩子
WebpackConfigExtractPlugin.hooks.configExtracted.call(filteredConfig, formattedConfig);
```

### 3. 监听钩子事件

在另一个插件中，监听这个钩子：

```javascript
class WebpackReadmeGeneratorPlugin {
  constructor(options = {}) {
    // ...其他初始化代码
    
    // 监听钩子
    this.setupHooks();
  }
  
  setupHooks() {
    // 监听WebpackConfigExtractPlugin的configExtracted钩子
    WebpackConfigExtractPlugin.hooks.configExtracted.tap(
      this.pluginName, 
      (config, formattedConfig) => {
        // 存储提取的配置
        this.extractedConfig = {
          config,
          formattedConfig,
          extractTime: new Date().toISOString()
        };
      }
    );
  }
  
  // ...其他代码
}
```

### 4. 使用通过钩子获取的数据

在插件的功能中使用获取的数据：

```javascript
compiler.hooks.done.tap(this.pluginName, (stats) => {
  // 使用通过钩子获取的数据生成README
  if (this.extractedConfig) {
    this.generateReadme();
  }
});
```

## 优点

1. **松耦合**: 插件之间不需要直接依赖对方的实例
2. **标准化**: 使用webpack自己的Tapable库，遵循webpack的设计理念
3. **灵活性**: 可以创建多种类型的钩子来满足不同的需求
4. **可扩展性**: 多个插件可以监听同一个钩子

## 不同类型的钩子

Tapable库提供了多种类型的钩子，适用于不同的场景：

1. **同步钩子**:
   - `SyncHook`: 最基本的同步钩子，不关心返回值
   - `SyncBailHook`: 当任何监听器返回非undefined值时停止调用后续监听器
   - `SyncWaterfallHook`: 前一个监听器的返回值会传给下一个监听器
   - `SyncLoopHook`: 监听器可以重复执行，直到返回undefined

2. **异步钩子**:
   - `AsyncParallelHook`: 并行执行监听器
   - `AsyncSeriesHook`: 串行执行监听器
   - `AsyncSeriesBailHook`: 可以提前结束的串行钩子
   - `AsyncSeriesWaterfallHook`: 串行瀑布流钩子

## 使用示例

请参考 `webpack-plugins-hook-example.js` 文件，了解如何在webpack配置中使用这两个插件。

```javascript
// webpack.config.js
const WebpackConfigExtractPlugin = require('./webpack-config-extract-plugin');
const WebpackReadmeGeneratorPlugin = require('./webpack-readme-generator-plugin');

module.exports = {
  // ...webpack配置
  plugins: [
    // 配置提取插件 - 必须先注册，因为它会触发钩子事件
    new WebpackConfigExtractPlugin({
      // ...插件配置
    }),
    
    // README生成插件 - 会监听WebpackConfigExtractPlugin的钩子
    new WebpackReadmeGeneratorPlugin({
      // ...插件配置
    }),
  ],
};
```

## 注意事项

1. **插件注册顺序**: 触发钩子的插件必须在监听钩子的插件之前注册
2. **错误处理**: 在钩子监听器中应添加适当的错误处理
3. **静态钩子**: 使用静态钩子可以让其他插件无需插件实例即可访问
4. **钩子命名**: 钩子名称应该清晰表达其目的和触发时机 