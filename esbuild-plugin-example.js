/**
 * esbuild插件示例 - 展示所有主要钩子的使用
 * @param {Object} options - 插件配置选项
 * @returns {Object} esbuild插件对象
 */
export default function esbuildPluginExample(options = {}) {
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
    name: 'esbuild-plugin-example',

    // 设置钩子 - 在构建开始时调用，用于设置构建选项
    setup(build) {
      // 记录构建开始
      console.log('构建开始，设置插件...');

      // 解析钩子 - 用于自定义模块解析
      build.onResolve({ filter: /.*/ }, (args) => {
        console.log('onResolve钩子被调用:', {
          路径: args.path,
          导入者: args.importer,
          命名空间: args.namespace,
          解析目录: args.resolveDir
        });

        // 这里可以实现自定义的模块解析逻辑
        // 返回 null 表示使用默认解析
        return null;
      });

      // 加载钩子 - 用于自定义模块加载
      build.onLoad({ filter: /.*/ }, (args) => {
        console.log('onLoad钩子被调用:', {
          路径: args.path,
          命名空间: args.namespace,
          后缀: args.suffix
        });

        // 这里可以实现自定义的模块加载逻辑
        // 返回 null 表示使用默认加载
        return null;
      });

      // 开始钩子 - 在构建开始时调用
      build.onStart(() => {
        console.log('onStart钩子被调用，构建开始');
        // 这里可以执行构建前的准备工作
      });

      // 结束钩子 - 在构建结束时调用
      build.onEnd((result) => {
        console.log('onEnd钩子被调用，构建结束');
        if (result.errors.length > 0) {
          console.error('构建过程中发生错误:', result.errors);
        }
        // 这里可以执行构建后的清理工作
      });

      // 转换钩子 - 用于转换模块内容
      build.onTransform({ filter: /\.(js|jsx|ts|tsx)$/ }, (args) => {
        console.log('onTransform钩子被调用，文件:', args.path);
        
        // 这里可以转换代码
        const code = args.contents;
        // 示例：移除所有console.log语句
        const transformedCode = code.replace(/console\.log\(.*?\);/g, '');
        
        return {
          contents: transformedCode,
          loader: args.loader // 保持原有的loader
        };
      });

      // 插件选项钩子 - 用于修改构建选项
      build.onPluginOptions((options) => {
        console.log('onPluginOptions钩子被调用，当前选项:', options);
        // 这里可以修改构建选项
        return {
          ...options,
          // 添加自定义选项
          customOption: true
        };
      });

      // 插件解析钩子 - 用于自定义插件解析
      build.onPluginResolve((args) => {
        console.log('onPluginResolve钩子被调用:', {
          路径: args.path,
          导入者: args.importer
        });
        // 这里可以实现自定义的插件解析逻辑
        return null;
      });

      // 插件加载钩子 - 用于自定义插件加载
      build.onPluginLoad((args) => {
        console.log('onPluginLoad钩子被调用:', {
          路径: args.path,
          命名空间: args.namespace
        });
        // 这里可以实现自定义的插件加载逻辑
        return null;
      });

      // 销毁钩子 - 在插件被销毁时调用
      build.onDispose(() => {
        console.log('onDispose钩子被调用，插件即将被销毁');
        // 这里可以执行清理工作，例如：
        // 1. 关闭文件监听器
        // 2. 清理缓存
        // 3. 释放资源
        // 4. 断开数据库连接
        // 5. 清理临时文件
        // 6. 重置全局状态
      });
    }
  };
} 