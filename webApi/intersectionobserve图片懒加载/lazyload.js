/**
 * 图片懒加载实现 - 使用Intersection Observer API
 * 
 * Intersection Observer API是一种异步检测目标元素与祖先元素或视口相交情况的方法。
 * 相比传统的scroll事件监听，它更高效，不会阻塞主线程。
 */

// 检查浏览器是否支持Intersection Observer API
const supportsIntersectionObserver = 'IntersectionObserver' in window;

/**
 * 懒加载图片处理函数
 * @param {HTMLImageElement} img - 需要懒加载的图片元素
 */
function loadImage(img) {
    const src = img.getAttribute('data-src');
    if (!src) return;
    
    // 获取图片容器和加载指示器
    const wrapper = img.closest('.image-wrapper');
    const loadingIndicator = wrapper ? wrapper.querySelector('.loading-indicator') : null;
    
    // 显示加载指示器
    if (loadingIndicator) {
        loadingIndicator.classList.add('active');
    }
    
    // 创建新图片对象预加载
    const newImg = new Image();
    
    // 图片加载成功处理
    newImg.onload = function() {
        img.src = src;
        img.classList.add('loaded');
        
        // 隐藏加载指示器
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
        
        console.log(`图片已加载: ${src}`);
    };
    
    // 图片加载失败处理
    newImg.onerror = function() {
        // 设置为错误占位图
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f8d7da"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24px" fill="%23721c24"%3E加载失败%3C/text%3E%3C/svg%3E';
        img.classList.add('error');
        
        // 隐藏加载指示器
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
        
        console.error(`图片加载失败: ${src}`);
    };
    
    // 开始加载图片
    newImg.src = src;
    
    // 移除data-src属性，防止重复加载
    img.removeAttribute('data-src');
}

/**
 * 使用Intersection Observer API实现懒加载
 */
function setupIntersectionObserver() {
    // 创建观察者实例
    const observer = new IntersectionObserver((entries, observer) => {
        // 遍历每个被观察的元素
        entries.forEach(entry => {
            // 当元素进入视口
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // 加载图片
                loadImage(img);
                
                // 图片加载后，停止观察该元素
                observer.unobserve(img);
            }
        });
    }, {
        // 配置选项
        root: null, // 使用视口作为根元素
        rootMargin: '0px 0px 200px 0px', // 底部增加200px的提前加载区域
        threshold: 0.1 // 当目标元素10%的部分可见时触发回调
    });
    
    // 获取所有懒加载图片并观察它们
    const lazyImages = document.querySelectorAll('.lazy-image[data-src]');
    lazyImages.forEach(img => {
        observer.observe(img);
    });
    
    console.log(`已设置观察 ${lazyImages.length} 张图片`);
    
    return observer;
}

/**
 * 使用滚动事件实现懒加载（降级方案）
 */
function setupScrollListener() {
    // 获取所有懒加载图片
    const lazyImages = document.querySelectorAll('.lazy-image[data-src]');
    
    // 节流函数，限制滚动事件的触发频率
    function throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall >= delay) {
                lastCall = now;
                callback.apply(this, args);
            }
        };
    }
    
    // 检查图片是否在视口中
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 200 &&
            rect.left <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // 滚动事件处理函数
    const lazyLoad = throttle(() => {
        let loadedCount = 0;
        
        lazyImages.forEach(img => {
            if (img.hasAttribute('data-src') && isInViewport(img)) {
                loadImage(img);
                loadedCount++;
            }
        });
        
        // 如果所有图片都已加载，移除滚动事件监听
        if (loadedCount === lazyImages.length) {
            window.removeEventListener('scroll', lazyLoad);
            console.log('所有图片已加载，移除滚动监听');
        }
    }, 200); // 200ms的节流时间
    
    // 添加滚动事件监听
    window.addEventListener('scroll', lazyLoad);
    
    // 初始触发一次，加载初始视口中的图片
    lazyLoad();
    
    console.log(`已设置滚动监听 ${lazyImages.length} 张图片`);
}

/**
 * 初始化懒加载
 */
function initLazyLoading() {
    console.log('初始化图片懒加载...');
    
    // 检查浏览器支持并选择相应的实现方式
    if (supportsIntersectionObserver) {
        console.log('使用Intersection Observer API实现懒加载');
        setupIntersectionObserver();
    } else {
        console.log('使用滚动事件实现懒加载（降级方案）');
        setupScrollListener();
    }
    
    // 添加调试信息
    console.log('图片懒加载初始化完成');
}

// 页面加载完成后初始化懒加载
document.addEventListener('DOMContentLoaded', initLazyLoading);

// 导出函数，方便外部调用
window.lazyLoadImages = {
    init: initLazyLoading,
    loadImage: loadImage
}; 