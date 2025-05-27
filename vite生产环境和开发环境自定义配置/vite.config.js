import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // 示例：如果你使用Vue
import rollupPluginExample from '../rollup-plugin-example.js'; // 导入示例Rollup插件
import esbuildPluginExample from '../esbuild-plugin-example.js'; // 导入示例esbuild插件
import path from 'path';
import fs from 'fs';

// 导入发布订阅系统相关插件
// 注意：根据实际路径调整导入路径
import { eventBus } from '../rollup基于发布订阅插件系统/rollup-plugin-event-bus.js';
import configExtractorPlugin from '../rollup基于发布订阅插件系统/rollup-plugin-config-extractor.js';
import readmeGeneratorPlugin from '../rollup基于发布订阅插件系统/rollup-plugin-readme-generator.js';

/**
 * 创建一个自定义的版本注释插件
 * 在生成的代码顶部添加版本和构建时间信息
 */
function versionCommentPlugin(options = {}) {
  const defaultOptions = {
    version: '1.0.0',
    includeDate: true,
    includeTimestamp: true,
    banner: '/** \n * @name: <%= name %> \n * @version: <%= version %> \n * @build: <%= date %> \n */'
  };

  const config = { ...defaultOptions, ...options };
  
  return {
    name: 'version-comment',
    
    // 在输出文件生成后修改代码
    renderChunk(code, chunk, outputOptions) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();
      
      let banner = config.banner
        .replace('<%= name %>', chunk.name || 'bundle')
        .replace('<%= version %>', config.version);
      
      if (config.includeDate) {
        banner = banner.replace('<%= date %>', config.includeTimestamp ? timestamp : dateStr);
      }
      
      return {
        code: banner + '\n\n' + code,
        map: null
      };
    }
  };
}

/**
 * 创建一个打包统计插件
 * 收集并输出打包统计信息
 */
function bundleStatsPlugin(options = {}) {
  const defaultOptions = {
    outputFile: 'bundle-stats.json',
    includeSize: true,
    includeModules: true
  };
  
  const config = { ...defaultOptions, ...options };
  const stats = {
    timestamp: new Date().toISOString(),
    chunks: [],
    totalSize: 0,
    modules: {}
  };
  
  return {
    name: 'bundle-stats',
    
    // 收集模块信息
    transform(code, id) {
      if (config.includeModules) {
        const size = code.length;
        stats.modules[id] = {
          size,
          lines: code.split('\n').length
        };
      }
      return null; // 不修改代码
    },
    
    // 收集chunk信息
    generateBundle(outputOptions, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const chunkInfo = {
            fileName,
            name: chunk.name,
            size: chunk.code.length,
            isEntry: !!chunk.isEntry
          };
          
          stats.chunks.push(chunkInfo);
          stats.totalSize += chunkInfo.size;
        }
      }
    },
    
    // 输出统计信息
    writeBundle() {
      const outputFile = config.outputFile;
      const outputPath = path.resolve(process.cwd(), outputFile);
      
      try {
        fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2), 'utf-8');
        console.log(`Bundle stats written to ${outputFile}`);
      } catch (error) {
        console.error('Failed to write bundle stats:', error);
      }
    }
  };
}

/**
 * 创建条件编译注释处理插件
 * 处理代码中的条件编译注释，例如：
 * // #if DEV
 * console.log('仅在开发环境中显示');
 * // #endif
 */
function conditionalCompilePlugin(options = {}) {
  const defaultOptions = {
    defines: {
      DEV: process.env.NODE_ENV === 'development',
      PROD: process.env.NODE_ENV === 'production'
    }
  };

  const config = { ...defaultOptions, ...options };
  
  return {
    name: 'esbuild-conditional-compile',
    
    setup(build) {
      // 使用正则表达式匹配条件编译注释
      const conditionalRegex = /\/\/\s*#(if|ifdef|ifndef|else|elif|endif)\s*(.*)?/g;
      const defines = config.defines;
      
      build.onLoad({ filter: /\.(js|ts|jsx|tsx)$/ }, async (args) => {
        try {
          // 读取文件内容
          const source = await fs.promises.readFile(args.path, 'utf8');
          
          // 处理条件编译注释
          let lines = source.split('\n');
          let result = [];
          let skip = false;
          let skipStack = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/\/\/\s*#(if|ifdef|ifndef|else|elif|endif)\s*(.*)?/);
            
            if (match) {
              const directive = match[1];
              const condition = match[2] ? match[2].trim() : '';
              
              switch (directive) {
                case 'if':
                case 'ifdef':
                  const isTrue = evaluateCondition(condition, defines);
                  skipStack.push(skip);
                  skip = !isTrue;
                  continue;
                  
                case 'ifndef':
                  const isDefined = condition in defines;
                  skipStack.push(skip);
                  skip = isDefined;
                  continue;
                  
                case 'else':
                  skip = !skip && skipStack.length > 0;
                  continue;
                  
                case 'elif':
                  if (skipStack.length > 0 && !skipStack[skipStack.length - 1]) {
                    skip = !evaluateCondition(condition, defines);
                  }
                  continue;
                  
                case 'endif':
                  if (skipStack.length > 0) {
                    skip = skipStack.pop();
                  }
                  continue;
              }
            }
            
            if (!skip) {
              result.push(line);
            }
          }
          
          return {
            contents: result.join('\n'),
            loader: path.extname(args.path).substring(1) // 根据文件扩展名确定loader
          };
        } catch (error) {
          return {
            errors: [{
              text: `条件编译处理错误: ${error.message}`,
              location: { file: args.path }
            }]
          };
        }
      });
      
      // 评估条件表达式
      function evaluateCondition(condition, defines) {
        if (!condition) return false;
        
        // 简单的条件评估，支持基本的逻辑运算
        try {
          // 替换所有已定义的变量
          let expr = condition;
          for (const [key, value] of Object.entries(defines)) {
            expr = expr.replace(new RegExp('\\b' + key + '\\b', 'g'), 
              typeof value === 'boolean' ? value : `"${value}"`);
          }
          
          // 执行表达式
          return new Function(`return (${expr});`)();
        } catch (error) {
          console.error(`条件表达式求值错误: ${condition}`, error);
          return false;
        }
      }
    }
  };
}

/**
 * 创建自动导入插件
 * 自动为特定文件添加导入语句
 */
function autoImportPlugin(options = {}) {
  const defaultOptions = {
    imports: [],
    filter: /\.(js|ts|jsx|tsx)$/
  };

  const config = { ...defaultOptions, ...options };
  
  return {
    name: 'esbuild-auto-import',
    
    setup(build) {
      build.onLoad({ filter: config.filter }, async (args) => {
        try {
          // 读取文件内容
          const source = await fs.promises.readFile(args.path, 'utf8');
          
          // 检查文件是否已包含要导入的模块
          let needsImports = [];
          for (const imp of config.imports) {
            if (!source.includes(imp.import)) {
              needsImports.push(imp);
            }
          }
          
          // 如果没有需要添加的导入，直接返回原始内容
          if (needsImports.length === 0) {
            return null;
          }
          
          // 生成导入语句
          let importStatements = needsImports.map(imp => {
            if (imp.default) {
              return `import ${imp.default} from '${imp.from}';`;
            } else if (imp.named && imp.named.length > 0) {
              return `import { ${imp.named.join(', ')} } from '${imp.from}';`;
            } else {
              return `import '${imp.from}';`;
            }
          }).join('\n');
          
          // 在文件顶部添加导入语句
          const result = importStatements + '\n\n' + source;
          
          return {
            contents: result,
            loader: path.extname(args.path).substring(1)
          };
        } catch (error) {
          return {
            errors: [{
              text: `自动导入处理错误: ${error.message}`,
              location: { file: args.path }
            }]
          };
        }
      });
    }
  };
}

/**
 * 创建源代码统计插件
 * 收集源代码统计信息并生成报告
 */
function sourceStatsPlugin(options = {}) {
  const defaultOptions = {
    outputFile: 'source-stats.json',
    filter: /\.(js|ts|jsx|tsx|vue|css|scss|less)$/
  };

  const config = { ...defaultOptions, ...options };
  const stats = {
    timestamp: new Date().toISOString(),
    files: {},
    summary: {
      totalFiles: 0,
      totalLines: 0,
      totalSize: 0,
      byExtension: {}
    }
  };
  
  return {
    name: 'esbuild-source-stats',
    
    setup(build) {
      // 收集文件统计信息
      build.onLoad({ filter: config.filter }, async (args) => {
        try {
          // 读取文件内容
          const source = await fs.promises.readFile(args.path, 'utf8');
          const lines = source.split('\n');
          const size = source.length;
          const ext = path.extname(args.path).substring(1);
          
          // 记录文件统计信息
          stats.files[args.path] = {
            lines: lines.length,
            size,
            extension: ext
          };
          
          // 更新汇总统计
          stats.summary.totalFiles++;
          stats.summary.totalLines += lines.length;
          stats.summary.totalSize += size;
          
          // 按扩展名统计
          if (!stats.summary.byExtension[ext]) {
            stats.summary.byExtension[ext] = {
              files: 0,
              lines: 0,
              size: 0
            };
          }
          
          stats.summary.byExtension[ext].files++;
          stats.summary.byExtension[ext].lines += lines.length;
          stats.summary.byExtension[ext].size += size;
          
          // 不修改文件内容
          return null;
        } catch (error) {
          console.error(`统计源代码错误: ${args.path}`, error);
          return null; // 错误时不中断构建
        }
      });
      
      // 构建结束时输出统计信息
      build.onEnd(async () => {
        try {
          const outputFile = config.outputFile;
          const outputPath = path.resolve(process.cwd(), outputFile);
          
          // 写入统计文件
          await fs.promises.writeFile(
            outputPath, 
            JSON.stringify(stats, null, 2), 
            'utf8'
          );
          
          console.log(`源代码统计已写入: ${outputFile}`);
        } catch (error) {
          console.error('输出源代码统计信息失败:', error);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    // 开发环境配置
    console.log('Vite Cfg: Running in development mode (serve)');
    return {
      plugins: [
        vue(), // 示例Vue插件
        // 在这里添加其他仅用于开发的插件
      ],
      esbuild: {
        // 在这里自定义开发环境的esbuild选项
        // 例如：保留类名和函数名，方便调试
        keepNames: true,
        // 例如：开发时不压缩JS
        minify: false,
        // 例如：自定义JSX工厂
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        logLevel: 'info', // 'verbose', 'debug', 'info', 'warning', 'error', 'silent'
        // 更多esbuild选项: https://esbuild.github.io/api/#build-api
        
        // 自定义esbuild插件配置
        plugins: [
          // 1. 使用示例esbuild插件
          esbuildPluginExample({
            debug: true
          }),
          
          // 2. 使用条件编译插件
          conditionalCompilePlugin({
            defines: {
              DEV: true,
              PROD: false,
              DEBUG: true,
              VERSION: '1.0.0-dev',
              API_URL: 'http://localhost:3000/api'
            }
          }),
          
          // 3. 使用自动导入插件
          autoImportPlugin({
            imports: [
              // 自动导入Vue组合式API
              {
                from: 'vue',
                named: ['ref', 'reactive', 'computed', 'watch', 'onMounted']
              },
              // 自动导入工具函数
              {
                from: '@/utils/helpers',
                named: ['formatDate', 'formatCurrency']
              },
              // 自动导入默认导出
              {
                from: '@/api',
                default: 'api'
              }
            ],
            // 只对src目录下的文件应用
            filter: /src\/.*\.(js|ts|vue)$/
          }),
          
          // 4. 使用源代码统计插件
          sourceStatsPlugin({
            outputFile: '.temp/source-stats.json'
          }),
          
          // 5. 自定义内联esbuild插件
          {
            name: 'dev-inline-plugin',
            setup(build) {
              // 在构建开始时执行
              build.onStart(() => {
                console.log('开发构建开始时间:', new Date().toISOString());
              });
              
              // 在构建结束时执行
              build.onEnd((result) => {
                console.log('开发构建结束时间:', new Date().toISOString());
                console.log('构建结果:', {
                  错误数: result.errors.length,
                  警告数: result.warnings.length
                });
              });
              
              // 添加自定义banner注释
              build.onLoad({ filter: /\.(js|ts)$/ }, async (args) => {
                try {
                  const source = await fs.promises.readFile(args.path, 'utf8');
                  const banner = `// 开发模式构建 - ${new Date().toISOString()}\n`;
                  return {
                    contents: banner + source,
                    loader: path.extname(args.path).substring(1)
                  };
                } catch (error) {
                  return null; // 错误时不中断构建
                }
              });
            }
          }
        ]
      },
      // 其他开发特定配置...
      server: {
        port: 3000, // 示例：自定义开发服务器端口
      },
    };
  } else if (command === 'build') {
    // 生产环境配置
    console.log('Vite Cfg: Running in production mode (build)');
    return {
      plugins: [
        vue(), // 示例Vue插件
        // 在这里添加其他仅用于生产的插件
      ],
      build: {
        // 在这里自定义生产环境的Rollup选项
        rollupOptions: {
          output: {
            // 自定义打包输出格式
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
            // manualChunks 配置代码分割
            manualChunks(id) {
              if (id.includes('node_modules')) {
                // 将所有来自 node_modules 的模块打包到一个单独的 chunk
                return 'vendor';
              }
            },
          },
          plugins: [
            // 添加自定义Rollup插件
            
            // 1. 使用示例插件（修改选项以适应生产环境）
            rollupPluginExample({
              debug: false,
              // 其他选项...
            }),
            
            // 2. 使用自定义版本注释插件
            versionCommentPlugin({
              version: process.env.npm_package_version || '1.0.0',
              includeTimestamp: true,
              banner: '/**\n * 应用名称: MyApp\n * 版本: <%= version %>\n * 构建时间: <%= date %>\n * 构建环境: production\n */'
            }),
            
            // 3. 使用打包统计插件
            bundleStatsPlugin({
              outputFile: 'dist/bundle-stats.json',
              includeModules: true
            }),
            
            // 4. 使用发布订阅系统相关插件
            configExtractorPlugin({
              outputToFile: true,
              outputPath: './dist/extracted-config.json',
              outputToConsole: false
            }),
            
            // 5. 使用README生成器插件
            readmeGeneratorPlugin({
              outputPath: './dist/BUILD-INFO.md',
              includeConfig: true,
              templateVariables: {
                projectName: 'Vite项目',
                description: '使用Vite构建的项目，集成了自定义Rollup插件',
                version: process.env.npm_package_version || '1.0.0'
              }
            }),
            
            // 6. 自定义内联插件 - 使用事件总线
            {
              name: 'inline-event-listener',
              buildStart() {
                // 注册事件监听器
                eventBus.on('configExtracted', 'inline-event-listener', (config) => {
                  console.log('[inline-event-listener] 接收到配置提取事件');
                });
              },
              closeBundle() {
                // 触发自定义事件
                eventBus.emit('buildCompleted', {
                  time: new Date().toISOString(),
                  mode: 'production'
                });
              }
            }
          ],
          // 更多Rollup选项: https://rollupjs.org/configuration-options/
        },
        minify: 'esbuild', // 或者 'terser'，Vite 5+ 默认esbuild
        // terserOptions: {}, // 如果 minify: 'terser'
        chunkSizeWarningLimit: 1000, // 提高chunk大小警告限制 (KB)
        // sourcemap: true, // 是否生成source map
        // reportCompressedSize: false, // 禁用报告压缩后大小，加速构建
      },
      // 其他生产特定配置...
    };
  }
  // 如果有不区分环境的通用配置，可以放在这里
  // 但通常按 command 返回完整的配置对象更清晰
  return {
    plugins: [vue()],
  };
}); 