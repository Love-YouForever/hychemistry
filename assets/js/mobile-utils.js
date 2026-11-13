/**
 * 移动端工具函数库
 * 提供统一的移动端适配功能
 * 
 * 功能特性：
 * 1. 设备类型检测
 * 2. 屏幕方向检测与横屏提示
 * 3. 触摸事件优化
 * 4. 安全区域适配
 * 
 * 使用方式：
 * 在HTML文件中引入此JS文件
 * <script src="js/mobile-utils.js"></script>
 * 
 * 初始化横屏检测：
 * MobileUtils.initLandscapeDetection('landscapeOverlay');
 */

const MobileUtils = (function() {
    /**
     * 检测是否为移动设备
     * @returns {boolean}
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * 检测是否为触摸设备
     * @returns {boolean}
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * 检测当前是否为横屏状态
     * @returns {boolean}
     */
    function isLandscape() {
        return window.matchMedia("(orientation: landscape)").matches;
    }

    /**
     * 检测当前是否为竖屏状态
     * @returns {boolean}
     */
    function isPortrait() {
        return window.matchMedia("(orientation: portrait)").matches;
    }

    /**
     * 获取设备屏幕方向
     * @returns {'portrait' | 'landscape'}
     */
    function getOrientation() {
        return isLandscape() ? 'landscape' : 'portrait';
    }

    /**
     * 获取视口宽度
     * @returns {number}
     */
    function getViewportWidth() {
        return window.innerWidth || document.documentElement.clientWidth;
    }

    /**
     * 获取视口高度
     * @returns {number}
     */
    function getViewportHeight() {
        return window.innerHeight || document.documentElement.clientHeight;
    }

    /**
     * 获取设备像素比
     * @returns {number}
     */
    function getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * 获取安全区域尺寸
     * @returns {Object} 包含top, right, bottom, left的对象
     */
    function getSafeAreaInsets() {
        const insets = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };

        if (typeof window !== 'undefined' && window.CSS && window.CSS.supports && window.CSS.supports('padding: env(safe-area-inset-top)')) {
            // 尝试获取安全区域值
            const root = document.documentElement;
            const getInset = (prop) => {
                const value = getComputedStyle(root).getPropertyValue(prop);
                return value ? parseFloat(value) : 0;
            };

            insets.top = getInset('--safe-area-inset-top') || 0;
            insets.right = getInset('--safe-area-inset-right') || 0;
            insets.bottom = getInset('--safe-area-inset-bottom') || 0;
            insets.left = getInset('--safe-area-inset-left') || 0;
        }

        return insets;
    }

    /**
     * 初始化横屏检测功能
     * @param {string} overlayId - 横屏遮罩元素的ID
     * @param {Object} options - 配置选项
     * @param {boolean} options.forceLandscape - 是否强制横屏（默认true）
     * @param {string} options.title - 提示标题
     * @param {string} options.message - 提示消息
     * @param {string} options.hint - 提示文字
     */
    function initLandscapeDetection(overlayId, options = {}) {
        const defaults = {
            forceLandscape: true,
            title: '请切换横屏模式',
            message: '为了获得最佳体验，请将设备旋转至横屏状态',
            hint: '⬅️ 旋转设备 ➡️'
        };

        const config = { ...defaults, ...options };
        const landscapeOverlay = document.getElementById(overlayId);

        // 如果没有遮罩元素，创建一个
        if (!landscapeOverlay) {
            createLandscapeOverlay(overlayId, config);
            return;
        }

        /**
         * 检查屏幕方向并显示/隐藏遮罩
         */
        function checkOrientation() {
            // 仅在移动设备上显示横屏提示
            if (!isMobileDevice()) {
                landscapeOverlay.classList.remove('show');
                return;
            }

            // 如果不需要强制横屏，直接返回
            if (!config.forceLandscape) {
                landscapeOverlay.classList.remove('show');
                return;
            }

            // 判断当前是否为竖屏状态
            const isPortraitMode = isPortrait();

            if (isPortraitMode) {
                landscapeOverlay.classList.add('show');
            } else {
                landscapeOverlay.classList.remove('show');
            }
        }

        /**
         * 更新遮罩内容
         */
        function updateOverlayContent() {
            const titleElement = landscapeOverlay.querySelector('.landscape-title');
            const messageElement = landscapeOverlay.querySelector('.landscape-message');
            const hintElement = landscapeOverlay.querySelector('.landscape-hint');

            if (titleElement) titleElement.textContent = config.title;
            if (messageElement) messageElement.textContent = config.message;
            if (hintElement) hintElement.textContent = config.hint;
        }

        // 更新内容
        updateOverlayContent();

        // 初始化检测
        checkOrientation();

        // 监听屏幕方向变化
        window.addEventListener('orientationchange', checkOrientation);

        // 监听窗口大小变化（处理resize情况）
        window.addEventListener('resize', checkOrientation);

        // 页面离开时的回退机制
        window.addEventListener('beforeunload', function() {
            if (landscapeOverlay) {
                landscapeOverlay.classList.remove('show');
            }
        });

        // 添加触摸设备的触摸事件支持（增强移动端交互）
        if (isTouchDevice()) {
            document.addEventListener('touchstart', function() {}, { passive: true });
        }
    }

    /**
     * 创建横屏遮罩元素
     * @param {string} overlayId - 遮罩元素ID
     * @param {Object} config - 配置选项
     */
    function createLandscapeOverlay(overlayId, config) {
        const overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'landscape-overlay';

        overlay.innerHTML = `
            <div class="landscape-icon">📱</div>
            <h2 class="landscape-title">${config.title}</h2>
            <p class="landscape-message">${config.message}</p>
            <p class="landscape-hint">${config.hint}</p>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * 优化触摸事件处理
     * @param {HTMLElement} element - 目标元素
     * @param {Function} handler - 事件处理函数
     */
    function optimizeTouchEvents(element, handler) {
        if (!element || typeof handler !== 'function') return;

        let lastTouchTime = 0;

        // 添加触摸事件支持
        element.addEventListener('touchstart', function(e) {
            // 防止双击缩放
            const currentTime = new Date().getTime();
            if (currentTime - lastTouchTime < 300) {
                e.preventDefault();
            }
            lastTouchTime = currentTime;

            handler(e);
        }, { passive: true });

        // 添加鼠标事件支持（兼容桌面端）
        element.addEventListener('click', handler);
    }

    /**
     * 设置元素的安全区域内边距
     * @param {HTMLElement} element - 目标元素
     * @param {string} position - 位置（top, right, bottom, left, all）
     */
    function setSafeAreaPadding(element, position = 'all') {
        if (!element) return;

        const insets = getSafeAreaInsets();
        const style = element.style;

        switch (position) {
            case 'top':
                style.paddingTop = `${insets.top}px`;
                break;
            case 'right':
                style.paddingRight = `${insets.right}px`;
                break;
            case 'bottom':
                style.paddingBottom = `${insets.bottom}px`;
                break;
            case 'left':
                style.paddingLeft = `${insets.left}px`;
                break;
            case 'all':
                style.paddingTop = `${insets.top}px`;
                style.paddingRight = `${insets.right}px`;
                style.paddingBottom = `${insets.bottom}px`;
                style.paddingLeft = `${insets.left}px`;
                break;
            default:
                break;
        }
    }

    /**
     * 设置元素的安全区域位置
     * @param {HTMLElement} element - 目标元素
     * @param {string} position - 位置（top, right, bottom, left）
     */
    function setSafeAreaPosition(element, position) {
        if (!element) return;

        const insets = getSafeAreaInsets();
        const style = element.style;

        switch (position) {
            case 'top':
                style.top = `${insets.top}px`;
                break;
            case 'right':
                style.right = `${insets.right}px`;
                break;
            case 'bottom':
                style.bottom = `${insets.bottom}px`;
                break;
            case 'left':
                style.left = `${insets.left}px`;
                break;
            default:
                break;
        }
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function}
     */
    function debounce(func, wait = 250) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function}
     */
    function throttle(func, limit = 250) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * 获取滚动位置
     * @returns {Object} 包含x, y的对象
     */
    function getScrollPosition() {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    }

    /**
     * 平滑滚动到指定位置
     * @param {number} x - 水平位置
     * @param {number} y - 垂直位置
     * @param {number} duration - 动画时长（毫秒）
     */
    function smoothScrollTo(x = 0, y = 0, duration = 500) {
        const startX = getScrollPosition().x;
        const startY = getScrollPosition().y;
        const distanceX = x - startX;
        const distanceY = y - startY;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 使用缓动函数
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            window.scrollTo(
                startX + distanceX * easeProgress,
                startY + distanceY * easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    /**
     * 导出公共API
     */
    return {
        // 设备检测
        isMobileDevice,
        isTouchDevice,
        
        // 屏幕方向检测
        isLandscape,
        isPortrait,
        getOrientation,
        
        // 视口信息
        getViewportWidth,
        getViewportHeight,
        getDevicePixelRatio,
        
        // 安全区域
        getSafeAreaInsets,
        setSafeAreaPadding,
        setSafeAreaPosition,
        
        // 横屏检测初始化
        initLandscapeDetection,
        
        // 触摸事件优化
        optimizeTouchEvents,
        
        // 工具函数
        debounce,
        throttle,
        smoothScrollTo,
        getScrollPosition
    };
})();

// 自动初始化（如果存在landscapeOverlay元素）
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('landscapeOverlay')) {
        MobileUtils.initLandscapeDetection('landscapeOverlay');
    }
});
