/**
 * 自定义Webpack插件 - ReadmeGeneratorPlugin
 * 功能：在编译完成后，基于当前文件生成一个readme文件
 */
class ReadmeGeneratorPlugin {
  constructor(options = {}) {
    // 默认配置
    this.options = {
      filename: 'README.md',
      content: '# 项目文档\n\n此文档由webpack自动生成\n\n## 构建信息\n\n构建时间: {{buildTime}}',
      ...options
    };
  }

  apply(compiler) {
    // 监听编译完成事件
    compiler.hooks.done.tap('ReadmeGeneratorPlugin', (options) => {
        console.log("我是编译完成后输出的配置",options)
    })
    compiler.hooks.entryOption.tap('ReadmeGeneratorPlugin',(stats)=>{
        console.log("我在入口文件完成后输出",stats)
    })
    compiler.hooks.afterResolvers.tap('ReadmeGeneratorPlugin',(options)=>{
        console.log("我是这个options",options)
    })
  }
}

module.exports = ReadmeGeneratorPlugin;
