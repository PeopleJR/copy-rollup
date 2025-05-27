// 定义缓存名称
const CACHE_NAME = 'app-cache-v1';

// 需要缓存的资源列表
const urlsToCache = [
    '/',
    '/index.html',
    '/static/css/main.css',
    '/static/js/main.js'
];


// Service Worker 安装事件
self.addEventListener('install', event => {
    console.log('Service Worker 正在安装');
    // 注册后台下载

    // 等待缓存完成
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            }).then(() => self.skipWaiting())
            .catch(error => {
                console.error('缓存安装失败:', error);
            })
    );
});

// Service Worker 激活事件
self.addEventListener('activate', event => {
    console.log('Service Worker 已激活');
    // 声明客户端控制权
    event.waitUntil(
        clients.claim().then(() => {
            console.log('Service Worker is now controlling clients');
        })
    );
    // 合并清理缓存和启用 Navigation Preload 的操作
    event.waitUntil(
        Promise.all([
            // 启用 Navigation Preload
            (async () => {
                try {
                    if (self.registration.navigationPreload) {
                        await self.registration.navigationPreload.enable();
                        console.log('Navigation Preload 已启用');
                    }
                } catch (error) {
                    console.error('启用 Navigation Preload 失败:', error);
                }
            })(),

            // 清理旧缓存
            (async () => {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => {
                            if (cacheName !== CACHE_NAME) {
                                console.log('删除旧缓存:', cacheName);
                                return caches.delete(cacheName);
                            }
                        })
                    );
                    console.log('旧缓存清理完成');
                } catch (error) {
                    console.error('清理缓存失败:', error);
                }
            })()
        ])
    );
});
// 监听后台下载事件
self.addEventListener('backgroundfetchsuccess', event => {
    const bgFetch = event.registration;
    console.log('后台下载完成:', bgFetch.id);

    event.waitUntil(async function () {
        // 获取下载的文件
        const records = await bgFetch.matchAll();

        // 打开缓存
        const cache = await caches.open(CACHE_NAME);

        // 将下载的文件存入缓存
        const promises = records.map(async record => {
            const response = await record.responseReady;
            const url = new URL(record.request.url).pathname;
            await cache.put(url, response);
        });

        await Promise.all(promises);

        // 通知客户端下载完成
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'DOWNLOAD_COMPLETE',
                id: bgFetch.id
            });
        });
    }());
});

// 监听下载进度
self.addEventListener('backgroundfetchprogress', event => {
    const bgFetch = event.registration;
    const progress = Math.round(bgFetch.downloaded / bgFetch.downloadTotal * 100);

    // 通知客户端下载进度
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'DOWNLOAD_PROGRESS',
                id: bgFetch.id,
                progress: progress
            });
        });
    });
});
//检查缓存是否过期
const isCacheValid = (response) => {
    const cacheDate = response.headers.get('date');
    if (!cacheDate) return false; // 如果没有日期信息，视为无效

    const now = new Date().getTime();
    const cacheTime = new Date(cacheDate).getTime();
    return now - cacheTime < MAX_AGE;
};
// 拦截网络请求
self.addEventListener('fetch', event => {
    //文档间的跳转


    event.respondWith(
        (async () => {
            // 处理导航请求和 Navigation Preload
            if (event.preloadResponse && event.request.mode === 'navigate') {
                try {
                    const preloadResponse = await event.preloadResponse;
                    const responseToCache = preloadResponse.clone();

                    // 缓存预加载的响应
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseToCache);

                    return preloadResponse;
                } catch (error) {
                    console.error('Navigation Preload failed:', error);
                    // 如果预加载失败，回退到普通请求
                    return fetch(event.request);
                }
            }

            // 处理非导航请求
            try {
                const cachedResponse = await caches.match(event.request);

                // 如果缓存有效，返回缓存的响应
                if (cachedResponse && isCacheValid(cachedResponse)) {
                    return cachedResponse;
                }

                // 如果缓存无效或不存在，发起网络请求
                const networkResponse = await fetch(event.request);

                // 检查响应是否有效
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    // 缓存新的响应
                    const responseToCache = networkResponse.clone();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseToCache);
                }

                return networkResponse;
            } catch (error) {
                console.error('Fetch failed:', error);
                // 如果网络请求失败，返回缓存的响应（如果有）
                const cachedResponse = await caches.match(event.request);
                return cachedResponse || new Response('Network error', { status: 500 });
            }
        })()
    )

});
// 监听来自客户端的消息
self.addEventListener('message', event => {
    console.log('从客户端接收到消息:', event.data);

    // 根据消息类型处理不同的逻辑
    switch (event.data.type) {
        case 'SKIP_WAITING':
            // 立即激活新的 Service Worker
            self.skipWaiting();
            break;
        case 'CLEAR_CACHE':
            // 清除所有缓存
            event.waitUntil(
                caches.keys().then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                })
            );
            break;
        default:
            // 将消息发送回客户端
            event.source.postMessage({
                type: 'RESPONSE',
                message: '收到消息:' + event.data.message
            });
    }
});

// 向所有客户端广播消息
const broadcast = async (message) => {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage(message);
    });
};

