/**
 * 模拟API - 用于虚拟列表数据懒加载示例
 * 
 * 此文件提供模拟的数据获取API，用于演示虚拟列表的懒加载功能。
 * 在实际应用中，这些函数会被替换为真实的API调用。
 */

// 模拟API类
class MockApi {
    /**
     * 创建模拟API实例
     * @param {Object} options - 配置选项
     * @param {number} options.itemsPerPage - 每页项目数
     * @param {number} options.totalPages - 总页数
     * @param {number} options.delay - 模拟API延迟(毫秒)
     */
    constructor(options = {}) {
        this.itemsPerPage = options.itemsPerPage || 100;
        this.totalPages = options.totalPages || 10;
        this.delay = options.delay || 500;
        this.errorRate = 0.1; // 10%的请求会返回错误
    }

    /**
     * 获取分页数据
     * @param {number} page - 页码（从1开始）
     * @returns {Promise<Object>} 包含数据的Promise
     */
    async getItems(page) {
        // 验证页码
        if (page < 1 || page > this.totalPages) {
            return Promise.reject(new Error(`无效的页码: ${page}`));
        }

        // 模拟API延迟
        await this.sleep(this.delay);

        // 模拟随机错误
        if (Math.random() < this.errorRate) {
            return Promise.reject(new Error('模拟API错误: 请求失败'));
        }

        // 计算起始索引
        const startIndex = (page - 1) * this.itemsPerPage;

        // 生成数据
        const items = [];
        for (let i = 0; i < this.itemsPerPage; i++) {
            const index = startIndex + i;
            items.push(this.generateItem(index));
        }

        // 返回数据和元信息
        return {
            items,
            meta: {
                page,
                itemsPerPage: this.itemsPerPage,
                totalPages: this.totalPages,
                totalItems: this.totalPages * this.itemsPerPage,
                hasNextPage: page < this.totalPages
            }
        };
    }

    /**
     * 获取总项目数
     * @returns {Promise<number>} 总项目数
     */
    async getTotalItems() {
        await this.sleep(this.delay / 2);
        return this.itemsPerPage * this.totalPages;
    }

    /**
     * 更新配置
     * @param {Object} options - 新的配置选项
     */
    updateConfig(options) {
        if (options.itemsPerPage !== undefined) {
            this.itemsPerPage = options.itemsPerPage;
        }
        if (options.totalPages !== undefined) {
            this.totalPages = options.totalPages;
        }
        if (options.delay !== undefined) {
            this.delay = options.delay;
        }
    }

    /**
     * 生成单个项目数据
     * @param {number} index - 项目索引
     * @returns {Object} 项目数据
     * @private
     */
    generateItem(index) {
        // 生成随机内容长度
        const contentLength = Math.floor(Math.random() * 3) + 1; // 1-3段内容

        // 生成内容段落
        const paragraphs = [];
        for (let i = 0; i < contentLength; i++) {
            paragraphs.push(this.generateParagraph());
        }

        return {
            id: `item-${index + 1}`,
            index: index + 1,
            title: `项目 ${index + 1}`,
            content: paragraphs,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            tags: this.generateTags()
        };
    }

    /**
     * 生成随机段落
     * @returns {string} 随机段落文本
     * @private
     */
    generateParagraph() {
        const sentences = [
            "这是一个虚拟列表项目示例。",
            "虚拟列表可以高效渲染大量数据。",
            "通过只渲染可见项目，大幅提高性能。",
            "结合懒加载技术，可以处理无限量数据。",
            "动态高度支持使虚拟列表更加灵活。",
            "滚动优化提高了用户体验。",
            "性能监控帮助开发者了解渲染效率。",
            "Web API提供了强大的浏览器原生功能。",
            "不依赖框架的实现更加轻量和灵活。",
            "响应式设计使其适应各种屏幕尺寸。"
        ];

        // 随机选择3-6个句子
        const sentenceCount = Math.floor(Math.random() * 4) + 3;
        const paragraph = [];

        for (let i = 0; i < sentenceCount; i++) {
            const randomIndex = Math.floor(Math.random() * sentences.length);
            paragraph.push(sentences[randomIndex]);
        }

        return paragraph.join(" ");
    }

    /**
     * 生成随机标签
     * @returns {Array<string>} 标签数组
     * @private
     */
    generateTags() {
        const allTags = ["虚拟列表", "Web API", "性能优化", "懒加载", "动态高度", "滚动优化", "前端技术", "浏览器API"];
        const tagCount = Math.floor(Math.random() * 3) + 1; // 1-3个标签
        const tags = [];

        for (let i = 0; i < tagCount; i++) {
            const randomIndex = Math.floor(Math.random() * allTags.length);
            const tag = allTags[randomIndex];
            if (!tags.includes(tag)) {
                tags.push(tag);
            }
        }

        return tags;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} 延迟Promise
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出API实例
window.MockApi = MockApi; 