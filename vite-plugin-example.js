/**
 * Vite插件示例 - 展示所有主要钩子的使用
 * @param {Object} options - 插件配置选项
 * @returns {Object} Vite插件对象
 */
export default function vitePluginExample(options = {}) {
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
    name: 'vite-plugin-example',

    // 配置钩子 - 在解析 Vite 配置前调用
    config(config, { command }) {
      console.log('config钩子被调用，当前命令:', command);
      return {
        // 可以在这里修改 Vite 配置
        resolve: {
          alias: {
            '@': '/src'
          }
        }
      };
    },

    // 配置已解析钩子 - 在解析 Vite 配置后调用
    configResolved(resolvedConfig) {
      console.log('configResolved钩子被调用，配置已解析');
      // 存储解析后的配置
      this.config = resolvedConfig;
    },

    // 配置服务器钩子 - 用于配置开发服务器
    configureServer(server) {
      console.log('configureServer钩子被调用');
      // 添加自定义中间件
      server.middlewares.use((req, res, next) => {
        console.log('请求路径:', req.url);
        next();
      });
    },

    // 转换钩子 - 用于转换模块内容
    transform(code, id) {
      console.log('transform钩子被调用，文件:', id);
      // 这里可以转换代码
      if (id.endsWith('.js')) {
        return {
          code: code.replace(/console\.log/g, '// console.log'),
          map: null
        };
      }
    },

    // 加载钩子 - 用于自定义加载逻辑
    load(id) {
      console.log('load钩子被调用，文件:', id);
      // 这里可以实现自定义的加载逻辑
      return null;
    },

    // 解析ID钩子 - 用于自定义模块解析
    resolveId(source, importer) {
      console.log('resolveId钩子被调用，源文件:', source, '导入者:', importer);
      // 这里可以实现自定义的模块解析逻辑
      return null;
    },

    // 构建开始钩子
    buildStart() {
      console.log('buildStart钩子被调用，构建开始');
    },

    // 构建结束钩子
    buildEnd() {
      console.log('buildEnd钩子被调用，构建结束');
    },

    // 关闭钩子 - 在服务器关闭时调用
    closeBundle() {
      console.log('closeBundle钩子被调用，服务器关闭');
    },

    // 热更新钩子 - 用于自定义HMR处理
    handleHotUpdate({ file, server }) {
      console.log('handleHotUpdate钩子被调用，文件:', file);
      // 这里可以实现自定义的热更新逻辑
      return null;
    },

    // 选项钩子 - 用于修改Rollup选项
    options(options) {
      console.log('options钩子被调用');
      return options;
    },

    // 输出生成钩子
    generateBundle(options, bundle) {
      console.log('generateBundle钩子被调用');
      // 这里可以修改或添加输出文件
    }
  };
} 