/**
 * webpack-tapable-hooks-example.js
 * 
 * 这个文件展示了webpack的tapable库中所有类型的钩子，
 * 并提供了每种钩子的详细描述、参数注释和使用示例。
 * 
 * tapable是webpack的核心库之一，它提供了一套灵活的钩子系统，
 * 使得webpack可以在构建过程的各个阶段插入自定义逻辑。
 */

// 引入tapable库中的所有钩子类型
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
 * TapableHooksExample - 包含tapable库中所有钩子类型的示例类
 */
class TapableHooksExample {
  constructor() {
    /**
     * 初始化所有类型的钩子
     * 
     * 每个钩子的构造函数都接收一个数组参数，定义了钩子被触发时传递的参数名称。
     * 这些参数名称主要用于文档目的，实际使用时可以是任何名称。
     */
    
    //==========================================================================================
    // 同步钩子 (Synchronous Hooks)
    //==========================================================================================
    
    /**
     * SyncHook - 最基本的同步钩子
     * 
     * 特点:
     * - 按照注册顺序同步执行所有监听器
     * - 不关心监听器的返回值
     * - 所有注册的监听器都会被调用
     * 
     * 参数:
     * @param {string} param1 - 第一个参数，可以在调用时传入
     * @param {string} param2 - 第二个参数，可以在调用时传入
     * 
     * 使用场景:
     * - 需要通知多个监听器但不需要它们的返回值
     * - 用于事件通知、日志记录等
     */
    this.syncHook = new SyncHook(['param1', 'param2']);
    
    /**
     * SyncBailHook - 可以提前退出的同步钩子
     * 
     * 特点:
     * - 按照注册顺序同步执行监听器
     * - 如果任何监听器返回非undefined的值，则停止执行后续监听器
     * - 整个钩子的返回值是第一个返回非undefined值的监听器的返回值
     * 
     * 参数:
     * @param {string} request - 请求对象，可以在调用时传入
     * 
     * 使用场景:
     * - 提供自定义解析器或加载器
     * - 实现中断逻辑，如权限验证
     * - 寻找第一个能处理特定请求的处理器
     */
    this.syncBailHook = new SyncBailHook(['request']);
    
    /**
     * SyncWaterfallHook - 瀑布流同步钩子
     * 
     * 特点:
     * - 按照注册顺序同步执行监听器
     * - 第一个监听器接收初始参数
     * - 后续每个监听器接收前一个监听器的返回值作为参数
     * - 整个钩子的返回值是最后一个监听器的返回值
     * 
     * 参数:
     * @param {Object} result - 初始结果，会在每个监听器间传递和修改
     * 
     * 使用场景:
     * - 累积处理、转换或过滤数据
     * - 实现管道/链式处理
     * - 允许多个插件顺序修改同一个对象
     */
    this.syncWaterfallHook = new SyncWaterfallHook(['result']);
    
    /**
     * SyncLoopHook - 循环同步钩子
     * 
     * 特点:
     * - 按照注册顺序同步执行监听器
     * - 如果监听器返回非undefined的值，则重新从第一个监听器开始执行
     * - 只有当所有监听器都返回undefined时，钩子才算执行完成
     * 
     * 参数:
     * @param {Object} data - 待处理的数据
     * 
     * 使用场景:
     * - 需要重复处理直到满足某个条件
     * - 依赖于其他监听器的处理结果
     * - 实现复杂的迭代逻辑
     */
    this.syncLoopHook = new SyncLoopHook(['data']);
    
    //==========================================================================================
    // 异步并行钩子 (Async Parallel Hooks)
    //==========================================================================================
    
    /**
     * AsyncParallelHook - 并行执行的异步钩子
     * 
     * 特点:
     * - 并行执行所有注册的异步监听器
     * - 所有监听器完成后才算完成
     * - 不关心监听器的返回值
     * 
     * 参数:
     * @param {string} resource - 资源路径或标识符
     * @param {string} filename - 文件名
     * 
     * 使用场景:
     * - 并行加载或处理资源
     * - 同时执行多个独立的异步操作
     * - 批量处理不依赖顺序的任务
     */
    this.asyncParallelHook = new AsyncParallelHook(['resource', 'filename']);
    
    /**
     * AsyncParallelBailHook - 可以提前退出的并行异步钩子
     * 
     * 特点:
     * - 并行执行所有注册的异步监听器
     * - 如果任何监听器返回非undefined的值，则提前结束
     * - 返回第一个非undefined的结果
     * 
     * 参数:
     * @param {Object} params - 参数对象
     * 
     * 使用场景:
     * - 并行验证或检查
     * - 寻找第一个能满足条件的异步处理器
     * - 需要快速失败机制的并行任务
     */
    this.asyncParallelBailHook = new AsyncParallelBailHook(['params']);
    
    //==========================================================================================
    // 异步串行钩子 (Async Series Hooks)
    //==========================================================================================
    
    /**
     * AsyncSeriesHook - 串行执行的异步钩子
     * 
     * 特点:
     * - 按照注册顺序串行执行异步监听器
     * - 一个监听器完成后才执行下一个
     * - 不关心监听器的返回值
     * 
     * 参数:
     * @param {Object} context - 上下文对象
     * @param {Function} callback - 回调函数
     * 
     * 使用场景:
     * - 需要按顺序执行的异步操作
     * - 前一个异步操作完成后才能开始下一个
     * - 异步管道处理
     */
    this.asyncSeriesHook = new AsyncSeriesHook(['context', 'callback']);
    
    /**
     * AsyncSeriesBailHook - 可以提前退出的串行异步钩子
     * 
     * 特点:
     * - 按照注册顺序串行执行异步监听器
     * - 如果任何监听器返回非undefined的值，则停止执行后续监听器
     * - 返回第一个非undefined的结果
     * 
     * 参数:
     * @param {Object} context - 上下文对象
     * 
     * 使用场景:
     * - 异步验证链
     * - 需要按顺序尝试多个处理器直到成功
     * - 有条件地中断异步处理链
     */
    this.asyncSeriesBailHook = new AsyncSeriesBailHook(['context']);
    
    /**
     * AsyncSeriesWaterfallHook - 瀑布流串行异步钩子
     * 
     * 特点:
     * - 按照注册顺序串行执行异步监听器
     * - 第一个监听器接收初始参数
     * - 后续每个监听器接收前一个监听器的结果作为参数
     * - 整个钩子的返回值是最后一个监听器的返回值
     * 
     * 参数:
     * @param {Object} initialValue - 初始值，会在监听器链之间传递和修改
     * 
     * 使用场景:
     * - 异步转换链
     * - 允许多个插件依次修改同一数据的异步处理
     * - 构建异步处理管道
     */
    this.asyncSeriesWaterfallHook = new AsyncSeriesWaterfallHook(['initialValue']);
  }
  
  //==========================================================================================
  // 同步钩子使用示例
  //==========================================================================================
  
  /**
   * 演示SyncHook的使用
   */
  demonstrateSyncHook() {
    console.log('\n===== SyncHook示例 =====');
    
    // 注册监听器 - 可以注册多个，按注册顺序执行
    this.syncHook.tap('Listener1', (param1, param2) => {
      console.log(`SyncHook - Listener1 接收到参数: ${param1}, ${param2}`);
      // 返回值被忽略
      return 'Listener1 result';
    });
    
    this.syncHook.tap('Listener2', (param1, param2) => {
      console.log(`SyncHook - Listener2 接收到参数: ${param1}, ${param2}`);
    });
    
    // 调用钩子，传入参数
    console.log('调用SyncHook...');
    this.syncHook.call('参数1', '参数2');
    // 所有监听器都会被调用，无论它们返回什么
    console.log('SyncHook调用完成');
  }
  
  /**
   * 演示SyncBailHook的使用
   */
  demonstrateSyncBailHook() {
    console.log('\n===== SyncBailHook示例 =====');
    
    // 注册监听器
    this.syncBailHook.tap('Validator1', (request) => {
      console.log(`SyncBailHook - Validator1 检查请求: ${request}`);
      // 返回undefined，继续执行下一个监听器
      return undefined;
    });
    
    this.syncBailHook.tap('Validator2', (request) => {
      console.log(`SyncBailHook - Validator2 检查请求: ${request}`);
      if (request === 'invalid') {
        // 返回非undefined值，中断执行
        return '请求无效';
      }
      return undefined;
    });
    
    this.syncBailHook.tap('Validator3', (request) => {
      // 如果前面的监听器返回了非undefined值，这个监听器不会被调用
      console.log(`SyncBailHook - Validator3 检查请求: ${request}`);
      return '请求已处理';
    });
    
    // 调用钩子 - 所有监听器都会执行
    console.log('调用SyncBailHook (valid)...');
    const result1 = this.syncBailHook.call('valid');
    console.log(`SyncBailHook结果 (valid): ${result1}`);
    
    // 调用钩子 - Validator2会中断执行
    console.log('\n调用SyncBailHook (invalid)...');
    const result2 = this.syncBailHook.call('invalid');
    console.log(`SyncBailHook结果 (invalid): ${result2}`);
  }
  
  /**
   * 演示SyncWaterfallHook的使用
   */
  demonstrateSyncWaterfallHook() {
    console.log('\n===== SyncWaterfallHook示例 =====');
    
    // 注册监听器
    this.syncWaterfallHook.tap('Transformer1', (result) => {
      console.log(`SyncWaterfallHook - Transformer1 接收到: ${JSON.stringify(result)}`);
      // 返回修改后的结果，传递给下一个监听器
      return { ...result, count: result.count + 1, transform1: true };
    });
    
    this.syncWaterfallHook.tap('Transformer2', (result) => {
      console.log(`SyncWaterfallHook - Transformer2 接收到: ${JSON.stringify(result)}`);
      // 返回修改后的结果，传递给下一个监听器
      return { ...result, count: result.count * 2, transform2: true };
    });
    
    this.syncWaterfallHook.tap('Transformer3', (result) => {
      console.log(`SyncWaterfallHook - Transformer3 接收到: ${JSON.stringify(result)}`);
      // 返回最终结果
      return { ...result, count: result.count + 5, transform3: true };
    });
    
    // 调用钩子，传入初始值
    console.log('调用SyncWaterfallHook...');
    const initialValue = { count: 0 };
    const finalResult = this.syncWaterfallHook.call(initialValue);
    console.log(`SyncWaterfallHook最终结果: ${JSON.stringify(finalResult)}`);
  }
  
  /**
   * 演示SyncLoopHook的使用
   */
  demonstrateSyncLoopHook() {
    console.log('\n===== SyncLoopHook示例 =====');
    
    let counter1 = 0;
    let counter2 = 0;
    
    // 注册监听器
    this.syncLoopHook.tap('Iterator1', (data) => {
      console.log(`SyncLoopHook - Iterator1 执行次数: ${counter1 + 1}`);
      
      if (counter1 < 2) {
        counter1++;
        // 返回非undefined值，钩子将重新从第一个监听器开始执行
        return true;
      }
      // 返回undefined，继续执行下一个监听器
      return undefined;
    });
    
    this.syncLoopHook.tap('Iterator2', (data) => {
      console.log(`SyncLoopHook - Iterator2 执行次数: ${counter2 + 1}`);
      
      if (counter2 < 1) {
        counter2++;
        // 返回非undefined值，钩子将重新从第一个监听器开始执行
        return true;
      }
      // 返回undefined，表示该监听器完成
      return undefined;
    });
    
    // 调用钩子
    console.log('调用SyncLoopHook...');
    this.syncLoopHook.call({ value: 'test' });
    console.log('SyncLoopHook调用完成');
    // SyncLoopHook的执行顺序将是:
    // Iterator1 (counter1=0) -> 返回true，重新开始
    // Iterator1 (counter1=1) -> 返回true，重新开始
    // Iterator1 (counter1=2) -> 返回undefined，继续
    // Iterator2 (counter2=0) -> 返回true，重新开始
    // Iterator1 (counter1=2) -> 返回undefined，继续
    // Iterator2 (counter2=1) -> 返回undefined，完成
  }
  
  //==========================================================================================
  // 异步并行钩子使用示例
  //==========================================================================================
  
  /**
   * 演示AsyncParallelHook的使用
   */
  demonstrateAsyncParallelHook() {
    console.log('\n===== AsyncParallelHook示例 =====');
    
    // 使用tapAsync注册基于回调的异步监听器
    this.asyncParallelHook.tapAsync('AsyncTask1', (resource, filename, callback) => {
      console.log(`AsyncParallelHook - AsyncTask1 开始处理: ${resource}, ${filename}`);
      
      // 模拟异步操作
      setTimeout(() => {
        console.log('AsyncParallelHook - AsyncTask1 完成');
        callback();
      }, 1000);
    });
    
    // 使用tapPromise注册基于Promise的异步监听器
    this.asyncParallelHook.tapPromise('AsyncTask2', (resource, filename) => {
      console.log(`AsyncParallelHook - AsyncTask2 开始处理: ${resource}, ${filename}`);
      
      // 返回Promise
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('AsyncParallelHook - AsyncTask2 完成');
          resolve();
        }, 2000);
      });
    });
    
    // 调用钩子 - 基于回调
    console.log('调用AsyncParallelHook (回调方式)...');
    this.asyncParallelHook.callAsync('resource.js', 'output.js', () => {
      console.log('AsyncParallelHook (回调方式) 所有任务完成');
    });
    
    // 调用钩子 - 基于Promise
    console.log('\n调用AsyncParallelHook (Promise方式)...');
    this.asyncParallelHook.promise('resource.js', 'output.js')
      .then(() => {
        console.log('AsyncParallelHook (Promise方式) 所有任务完成');
      });
  }
  
  /**
   * 演示AsyncParallelBailHook的使用
   */
  demonstrateAsyncParallelBailHook() {
    console.log('\n===== AsyncParallelBailHook示例 =====');
    
    // 使用tapAsync注册基于回调的异步监听器
    this.asyncParallelBailHook.tapAsync('Validator1', (params, callback) => {
      console.log(`AsyncParallelBailHook - Validator1 开始检查: ${JSON.stringify(params)}`);
      
      setTimeout(() => {
        // 检查通过，返回null（等同于undefined）继续执行
        console.log('AsyncParallelBailHook - Validator1 检查通过');
        callback(null);
      }, 1000);
    });
    
    this.asyncParallelBailHook.tapAsync('Validator2', (params, callback) => {
      console.log(`AsyncParallelBailHook - Validator2 开始检查: ${JSON.stringify(params)}`);
      
      setTimeout(() => {
        if (params.invalid) {
          // 检查失败，返回错误信息，中断执行
          console.log('AsyncParallelBailHook - Validator2 检查失败');
          callback(null, '参数无效');
          return;
        }
        
        console.log('AsyncParallelBailHook - Validator2 检查通过');
        callback(null);
      }, 1500);
    });
    
    // 使用tapPromise注册基于Promise的异步监听器
    this.asyncParallelBailHook.tapPromise('Validator3', (params) => {
      console.log(`AsyncParallelBailHook - Validator3 开始检查: ${JSON.stringify(params)}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('AsyncParallelBailHook - Validator3 检查通过');
          resolve();
        }, 2000);
      });
    });
    
    // 调用钩子 - 所有验证都通过
    console.log('调用AsyncParallelBailHook (有效参数)...');
    this.asyncParallelBailHook.callAsync({ valid: true }, (err, result) => {
      console.log(`AsyncParallelBailHook结果 (有效参数): ${result || '所有验证通过'}`);
    });
    
    // 让之前的任务有时间完成
    setTimeout(() => {
      // 调用钩子 - Validator2将失败
      console.log('\n调用AsyncParallelBailHook (无效参数)...');
      this.asyncParallelBailHook.callAsync({ invalid: true }, (err, result) => {
        console.log(`AsyncParallelBailHook结果 (无效参数): ${result || '所有验证通过'}`);
      });
    }, 3000);
  }
  
  //==========================================================================================
  // 异步串行钩子使用示例
  //==========================================================================================
  
  /**
   * 演示AsyncSeriesHook的使用
   */
  demonstrateAsyncSeriesHook() {
    console.log('\n===== AsyncSeriesHook示例 =====');
    
    // 使用tapAsync注册基于回调的异步监听器
    this.asyncSeriesHook.tapAsync('SeriesTask1', (context, callback, callback2) => {
      console.log(`AsyncSeriesHook - SeriesTask1 开始处理: ${JSON.stringify(context)}`);
      
      setTimeout(() => {
        console.log('AsyncSeriesHook - SeriesTask1 完成');
        // 修改上下文，但这个修改对下一个监听器不可见，除非通过回调传递
        context.task1 = true;
        callback();
      }, 1000);
    });
    
    // 使用tapPromise注册基于Promise的异步监听器
    this.asyncSeriesHook.tapPromise('SeriesTask2', (context, callback) => {
      console.log(`AsyncSeriesHook - SeriesTask2 开始处理: ${JSON.stringify(context)}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('AsyncSeriesHook - SeriesTask2 完成');
          context.task2 = true;
          resolve();
        }, 1000);
      });
    });
    
    this.asyncSeriesHook.tapAsync('SeriesTask3', (context, callback) => {
      console.log(`AsyncSeriesHook - SeriesTask3 开始处理: ${JSON.stringify(context)}`);
      
      setTimeout(() => {
        console.log('AsyncSeriesHook - SeriesTask3 完成');
        context.task3 = true;
        callback();
      }, 1000);
    });
    
    // 调用钩子 - 基于回调
    const context = { initialData: 'someData' };
    console.log('调用AsyncSeriesHook (回调方式)...');
    this.asyncSeriesHook.callAsync(context, () => {
      console.log(`AsyncSeriesHook完成，最终上下文: ${JSON.stringify(context)}`);
    });
  }
  
  /**
   * 演示AsyncSeriesBailHook的使用
   */
  demonstrateAsyncSeriesBailHook() {
    console.log('\n===== AsyncSeriesBailHook示例 =====');
    
    // 注册监听器
    this.asyncSeriesBailHook.tapAsync('AuthChecker1', (context, callback) => {
      console.log(`AsyncSeriesBailHook - AuthChecker1 检查权限: ${JSON.stringify(context)}`);
      
      setTimeout(() => {
        if (context.role === 'guest') {
          console.log('AsyncSeriesBailHook - AuthChecker1 拒绝访问');
          // 返回错误信息，中断执行
          callback(null, '访客无权访问');
          return;
        }
        
        console.log('AsyncSeriesBailHook - AuthChecker1 检查通过');
        callback(null);
      }, 1000);
    });
    
    this.asyncSeriesBailHook.tapPromise('AuthChecker2', (context) => {
      console.log(`AsyncSeriesBailHook - AuthChecker2 检查权限: ${JSON.stringify(context)}`);
      
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (context.role === 'user' && context.resource === 'admin-panel') {
            console.log('AsyncSeriesBailHook - AuthChecker2 拒绝访问');
            // 返回错误信息，中断执行
            resolve('普通用户无法访问管理面板');
            return;
          }
          
          console.log('AsyncSeriesBailHook - AuthChecker2 检查通过');
          resolve();
        }, 1000);
      });
    });
    
    this.asyncSeriesBailHook.tapAsync('AuthChecker3', (context, callback) => {
      console.log(`AsyncSeriesBailHook - AuthChecker3 检查权限: ${JSON.stringify(context)}`);
      
      setTimeout(() => {
        console.log('AsyncSeriesBailHook - AuthChecker3 检查通过');
        callback(null, '访问已授权');
      }, 1000);
    });
    
    // 调用钩子 - 第一个检查器会拒绝
    console.log('调用AsyncSeriesBailHook (访客)...');
    this.asyncSeriesBailHook.callAsync({ role: 'guest', resource: 'dashboard' }, (err, result) => {
      console.log(`AsyncSeriesBailHook结果 (访客): ${result}`);
    });
    
    // 让之前的任务有时间完成
    setTimeout(() => {
      // 调用钩子 - 第二个检查器会拒绝
      console.log('\n调用AsyncSeriesBailHook (普通用户访问管理面板)...');
      this.asyncSeriesBailHook.callAsync({ role: 'user', resource: 'admin-panel' }, (err, result) => {
        console.log(`AsyncSeriesBailHook结果 (普通用户访问管理面板): ${result}`);
      });
    }, 4000);
    
    // 让之前的任务有时间完成
    setTimeout(() => {
      // 调用钩子 - 所有检查器都通过
      console.log('\n调用AsyncSeriesBailHook (管理员)...');
      this.asyncSeriesBailHook.callAsync({ role: 'admin', resource: 'admin-panel' }, (err, result) => {
        console.log(`AsyncSeriesBailHook结果 (管理员): ${result}`);
      });
    }, 8000);
  }
  
  /**
   * 演示AsyncSeriesWaterfallHook的使用
   */
  demonstrateAsyncSeriesWaterfallHook() {
    console.log('\n===== AsyncSeriesWaterfallHook示例 =====');
    
    // 注册监听器
    this.asyncSeriesWaterfallHook.tapAsync('Processor1', (initialValue, callback) => {
      console.log(`AsyncSeriesWaterfallHook - Processor1 接收到: ${JSON.stringify(initialValue)}`);
      
      setTimeout(() => {
        // 修改值并传递给下一个处理器
        const result = { ...initialValue, step1: true, count: initialValue.count + 10 };
        console.log(`AsyncSeriesWaterfallHook - Processor1 返回: ${JSON.stringify(result)}`);
        callback(null, result);
      }, 1000);
    });
    
    this.asyncSeriesWaterfallHook.tapPromise('Processor2', (data) => {
      console.log(`AsyncSeriesWaterfallHook - Processor2 接收到: ${JSON.stringify(data)}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // 修改值并传递给下一个处理器
          const result = { ...data, step2: true, count: data.count * 2 };
          console.log(`AsyncSeriesWaterfallHook - Processor2 返回: ${JSON.stringify(result)}`);
          resolve(result);
        }, 1000);
      });
    });
    
    this.asyncSeriesWaterfallHook.tapAsync('Processor3', (data, callback) => {
      console.log(`AsyncSeriesWaterfallHook - Processor3 接收到: ${JSON.stringify(data)}`);
      
      setTimeout(() => {
        // 修改值并返回最终结果
        const result = { ...data, step3: true, count: data.count + 5, final: true };
        console.log(`AsyncSeriesWaterfallHook - Processor3 返回: ${JSON.stringify(result)}`);
        callback(null, result);
      }, 1000);
    });
    
    // 调用钩子
    console.log('调用AsyncSeriesWaterfallHook...');
    const initialValue = { count: 0 };
    this.asyncSeriesWaterfallHook.callAsync(initialValue, (err, result) => {
      console.log(`AsyncSeriesWaterfallHook最终结果: ${JSON.stringify(result)}`);
    });
  }
  
  /**
   * 运行所有钩子演示
   */
  runAllExamples() {
    console.log('===== 开始tapable钩子示例演示 =====');
    
    // 同步钩子示例
    this.demonstrateSyncHook();
    this.demonstrateSyncBailHook();
    this.demonstrateSyncWaterfallHook();
    this.demonstrateSyncLoopHook();
    
    // 异步钩子示例 (需要等待异步操作完成)
    // 注：在真实环境中应该使用Promise链或async/await处理异步流程
    this.demonstrateAsyncParallelHook();
    
    // 等待5秒后运行AsyncParallelBailHook示例
    setTimeout(() => {
      this.demonstrateAsyncParallelBailHook();
    }, 5000);
    
    // 等待10秒后运行AsyncSeriesHook示例
    setTimeout(() => {
      this.demonstrateAsyncSeriesHook();
    }, 10000);
    
    // 等待15秒后运行AsyncSeriesBailHook示例
    setTimeout(() => {
      this.demonstrateAsyncSeriesBailHook();
    }, 15000);
    
    // 等待30秒后运行AsyncSeriesWaterfallHook示例
    setTimeout(() => {
      this.demonstrateAsyncSeriesWaterfallHook();
    }, 30000);
  }
}

// 创建实例并运行示例
// 注意：实际使用时，可能需要按需调用单个示例，而不是一次运行所有示例
const example = new TapableHooksExample();
example.runAllExamples();

module.exports = TapableHooksExample; 