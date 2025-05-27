# WebpackPluginEventBus

一个基于webpack的tapable库实现的插件事件总线系统，用于管理webpack插件之间的通信。

## 功能特性

- 支持所有tapable钩子类型（同步和异步）
- 提供丰富的事件管理API：on、once、off、emit、emitAsync
- 类似Node.js的EventEmitter API，但基于webpack的tapable库
- 插件之间无需直接依赖，通过事件通信
- 支持同步和异步事件处理
- 自动管理钩子实例的创建和复用

## 安装

```bash
npm install --save-dev webpack-plugin-event-bus
```

或者，将`webpack-plugin-event-bus.js`文件直接复制到您的项目中。

## 基本用法

```javascript
// 导入事件总线
const { eventBus } = require('webpack-plugin-event-bus');

// 在插件A中触发事件
class PluginA {
  apply(compiler) {
    compiler.hooks.done.tap('PluginA', (stats) => {
      // 触发事件，传递数据
      eventBus.emit('myEvent', 'sync', { data: 'some data' });
    });
  }
}

// 在插件B中监听事件
class PluginB {
  constructor() {
    // 在构造函数中注册事件监听器
    eventBus.on('myEvent', 'sync', 'PluginB', (data) => {
      console.log('收到数据:', data);
    });
  }
  
  apply(compiler) {
    // 插件逻辑...
  }
}
```

## 支持的钩子类型

WebpackPluginEventBus支持以下钩子类型：

### 同步钩子

- `sync`: 基本同步钩子，不关心返回值（SyncHook）
- `syncBail`: 当任何监听器返回非undefined值时停止调用后续监听器（SyncBailHook）
- `syncWaterfall`: 前一个监听器的返回值传递给下一个监听器（SyncWaterfallHook）
- `syncLoop`: 监听器可以重复执行，直到返回undefined（SyncLoopHook）

### 异步钩子

- `asyncParallel`: 并行执行监听器（AsyncParallelHook）
- `asyncParallelBail`: 可以提前结束的并行钩子（AsyncParallelBailHook）
- `asyncSeries`: 串行执行监听器（AsyncSeriesHook）
- `asyncSeriesBail`: 可以提前结束的串行钩子（AsyncSeriesBailHook）
- `asyncSeriesWaterfall`: 串行瀑布流钩子（AsyncSeriesWaterfallHook）

## API参考

### EventBus实例

事件总线默认导出一个全局实例，但您也可以创建自己的实例：

```javascript
const { WebpackPluginEventBus } = require('webpack-plugin-event-bus');
const myEventBus = new WebpackPluginEventBus();
```

### 注册事件监听器

```javascript
// 基本监听
eventBus.on(
  'eventName',      // 事件名称
  'hookType',       // 钩子类型，如'sync'、'asyncSeries'等
  'listenerName',   // 监听器名称（通常是插件名称）
  (arg1, arg2) => { // 处理函数
    // 处理事件...
    return result;  // 根据钩子类型，返回值可能被使用或忽略
  },
  ['arg1', 'arg2']  // 可选：参数名称（文档用途）
);

// 一次性监听（执行一次后自动移除）
eventBus.once(
  'eventName',
  'hookType',
  'listenerName', 
  handler,
  args
);
```

### 触发事件

```javascript
// 同步触发
const result = eventBus.emit(
  'eventName',  // 事件名称
  'hookType',   // 钩子类型
  arg1, arg2    // 传递给处理程序的参数
);

// 异步触发（适用于异步钩子）
const result = await eventBus.emitAsync(
  'eventName',
  'hookType',
  arg1, arg2
);
```

### 移除事件监听器

```javascript
eventBus.off(
  'eventName',   // 事件名称
  'hookType',    // 钩子类型
  'listenerName' // 监听器名称
);
```

### 其他有用的方法

```javascript
// 获取或创建钩子（通常不需要直接调用）
const hook = eventBus.getOrCreateHook(
  'eventName',
  'hookType',
  ['arg1', 'arg2']
);

// 列出所有已注册的钩子
const hooks = eventBus.listHooks();

// 检查钩子是否存在
const exists = eventBus.hasHook('eventName', 'hookType');

// 获取钩子的处理程序数量
const count = eventBus.handlerCount('eventName', 'hookType');
```

## 实际使用示例

请参见 `webpack-plugin-event-bus-example.js` 文件，该文件包含了如何使用事件总线实现插件间通信的完整示例。

## 示例解析

```javascript
// 触发配置提取完成事件
eventBus.emit('configExtracted', 'sync', filteredConfig, formattedConfig);

// 监听配置提取事件
eventBus.on('configExtracted', 'sync', 'MyPlugin', (config, formattedConfig) => {
  // 使用提取的配置
});

// 使用瀑布流钩子增强配置
const enhancedConfig = eventBus.emit('enhanceConfig', 'syncWaterfall', initialConfig);

// 使用异步钩子
const result = await eventBus.emitAsync('asyncProcess', 'asyncSeries', data);
```

## 最佳实践

1. **事件命名**: 使用描述性名称，如 `configExtracted`、`assetsProcessed` 等
2. **选择合适的钩子类型**:
   - 使用 `sync` 进行简单的事件通知
   - 使用 `syncWaterfall` 进行数据转换链
   - 使用 `asyncSeries` 进行顺序异步操作
3. **注册时机**: 在插件的构造函数中注册监听器，以确保及时捕获事件
4. **文档**: 在插件文档中清晰说明发出和监听的事件
5. **错误处理**: 在异步事件处理中使用try/catch捕获异常

## 与静态钩子的比较

传统方式（静态钩子）:
```javascript
class PluginA {
  static hooks = {
    someEvent: new SyncHook(['arg1', 'arg2'])
  };
  
  apply(compiler) {
    // 触发钩子
    PluginA.hooks.someEvent.call(arg1, arg2);
  }
}

// 在另一个插件中使用
class PluginB {
  constructor() {
    // 需要直接引用PluginA
    PluginA.hooks.someEvent.tap('PluginB', (arg1, arg2) => {
      // 处理...
    });
  }
}
```

使用EventBus:
```javascript
class PluginA {
  apply(compiler) {
    // 触发事件
    eventBus.emit('someEvent', 'sync', arg1, arg2);
  }
}

class PluginB {
  constructor() {
    // 不需要直接引用PluginA
    eventBus.on('someEvent', 'sync', 'PluginB', (arg1, arg2) => {
      // 处理...
    });
  }
}
```

主要优势:
- 无需直接依赖其他插件类型
- 可通过事件名称查找所有相关插件
- 支持更丰富的事件管理API（如once和off）

## 注意事项

1. **避免在同步钩子回调中使用异步操作**, 这可能导致不可预期的行为
2. **选择合适的钩子类型**, 确保与您的用例匹配
3. **处理错误**, 特别是在异步钩子中
4. **避免循环依赖**, 多个插件相互触发事件可能导致无限循环
5. **注意垃圾收集**, 在插件卸载时取消事件监听

## 许可证

MIT 