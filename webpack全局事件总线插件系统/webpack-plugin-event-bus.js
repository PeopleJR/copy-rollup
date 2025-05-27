/**
 * webpack-plugin-event-bus.js
 * 
 * 一个基于webpack的tapable库实现的插件事件总线系统
 * 用于管理webpack插件之间的事件通信
 */

const {
  // 同步钩子
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  
  // 异步并行钩子
  AsyncParallelHook,
  AsyncParallelBailHook,
  
  // 异步串行钩子
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook
} = require('tapable');

/**
 * 钩子类型映射，用于创建各种类型的钩子
 */
const HOOK_TYPES = {
  sync: SyncHook,
  syncBail: SyncBailHook,
  syncWaterfall: SyncWaterfallHook,
  syncLoop: SyncLoopHook,
  asyncParallel: AsyncParallelHook,
  asyncParallelBail: AsyncParallelBailHook,
  asyncSeries: AsyncSeriesHook,
  asyncSeriesBail: AsyncSeriesBailHook,
  asyncSeriesWaterfall: AsyncSeriesWaterfallHook
};

/**
 * 事件总线类 - 用于webpack插件之间的事件通信
 */
class WebpackPluginEventBus {
  /**
   * 创建事件总线实例
   */
  constructor() {
    this.hooks = {};
    this.onceHandlers = new Map(); // 存储一次性处理程序
    this.pluginPrefix = 'WebpackPluginEventBus';
  }

  /**
   * 获取或创建钩子
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param {Array<string>} args - 钩子参数名称
   * @returns {Object} - tapable钩子实例
   */
  getOrCreateHook(name, type = 'sync', args = []) {
    // 确保类型有效
    if (!HOOK_TYPES[type]) {
      throw new Error(`无效的钩子类型: ${type}。可用类型: ${Object.keys(HOOK_TYPES).join(', ')}`);
    }

    // 完整钩子标识符: 类型 + 名称
    const hookId = `${type}:${name}`;
    
    // 如果钩子不存在则创建
    if (!this.hooks[hookId]) {
      const HookClass = HOOK_TYPES[type];
      this.hooks[hookId] = new HookClass(args);
      console.log(`[${this.pluginPrefix}] 创建新钩子: "${hookId}" 参数: ${args.join(', ')}`);
    }
    
    return this.hooks[hookId];
  }

  /**
   * 注册监听器到钩子
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param {string} pluginName - 插件名称
   * @param {Function} handler - 处理函数
   * @param {Array<string>} args - 钩子参数名称
   * @returns {this} - 链式调用
   */
  on(name, type, pluginName, handler, args = []) {
    const hook = this.getOrCreateHook(name, type, args);
    hook.tap(pluginName, handler);
    console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 注册到钩子 "${type}:${name}"`);
    return this;
  }

  /**
   * 注册一次性监听器到钩子
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param {string} pluginName - 插件名称
   * @param {Function} handler - 处理函数
   * @param {Array<string>} args - 钩子参数名称
   * @returns {this} - 链式调用
   */
  once(name, type, pluginName, handler, args = []) {
    const hook = this.getOrCreateHook(name, type, args);
    
    // 创建一个包装器
    const wrappedHandler = (...handlerArgs) => {
      // 获取结果
      const result = handler(...handlerArgs);
      
      // 执行后立即移除监听器
      this.off(name, type, pluginName);
      
      return result;
    };
    
    // 存储原始处理程序和包装器的映射关系
    const handlerId = `${type}:${name}:${pluginName}`;
    this.onceHandlers.set(handlerId, { original: handler, wrapped: wrappedHandler });
    
    // 注册包装器
    hook.tap(pluginName, wrappedHandler);
    console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 注册一次性监听器到钩子 "${type}:${name}"`);
    return this;
  }

  /**
   * 移除钩子监听器
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param {string} pluginName - 插件名称
   * @returns {boolean} - 是否成功移除
   */
  off(name, type, pluginName) {
    const hookId = `${type}:${name}`;
    const hook = this.hooks[hookId];
    
    if (!hook) {
      console.warn(`[${this.pluginPrefix}] 尝试移除不存在的钩子: "${hookId}"`);
      return false;
    }
    
    // 检查钩子是否支持取消注册（未实现于所有Tapable的钩子中）
    if (typeof hook.untap === 'function') {
      hook.untap(pluginName);
      console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 从钩子 "${hookId}" 中移除`);
      return true;
    }
    
    // Tapable库的钩子不直接支持移除监听器
    // 但我们可以从onceHandlers中移除跟踪
    const handlerId = `${type}:${name}:${pluginName}`;
    if (this.onceHandlers.has(handlerId)) {
      this.onceHandlers.delete(handlerId);
    }
    
    console.warn(`[${this.pluginPrefix}] 无法从钩子 "${hookId}" 中移除插件 "${pluginName}"，tapable不直接支持此操作`);
    return false;
  }

  /**
   * 触发钩子事件 - 同步方式
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param  {...any} args - 传递给处理程序的参数
   * @returns {any} - 钩子调用的结果
   */
  emit(name, type, ...args) {
    const hookId = `${type}:${name}`;
    const hook = this.hooks[hookId];
    
    if (!hook) {
      console.warn(`[${this.pluginPrefix}] 尝试触发不存在的钩子: "${hookId}"`);
      return undefined;
    }
    
    console.log(`[${this.pluginPrefix}] 触发钩子: "${hookId}"`);
    return hook.call(...args);
  }
  
  /**
   * 触发钩子事件 - Promise异步方式
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @param  {...any} args - 传递给处理程序的参数
   * @returns {Promise<any>} - 包含钩子调用结果的Promise
   */
  async emitAsync(name, type, ...args) {
    const hookId = `${type}:${name}`;
    const hook = this.hooks[hookId];
    
    if (!hook) {
      console.warn(`[${this.pluginPrefix}] 尝试触发不存在的异步钩子: "${hookId}"`);
      return undefined;
    }
    
    if (!hook.promise) {
      throw new Error(`钩子 "${hookId}" 不支持promise调用，请使用异步钩子类型`);
    }
    
    console.log(`[${this.pluginPrefix}] 触发异步钩子: "${hookId}"`);
    return hook.promise(...args);
  }
  
  /**
   * 列出所有已注册的钩子
   * @returns {Array<Object>} - 钩子信息对象数组
   */
  listHooks() {
    return Object.keys(this.hooks).map(hookId => {
      const [type, name] = hookId.split(':');
      return { name, type, id: hookId };
    });
  }
  
  /**
   * 检查钩子是否存在
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @returns {boolean} - 钩子是否存在
   */
  hasHook(name, type = 'sync') {
    const hookId = `${type}:${name}`;
    return !!this.hooks[hookId];
  }
  
  /**
   * 获取当前钩子的处理程序数量
   * @param {string} name - 钩子名称
   * @param {string} type - 钩子类型
   * @returns {number} - 处理程序数量
   */
  handlerCount(name, type = 'sync') {
    const hookId = `${type}:${name}`;
    const hook = this.hooks[hookId];
    
    if (!hook || !hook.taps) {
      return 0;
    }
    
    return hook.taps.length;
  }
}

// 创建全局事件总线实例
const eventBus = new WebpackPluginEventBus();

module.exports = {
  WebpackPluginEventBus,
  eventBus
}; 