/**
 * Webpack插件示例 - 展示所有主要钩子的使用
 * @param {Object} options - 插件配置选项
 * @returns {Object} Webpack插件对象
 */
class WebpackPluginExample {
  constructor(options = {}) {
    // 默认配置
    this.options = {
      debug: false,
      // 其他默认配置...
      ...options
    };
  }

  apply(compiler) {
    // 编译开始钩子
    compiler.hooks.beforeRun.tap('WebpackPluginExample', (compilation) => {
      console.log('beforeRun钩子被调用，编译开始前');
    });

    // 编译开始钩子
    compiler.hooks.run.tap('WebpackPluginExample', (compilation) => {
      console.log('run钩子被调用，编译开始');
    });

    // 编译完成钩子
    compiler.hooks.done.tap('WebpackPluginExample', (stats) => {
      console.log('done钩子被调用，编译完成');
      if (stats.hasErrors()) {
        console.error('编译过程中发生错误:', stats.compilation.errors);
      }
    });

    // 编译失败钩子
    compiler.hooks.failed.tap('WebpackPluginExample', (error) => {
      console.error('failed钩子被调用，编译失败:', error);
    });

    // 编译无效钩子
    compiler.hooks.invalid.tap('WebpackPluginExample', (fileName, changeTime) => {
      console.log('invalid钩子被调用，文件变化:', fileName, changeTime);
    });

    // 编译钩子
    compiler.hooks.compilation.tap('WebpackPluginExample', (compilation, params) => {
      console.log('compilation钩子被调用，编译中');

      // 模块构建钩子
      compilation.hooks.buildModule.tap('WebpackPluginExample', (module) => {
        console.log('buildModule钩子被调用，构建模块:', module.resource);
      });

      // 模块重建钩子
      compilation.hooks.rebuildModule.tap('WebpackPluginExample', (module) => {
        console.log('rebuildModule钩子被调用，重建模块:', module.resource);
      });

      // 模块完成钩子
      compilation.hooks.succeedModule.tap('WebpackPluginExample', (module) => {
        console.log('succeedModule钩子被调用，模块构建完成:', module.resource);
      });

      // 模块失败钩子
      compilation.hooks.failedModule.tap('WebpackPluginExample', (module, error) => {
        console.error('failedModule钩子被调用，模块构建失败:', module.resource, error);
      });

      // 资源生成钩子
      compilation.hooks.afterOptimizeAssets.tap('WebpackPluginExample', (assets) => {
        console.log('afterOptimizeAssets钩子被调用，资源优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunks.tap('WebpackPluginExample', (chunks) => {
        console.log('afterOptimizeChunks钩子被调用，代码块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeModules.tap('WebpackPluginExample', (modules) => {
        console.log('afterOptimizeModules钩子被调用，模块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeTree.tap('WebpackPluginExample', (chunks, modules) => {
        console.log('afterOptimizeTree钩子被调用，依赖树优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterProcessAssets.tap('WebpackPluginExample', (assets) => {
        console.log('afterProcessAssets钩子被调用，资源处理完成');
      });

      // 代码生成钩子
      compilation.hooks.afterSeal.tap('WebpackPluginExample', () => {
        console.log('afterSeal钩子被调用，编译完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeSize.tap('WebpackPluginExample', (assets) => {
        console.log('afterOptimizeSize钩子被调用，资源大小优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunkModules.tap('WebpackPluginExample', (chunks, modules) => {
        console.log('afterOptimizeChunkModules钩子被调用，代码块模块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunkAssets.tap('WebpackPluginExample', (chunks) => {
        console.log('afterOptimizeChunkAssets钩子被调用，代码块资源优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeAssets.tap('WebpackPluginExample', (assets) => {
        console.log('afterOptimizeAssets钩子被调用，资源优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunks.tap('WebpackPluginExample', (chunks) => {
        console.log('afterOptimizeChunks钩子被调用，代码块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeModules.tap('WebpackPluginExample', (modules) => {
        console.log('afterOptimizeModules钩子被调用，模块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeTree.tap('WebpackPluginExample', (chunks, modules) => {
        console.log('afterOptimizeTree钩子被调用，依赖树优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterProcessAssets.tap('WebpackPluginExample', (assets) => {
        console.log('afterProcessAssets钩子被调用，资源处理完成');
      });

      // 代码生成钩子
      compilation.hooks.afterSeal.tap('WebpackPluginExample', () => {
        console.log('afterSeal钩子被调用，编译完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeSize.tap('WebpackPluginExample', (assets) => {
        console.log('afterOptimizeSize钩子被调用，资源大小优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunkModules.tap('WebpackPluginExample', (chunks, modules) => {
        console.log('afterOptimizeChunkModules钩子被调用，代码块模块优化完成');
      });

      // 代码生成钩子
      compilation.hooks.afterOptimizeChunkAssets.tap('WebpackPluginExample', (chunks) => {
        console.log('afterOptimizeChunkAssets钩子被调用，代码块资源优化完成');
      });
    });

    // 编译钩子
    compiler.hooks.afterCompile.tap('WebpackPluginExample', (compilation) => {
      console.log('afterCompile钩子被调用，编译后');
    });

    // 编译钩子
    compiler.hooks.afterEmit.tap('WebpackPluginExample', (compilation) => {
      console.log('afterEmit钩子被调用，输出后');
    });

    // 编译钩子
    compiler.hooks.afterPlugins.tap('WebpackPluginExample', (compiler) => {
      console.log('afterPlugins钩子被调用，插件加载后');
    });

    // 编译钩子
    compiler.hooks.afterResolvers.tap('WebpackPluginExample', (compiler) => {
      console.log('afterResolvers钩子被调用，解析器加载后');
    });

    // 编译钩子
    compiler.hooks.beforeCompile.tap('WebpackPluginExample', (params) => {
      console.log('beforeCompile钩子被调用，编译前');
    });

    // 编译钩子
    compiler.hooks.beforeRun.tap('WebpackPluginExample', (compiler) => {
      console.log('beforeRun钩子被调用，运行前');
    });

    // 编译钩子
    compiler.hooks.contextModuleFactory.tap('WebpackPluginExample', (factory) => {
      console.log('contextModuleFactory钩子被调用，上下文模块工厂');
    });

    // 编译钩子
    compiler.hooks.normalModuleFactory.tap('WebpackPluginExample', (factory) => {
      console.log('normalModuleFactory钩子被调用，普通模块工厂');
    });

    // 编译钩子
    compiler.hooks.watchRun.tap('WebpackPluginExample', (compiler) => {
      console.log('watchRun钩子被调用，监听运行');
    });

    // 编译钩子
    compiler.hooks.watchClose.tap('WebpackPluginExample', () => {
      console.log('watchClose钩子被调用，监听关闭');
    });

    // 编译钩子
    compiler.hooks.shutdown.tap('WebpackPluginExample', () => {
      console.log('shutdown钩子被调用，关闭');
    });

    // 编译钩子
    compiler.hooks.infrastructureLog.tap('WebpackPluginExample', (name, type, args) => {
      console.log('infrastructureLog钩子被调用，基础设施日志:', name, type, args);
    });

    // 编译钩子
    compiler.hooks.log.tap('WebpackPluginExample', (origin, logEntry) => {
      console.log('log钩子被调用，日志:', origin, logEntry);
    });

    // 编译钩子
    compiler.hooks.trace.tap('WebpackPluginExample', (trace) => {
      console.log('trace钩子被调用，跟踪:', trace);
    });

    // 编译钩子
    compiler.hooks.afterEnvironment.tap('WebpackPluginExample', () => {
      console.log('afterEnvironment钩子被调用，环境设置后');
    });

    // 编译钩子
    compiler.hooks.afterPlugins.tap('WebpackPluginExample', (compiler) => {
      console.log('afterPlugins钩子被调用，插件加载后');
    });

    // 编译钩子
    compiler.hooks.afterResolvers.tap('WebpackPluginExample', (compiler) => {
      console.log('afterResolvers钩子被调用，解析器加载后');
    });

    // 编译钩子
    compiler.hooks.beforeCompile.tap('WebpackPluginExample', (params) => {
      console.log('beforeCompile钩子被调用，编译前');
    });

    // 编译钩子
    compiler.hooks.beforeRun.tap('WebpackPluginExample', (compiler) => {
      console.log('beforeRun钩子被调用，运行前');
    });

    // 编译钩子
    compiler.hooks.contextModuleFactory.tap('WebpackPluginExample', (factory) => {
      console.log('contextModuleFactory钩子被调用，上下文模块工厂');
    });

    // 编译钩子
    compiler.hooks.normalModuleFactory.tap('WebpackPluginExample', (factory) => {
      console.log('normalModuleFactory钩子被调用，普通模块工厂');
    });

    // 编译钩子
    compiler.hooks.watchRun.tap('WebpackPluginExample', (compiler) => {
      console.log('watchRun钩子被调用，监听运行');
    });

    // 编译钩子
    compiler.hooks.watchClose.tap('WebpackPluginExample', () => {
      console.log('watchClose钩子被调用，监听关闭');
    });

    // 编译钩子
    compiler.hooks.shutdown.tap('WebpackPluginExample', () => {
      console.log('shutdown钩子被调用，关闭');
    });

    // 编译钩子
    compiler.hooks.infrastructureLog.tap('WebpackPluginExample', (name, type, args) => {
      console.log('infrastructureLog钩子被调用，基础设施日志:', name, type, args);
    });

    // 编译钩子
    compiler.hooks.log.tap('WebpackPluginExample', (origin, logEntry) => {
      console.log('log钩子被调用，日志:', origin, logEntry);
    });

    // 编译钩子
    compiler.hooks.trace.tap('WebpackPluginExample', (trace) => {
      console.log('trace钩子被调用，跟踪:', trace);
    });

    // 编译钩子
    compiler.hooks.afterEnvironment.tap('WebpackPluginExample', () => {
      console.log('afterEnvironment钩子被调用，环境设置后');
    });
  }
}

module.exports = WebpackPluginExample; 