        function goBack() {
            window.location.href = './games.html';
        }

        // 检测是否为移动设备（更可靠的检测方式）
        function isMobileDevice() {
            // 通过多种方式检测移动端
            const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth <= 1024;
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            
            // 检测常见移动设备特征
            const isMobileUA = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
            
            return (hasTouchSupport && isSmallScreen) || isMobileUA;
        }

        // 记录当前屏幕状态
        let currentOrientation = null;
        let refreshTimeout = null;
        let isFirstLoad = true;

        // 移动端横屏检测与处理
        function handleOrientationChange() {
            // 仅在移动端触发
            if (!isMobileDevice()) {
                // PC端：隐藏竖屏提示，确保游戏正常显示
                const overlay = document.getElementById('landscapeOverlay');
                if (overlay) {
                    overlay.style.display = 'none';
                }
                return;
            }

            const overlay = document.getElementById('landscapeOverlay');
            const isPortrait = window.matchMedia('(orientation: portrait)').matches;
            
            if (overlay) {
                if (isPortrait) {
                    // 竖屏：显示引导界面
                    overlay.style.display = 'flex';
                    currentOrientation = 'portrait';
                    
                    // 隐藏游戏相关元素
                    const header = document.querySelector('.header');
                    const gameContainer = document.querySelector('.game-container');
                    if (header) header.style.display = 'none';
                    if (gameContainer) gameContainer.style.display = 'none';
                } else {
                    // 横屏：隐藏引导界面，显示游戏
                    overlay.style.display = 'none';
                    
                    // 显示游戏相关元素
                    const header = document.querySelector('.header');
                    const gameContainer = document.querySelector('.game-container');
                    if (header) header.style.display = 'flex';
                    if (gameContainer) gameContainer.style.display = 'flex';
                    
                    // 首次加载或从竖屏切换到横屏时需要刷新
                    if (currentOrientation === 'portrait' || isFirstLoad) {
                        // 延迟刷新，等待设备完全旋转
                        if (refreshTimeout) {
                            clearTimeout(refreshTimeout);
                        }
                        refreshTimeout = setTimeout(function() {
                            // 检查iframe是否已存在
                            const iframe = document.querySelector('.game-wrapper iframe');
                            if (iframe) {
                                // 重新加载iframe而不是整个页面
                                iframe.src = iframe.src;
                            } else {
                                // 作为后备方案，刷新整个页面
                                location.reload();
                            }
                        }, 300); // 300ms延迟确保旋转完成
                    }
                    currentOrientation = 'landscape';
                    isFirstLoad = false;
                }
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            console.log('元素符号速配页面已加载');
            console.log('是否为移动端:', isMobileDevice());
            
            // 初始检测屏幕方向
            const isPortrait = window.matchMedia('(orientation: portrait)').matches;
            currentOrientation = isPortrait ? 'portrait' : 'landscape';
            
            // 设置初始状态
            handleOrientationChange();
            
            // 监听屏幕旋转（移动端特有事件）
            if (isMobileDevice()) {
                window.addEventListener('orientationchange', handleOrientationChange);
            }
            
            // 监听窗口大小变化（用于模拟器测试和窗口调整）
            window.addEventListener('resize', function() {
                // 防抖处理
                if (refreshTimeout) {
                    clearTimeout(refreshTimeout);
                }
                refreshTimeout = setTimeout(handleOrientationChange, 200);
            });
        });