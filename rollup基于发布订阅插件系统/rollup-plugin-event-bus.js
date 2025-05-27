/**
 * rollup-plugin-event-bus.js
 * 
 * 为Rollup插件提供的事件总线，使插件之间可以进行通信
 * 实现了一个简单的发布/订阅模式，支持同步和异步事件
 */

/**
 * 事件总线类 - 管理事件注册和触发
 */
class RollupPluginEventBus {
  /**
   * 创建事件总线实例
   */
  constructor() {
    this.events = new Map(); // 事件名称 -> 处理函数数组
    this.onceEvents = new Map(); // 用于追踪一次性事件
    this.pluginPrefix = 'RollupPluginEventBus';
  }

  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {string} pluginName - 注册监听的插件名称
   * @param {Function} handler - 事件处理函数
   * @returns {this} - 链式调用
   */
  on(eventName, pluginName, handler) {
    if (typeof handler !== 'function') {
      throw new Error('事件处理函数必须是一个函数');
    }

    const handlerId = `${eventName}:${pluginName}`;
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const handlers = this.events.get(eventName);
    handlers.push({
      pluginName,
      handlerId,
      handler
    });

    console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 注册到事件 "${eventName}"`);
    return this;
  }

  /**
   * 注册一次性事件监听器，触发一次后自动移除
   * @param {string} eventName - 事件名称
   * @param {string} pluginName - 注册监听的插件名称
   * @param {Function} handler - 事件处理函数
   * @returns {this} - 链式调用
   */
  once(eventName, pluginName, handler) {
    if (typeof handler !== 'function') {
      throw new Error('事件处理函数必须是一个函数');
    }

    const handlerId = `${eventName}:${pluginName}`;
    
    // 创建包装处理函数
    const wrappedHandler = (...args) => {
      // 先移除监听器
      this.off(eventName, pluginName);
      // 调用原始处理函数
      return handler(...args);
    };

    this.onceEvents.set(handlerId, {
      original: handler,
      wrapped: wrappedHandler
    });

    // 使用包装函数注册
    this.on(eventName, pluginName, wrappedHandler);
    console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 注册一次性事件 "${eventName}"`);
    
    return this;
  }

  /**
   * 取消事件监听
   * @param {string} eventName - 事件名称
   * @param {string} pluginName - 插件名称
   * @returns {boolean} - 是否成功移除
   */
  off(eventName, pluginName) {
    if (!this.events.has(eventName)) {
      return false;
    }

    const handlerId = `${eventName}:${pluginName}`;
    const handlers = this.events.get(eventName);
    const originalLength = handlers.length;

    // 移除事件处理函数
    const filteredHandlers = handlers.filter(
      h => h.handlerId !== handlerId
    );
    
    this.events.set(eventName, filteredHandlers);

    // 清理一次性事件注册
    if (this.onceEvents.has(handlerId)) {
      this.onceEvents.delete(handlerId);
    }

    const removed = originalLength > filteredHandlers.length;
    if (removed) {
      console.log(`[${this.pluginPrefix}] 插件 "${pluginName}" 从事件 "${eventName}" 中移除`);
    }
    
    // 如果没有处理函数了，删除该事件
    if (filteredHandlers.length === 0) {
      this.events.delete(eventName);
    }

    return removed;
  }

  /**
   * 触发同步事件
   * @param {string} eventName - 事件名称
   * @param {...any} args - 传递给事件处理函数的参数
   * @returns {Array<any>} - 所有处理函数的返回值数组
   */
  emit(eventName, ...args) {
    if (!this.events.has(eventName)) {
      console.log(`[${this.pluginPrefix}] 事件 "${eventName}" 没有监听器`);
      return [];
    }

    console.log(`[${this.pluginPrefix}] 触发事件 "${eventName}"`);
    const handlers = this.events.get(eventName);
    
    return handlers.map(({ pluginName, handler }) => {
      try {
        const result = handler(...args);
        return { pluginName, result };
      } catch (error) {
        console.error(`[${this.pluginPrefix}] 插件 "${pluginName}" 处理事件 "${eventName}" 时出错:`, error);
        return { pluginName, error };
      }
    });
  }

  /**
   * 触发异步事件 (Promise-based)
   * @param {string} eventName - 事件名称
   * @param {...any} args - 传递给事件处理函数的参数
   * @returns {Promise<Array<any>>} - 包含所有处理函数结果的Promise
   */
  async emitAsync(eventName, ...args) {
    if (!this.events.has(eventName)) {
      console.log(`[${this.pluginPrefix}] 异步事件 "${eventName}" 没有监听器`);
      return [];
    }

    console.log(`[${this.pluginPrefix}] 触发异步事件 "${eventName}"`);
    const handlers = this.events.get(eventName);
    
    // 使用Promise.all等待所有异步处理完成
    const results = await Promise.all(
      handlers.map(async ({ pluginName, handler }) => {
        try {
          const result = await Promise.resolve(handler(...args));
          return { pluginName, result };
        } catch (error) {
          console.error(`[${this.pluginPrefix}] 插件 "${pluginName}" 处理异步事件 "${eventName}" 时出错:`, error);
          return { pluginName, error };
        }
      })
    );
    
    return results;
  }

  /**
   * 获取事件处理函数的数量
   * @param {string} eventName - 事件名称
   * @returns {number} 处理函数数量
   */
  listenerCount(eventName) {
    if (!this.events.has(eventName)) {
      return 0;
    }
    return this.events.get(eventName).length;
  }

  /**
   * 列出所有注册的事件
   * @returns {Array<string>} 事件名称数组
   */
  listEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * 列出特定事件的所有监听器
   * @param {string} eventName - 事件名称
   * @returns {Array<string>} 监听器插件名称数组
   */
  listEventListeners(eventName) {
    if (!this.events.has(eventName)) {
      return [];
    }
    return this.events.get(eventName).map(h => h.pluginName);
  }
}

// 创建单例实例，方便直接导入使用
const eventBus = new RollupPluginEventBus();

module.exports = {
  RollupPluginEventBus,
  eventBus
}; 