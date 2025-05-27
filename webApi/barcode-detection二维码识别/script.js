/**
 * 条形码检测实现 - 使用浏览器原生Barcode Detection API
 * 
 * 此脚本实现了两种条形码检测方式：
 * 1. 使用摄像头实时检测条形码
 * 2. 从上传的图片中检测条形码
 * 
 * 支持多种条形码格式，如QR码、Code 128、EAN等
 */

// DOM元素引用
const elements = {
    // API状态相关
    apiSupportStatus: document.getElementById('api-support-status'),
    supportedFormatsList: document.getElementById('supported-formats-list'),
    
    // 标签页相关
    tabCamera: document.getElementById('tab-camera'),
    tabUpload: document.getElementById('tab-upload'),
    cameraSection: document.getElementById('camera-section'),
    uploadSection: document.getElementById('upload-section'),
    
    // 摄像头相关
    video: document.getElementById('video'),
    cameraCanvas: document.getElementById('camera-canvas'),
    startCameraButton: document.getElementById('start-camera'),
    stopCameraButton: document.getElementById('stop-camera'),
    cameraSelect: document.getElementById('camera-select'),
    
    // 图片上传相关
    fileInput: document.getElementById('file-input'),
    uploadArea: document.getElementById('upload-area'),
    previewImage: document.getElementById('preview-image'),
    uploadCanvas: document.getElementById('upload-canvas'),
    detectButton: document.getElementById('detect-button'),
    
    // 结果相关
    resultsDisplay: document.getElementById('results-display'),
    copyResultsButton: document.getElementById('copy-results'),
    clearResultsButton: document.getElementById('clear-results')
};

// 全局变量
let barcodeDetector = null;
let supportedFormats = [];
let videoStream = null;
let isDetectingFromCamera = false;
let cameraDetectionInterval = null;

/**
 * 初始化应用
 */
async function initApp() {
    // 检查API支持
    await checkApiSupport();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置拖放功能
    setupDragAndDrop();
}

/**
 * 检查浏览器是否支持Barcode Detection API
 */
async function checkApiSupport() {
    if ('BarcodeDetector' in window) {
        try {
            // 获取支持的条形码格式 返回一个数组
            supportedFormats = await BarcodeDetector.getSupportedFormats();
            
            // 创建条形码检测器实例
            barcodeDetector = new BarcodeDetector({
                formats: supportedFormats
            });
            
            // 更新UI显示支持状态
            elements.apiSupportStatus.innerHTML = `
                <p class="status-success">✅ 此浏览器支持Barcode Detection API</p>
            `;
            
            // 显示支持的条形码格式
            displaySupportedFormats(supportedFormats);
            
            return true;
        } catch (error) {
            console.error('初始化Barcode Detection API失败:', error);
            showApiError('API初始化失败: ' + error.message);
            return false;
        }
    } else {
        showApiError('此浏览器不支持Barcode Detection API');
        return false;
    }
}

/**
 * 显示API错误信息
 * @param {string} message - 错误信息
 */
function showApiError(message) {
    elements.apiSupportStatus.innerHTML = `
        <p class="status-error">❌ ${message}</p>
        <p>请尝试使用最新版本的Chrome、Edge或Opera浏览器。</p>
    `;
}

/**
 * 显示支持的条形码格式
 * @param {Array<string>} formats - 支持的条形码格式数组
 */
function displaySupportedFormats(formats) {
    if (formats && formats.length > 0) {
        const formatsList = formats.map(format => {
            // 格式化显示名称
            const displayName = formatDisplayName(format);
            return `<li>${displayName}</li>`;
        }).join('');
        
        elements.supportedFormatsList.innerHTML = formatsList;
    } else {
        elements.supportedFormatsList.innerHTML = '<li>未找到支持的格式</li>';
    }
}

/**
 * 获取条形码格式的显示名称
 * @param {string} format - 条形码格式
 * @returns {string} 格式化的显示名称
 */
function formatDisplayName(format) {
    // 格式化显示名称的映射
    const formatNames = {
        'aztec': 'Aztec码',
        'code_128': 'Code 128',
        'code_39': 'Code 39',
        'code_93': 'Code 93',
        'codabar': 'Codabar',
        'data_matrix': 'Data Matrix',
        'ean_13': 'EAN-13',
        'ean_8': 'EAN-8',
        'itf': 'ITF',
        'pdf417': 'PDF417',
        'qr_code': 'QR码',
        'upc_a': 'UPC-A',
        'upc_e': 'UPC-E'
    };
    
    return formatNames[format] || format;
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 标签页切换
    elements.tabCamera.addEventListener('click', () => switchTab('camera'));
    elements.tabUpload.addEventListener('click', () => switchTab('upload'));
    
    // 摄像头控制
    elements.startCameraButton.addEventListener('click', startCamera);
    elements.stopCameraButton.addEventListener('click', stopCamera);
    elements.cameraSelect.addEventListener('change', switchCamera);
    
    // 图片上传
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.detectButton.addEventListener('click', detectFromImage);
    
    // 结果操作
    elements.copyResultsButton.addEventListener('click', copyResults);
    elements.clearResultsButton.addEventListener('click', clearResults);
}

/**
 * 设置拖放功能
 */
function setupDragAndDrop() {
    const uploadArea = elements.uploadArea;
    
    // 阻止默认拖放行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 添加高亮效果
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('highlight');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('highlight');
        }, false);
    });
    
    // 处理拖放文件
    uploadArea.addEventListener('drop', event => {
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            elements.fileInput.files = files;
            handleFileSelect({ target: elements.fileInput });
        }
    }, false);
}

/**
 * 切换标签页
 * @param {string} tabName - 标签页名称 ('camera' 或 'upload')
 */
function switchTab(tabName) {
    // 如果正在使用摄像头检测，并且切换到上传标签，停止摄像头
    if (isDetectingFromCamera && tabName === 'upload') {
        stopCamera();
    }
    
    // 更新标签按钮状态
    elements.tabCamera.classList.toggle('active', tabName === 'camera');
    elements.tabUpload.classList.toggle('active', tabName === 'upload');
    
    // 更新内容区域显示
    elements.cameraSection.classList.toggle('active', tabName === 'camera');
    elements.uploadSection.classList.toggle('active', tabName === 'upload');
}

/**
 * 枚举可用的摄像头设备
 */
async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // 清空现有选项
        elements.cameraSelect.innerHTML = '';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '选择摄像头...';
        elements.cameraSelect.appendChild(defaultOption);
        
        // 添加摄像头选项
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `摄像头 ${index + 1}`;
            elements.cameraSelect.appendChild(option);
        });
        
        // 如果有摄像头，启用选择框
        elements.cameraSelect.disabled = videoDevices.length === 0;
        
        // 如果只有一个摄像头，直接选中它
        if (videoDevices.length === 1) {
            elements.cameraSelect.value = videoDevices[0].deviceId;
        }
        
        return videoDevices.length > 0;
    } catch (error) {
        console.error('枚举摄像头失败:', error);
        return false;
    }
}

/**
 * 启动摄像头
 */
async function startCamera() {
    // 如果没有摄像头选项，先枚举摄像头
    if (elements.cameraSelect.options.length <= 1) {
        const hasCameras = await enumerateCameras();
        if (!hasCameras) {
            showResults([{ error: '未找到可用的摄像头设备' }]);
            return;
        }
    }
    
    // 获取选中的摄像头ID
    const deviceId = elements.cameraSelect.value;
    
    // 如果没有选择摄像头，提示用户
    if (!deviceId) {
        alert('请选择一个摄像头');
        return;
    }
    
    try {
        // 停止现有的视频流
        if (videoStream) {
            stopCamera();
        }
        
        // 获取媒体流
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 设置视频源
        elements.video.srcObject = videoStream;
        
        // 等待视频加载
        await new Promise(resolve => {
            elements.video.onloadedmetadata = resolve;
        });
        
        // 调整canvas大小以匹配视频
        const videoWidth = elements.video.videoWidth;
        const videoHeight = elements.video.videoHeight;
        
        elements.cameraCanvas.width = videoWidth;
        elements.cameraCanvas.height = videoHeight;
        
        // 更新UI状态
        elements.startCameraButton.disabled = true;
        elements.stopCameraButton.disabled = false;
        elements.cameraSelect.disabled = true;
        
        // 开始检测
        isDetectingFromCamera = true;
        startCameraDetection();
        
    } catch (error) {
        console.error('启动摄像头失败:', error);
        showResults([{ error: '启动摄像头失败: ' + error.message }]);
    }
}

/**
 * 停止摄像头
 */
function stopCamera() {
    // 停止检测
    isDetectingFromCamera = false;
    if (cameraDetectionInterval) {
        clearInterval(cameraDetectionInterval);
        cameraDetectionInterval = null;
    }
    
    // 停止视频流
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // 清除视频源
    elements.video.srcObject = null;
    
    // 清除canvas
    const ctx = elements.cameraCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.cameraCanvas.width, elements.cameraCanvas.height);
    
    // 更新UI状态
    elements.startCameraButton.disabled = false;
    elements.stopCameraButton.disabled = true;
    elements.cameraSelect.disabled = false;
}

/**
 * 切换摄像头
 */
function switchCamera() {
    if (videoStream) {
        stopCamera();
    }
    
    if (elements.cameraSelect.value) {
        startCamera();
    }
}

/**
 * 开始从摄像头检测条形码
 */
function startCameraDetection() {
    // 确保API和视频都可用
    if (!barcodeDetector || !videoStream) {
        return;
    }
    
    // 设置定时检测
    cameraDetectionInterval = setInterval(async () => {
        if (!isDetectingFromCamera) {
            return;
        }
        
        try {
            // 从视频帧中检测条形码
            const barcodes = await barcodeDetector.detect(elements.video);
            
            // 在canvas上绘制检测结果
            drawDetectionResults(elements.cameraCanvas, barcodes);
            
            // 如果检测到条形码，显示结果
            if (barcodes.length > 0) {
                showResults(barcodes);
                
                // 可选：检测到条形码后暂停一段时间，避免重复检测
                clearInterval(cameraDetectionInterval);
                setTimeout(() => {
                    if (isDetectingFromCamera) {
                        startCameraDetection();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('从摄像头检测条形码失败:', error);
        }
    }, 200); // 每200ms检测一次
}

/**
 * 处理文件选择事件
 * @param {Event} event - 文件选择事件
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    // 读取文件并显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        elements.previewImage.src = e.target.result;
        elements.previewImage.onload = function() {
            // 调整canvas大小以匹配图片
            elements.uploadCanvas.width = this.width;
            elements.uploadCanvas.height = this.height;
            
            // 清除canvas上的旧内容
            const ctx = elements.uploadCanvas.getContext('2d');
            ctx.clearRect(0, 0, elements.uploadCanvas.width, elements.uploadCanvas.height);
            
            // 启用检测按钮
            elements.detectButton.disabled = false;
        };
    };
    reader.readAsDataURL(file);
}

/**
 * 从上传的图片中检测条形码
 */
async function detectFromImage() {
    // 确保API和图片都可用
    if (!barcodeDetector || !elements.previewImage.src) {
        return;
    }
    
    try {
        // 从图片中检测条形码
        const barcodes = await barcodeDetector.detect(elements.previewImage);
        
        // 在canvas上绘制检测结果
        drawDetectionResults(elements.uploadCanvas, barcodes);
        
        // 显示检测结果
        showResults(barcodes);
    } catch (error) {
        console.error('从图片检测条形码失败:', error);
        showResults([{ error: '检测失败: ' + error.message }]);
    }
}

/**
 * 在canvas上绘制检测结果
 * @param {HTMLCanvasElement} canvas - 目标canvas元素
 * @param {Array<Object>} barcodes - 检测到的条形码数组
 */
function drawDetectionResults(canvas, barcodes) {
    const ctx = canvas.getContext('2d');
    
    // 清除canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果没有检测到条形码，直接返回
    if (!barcodes || barcodes.length === 0) {
        return;
    }
    
    // 绘制每个条形码的边界框和角点
    barcodes.forEach((barcode, index) => {
        // 设置不同的颜色
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
        const color = colors[index % colors.length];
        
        // 绘制边界框
        const box = barcode.boundingBox;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // 绘制角点
        ctx.fillStyle = color;
        barcode.cornerPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // 绘制条形码格式和内容
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        const text = `${formatDisplayName(barcode.format)}: ${barcode.rawValue}`;
        const textX = box.x;
        const textY = box.y > 20 ? box.y - 10 : box.y + box.height + 20;
        
        ctx.strokeText(text, textX, textY);
        ctx.fillText(text, textX, textY);
    });
}

/**
 * 显示检测结果
 * @param {Array<Object>} barcodes - 检测到的条形码数组
 */
function showResults(barcodes) {
    // 清除现有结果
    elements.resultsDisplay.innerHTML = '';
    
    // 如果没有检测到条形码
    if (!barcodes || barcodes.length === 0) {
        elements.resultsDisplay.innerHTML = '<p class="no-results">未检测到条形码</p>';
        elements.copyResultsButton.disabled = true;
        elements.clearResultsButton.disabled = true;
        return;
    }
    
    // 如果有错误
    if (barcodes[0].error) {
        elements.resultsDisplay.innerHTML = `<p class="error-message">${barcodes[0].error}</p>`;
        elements.copyResultsButton.disabled = true;
        elements.clearResultsButton.disabled = false;
        return;
    }
    
    // 创建结果HTML
    let resultsHTML = '<div class="results-list">';
    
    barcodes.forEach((barcode, index) => {
        resultsHTML += `
            <div class="result-item">
                <h3>条形码 #${index + 1}</h3>
                <div class="result-details">
                    <p><strong>格式:</strong> ${formatDisplayName(barcode.format)}</p>
                    <p><strong>内容:</strong> <span class="result-value">${barcode.rawValue}</span></p>
                    <p><strong>位置:</strong> x=${Math.round(barcode.boundingBox.x)}, y=${Math.round(barcode.boundingBox.y)}, 
                       宽=${Math.round(barcode.boundingBox.width)}, 高=${Math.round(barcode.boundingBox.height)}</p>
                </div>
            </div>
        `;
    });
    
    resultsHTML += '</div>';
    
    // 显示结果
    elements.resultsDisplay.innerHTML = resultsHTML;
    
    // 启用操作按钮
    elements.copyResultsButton.disabled = false;
    elements.clearResultsButton.disabled = false;
}

/**
 * 复制检测结果到剪贴板
 */
function copyResults() {
    // 获取所有结果值
    const resultValues = Array.from(document.querySelectorAll('.result-value'))
        .map(el => el.textContent)
        .join('\n');
    
    // 如果没有结果，直接返回
    if (!resultValues) {
        return;
    }
    
    // 复制到剪贴板
    navigator.clipboard.writeText(resultValues)
        .then(() => {
            // 显示复制成功提示
            const originalText = elements.copyResultsButton.textContent;
            elements.copyResultsButton.textContent = '已复制!';
            setTimeout(() => {
                elements.copyResultsButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('复制到剪贴板失败:', err);
            alert('复制失败，请手动复制');
        });
}

/**
 * 清除检测结果
 */
function clearResults() {
    // 清除结果显示
    elements.resultsDisplay.innerHTML = '<p class="no-results">尚未检测到条形码</p>';
    
    // 禁用操作按钮
    elements.copyResultsButton.disabled = true;
    elements.clearResultsButton.disabled = true;
    
    // 清除canvas
    const cameraCtx = elements.cameraCanvas.getContext('2d');
    cameraCtx.clearRect(0, 0, elements.cameraCanvas.width, elements.cameraCanvas.height);
    
    const uploadCtx = elements.uploadCanvas.getContext('2d');
    uploadCtx.clearRect(0, 0, elements.uploadCanvas.width, elements.uploadCanvas.height);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 