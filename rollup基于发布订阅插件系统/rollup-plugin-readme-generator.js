/**
 * rollup-plugin-readme-generator.js
 * 
 * 监听配置提取事件并生成README文件的Rollup插件
 */
const fs = require('fs');
const path = require('path');
const { eventBus } = require('./rollup-plugin-event-bus');

/**
 * README生成器插件
 * @param {Object} options - 插件配置选项
 * @returns {Object} Rollup插件对象
 */
function readmeGeneratorPlugin(options = {}) {
  // 默认配置
  const config = {
    outputPath: './README.md',
    includeConfig: true,
    includeSections: ['introduction', 'installation', 'usage', 'configuration', 'license'],
    templateVariables: {
      projectName: 'Rollup项目',
      description: '使用Rollup构建的项目',
      author: '',
      version: '1.0.0',
      license: 'MIT'
    },
    ...options
  };

  // 存储从事件中接收的配置
  let extractedConfig = null;
  let formattedConfig = null;
  let extractTime = null;

  // 在构造函数中设置事件监听
  console.log('[rollup-readme-generator] 注册事件监听器');
  
  eventBus.on('configExtracted', 'rollup-readme-generator', (config, formattedCfg) => {
    console.log('[rollup-readme-generator] 接收到配置提取事件');
    
    extractedConfig = config;
    formattedConfig = formattedCfg;
    extractTime = new Date().toISOString();
  });

  return {
    name: 'rollup-readme-generator',

    /**
     * 生成README文件内容
     * @returns {string} 生成的README内容
     */
    _generateReadmeContent() {
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
      if (sections.includes('configuration') && this.options.includeConfig && extractedConfig) {
        content += `## Rollup配置\n\n`;
        
        if (extractTime) {
          content += `配置提取时间: ${extractTime}\n\n`;
        }
        
        content += `\`\`\`json\n`;
        content += formattedConfig || JSON.stringify(extractedConfig, null, 2);
        content += `\n\`\`\`\n\n`;
      }
      
      // 添加许可证部分
      if (sections.includes('license') && license) {
        content += `## 许可证\n\n`;
        content += `${license}\n`;
      }
      
      return content;
    },

    /**
     * 生成README文件
     */
    _generateReadme() {
      try {
        const readmeContent = this._generateReadmeContent();
        const outputPath = this.options.outputPath;
        
        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入README文件
        fs.writeFileSync(outputPath, readmeContent, 'utf-8');
        console.log(`[rollup-readme-generator] README文件已生成: ${outputPath}`);
      } catch (error) {
        console.error('[rollup-readme-generator] 生成README文件失败:', error);
      }
    },

    /**
     * 编译结束钩子 - 生成README文件
     */
    closeBundle() {
      // 如果已经接收到配置，生成README
      if (this.options.includeConfig && !extractedConfig) {
        console.warn('[rollup-readme-generator] 未接收到配置信息，无法在README中包含配置');
      }
      
      console.log('[rollup-readme-generator] 生成README文件');
      this._generateReadme();
    },

    // 访问插件选项
    get options() {
      return config;
    }
  };
}

module.exports = readmeGeneratorPlugin; 