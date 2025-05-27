/**
 * Rollup插件示例 - 展示所有主要钩子的使用
 * @param {Object} options - 插件配置选项
 * @returns {Object} Rollup插件对象
 */
export default function rollupPluginExample(options = {}) {
  // 默认配置
  const defaultOptions = {
    debug: false,
    // 其他默认配置...
  };

  // 合并用户配置和默认配置
  const config = {
    ...defaultOptions,
    ...options
  };

  return {
    // 插件名称
    name: 'rollup-plugin-example',

    // 构建钩子 - 在构建开始时调用
    buildStart() {
      console.log('buildStart钩子被调用，构建开始');
      // 这里可以执行构建前的准备工作
    },

    // 选项钩子 - 用于修改Rollup选项
    options(options) {
      console.log('options钩子被调用，当前选项:', options);
      // 这里可以修改Rollup选项
      return {
        ...options,
        // 添加自定义选项
        customOption: true
      };
    },

    // 解析ID钩子 - 用于自定义模块解析
    resolveId(source, importer) {
      console.log('resolveId钩子被调用:', {
        源文件: source,
        导入者: importer
      });
      // 这里可以实现自定义的模块解析逻辑
      // 返回 null 表示使用默认解析
      return null;
    },

    // 加载钩子 - 用于自定义模块加载
    load(id) {
      console.log('load钩子被调用，文件:', id);
      // 这里可以实现自定义的模块加载逻辑
      // 返回 null 表示使用默认加载
      return null;
    },

    // 转换钩子 - 用于转换模块内容
    transform(code, id) {
      console.log('transform钩子被调用，文件:', id);
      // 这里可以转换代码
      // 示例：移除所有console.log语句
      const transformedCode = code.replace(/console\.log\(.*?\);/g, '');
      return {
        code: transformedCode,
        map: null // 可以返回sourcemap
      };
    },

    // 模块解析钩子 - 用于自定义模块解析
    resolveDynamicImport(specifier, importer) {
      console.log('resolveDynamicImport钩子被调用:', {
        说明符: specifier,
        导入者: importer
      });
      // 这里可以实现自定义的动态导入解析逻辑
      return null;
    },

    // 构建结束钩子
    buildEnd() {
      console.log('buildEnd钩子被调用，构建结束');
      // 这里可以执行构建后的清理工作
    },

    // 输出生成钩子 - 在生成输出文件时调用
    renderChunk(code, chunk, options) {
      console.log('renderChunk钩子被调用，块:', chunk.fileName);
      // 这里可以修改输出代码
      return {
        code,
        map: null
      };
    },

    // 输出生成钩子 - 在生成所有输出文件后调用
    generateBundle(options, bundle) {
      console.log('generateBundle钩子被调用');
      // 这里可以修改或添加输出文件
      // bundle 是一个对象，键是文件名，值是文件内容
    },

    // 写入钩子 - 在写入文件时调用
    writeBundle(bundle) {
      console.log('writeBundle钩子被调用');
      // 这里可以在文件写入后执行操作
    },

    // 关闭钩子 - 在构建结束时调用
    closeBundle() {
      console.log('closeBundle钩子被调用，构建结束');
      // 这里可以执行最终的清理工作
    },

    // 监听文件变化钩子
    watchChange(id, change) {
      console.log('watchChange钩子被调用:', {
        文件: id,
        变化类型: change.event
      });
      // 这里可以处理文件变化
    },

    // 监听文件删除钩子
    watchClose() {
      console.log('watchClose钩子被调用，监听结束');
      // 这里可以执行监听结束后的清理工作
    }
  };
} 