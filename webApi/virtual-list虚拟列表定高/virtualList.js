/**
 * 虚拟列表实现 - 使用原生Web API
 * 
 * 此脚本实现了高性能的虚拟列表，只渲染可见区域内的元素，
 * 适用于大数据量的列表渲染，可显著提高性能和减少内存使用。
 * 
 * 使用的Web API:
 * - Intersection Observer API：检测元素可见性
 * - Resize Observer API：监控元素大小变化
 * - requestAnimationFrame：优化滚动性能
 * - DOM操作API：动态创建和移除DOM元素
 */

// 虚拟列表类
class VirtualList {
    /**
     * 创建虚拟列表实例
     * @param {Object} options - 配置选项
     * @param {HTMLElement} options.container - 容器元素
     * @param {HTMLElement} options.scrollHeightEl - 用于撑开滚动高度的元素
     * @param {HTMLElement} options.contentEl - 实际渲染内容的容器元素
     * @param {number} options.totalItems - 总项目数
     * @param {number} options.itemHeight - 每个项目的高度（像素）
     * @param {number} options.overscan - 可视区域外额外渲染的项目数（上下各多少个）
     * @param {Function} options.renderItem - 渲染单个项目的函数
     */
    constructor(options) {
        // 保存选项
        this.container = options.container;
        this.scrollHeightEl = options.scrollHeightEl;
        this.contentEl = options.contentEl;
        this.totalItems = options.totalItems || 0;
        this.itemHeight = options.itemHeight || 50;
        this.overscan = options.overscan || 5;
        this.renderItem = options.renderItem || this.defaultRenderItem;
        
        // 内部状态
        this.visibleItems = new Map(); // 当前可见的项目 Map<index, element>
        this.lastScrollTop = 0; // 上次滚动位置
        this.ticking = false; // 是否正在处理滚动事件
        this.resizeObserver = null; // 大小变化观察者
        
        // 统计信息元素
        this.stats = {
            renderedCount: document.getElementById('rendered-count'),
            totalCount: document.getElementById('total-count'),
            renderRatio: document.getElementById('render-ratio'),
            scrollPosition: document.getElementById('scroll-position')
        };
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化虚拟列表
     */
    init() {
        // 设置滚动区域高度
        this.updateScrollHeight();
        
        // 添加滚动事件监听
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        
        // 设置ResizeObserver监控容器大小变化
        this.setupResizeObserver();
        
        // 初始渲染
        this.render();
        
        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 设置使用ResizeObserver监控容器大小变化
     */
    setupResizeObserver() {
        // 检查浏览器是否支持ResizeObserver,浏览器    
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(entries => {
                // 当容器大小变化时重新渲染
                this.render();
            });
            
            // 观察容器元素
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * 更新滚动区域高度
     */
    updateScrollHeight() {
        //总条目数*每个项目的高度
        const totalHeight = this.totalItems * this.itemHeight;
        this.scrollHeightEl.style.height = `${totalHeight}px`;
    }
    
    /**
     * 处理滚动事件
     * @param {Event} event - 滚动事件对象
     */
    handleScroll(event) {
        // 更新滚动位置统计信息
        if (this.stats.scrollPosition) {
            // 获取滚动位置
            this.stats.scrollPosition.textContent = Math.round(this.container.scrollTop);
        }
        
        // 使用requestAnimationFrame优化滚动性能
        if (!this.ticking) {
            // 使用requestAnimationFrame优化滚动性能
            window.requestAnimationFrame(() => {
                this.render();
                // 重置ticking状态
                this.ticking = false;
            });
            // 设置ticking状态
            this.ticking = true;
        }
    }
    
    /**
     * 渲染可见区域内的项目
     */
    render() {
        // 获取可视区域信息
        const containerRect = this.container.getBoundingClientRect();
        // 获取容器高度 
        const containerHeight = containerRect.height;
        
        // 计算可见项目的范围
        const scrollTop = this.container.scrollTop;
        // 计算开始索引
        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
        // 计算结束索引
        const endIndex = Math.min(
            this.totalItems - 1,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.overscan
        );
        console.log(startIndex,endIndex);
        // 创建当前应该可见的项目集合
        const currentlyVisible = new Set();
        // 遍历当前应该可见的项目
        for (let i = startIndex; i <= endIndex; i++) {
            // 添加项目
            currentlyVisible.add(i);
        }
        
        // 移除不再可见的项目
        for (const [index, element] of this.visibleItems.entries()) {   
            // 如果当前项目不再可见
            if (!currentlyVisible.has(index)) {
                // 移除项目
                this.contentEl.removeChild(element);
                // 删除项目
                this.visibleItems.delete(index);
            }
        }
        
        // 添加新可见的项目
        for (let i = startIndex; i <= endIndex; i++) {
            if (!this.visibleItems.has(i)) {
                // 渲染项目
                const element = this.renderItem(i);
                // 设置项目位置
                element.style.transform = `translateY(${i * this.itemHeight}px)`;
                // 添加项目
                this.contentEl.appendChild(element);
                // 设置项目
                this.visibleItems.set(i, element);
            }
        }
        
        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 默认的项目渲染函数
     * @param {number} index - 项目索引
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    defaultRenderItem(index) {
        // 创建项目
        const item = document.createElement('div');
        // 设置项目类名
        item.className = 'list-item';
        // 设置项目高度
        item.style.height = `${this.itemHeight}px`;
        
        // 创建内容
        const content = document.createElement('div');
        // 设置内容类名
        content.className = 'list-item-content';
        
        // 创建索引
        const indexEl = document.createElement('div');
        // 设置索引类名
        indexEl.className = 'list-item-index';
        // 设置索引内容
        indexEl.textContent = `#${index + 1}`;
        
        // 创建文本
        const textEl = document.createElement('div');
        // 设置文本类名
        textEl.className = 'list-item-text';
        // 设置文本内容
        textEl.textContent = `这是列表项 ${index + 1} 的内容`;
        
        // 添加索引
                content.appendChild(indexEl);
        // 添加文本
        content.appendChild(textEl);
        // 添加内容
        item.appendChild(content);
        
        return item;
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        if (this.stats.renderedCount) {
            this.stats.renderedCount.textContent = this.visibleItems.size;
        }
        
        if (this.stats.totalCount) {
            this.stats.totalCount.textContent = this.totalItems;
        }
        
        if (this.stats.renderRatio) {
            const ratio = (this.visibleItems.size / this.totalItems * 100).toFixed(2);
            this.stats.renderRatio.textContent = `${ratio}%`;
        }
    }
    
    /**
     * 更新配置
     * @param {Object} options - 新的配置选项
     */
    updateConfig(options) {
        // 更新配置
        if (options.totalItems !== undefined) {
            this.totalItems = options.totalItems;
        }
        
        if (options.itemHeight !== undefined) {
            this.itemHeight = options.itemHeight;
        }
        
        if (options.overscan !== undefined) {
            this.overscan = options.overscan;
        }
        
        // 清空当前可见项目
        for (const element of this.visibleItems.values()) {
            this.contentEl.removeChild(element);
        }
        this.visibleItems.clear();
        
        // 更新滚动高度
        this.updateScrollHeight();
        
        // 重新渲染
        this.render();
    }
    
    /**
     * 销毁虚拟列表实例，清理资源
     */
    destroy() {
        // 移除滚动事件监听
        this.container.removeEventListener('scroll', this.handleScroll);
        
        // 停止ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // 清空内容
        this.contentEl.innerHTML = '';
        this.visibleItems.clear();
    }
}

// DOM元素引用
const elements = {
    virtualListContainer: document.getElementById('virtual-list'),
    scrollHeight: document.getElementById('scroll-height'),
    listContent: document.getElementById('list-content'),
    totalItemsInput: document.getElementById('total-items'),
    itemHeightInput: document.getElementById('item-height'),
    applySettingsButton: document.getElementById('apply-settings')
};

// 虚拟列表实例
let virtualList = null;

/**
 * 初始化应用
 */
function initApp() {
    // 创建虚拟列表实例
    virtualList = new VirtualList({
        container: elements.virtualListContainer,
        scrollHeightEl: elements.scrollHeight,
        contentEl: elements.listContent,
        totalItems: parseInt(elements.totalItemsInput.value) || 10000,
        itemHeight: parseInt(elements.itemHeightInput.value) || 50,
        overscan: 5
    });
    
    // 设置应用设置按钮事件
    elements.applySettingsButton.addEventListener('click', applySettings);
}

/**
 * 应用新设置
 */
function applySettings() {
    if (virtualList) {
        virtualList.updateConfig({
            totalItems: parseInt(elements.totalItemsInput.value) || 10000,
            itemHeight: parseInt(elements.itemHeightInput.value) || 50
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 