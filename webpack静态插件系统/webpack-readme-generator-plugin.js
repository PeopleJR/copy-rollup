/**
 * webpack-readme-generator-plugin
 * 一个用于生成README文件的webpack插件，可以通过钩子接收WebpackConfigExtractPlugin提取的配置
 */
const fs = require('fs');
const path = require('path');
const WebpackConfigExtractPlugin = require('./webpack-config-extract-plugin');

class WebpackReadmeGeneratorPlugin {
  /**
   * @param {Object} options - 插件配置选项
   * @param {string} options.outputPath - README文件输出路径
   * @param {boolean} options.includeConfig - 是否包含webpack配置信息
   * @param {Array<string>} options.includeSections - 要包含的README部分
   * @param {Object} options.templateVariables - 模板变量
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      outputPath: './README.md',
      includeConfig: true,
      includeSections: ['introduction', 'installation', 'usage', 'configuration', 'license'],
      templateVariables: {
        projectName: 'Webpack Project',
        description: '使用webpack构建的项目',
        author: '',
        version: '1.0.0',
        license: 'MIT'
      },
      ...options
    };
    
    this.pluginName = 'WebpackReadmeGeneratorPlugin';
    this.extractedConfig = null; // 存储从WebpackConfigExtractPlugin获取的配置
    
    // 监听WebpackConfigExtractPlugin的钩子
    this.setupHooks();
  }
  
  /**
   * 设置钩子监听
   */
  setupHooks() {
    // 监听WebpackConfigExtractPlugin的configExtracted钩子
    WebpackConfigExtractPlugin.hooks.configExtracted.tap(
      this.pluginName, 
      (config, formattedConfig) => {
        console.log(`[${this.pluginName}] 监听到配置提取完成事件`);
        this.extractedConfig = {
          config,
          formattedConfig,
          extractTime: new Date().toISOString()
        };
      }
    );
  }

  /**
   * 应用插件
   * @param {import('webpack').Compiler} compiler - webpack编译器实例
   */
  apply(compiler) {
    // 编译完成钩子，在所有插件处理完成后执行
    compiler.hooks.done.tap(this.pluginName, (stats) => {
      if (this.extractedConfig) {
        console.log(`[${this.pluginName}] 使用提取的配置生成README`);
        this.generateReadme();
      } else {
        console.warn(`[${this.pluginName}] 未接收到配置数据，无法在README中包含配置信息`);
        if (this.options.includeConfig) {
          console.warn(`[${this.pluginName}] 确保WebpackConfigExtractPlugin在本插件之前注册`);
        }
        // 即使没有配置数据，也尝试生成README
        this.generateReadme();
      }
    });
  }
  
  /**
   * 生成README文件
   */
  generateReadme() {
    try {
      const readmeContent = this.generateReadmeContent();
      
      // 确保输出目录存在
      const outputDir = path.dirname(this.options.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 写入README文件
      fs.writeFileSync(this.options.outputPath, readmeContent, 'utf-8');
      console.log(`[${this.pluginName}] README文件已生成: ${this.options.outputPath}`);
    } catch (error) {
      console.error(`[${this.pluginName}] 生成README文件失败:`, error);
    }
  }
  
  /**
   * 生成README文件内容
   * @returns {string} README文件内容
   */
  generateReadmeContent() {
    const { projectName, description, author, version, license } = this.options.templateVariables;
    const sections = this.options.includeSections;
    let content = '';
    
    // 添加标题
    if (sections.includes('introduction')) {
      content += `# ${projectName}\n\n`;
      content += `${description}\n\n`;
      
      if (author) {
        content += `作者: ${author}\n\n`;
      }
      
      if (version) {
        content += `版本: ${version}\n\n`;
      }
    }
    
    // 添加安装部分
    if (sections.includes('installation')) {
      content += `## 安装\n\n`;
      content += `\`\`\`bash\n`;
      content += `npm install\n`;
      content += `# 或\n`;
      content += `yarn install\n`;
      content += `\`\`\`\n\n`;
    }
    
    // 添加使用部分
    if (sections.includes('usage')) {
      content += `## 使用\n\n`;
      content += `\`\`\`bash\n`;
      content += `npm run build # 生产环境构建\n`;
      content += `npm run dev   # 开发环境构建\n`;
      content += `\`\`\`\n\n`;
    }
    
    // 添加配置部分
    if (sections.includes('configuration') && this.options.includeConfig && this.extractedConfig) {
      content += `## Webpack配置\n\n`;
      content += `配置提取时间: ${this.extractedConfig.extractTime}\n\n`;
      content += `\`\`\`json\n`;
      content += this.extractedConfig.formattedConfig || JSON.stringify(this.extractedConfig.config, null, 2);
      content += `\n\`\`\`\n\n`;
    }
    
    // 添加许可证部分
    if (sections.includes('license') && license) {
      content += `## 许可证\n\n`;
      content += `${license}\n`;
    }
    
    return content;
  }
}

module.exports = WebpackReadmeGeneratorPlugin; 