/**
 * ScrollTimeline 和 ViewTimeline API 演示
 * 
 * 本脚本实现了：
 * 1. 检测ScrollTimeline API支持情况
 * 2. 提供不支持ScrollTimeline的浏览器的后备方案
 * 3. 实现回到顶部功能
 * 4. 创建高级动画效果
 */

// 检测浏览器对ScrollTimeline API的支持情况
const supportsScrollTimeline = CSS.supports('animation-timeline: scroll()');
const supportsViewTimeline = CSS.supports('animation-timeline: view()');

// DOM元素
const progressBar = document.querySelector('.progress-bar');
const scrollToTopBtn = document.getElementById('scrollToTop');
const galleryItems = document.querySelectorAll('.gallery-item');
const scrollIndicator = document.querySelector('.scroll-indicator');

// 更新API支持指示器
const updateSupportIndicators = () => {
    // ScrollTimeline支持指示器
    const scrollTimelineIndicator = document.getElementById('scroll-timeline-support');
    const scrollTimelineLight = scrollTimelineIndicator.querySelector('.indicator');
    
    if (supportsScrollTimeline) {
        scrollTimelineLight.classList.add('supported');
    }
    
    // ViewTimeline支持指示器
    const viewTimelineIndicator = document.getElementById('view-timeline-support');
    const viewTimelineLight = viewTimelineIndicator.querySelector('.indicator');
    
    if (supportsViewTimeline) {
        viewTimelineLight.classList.add('supported');
    }
};

// 更新ARIA属性以实现辅助功能
const updateAriaAttributes = (scrollProgress) => {
    if (scrollIndicator) {
        // 使用百分比表示滚动进度
        const progressPercent = Math.round(scrollProgress * 100);
        scrollIndicator.setAttribute('aria-valuenow', progressPercent);
    }
};

// 在不支持ScrollTimeline API的浏览器中实现后备滚动动画
if (!supportsScrollTimeline) {
    console.log('浏览器不支持ScrollTimeline API，使用后备方案');
    
    // 滚动进度条后备方案
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min(scrollTop / scrollHeight, 1);
        
        progressBar.style.transform = `scaleX(${scrollProgress})`;
        
        // 更新辅助功能ARIA属性
        updateAriaAttributes(scrollProgress);
        
        // 回到顶部按钮显示逻辑
        if (scrollProgress > 0.2) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.transform = 'translateY(0)';
        } else {
            scrollToTopBtn.style.opacity = '0';
            scrollToTopBtn.style.transform = 'translateY(10px)';
        }
    });
}
// 在支持ScrollTimeline的浏览器中也要更新ARIA属性
else {
    // 使用requestAnimationFrame监控滚动位置以更新ARIA属性
    function updateScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min(scrollTop / scrollHeight, 1);
        
        updateAriaAttributes(scrollProgress);
        
        requestAnimationFrame(updateScroll);
    }
    
    requestAnimationFrame(updateScroll);
}

// 在不支持ViewTimeline API的浏览器中实现后备视图动画
if (!supportsViewTimeline) {
    console.log('浏览器不支持ViewTimeline API，使用后备方案');
    
    // 使用IntersectionObserver实现元素进入视口时的动画
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    };
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const img = entry.target.querySelector('img');
            const ratio = Math.min(Math.max(entry.intersectionRatio, 0), 1);
            
            // 计算缩放和滤镜值
            if (entry.isIntersecting) {
                // 计算基于交叉比例的动画值
                const scaleValue = 1.1 - (ratio * 0.1);
                const grayscaleValue = 1 - ratio;
                const brightnessValue = 0.8 + (ratio * 0.2);
                
                img.style.transform = `scale(${scaleValue})`;
                img.style.filter = `grayscale(${grayscaleValue}) brightness(${brightnessValue})`;
            }
        });
    }, observerOptions);
    
    const captionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const caption = entry.target;
            const heading = caption.querySelector('h2');
            const paragraph = caption.querySelector('p');
            
            if (entry.isIntersecting) {
                const ratio = Math.min(Math.max(entry.intersectionRatio * 2, 0), 1);
                
                // 标题的动画
                heading.style.opacity = ratio;
                heading.style.transform = `translateY(${30 - ratio * 30}px)`;
                
                // 段落的动画，稍微延迟
                const pRatio = Math.max(ratio - 0.2, 0) * 1.25;
                paragraph.style.opacity = pRatio;
                paragraph.style.transform = `translateY(${30 - pRatio * 30}px)`;
            }
        });
    }, observerOptions);
    
    // 观察每个画廊项的图片容器和说明
    galleryItems.forEach(item => {
        const imageContainer = item.querySelector('.image-container');
        const caption = item.querySelector('.caption');
        
        if (imageContainer) imageObserver.observe(imageContainer);
        if (caption) captionObserver.observe(caption);
    });
}

// 回到顶部按钮功能
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// 使用JavaScript应用ScrollTimeline特效（即使CSS已支持，也可以通过JS增强）
if (supportsScrollTimeline && 'ScrollTimeline' in window) {
    // 创建主滚动时间线
    const scrollTimeline = new ScrollTimeline({
        source: document.documentElement,
        axis: 'block'
    });
    
    // 使用JavaScript API实现一些额外的效果
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
        // 为每一个项目创建一些交错的动画效果
        const delay = index * 0.1; // 每个项目的延迟值不同
        
        // 为每个项目创建视图时间线
        const viewTimeline = new ViewTimeline({
            subject: item,
            axis: 'block'
        });
        
        // 为项目添加3D旋转效果
        // 偶数项向左旋转，奇数项向右旋转
        const rotateDirection = index % 2 === 0 ? -1 : 1;
        
        item.animate(
            {
                transform: [
                    `perspective(1000px) rotateY(${rotateDirection * 5}deg)`,
                    `perspective(1000px) rotateY(0deg)`,
                    `perspective(1000px) rotateY(${-rotateDirection * 5}deg)`
                ]
            },
            {
                timeline: viewTimeline,
                rangeStart: 'entry 0%',
                rangeEnd: 'exit 100%',
                easing: 'ease-in-out',
                fill: 'both'
            }
        );
        
        // 给说明区域添加阴影效果变化
        const caption = item.querySelector('.caption');
        if (caption) {
            caption.animate(
                {
                    boxShadow: [
                        '0 5px 15px rgba(0, 0, 0, 0)',
                        '0 10px 25px rgba(0, 0, 0, 0.1)',
                        '0 5px 15px rgba(0, 0, 0, 0)'
                    ]
                },
                {
                    timeline: viewTimeline,
                    rangeStart: 'entry 10%',
                    rangeEnd: 'exit 90%',
                    easing: 'ease-in-out',
                    fill: 'both'
                }
            );
        }
    });
    
    // 为API说明区域添加动画
    const explanationItems = document.querySelectorAll('.explanation-item');
    explanationItems.forEach((item, index) => {
        const viewTimeline = new ViewTimeline({
            subject: item,
            axis: 'block'
        });
        
        item.animate(
            {
                opacity: [0, 1],
                transform: ['translateY(30px)', 'translateY(0)']
            },
            {
                timeline: viewTimeline,
                rangeStart: 'entry 0%',
                rangeEnd: 'entry 50%',
                easing: 'ease-out',
                fill: 'both'
            }
        );
    });
}

// 页面加载事件
window.addEventListener('load', () => {
    // 添加延迟加载的类，用于触发一些仅在页面完全加载后的动画
    document.body.classList.add('page-loaded');
    
    // 更新API支持指示器
    updateSupportIndicators();
    
    // 初始化其他页面元素
    console.log('页面加载完成，ScrollTimeline支持状态:', supportsScrollTimeline);
    console.log('ViewTimeline支持状态:', supportsViewTimeline);
});

// 检测首选项减少运动
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
    console.log('检测到用户偏好减少动画，禁用或简化动画效果');
} 