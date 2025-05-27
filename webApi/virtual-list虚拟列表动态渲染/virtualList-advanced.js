/**
 * 高级虚拟列表实现 - 使用原生Web API
 * 
 * 此脚本实现了高级虚拟列表功能，包括：
 * - 动态高度支持
 * - 数据懒加载
 * - 滚动优化
 * - 性能监控
 */

// 添加性能监控所需的样式
(function() {
    // 检查是否已存在样式
    if (document.getElementById('virtual-list-performance-styles')) return;
    
    // 创建样式元素
    const style = document.createElement('style');
    style.id = 'virtual-list-performance-styles';
    style.textContent = `
        /* 性能监控面板样式 */
        #performance-panel {
            background-color: rgba(240, 240, 240, 0.95);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            padding: 15px;
        }
        
        /* 指标容器 */
        .metric-container {
            display: inline-block;
            margin-right: 20px;
            margin-bottom: 10px;
        }
        
        /* 指标标签 */
        .metric-label {
            font-weight: bold;
            margin-right: 5px;
        }
        
        /* 指标值 */
        .metric-value {
            font-family: 'Courier New', monospace;
        }
        
        /* 历史控制按钮 */
        .history-controls {
            margin-top: 10px;
        }
        
        /* 历史按钮 */
        .history-btn {
            background-color: #4a6fa5;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
            padding: 5px 10px;
            transition: background-color 0.3s;
        }
        
        .history-btn:hover {
            background-color: #3a5a8c;
        }
        
        /* 历史面板 */
        .history-panel {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            left: 50%;
            max-height: 80vh;
            max-width: 90vw;
            overflow: auto;
            padding: 20px;
            position: fixed;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            z-index: 1000;
        }
        
        /* 历史内容 */
        .history-content {
            margin: 15px 0;
            max-height: 60vh;
            overflow: auto;
        }
        
        /* 历史表格 */
        .history-table {
            border-collapse: collapse;
            width: 100%;
        }
        
        .history-table th, .history-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        
        .history-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .history-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .history-table tr:hover {
            background-color: #f1f1f1;
        }
        
        /* 当前会话行 */
        .current-session {
            background-color: #e8f4fd !important;
            font-weight: bold;
        }
        
        /* 警告值 */
        .warning-value {
            color: #ff9800;
        }
        
        /* 错误值 */
        .error-value {
            color: #f44336;
            font-weight: bold;
        }
        
        /* 关闭按钮 */
        .close-btn {
            background-color: #f44336;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            float: right;
            font-size: 14px;
            padding: 5px 10px;
            transition: background-color 0.3s;
        }
        
        .close-btn:hover {
            background-color: #d32f2f;
        }
        
        /* 性能图表 */
        #perf-graph {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            display: block;
            height: 100px;
            margin: 10px 0;
            width: 100%;
        }
    `;
    
    // 添加到文档头部
    document.head.appendChild(style);
})();

// 性能监控类
class PerformanceMonitor {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 最大历史记录长度（内存中保存）
            maxHistoryLength: options.maxHistoryLength || 100,
            // 启用长期监控
            enableLongTermMonitoring: options.enableLongTermMonitoring !== false,
            // 数据保存间隔（毫秒）
            saveInterval: options.saveInterval || 60000, // 默认1分钟
            // 存储ID（用于区分不同应用的数据）
            storageId: options.storageId || 'virtual-list-perf',
            // 最大存储历史记录数
            maxStoredSessions: options.maxStoredSessions || 10,
            // 要监控的性能条目类型
            observeEntryTypes: options.observeEntryTypes || [
                'longtask', 'layout-shift', 'largest-contentful-paint', 
                'first-input', 'paint', 'resource', 'navigation', 'element',
                'mark', 'measure'
            ]
        };
        
        // 性能指标
        this.metrics = {
            renderTime: 0,
            fps: 0,
            lastFrameTime: 0,
            frameCount: 0,
            lastFpsUpdateTime: 0,
            longTasks: 0,        // 长任务计数
            totalLongTaskTime: 0, // 长任务总时间
            layoutShifts: 0,     // 布局偏移计数
            cumulativeLayoutShift: 0, // 累积布局偏移
            largestContentfulPaint: 0, // 最大内容绘制时间
            firstInputDelay: 0   // 首次输入延迟
        };
        
        // 性能历史数据（用于图表）
        this.history = {
            renderTimes: [],
            fps: [],
            longTasks: [],
            layoutShifts: []
        };

        // 长期监控数据
        this.longTermMetrics = {
            sessions: [],
            currentSession: {
                startTime: Date.now(),
                endTime: null,
                avgFps: 0,
                minFps: Infinity,
                maxRenderTime: 0,
                longTasks: 0,
                cumulativeLayoutShift: 0,
                samples: 0
            }
        };
        
        // 存储工具对象
        this.storage = {
            /**
             * 保存数据到本地存储
             * @param {Object} data - 要保存的数据
             */
            save: (data) => {
                try {
                    const storageKey = `${this.options.storageId}-data`;
                    localStorage.setItem(storageKey, JSON.stringify(data));
                    return true;
                } catch (error) {
                    console.error('无法保存性能数据:', error);
                    return false;
                }
            },
            
            /**
             * 从本地存储加载数据
             * @returns {Object|null} 加载的数据或null
             */
            load: () => {
                try {
                    const storageKey = `${this.options.storageId}-data`;
                    const data = localStorage.getItem(storageKey);
                    return data ? JSON.parse(data) : null;
                } catch (error) {
                    console.error('无法加载性能数据:', error);
                    return null;
                }
            }
        };
        
        // DOM元素
        this.elements = {
            renderTime: document.getElementById('render-time'),
            fps: document.getElementById('fps'),
            perfGraph: document.getElementById('perf-graph'),
            longTasks: document.getElementById('long-tasks'),
            layoutShift: document.getElementById('layout-shift')
        };
        
        // 初始化性能观察器
        this.observers = {};
        this.setupPerformanceObserver();
        
        // 初始化图表
        this.initGraph();
        
        // 启动FPS计算
        this.startFpsTracking();
        
        // 加载保存的性能数据
        if (this.options.enableLongTermMonitoring) {
            this.loadSavedMetrics();
            
            // 设置定期保存
            this.saveIntervalId = setInterval(() => {
                this.updateLongTermMetrics();
                this.saveMetrics();
            }, this.options.saveInterval);
            
            // 设置页面卸载时保存
            window.addEventListener('beforeunload', () => {
                this.updateLongTermMetrics(true);
                this.saveMetrics();
            });
        }
    }
    
    /**
     * 设置性能观察器
     */
    setupPerformanceObserver() {
        // 检查浏览器支持
        if (!('PerformanceObserver' in window)) {
            console.warn('该浏览器不支持PerformanceObserver API');
            return;
        }
        
        // 检查支持的条目类型 PerformanceObserver.supportedEntryTypes静态属性数组
        const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
        
        // 创建性能观察器并配置
        if (supportedTypes.includes('longtask')) {
            this.observers.longTask = new PerformanceObserver(this.processPerformanceEntries.bind(this));
            this.observers.longTask.observe({ entryTypes: ['longtask'] });
        }
        
        if (supportedTypes.includes('layout-shift')) {
            this.observers.layoutShift = new PerformanceObserver(this.processPerformanceEntries.bind(this));
            this.observers.layoutShift.observe({ entryTypes: ['layout-shift'] });
        }
        
        if (supportedTypes.includes('largest-contentful-paint')) {
            this.observers.lcp = new PerformanceObserver(this.processPerformanceEntries.bind(this));
            this.observers.lcp.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        if (supportedTypes.includes('first-input')) {
            this.observers.fid = new PerformanceObserver(this.processPerformanceEntries.bind(this));
            this.observers.fid.observe({ entryTypes: ['first-input'] });
        }
        
        // 添加通用性能条目观察器
        const generalEntryTypes = this.options.observeEntryTypes.filter(
            type => supportedTypes.includes(type) && 
            !['longtask', 'layout-shift', 'largest-contentful-paint', 'first-input'].includes(type)
        );
        
        if (generalEntryTypes.length > 0) {
            this.observers.general = new PerformanceObserver(this.processPerformanceEntries.bind(this));
            this.observers.general.observe({ entryTypes: generalEntryTypes });
        }
    }
    
    /**
     * 处理性能条目
     * @param {PerformanceObserverEntryList} list - 性能条目列表
     * @param {PerformanceObserver} observer - 观察器实例
     */
    processPerformanceEntries(list, observer) {
        list.getEntries().forEach(entry => {
            switch (entry.entryType) {
                case 'longtask':
                    this.metrics.longTasks++;
                    this.metrics.totalLongTaskTime += entry.duration;
                    
                    // 添加到历史记录
                    this.history.longTasks.push({
                        time: performance.now(),
                        duration: entry.duration
                    });
                    
                    // 保持历史记录长度限制
                    if (this.history.longTasks.length > this.options.maxHistoryLength) {
                        this.history.longTasks.shift();
                    }
                    
                    // 更新UI（如果有元素）
                    if (this.elements.longTasks) {
                        this.elements.longTasks.textContent = `${this.metrics.longTasks} (${this.metrics.totalLongTaskTime.toFixed(0)}ms)`;
                    }
                    break;
                    
                case 'layout-shift':
                    if (!entry.hadRecentInput) {
                        this.metrics.layoutShifts++;
                        this.metrics.cumulativeLayoutShift += entry.value;
                        
                        // 添加到历史记录
                        this.history.layoutShifts.push({
                            time: performance.now(),
                            value: entry.value
                        });
                        
                        // 保持历史记录长度限制
                        if (this.history.layoutShifts.length > this.options.maxHistoryLength) {
                            this.history.layoutShifts.shift();
                        }
                        
                        // 更新UI（如果有元素）
                        if (this.elements.layoutShift) {
                            this.elements.layoutShift.textContent = `${this.metrics.cumulativeLayoutShift.toFixed(3)}`;
                        }
                    }
                    break;
                    
                case 'largest-contentful-paint':
                    this.metrics.largestContentfulPaint = entry.startTime;
                    break;
                    
                case 'first-input':
                    this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                    break;
                    
                // 可以根据需要处理其他类型的性能条目
            }
        });
        
        // 更新图表
        this.updateGraph();
    }
    
    /**
     * 加载保存的性能指标
     */
    loadSavedMetrics() {
        const savedData = this.storage.load();
        if (savedData && savedData.sessions) {
            this.longTermMetrics = savedData;
        }
    }
    
    /**
     * 保存性能指标到本地存储
     */
    saveMetrics() {
        if (!this.options.enableLongTermMonitoring) return;
        this.storage.save(this.longTermMetrics);
    }
    
    /**
     * 更新长期性能指标
     * @param {boolean} finishSession - 是否结束当前会话
     */
    updateLongTermMetrics(finishSession = false) {
        const currentSession = this.longTermMetrics.currentSession;
        const fpsHistory = this.history.fps;
        
        // 更新会话数据
        if (fpsHistory.length > 0) {
            const totalFps = fpsHistory.reduce((sum, fps) => sum + fps, 0);
            currentSession.avgFps = (currentSession.avgFps * currentSession.samples + totalFps) / 
                                     (currentSession.samples + fpsHistory.length);
            
            currentSession.minFps = Math.min(currentSession.minFps, ...fpsHistory);
            currentSession.samples += fpsHistory.length;
        }
        
        // 更新渲染时间
        if (this.history.renderTimes.length > 0) {
            currentSession.maxRenderTime = Math.max(
                currentSession.maxRenderTime,
                Math.max(...this.history.renderTimes)
            );
        }
        
        // 更新布局偏移
        currentSession.cumulativeLayoutShift = this.metrics.cumulativeLayoutShift;
        
        // 更新长任务
        currentSession.longTasks = this.metrics.longTasks;
        
        // 如果结束会话，保存到历史并创建新会话
        if (finishSession) {
            currentSession.endTime = Date.now();
            
            // 添加到会话历史
            this.longTermMetrics.sessions.push({...currentSession});
            
            // 限制保存的会话数
            if (this.longTermMetrics.sessions.length > this.options.maxStoredSessions) {
                this.longTermMetrics.sessions.shift();
            }
            
            // 创建新会话
            this.longTermMetrics.currentSession = {
                startTime: Date.now(),
                endTime: null,
                avgFps: 0,
                minFps: Infinity,
                maxRenderTime: 0,
                longTasks: 0,
                cumulativeLayoutShift: 0,
                samples: 0
            };
        }
    }
    
    /**
     * 初始化性能图表
     */
    initGraph() {
        if (!this.elements.perfGraph) return;
        
        this.graphCtx = this.elements.perfGraph.getContext('2d');
        this.graphWidth = this.elements.perfGraph.width;
        this.graphHeight = this.elements.perfGraph.height;
    }
    
    /**
     * 启动FPS跟踪
     */
    startFpsTracking() {
        // 设置上次帧时间
        this.metrics.lastFrameTime = performance.now();
        // 设置上次FPS更新时间
        this.metrics.lastFpsUpdateTime = performance.now();
        // 设置帧计数
        this.metrics.frameCount = 0;
        // 跟踪帧       
        const trackFrame = () => {
            // 获取当前 时间
            const now = performance.now();
            
            // 计算帧率
            this.metrics.frameCount++;
            const elapsed = now - this.metrics.lastFpsUpdateTime;
            
            // 每秒更新一次FPS
            if (elapsed >= 1000) {
                // 计算FPS
                this.metrics.fps = Math.round(this.metrics.frameCount * 1000 / elapsed);
                // 更新FPS显示
                this.updateFpsDisplay();
                
                // 添加到历史记录
                this.history.fps.push(this.metrics.fps);
                // 如果历史记录超过最大长度，移除第一个     
                if (this.history.fps.length > this.options.maxHistoryLength) {
                    this.history.fps.shift();
                }
                
                // 重置计数器
                this.metrics.frameCount = 0;
                this.metrics.lastFpsUpdateTime = now;
                
                // 更新图表
                this.updateGraph();
            }
            
            this.metrics.lastFrameTime = now;
            requestAnimationFrame(trackFrame);
        };
        
        requestAnimationFrame(trackFrame);
    }
    
    /**
     * 开始测量渲染时间
     * @returns {Function} 结束测量的函数
     */
    startRenderMeasure() {
        // 获取开始时间
        const startTime = performance.now();
        // 使用Performance API标记开始
        performance.mark('render-start');
        
        // 返回结束测量的函数
        return () => {
            // 标记结束
            performance.mark('render-end');
            
            // 创建测量
            performance.measure('render-duration', 'render-start', 'render-end');
            
            // 获取结束时间
            const endTime = performance.now();
            // 计算渲染时间
            this.metrics.renderTime = endTime - startTime;
            // 更新渲染时间显示
                this.updateRenderTimeDisplay();
            
            // 添加到历史记录
            this.history.renderTimes.push(this.metrics.renderTime);
            if (this.history.renderTimes.length > this.options.maxHistoryLength) {
                this.history.renderTimes.shift();
            }
            
            // 清理标记
            performance.clearMarks('render-start');
            performance.clearMarks('render-end');
            performance.clearMeasures('render-duration');
        };
    }
    
    /**
     * 更新渲染时间显示
     */
    updateRenderTimeDisplay() {
        if (this.elements.renderTime) {
            this.elements.renderTime.textContent = `${this.metrics.renderTime.toFixed(2)}ms`;
        }
    }
    
    /**
     * 更新FPS显示
     */
    updateFpsDisplay() {
        // 如果FPS显示元素存在
        if (this.elements.fps) {
            // 更新FPS显示
            this.elements.fps.textContent = `${this.metrics.fps}fps`;
        }
    }
    
    /**
     * 更新性能图表
     */
    updateGraph() {
        if (!this.graphCtx) return;
        
        const ctx = this.graphCtx;
        const width = this.graphWidth;
        const height = this.graphHeight;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景网格
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        
        // 水平网格线
        for (let i = 0; i < 5; i++) {
            const y = height * i / 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // 垂直网格线
        for (let i = 0; i < 11; i++) {
            const x = width * i / 10;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // 绘制FPS曲线
        if (this.history.fps.length > 1) {
            const maxFps = Math.max(60, ...this.history.fps);
            
            ctx.strokeStyle = '#28a745';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            this.history.fps.forEach((fps, index) => {
                const x = width * index / (this.options.maxHistoryLength - 1);
                const y = height - (fps / maxFps * height * 0.8);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // 绘制渲染时间曲线
        if (this.history.renderTimes.length > 1) {
            const maxTime = Math.max(100, ...this.history.renderTimes);
            
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            this.history.renderTimes.forEach((time, index) => {
                const x = width * index / (this.options.maxHistoryLength - 1);
                const y = height - (time / maxTime * height * 0.8);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // 绘制长任务标记点
        if (this.history.longTasks.length > 0) {
            ctx.fillStyle = '#dc3545';
            
            this.history.longTasks.forEach(taskInfo => {
                // 找到最接近的时间点
                const timeIndex = Math.floor(taskInfo.time / 1000) % this.options.maxHistoryLength;
                if (timeIndex < this.options.maxHistoryLength) {
                    const x = width * timeIndex / (this.options.maxHistoryLength - 1);
                    const y = height - 10; // 底部标记
                    
                    // 绘制红色三角形表示长任务
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 5, y + 10);
                    ctx.lineTo(x + 5, y + 10);
                    ctx.fill();
                }
            });
        }
        
        // 绘制布局偏移标记点
        if (this.history.layoutShifts.length > 0) {
            ctx.fillStyle = '#fd7e14';
            
            this.history.layoutShifts.forEach(shiftInfo => {
                // 找到最接近的时间点
                const timeIndex = Math.floor(shiftInfo.time / 1000) % this.options.maxHistoryLength;
                if (timeIndex < this.options.maxHistoryLength) {
                    const x = width * timeIndex / (this.options.maxHistoryLength - 1);
                    const y = 10; // 顶部标记
                    
                    // 绘制橙色圆形表示布局偏移
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    /**
     * 导出性能数据
     * @returns {string} 性能数据的JSON字符串
     */
    exportMetricsData() {
        this.updateLongTermMetrics(true);
        return JSON.stringify({
            exportTime: Date.now(),
            currentMetrics: this.metrics,
            history: this.history,
            longTerm: this.longTermMetrics
        });
    }
    
    /**
     * 导入性能数据
     * @param {string} jsonData - 性能数据的JSON字符串
     * @returns {boolean} 是否导入成功
     */
    importMetricsData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.longTerm && data.longTerm.sessions) {
                this.longTermMetrics = data.longTerm;
                this.saveMetrics();
                return true;
            }
            return false;
        } catch (error) {
            console.error('导入性能数据失败:', error);
            return false;
        }
    }
    
    /**
     * 清除所有观察器和计时器
     */
    disconnect() {
        // 清除所有性能观察器
        Object.values(this.observers).forEach(observer => {
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        });
        
        // 清除保存定时器
        if (this.saveIntervalId) {
            clearInterval(this.saveIntervalId);
        }
        
        // 最后保存一次数据
        if (this.options.enableLongTermMonitoring) {
            this.updateLongTermMetrics(true);
            this.saveMetrics();
        }
    }
}

// 基础虚拟列表类 - 所有虚拟列表实现的基类
class BaseVirtualList {
    /**
     * 创建虚拟列表实例
     * @param {Object} options - 配置选项
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
        this.scrollDirection = 'down'; // 滚动方向
        this.ticking = false; // 是否正在处理滚动事件
        this.resizeObserver = null; // 大小变化观察者
        
        // 性能监控
        this.performanceMonitor = options.performanceMonitor || null;
        
        // 统计信息元素
        this.stats = {
            renderedCount: document.getElementById('rendered-count'),
            totalCount: document.getElementById('total-count'),
            renderRatio: document.getElementById('render-ratio'),
            scrollPosition: document.getElementById('scroll-position')
        };
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
     * 设置ResizeObserver监控容器大小变化
     */
    setupResizeObserver() {
        // 检查浏览器是否支持ResizeObserver
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
        const totalHeight = this.totalItems * this.itemHeight;
        this.scrollHeightEl.style.height = `${totalHeight}px`;
    }
    
    /**
     * 处理滚动事件
     * @param {Event} event - 滚动事件对象
     */
    handleScroll(event) {
        // 确定滚动方向
        const currentScrollTop = this.container.scrollTop;
        this.scrollDirection = currentScrollTop > this.lastScrollTop ? 'down' : 'up';
        this.lastScrollTop = currentScrollTop;
        
        // 更新滚动位置统计信息
        if (this.stats.scrollPosition) {
            this.stats.scrollPosition.textContent = Math.round(currentScrollTop);
        }
        
        // 使用requestAnimationFrame优化滚动性能
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.render();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }
    
    /**
     * 渲染可见区域内的项目
     */
    render() {
        // 如果有性能监控，开始测量渲染时间
        const endMeasure = this.performanceMonitor ? 
            this.performanceMonitor.startRenderMeasure() : null;
        
        // 获取可视区域信息
        const containerRect = this.container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        
        // 计算可见项目的范围
        const scrollTop = this.container.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
        const endIndex = Math.min(
            this.totalItems - 1,
            Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.overscan
        );
        
        // 创建当前应该可见的项目集合
        const currentlyVisible = new Set();
        for (let i = startIndex; i <= endIndex; i++) {
            currentlyVisible.add(i);
        }
        
        // 移除不再可见的项目
        for (const [index, element] of this.visibleItems.entries()) {
            if (!currentlyVisible.has(index)) {
                this.contentEl.removeChild(element);
                this.visibleItems.delete(index);
            }
        }
        
        // 添加新可见的项目
        for (let i = startIndex; i <= endIndex; i++) {
            if (!this.visibleItems.has(i)) {
                const element = this.renderItem(i);
                element.style.transform = `translateY(${i * this.itemHeight}px)`;
                this.contentEl.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }
        
        // 更新统计信息
        this.updateStats();
        
        // 如果有性能监控，结束测量
        if (endMeasure) {
            endMeasure();
        }
    }
    
    /**
     * 默认的项目渲染函数
     * @param {number} index - 项目索引
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    defaultRenderItem(index) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.height = `${this.itemHeight}px`;
        
        const content = document.createElement('div');
        content.className = 'list-item-content';
        
        const indexEl = document.createElement('div');
        indexEl.className = 'list-item-index';
        indexEl.textContent = `#${index + 1}`;
        
        const textEl = document.createElement('div');
        textEl.className = 'list-item-text';
        textEl.textContent = `这是列表项 ${index + 1} 的内容`;
        
        content.appendChild(indexEl);
        content.appendChild(textEl);
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

// 动态高度虚拟列表类
class DynamicHeightVirtualList extends BaseVirtualList {
    /**
     * 创建动态高度虚拟列表实例
     * @param {Object} options - 配置选项
     */
    constructor(options) {
        super(options);
        
        // 动态高度特有属性
        this.heightCache = new Map(); // 缓存每个项目的实际高度
        this.positionCache = new Map(); // 缓存每个项目的位置
        this.estimatedItemHeight = options.itemHeight || 50; // 估计的项目高度
        this.heightVariation = options.heightVariation || 100; // 高度变化百分比（100表示0-200%的变化）
        this.cacheInvalidated = true; // 缓存是否失效
        
        // 因为高度是动态的，我们需要一个累计滚动高度
        this.totalHeight = this.estimateScrollHeight();
    }
    
    /**
     * 估算滚动区域总高度
     * @returns {number} 估算的总高度
     */
    estimateScrollHeight() {
        // 如果所有高度都已知，返回实际总高度
        if (this.heightCache.size === this.totalItems) {
            let total = 0;
            for (const height of this.heightCache.values()) {
                total += height;
            }
            return total;
        }
        
        // 否则使用估计高度
        return this.totalItems * this.estimatedItemHeight;
    }
    
    /**
     * 更新滚动区域高度
     */
    updateScrollHeight() {
        this.totalHeight = this.estimateScrollHeight();
        this.scrollHeightEl.style.height = `${this.totalHeight}px`;
    }
    
    /**
     * 计算项目的位置
     * @param {number} index - 项目索引
     * @returns {number} 项目的Y位置
     */
    getItemPosition(index) {
        // 如果缓存无效，重新计算所有位置
        if (this.cacheInvalidated) {
            this.updatePositionCache();
        }
        
        // 如果有缓存的位置，直接返回
        if (this.positionCache.has(index)) {
            return this.positionCache.get(index);
        }
        
        // 找到最近的已知位置
        let closestIndex = -1;
        let position = 0;
        
        for (let i = 0; i < index; i++) {
            if (this.positionCache.has(i)) {
                closestIndex = i;
                position = this.positionCache.get(i);
            }
        }
        
        // 计算从最近的已知位置到目标位置
        for (let i = closestIndex + 1; i <= index; i++) {
            const height = this.heightCache.get(i) || this.estimatedItemHeight;
            position += height;
            this.positionCache.set(i, position - height); // 存储每个项目的起始位置
        }
        
        return this.positionCache.get(index);
    }
    
    /**
     * 更新位置缓存
     */
    updatePositionCache() {
        this.positionCache.clear();
        let cumulativeHeight = 0;
        
        for (let i = 0; i < this.totalItems; i++) {
            this.positionCache.set(i, cumulativeHeight);
            const height = this.heightCache.get(i) || this.estimatedItemHeight;
            cumulativeHeight += height;
        }
        
        this.cacheInvalidated = false;
    }
    
    /**
     * 获取项目的高度
     * @param {number} index - 项目索引
     * @returns {number} 项目高度
     */
    getItemHeight(index) {
        return this.heightCache.get(index) || this.estimatedItemHeight;
    }
    
    /**
     * 设置项目的实际高度
     * @param {number} index - 项目索引
     * @param {number} height - 项目的实际高度
     */
    setItemHeight(index, height) {
        const oldHeight = this.heightCache.get(index);
        
        // 如果高度变化，更新缓存并标记位置缓存为无效
        if (oldHeight !== height) {
            this.heightCache.set(index, height);
            this.cacheInvalidated = true;
            this.updateScrollHeight();
        }
    }
    
    /**
     * 测量已渲染项目的实际高度
     */
    measureVisibleItems() {
        for (const [index, element] of this.visibleItems.entries()) {
            const height = element.offsetHeight;
            this.setItemHeight(index, height);
        }
    }
    
    /**
     * 渲染可见区域内的项目
     * 覆盖父类方法以支持动态高度
     */
    render() {
        // 如果有性能监控，开始测量渲染时间
        const endMeasure = this.performanceMonitor ? 
            this.performanceMonitor.startRenderMeasure() : null;
        
        // 获取可视区域信息
        const containerRect = this.container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const scrollTop = this.container.scrollTop;
        
        // 计算可见项目的范围
        // 这里我们需要根据位置查找索引，而不是简单地除以固定高度
        const startIndex = this.findIndexForPosition(scrollTop - this.estimatedItemHeight * this.overscan);
        const endIndex = this.findIndexForPosition(scrollTop + containerHeight + this.estimatedItemHeight * this.overscan);
        
        // 创建当前应该可见的项目集合
        const currentlyVisible = new Set();
        for (let i = Math.max(0, startIndex); i <= Math.min(this.totalItems - 1, endIndex); i++) {
            currentlyVisible.add(i);
        }
        
        // 移除不再可见的项目
        for (const [index, element] of this.visibleItems.entries()) {
            if (!currentlyVisible.has(index)) {
                this.contentEl.removeChild(element);
                this.visibleItems.delete(index);
            }
        }
        
        // 添加新可见的项目
        for (let i = Math.max(0, startIndex); i <= Math.min(this.totalItems - 1, endIndex); i++) {
            if (!this.visibleItems.has(i)) {
                const element = this.renderItem(i);
                const position = this.getItemPosition(i);
                element.style.transform = `translateY(${position}px)`;
                this.contentEl.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }
        
        // 测量可见项目的实际高度
        this.measureVisibleItems();
        
        // 更新统计信息
        this.updateStats();
        
        // 如果有性能监控，结束测量
        if (endMeasure) {
            endMeasure();
        }
    }
    
    /**
     * 根据滚动位置查找对应的项目索引
     * @param {number} position - 滚动位置
     * @returns {number} 项目索引
     */
    findIndexForPosition(position) {
        // 边界情况
        if (position <= 0) return 0;
        if (position >= this.totalHeight) return this.totalItems - 1;
        
        // 如果位置缓存无效，更新缓存
        if (this.cacheInvalidated) {
            this.updatePositionCache();
        }
        
        // 二分查找
        let low = 0;
        let high = this.totalItems - 1;
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midPosition = this.getItemPosition(mid);
            const midHeight = this.getItemHeight(mid);
            
            if (position >= midPosition && position < midPosition + midHeight) {
                return mid;
            } else if (position < midPosition) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        
        return low;
    }
    
    /**
     * 默认的动态高度项目渲染函数
     * @param {number} index - 项目索引
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    defaultRenderItem(index) {
        // 基于高度变化百分比计算随机高度
        const randomFactor = 1 + (Math.random() * this.heightVariation / 100) - (this.heightVariation / 200);
        const itemHeight = Math.max(20, Math.floor(this.estimatedItemHeight * randomFactor));
        
        // 创建列表项
        const item = document.createElement('div');
        item.className = 'dynamic-list-item';
        
        // 创建内容容器
        const content = document.createElement('div');
        content.className = 'dynamic-content';
        
        // 创建头部（标题栏）
        const header = document.createElement('div');
        header.className = 'dynamic-content-header';
        
        const indexEl = document.createElement('div');
        indexEl.className = 'list-item-index';
        indexEl.textContent = `#${index + 1}`;
        
        const titleEl = document.createElement('div');
        titleEl.className = 'list-item-text';
        titleEl.textContent = `动态高度项目 ${index + 1}`;
        
        header.appendChild(indexEl);
        header.appendChild(titleEl);
        
        // 创建正文
        const body = document.createElement('div');
        body.className = 'dynamic-content-body';
        
        // 根据随机高度添加不同数量的段落
        const paragraphCount = Math.ceil(randomFactor * 2); // 1-3个段落
        
        for (let i = 0; i < paragraphCount; i++) {
            const p = document.createElement('p');
            p.textContent = `这是动态高度项目 ${index + 1} 的第 ${i + 1} 段内容。动态高度使虚拟列表能够处理不同大小的内容。`;
            body.appendChild(p);
        }
        
        content.appendChild(header);
        content.appendChild(body);
        item.appendChild(content);
        
        return item;
    }
    
    /**
     * 更新配置
     * @param {Object} options - 新的配置选项
     */
    updateConfig(options) {
        if (options.heightVariation !== undefined) {
            this.heightVariation = options.heightVariation;
        }
        
        // 调用父类方法更新基本配置
        super.updateConfig(options);
        
        // 清空高度缓存和位置缓存
        this.heightCache.clear();
        this.positionCache.clear();
        this.cacheInvalidated = true;
    }
}

// 懒加载虚拟列表类
class LazyLoadVirtualList extends BaseVirtualList {
    /**
     * 创建懒加载虚拟列表实例
     * @param {Object} options - 配置选项
     */
    constructor(options) {
        super(options);
        
        // 懒加载特有属性
        this.api = options.api; // API实例
        this.items = []; // 已加载的数据项
        this.loadedPages = new Set(); // 已加载的页码集合
        this.currentPage = 1; // 当前页码
        this.itemsPerPage = options.itemsPerPage || 100; // 每页项目数
        this.totalPages = options.totalPages || 10; // 总页数
        this.loadingDistance = options.loadingDistance || 200; // 触发加载的距离（px）
        
        // 加载状态
        this.loading = false; // 是否正在加载
        this.hasError = false; // 是否有错误
        this.errorMessage = ''; // 错误信息
        
        // 加载指示器
        this.loader = document.getElementById('loader');
        
        // 初始化总项目数
        this.totalItems = this.itemsPerPage * this.totalPages;
    }
    
    /**
     * 初始化虚拟列表
     * 覆盖父类方法以添加初始数据加载
     */
    async init() {
        // 设置滚动区域高度
        this.updateScrollHeight();
        
        // 添加滚动事件监听
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        
        // 设置ResizeObserver监控容器大小变化
        this.setupResizeObserver();
        
        // 加载第一页数据
        await this.loadPage(1);
        
        // 初始渲染
        this.render();
        
        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 处理滚动事件
     * 覆盖父类方法以添加懒加载触发
     * @param {Event} event - 滚动事件对象
     */
    handleScroll(event) {
        // 调用父类方法
        super.handleScroll(event);
        
        // 检查是否需要加载更多数据
        this.checkAndLoadMore();
    }
    
    /**
     * 检查并加载更多数据
     */
    checkAndLoadMore() {
        // 如果正在加载或已经没有更多页，直接返回
        if (this.loading || this.loadedPages.size >= this.totalPages) {
            return;
        }
        
        // 计算距离底部的距离
        const containerHeight = this.container.clientHeight;
        const scrollTop = this.container.scrollTop;
        const scrollHeight = this.container.scrollHeight;
        const distanceToBottom = scrollHeight - scrollTop - containerHeight;
        
        // 如果接近底部，加载下一页
        if (distanceToBottom < this.loadingDistance) {
            const nextPage = this.currentPage + 1;
            if (nextPage <= this.totalPages && !this.loadedPages.has(nextPage)) {
                this.loadPage(nextPage);
            }
        }
    }
    
    /**
     * 加载指定页的数据
     * @param {number} page - 页码
     * @returns {Promise<void>}
     */
    async loadPage(page) {
        // 如果已经加载过此页或页码无效，直接返回
        if (this.loadedPages.has(page) || page < 1 || page > this.totalPages) {
            return;
        }
        
        // 设置加载状态
        this.loading = true;
        this.hasError = false;
        this.showLoader();
        
        try {
            // 调用API获取数据
            const response = await this.api.getItems(page);
            
            // 处理数据
            this.processLoadedData(page, response);
            
            // 更新当前页码
            this.currentPage = page;
            
            // 记录已加载页码
            this.loadedPages.add(page);
            
            // 重新渲染
            this.render();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.hasError = true;
            this.errorMessage = error.message;
            this.showError();
        } finally {
            // 清除加载状态
            this.loading = false;
            this.hideLoader();
        }
    }
    
    /**
     * 处理加载的数据
     * @param {number} page - 页码
     * @param {Object} response - API响应数据
     */
    processLoadedData(page, response) {
        // 计算数据应该插入的位置
        const startIndex = (page - 1) * this.itemsPerPage;
        
        // 确保items数组有足够的长度
        if (this.items.length < startIndex + response.items.length) {
            this.items.length = startIndex + response.items.length;
        }
        
        // 插入数据
        for (let i = 0; i < response.items.length; i++) {
            this.items[startIndex + i] = response.items[i];
        }
        
        // 如果是第一次加载，更新总项目数和页数
        if (this.loadedPages.size === 0) {
            this.totalItems = response.meta.totalItems;
            this.totalPages = response.meta.totalPages;
            this.updateScrollHeight();
        }
    }
    
    /**
     * 显示加载指示器
     */
    showLoader() {
        if (this.loader) {
            this.loader.classList.add('active');
        }
    }
    
    /**
     * 隐藏加载指示器
     */
    hideLoader() {
        if (this.loader) {
            this.loader.classList.remove('active');
        }
    }
    
    /**
     * 显示错误信息
     */
    showError() {
        // 创建错误消息元素
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = `加载失败: ${this.errorMessage}`;
        
        // 添加重试按钮
        const retryBtn = document.createElement('button');
        retryBtn.className = 'primary-button';
        retryBtn.textContent = '重试';
        retryBtn.style.marginTop = '1rem';
        retryBtn.addEventListener('click', () => {
            // 移除错误消息
            this.contentEl.removeChild(errorEl);
            // 重试加载
            this.loadPage(this.currentPage + 1);
        });
        
        errorEl.appendChild(retryBtn);
        
        // 添加到内容区域
        this.contentEl.appendChild(errorEl);
    }
    
    /**
     * 默认的项目渲染函数，使用懒加载数据
     * @param {number} index - 项目索引
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    defaultRenderItem(index) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.height = `${this.itemHeight}px`;
        
        const content = document.createElement('div');
        content.className = 'list-item-content';
        
        // 获取数据对象
        const itemData = this.items[index];
        
        // 如果数据已加载，显示实际内容
        if (itemData) {
            const indexEl = document.createElement('div');
            indexEl.className = 'list-item-index';
            indexEl.textContent = `#${itemData.index}`;
            
            const textEl = document.createElement('div');
            textEl.className = 'list-item-text';
            
            const title = document.createElement('strong');
            title.textContent = itemData.title;
            
            const timestamp = document.createElement('small');
            timestamp.textContent = ` - ${new Date(itemData.timestamp).toLocaleString()}`;
            timestamp.style.color = '#6c757d';
            
            textEl.appendChild(title);
            textEl.appendChild(timestamp);
            
            // 如果有内容，添加内容
            if (itemData.content && itemData.content.length > 0) {
                const contentP = document.createElement('p');
                contentP.textContent = itemData.content[0];
                contentP.style.marginTop = '0.5rem';
                textEl.appendChild(contentP);
            }
            
            // 如果有标签，添加标签
            if (itemData.tags && itemData.tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.style.marginTop = '0.5rem';
                
                itemData.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.textContent = tag;
                    tagSpan.style.display = 'inline-block';
                    tagSpan.style.padding = '0.25rem 0.5rem';
                    tagSpan.style.backgroundColor = '#e9ecef';
                    tagSpan.style.borderRadius = '4px';
                    tagSpan.style.marginRight = '0.5rem';
                    tagSpan.style.fontSize = '0.8rem';
                    tagsDiv.appendChild(tagSpan);
                });
                
                textEl.appendChild(tagsDiv);
            }
            
            content.appendChild(indexEl);
            content.appendChild(textEl);
        } else {
            // 如果数据尚未加载，显示加载占位符
            const indexEl = document.createElement('div');
            indexEl.className = 'list-item-index';
            indexEl.textContent = `#${index + 1}`;
            
            const textEl = document.createElement('div');
            textEl.className = 'list-item-text';
            textEl.textContent = '加载中...';
            
            content.appendChild(indexEl);
            content.appendChild(textEl);
        }
        
        item.appendChild(content);
        return item;
    }
    
    /**
     * 更新配置
     * @param {Object} options - 新的配置选项
     */
    updateConfig(options) {
        let needsReset = false;
        
        if (options.itemsPerPage !== undefined && options.itemsPerPage !== this.itemsPerPage) {
            this.itemsPerPage = options.itemsPerPage;
            needsReset = true;
        }
        
        if (options.totalPages !== undefined && options.totalPages !== this.totalPages) {
            this.totalPages = options.totalPages;
            needsReset = true;
        }
        
        if (options.apiDelay !== undefined && this.api) {
            this.api.updateConfig({ delay: options.apiDelay });
        }
        
        // 如果需要重置，清空所有数据并重新加载
        if (needsReset) {
            // 清空数据
            this.items = [];
            this.loadedPages.clear();
            this.currentPage = 1;
            this.loading = false;
            this.hasError = false;
            
            // 更新总项目数
            this.totalItems = this.itemsPerPage * this.totalPages;
            
            // 清空内容
            for (const element of this.visibleItems.values()) {
                this.contentEl.removeChild(element);
            }
            this.visibleItems.clear();
            
            // 更新滚动高度
            this.updateScrollHeight();
            
            // 重新加载第一页
            this.loadPage(1).then(() => {
                // 重新渲染
                this.render();
            });
        } else {
            // 调用父类方法更新基本配置
            super.updateConfig(options);
        }
    }
}

// 初始化代码
document.addEventListener('DOMContentLoaded', () => {
    // 创建性能监控面板
    const createPerformancePanel = () => {
        // 检查是否已存在
        if (document.getElementById('performance-panel')) return;
        
        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'performance-panel';
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '性能监控';
        title.style.margin = '0 0 10px 0';
        
        // 创建指标容器
        const metricsContainer = document.createElement('div');
        metricsContainer.className = 'metrics-container';
        
        // 添加FPS指标
        const fpsContainer = document.createElement('div');
        fpsContainer.className = 'metric-container';
        
        const fpsLabel = document.createElement('span');
        fpsLabel.className = 'metric-label';
        fpsLabel.textContent = 'FPS:';
        
        const fpsValue = document.createElement('span');
        fpsValue.id = 'fps';
        fpsValue.className = 'metric-value';
        fpsValue.textContent = '0';
        
        fpsContainer.appendChild(fpsLabel);
        fpsContainer.appendChild(fpsValue);
        metricsContainer.appendChild(fpsContainer);
        
        // 添加渲染时间指标
        const renderTimeContainer = document.createElement('div');
        renderTimeContainer.className = 'metric-container';
        
        const renderTimeLabel = document.createElement('span');
        renderTimeLabel.className = 'metric-label';
        renderTimeLabel.textContent = '渲染时间:';
        
        const renderTimeValue = document.createElement('span');
        renderTimeValue.id = 'render-time';
        renderTimeValue.className = 'metric-value';
        renderTimeValue.textContent = '0.00ms';
        
        renderTimeContainer.appendChild(renderTimeLabel);
        renderTimeContainer.appendChild(renderTimeValue);
        metricsContainer.appendChild(renderTimeContainer);
        
        // 添加渲染项目数指标
        const renderedCountContainer = document.createElement('div');
        renderedCountContainer.className = 'metric-container';
        
        const renderedCountLabel = document.createElement('span');
        renderedCountLabel.className = 'metric-label';
        renderedCountLabel.textContent = '已渲染项:';
        
        const renderedCountValue = document.createElement('span');
        renderedCountValue.id = 'rendered-count';
        renderedCountValue.className = 'metric-value';
        renderedCountValue.textContent = '0';
        
        renderedCountContainer.appendChild(renderedCountLabel);
        renderedCountContainer.appendChild(renderedCountValue);
        metricsContainer.appendChild(renderedCountContainer);
        
        // 添加总项目数指标
        const totalCountContainer = document.createElement('div');
        totalCountContainer.className = 'metric-container';
        
        const totalCountLabel = document.createElement('span');
        totalCountLabel.className = 'metric-label';
        totalCountLabel.textContent = '总项目数:';
        
        const totalCountValue = document.createElement('span');
        totalCountValue.id = 'total-count';
        totalCountValue.className = 'metric-value';
        totalCountValue.textContent = '0';
        
        totalCountContainer.appendChild(totalCountLabel);
        totalCountContainer.appendChild(totalCountValue);
        metricsContainer.appendChild(totalCountContainer);
        
        // 添加渲染比例指标
        const renderRatioContainer = document.createElement('div');
        renderRatioContainer.className = 'metric-container';
        
        const renderRatioLabel = document.createElement('span');
        renderRatioLabel.className = 'metric-label';
        renderRatioLabel.textContent = '渲染比例:';
        
        const renderRatioValue = document.createElement('span');
        renderRatioValue.id = 'render-ratio';
        renderRatioValue.className = 'metric-value';
        renderRatioValue.textContent = '0.00%';
        
        renderRatioContainer.appendChild(renderRatioLabel);
        renderRatioContainer.appendChild(renderRatioValue);
        metricsContainer.appendChild(renderRatioContainer);
        
        // 添加滚动位置指标
        const scrollPositionContainer = document.createElement('div');
        scrollPositionContainer.className = 'metric-container';
        
        const scrollPositionLabel = document.createElement('span');
        scrollPositionLabel.className = 'metric-label';
        scrollPositionLabel.textContent = '滚动位置:';
        
        const scrollPositionValue = document.createElement('span');
        scrollPositionValue.id = 'scroll-position';
        scrollPositionValue.className = 'metric-value';
        scrollPositionValue.textContent = '0';
        
        scrollPositionContainer.appendChild(scrollPositionLabel);
        scrollPositionContainer.appendChild(scrollPositionValue);
        metricsContainer.appendChild(scrollPositionContainer);
        
        // 添加图表
        const graphContainer = document.createElement('div');
        const graph = document.createElement('canvas');
        graph.id = 'perf-graph';
        graph.width = 600;
        graph.height = 100;
        graphContainer.appendChild(graph);
        
        // 组装面板
        panel.appendChild(title);
        panel.appendChild(metricsContainer);
        panel.appendChild(graphContainer);
        
        // 添加到页面
        const container = document.querySelector('.container') || document.body;
        if (container.firstChild) {
            container.insertBefore(panel, container.firstChild);
        } else {
            container.appendChild(panel);
        }
        
        return panel;
    };
    
    // 创建性能监控面板
    const perfPanel = createPerformancePanel();
    
    // 创建性能监控实例
    const performanceMonitor = new PerformanceMonitor({
        enableLongTermMonitoring: true,
        maxHistoryLength: 120,
        saveInterval: 30000, // 30秒保存一次
        storageId: 'virtual-list-perf-demo',
        maxStoredSessions: 20,
        observeEntryTypes: [
            'longtask', 'layout-shift', 'largest-contentful-paint', 
            'first-input', 'paint', 'resource', 'navigation', 
            'mark', 'measure'
        ]
    });
    
    // 创建性能指标的额外DOM元素
    const createAdditionalMetricsUI = () => {
        if (!perfPanel) return;
        
        // 添加长任务和布局偏移的指标
        if (!document.getElementById('long-tasks')) {
            const longTasksContainer = document.createElement('div');
            longTasksContainer.className = 'metric-container';
            
            const longTasksLabel = document.createElement('span');
            longTasksLabel.className = 'metric-label';
            longTasksLabel.textContent = '长任务:';
            
            const longTasksValue = document.createElement('span');
            longTasksValue.id = 'long-tasks';
            longTasksValue.className = 'metric-value';
            longTasksValue.textContent = '0 (0ms)';
            
            longTasksContainer.appendChild(longTasksLabel);
            longTasksContainer.appendChild(longTasksValue);
            perfPanel.querySelector('.metrics-container').appendChild(longTasksContainer);
        }
        
        if (!document.getElementById('layout-shift')) {
            const layoutShiftContainer = document.createElement('div');
            layoutShiftContainer.className = 'metric-container';
            
            const layoutShiftLabel = document.createElement('span');
            layoutShiftLabel.className = 'metric-label';
            layoutShiftLabel.textContent = 'CLS:';
            
            const layoutShiftValue = document.createElement('span');
            layoutShiftValue.id = 'layout-shift';
            layoutShiftValue.className = 'metric-value';
            layoutShiftValue.textContent = '0.000';
            
            layoutShiftContainer.appendChild(layoutShiftLabel);
            layoutShiftContainer.appendChild(layoutShiftValue);
            perfPanel.querySelector('.metrics-container').appendChild(layoutShiftContainer);
        }
        
        // 添加会话历史按钮
        if (!document.getElementById('show-history')) {
            const historyBtnContainer = document.createElement('div');
            historyBtnContainer.className = 'history-controls';
            
            const historyBtn = document.createElement('button');
            historyBtn.id = 'show-history';
            historyBtn.className = 'history-btn';
            historyBtn.textContent = '查看历史记录';
            historyBtn.addEventListener('click', showPerformanceHistory);
            
            const exportBtn = document.createElement('button');
            exportBtn.id = 'export-metrics';
            exportBtn.className = 'history-btn';
            exportBtn.textContent = '导出数据';
            exportBtn.addEventListener('click', exportPerformanceData);
            
            historyBtnContainer.appendChild(historyBtn);
            historyBtnContainer.appendChild(exportBtn);
            perfPanel.appendChild(historyBtnContainer);
            
            // 添加历史面板（初始隐藏）
            if (!document.getElementById('history-panel')) {
                const historyPanel = document.createElement('div');
                historyPanel.id = 'history-panel';
                historyPanel.className = 'history-panel';
                historyPanel.style.display = 'none';
                
                const historyTitle = document.createElement('h3');
                historyTitle.textContent = '性能历史记录';
                
                const historyContent = document.createElement('div');
                historyContent.id = 'history-content';
                historyContent.className = 'history-content';
                
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-btn';
                closeBtn.textContent = '关闭';
                closeBtn.addEventListener('click', () => {
                    historyPanel.style.display = 'none';
                });
                
                historyPanel.appendChild(historyTitle);
                historyPanel.appendChild(historyContent);
                historyPanel.appendChild(closeBtn);
                document.body.appendChild(historyPanel);
            }
        }
    };
    
    // 显示性能历史记录
    const showPerformanceHistory = () => {
        const historyPanel = document.getElementById('history-panel');
        const historyContent = document.getElementById('history-content');
        
        if (!historyPanel || !historyContent) return;
        
        // 清空现有内容
        historyContent.innerHTML = '';
        
        // 更新当前会话数据
        performanceMonitor.updateLongTermMetrics(false);
        
        // 获取会话数据
        const sessions = [...performanceMonitor.longTermMetrics.sessions];
        
        // 添加当前会话
        sessions.push({
            ...performanceMonitor.longTermMetrics.currentSession,
            isCurrent: true,
            endTime: Date.now()
        });
        
        // 创建表格
        const table = document.createElement('table');
        table.className = 'history-table';
        
        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        ['会话', '日期', '持续时间', '平均FPS', '最低FPS', '最大渲染时间', '长任务', 'CLS'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 表体
        const tbody = document.createElement('tbody');
        
        sessions.forEach((session, index) => {
            const row = document.createElement('tr');
            if (session.isCurrent) {
                row.className = 'current-session';
            }
            
            // 会话编号
            const sessionCell = document.createElement('td');
            sessionCell.textContent = session.isCurrent ? '当前' : `#${sessions.length - index - 1}`;
            row.appendChild(sessionCell);
            
            // 日期
            const dateCell = document.createElement('td');
            const date = new Date(session.startTime);
            dateCell.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            row.appendChild(dateCell);
            
            // 持续时间
            const durationCell = document.createElement('td');
            const duration = (session.endTime - session.startTime) / 1000 / 60;
            durationCell.textContent = `${duration.toFixed(1)}分钟`;
            row.appendChild(durationCell);
            
            // 平均FPS
            const avgFpsCell = document.createElement('td');
            avgFpsCell.textContent = session.avgFps.toFixed(1);
            if (session.avgFps < 30) {
                avgFpsCell.className = 'warning-value';
            }
            row.appendChild(avgFpsCell);
            
            // 最低FPS
            const minFpsCell = document.createElement('td');
            minFpsCell.textContent = session.minFps === Infinity ? 'N/A' : session.minFps;
            if (session.minFps < 20 && session.minFps !== Infinity) {
                minFpsCell.className = 'error-value';
            }
            row.appendChild(minFpsCell);
            
            // 最大渲染时间
            const maxRenderCell = document.createElement('td');
            maxRenderCell.textContent = `${session.maxRenderTime.toFixed(1)}ms`;
            if (session.maxRenderTime > 50) {
                maxRenderCell.className = 'warning-value';
            }
            row.appendChild(maxRenderCell);
            
            // 长任务
            const longTasksCell = document.createElement('td');
            longTasksCell.textContent = session.longTasks;
            if (session.longTasks > 0) {
                longTasksCell.className = 'warning-value';
            }
            row.appendChild(longTasksCell);
            
            // CLS
            const clsCell = document.createElement('td');
            clsCell.textContent = session.cumulativeLayoutShift.toFixed(3);
            if (session.cumulativeLayoutShift > 0.1) {
                clsCell.className = 'warning-value';
            }
            if (session.cumulativeLayoutShift > 0.25) {
                clsCell.className = 'error-value';
            }
            row.appendChild(clsCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        historyContent.appendChild(table);
        
        // 显示面板
        historyPanel.style.display = 'block';
    };
    
    // 导出性能数据
    const exportPerformanceData = () => {
        // 导出数据
        const data = performanceMonitor.exportMetricsData();
        
        // 创建下载链接
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtual-list-perf-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };
    
    // 创建额外的性能UI
    createAdditionalMetricsUI();
    
    // 在页面卸载时断开性能监控
    window.addEventListener('beforeunload', () => {
        if (performanceMonitor) {
            performanceMonitor.disconnect();
        }
    });
    
    // 标签页元素
    const tabButtons = {
        basic: document.getElementById('tab-basic'),
        dynamic: document.getElementById('tab-dynamic'),
        lazy: document.getElementById('tab-lazy')
    };
    
    const tabContents = {
        basic: document.getElementById('basic-tab-content'),
        dynamic: document.getElementById('dynamic-tab-content'),
        lazy: document.getElementById('lazy-tab-content')
    };
    
    // 创建基础虚拟列表实例
    const basicVirtualList = new BaseVirtualList({
        container: document.getElementById('virtual-list-basic'),
        scrollHeightEl: document.getElementById('scroll-height-basic'),
        contentEl: document.getElementById('list-content-basic'),
        totalItems: parseInt(document.getElementById('total-items-basic').value) || 10000,
        itemHeight: parseInt(document.getElementById('item-height-basic').value) || 50,
        overscan: parseInt(document.getElementById('overscan-basic').value) || 5,
        performanceMonitor
    });
    
    // 创建动态高度虚拟列表实例
    const dynamicVirtualList = new DynamicHeightVirtualList({
        container: document.getElementById('virtual-list-dynamic'),
        scrollHeightEl: document.getElementById('scroll-height-dynamic'),
        contentEl: document.getElementById('list-content-dynamic'),
        totalItems: parseInt(document.getElementById('total-items-dynamic').value) || 5000,
        itemHeight: 50, // 估计高度
        heightVariation: parseInt(document.getElementById('dynamic-variation').value) || 100,
        overscan: 5,
        performanceMonitor
    });
    
    // 创建模拟API实例
    const mockApi = new MockApi({
        itemsPerPage: parseInt(document.getElementById('items-per-page').value) || 100,
        totalPages: parseInt(document.getElementById('total-pages').value) || 10,
        delay: parseInt(document.getElementById('api-delay').value) || 500
    });
    
    // 创建懒加载虚拟列表实例
    const lazyVirtualList = new LazyLoadVirtualList({
        container: document.getElementById('virtual-list-lazy'),
        scrollHeightEl: document.getElementById('scroll-height-lazy'),
        contentEl: document.getElementById('list-content-lazy'),
        itemHeight: 100, // 懒加载项目高度
        overscan: 5,
        api: mockApi,
        itemsPerPage: parseInt(document.getElementById('items-per-page').value) || 100,
        totalPages: parseInt(document.getElementById('total-pages').value) || 10,
        performanceMonitor
    });
    
    // 初始化虚拟列表
    basicVirtualList.init();
    dynamicVirtualList.init();
    lazyVirtualList.init();
    
    // 标签切换功能
    function switchTab(tabName) {
        // 更新标签按钮状态
        Object.keys(tabButtons).forEach(key => {
            tabButtons[key].classList.toggle('active', key === tabName);
        });
        
        // 更新内容区域显示
        Object.keys(tabContents).forEach(key => {
            tabContents[key].style.display = key === tabName ? 'block' : 'none';
        });
    }
    
    // 添加标签切换事件
    tabButtons.basic.addEventListener('click', () => switchTab('basic'));
    tabButtons.dynamic.addEventListener('click', () => switchTab('dynamic'));
    tabButtons.lazy.addEventListener('click', () => switchTab('lazy'));
    
    // 添加设置应用事件
    document.getElementById('apply-settings-basic').addEventListener('click', () => {
        basicVirtualList.updateConfig({
            totalItems: parseInt(document.getElementById('total-items-basic').value) || 10000,
            itemHeight: parseInt(document.getElementById('item-height-basic').value) || 50,
            overscan: parseInt(document.getElementById('overscan-basic').value) || 5
        });
    });
    
    document.getElementById('apply-settings-dynamic').addEventListener('click', () => {
        dynamicVirtualList.updateConfig({
            totalItems: parseInt(document.getElementById('total-items-dynamic').value) || 5000,
            heightVariation: parseInt(document.getElementById('dynamic-variation').value) || 100
        });
    });
    
    document.getElementById('apply-settings-lazy').addEventListener('click', () => {
        // 更新API配置
        mockApi.updateConfig({
            itemsPerPage: parseInt(document.getElementById('items-per-page').value) || 100,
            totalPages: parseInt(document.getElementById('total-pages').value) || 10,
            delay: parseInt(document.getElementById('api-delay').value) || 500
        });
        
        // 更新虚拟列表配置
        lazyVirtualList.updateConfig({
            itemsPerPage: parseInt(document.getElementById('items-per-page').value) || 100,
            totalPages: parseInt(document.getElementById('total-pages').value) || 10,
            apiDelay: parseInt(document.getElementById('api-delay').value) || 500
        });
    });
    
    // 高度变化滑块实时显示
    const dynamicVariation = document.getElementById('dynamic-variation');
    const variationValue = document.getElementById('variation-value');
    
    dynamicVariation.addEventListener('input', () => {
        variationValue.textContent = `${dynamicVariation.value}%`;
    });
});