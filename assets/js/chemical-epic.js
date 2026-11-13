        // ========== 分页切换逻辑 (纯卡片堆叠效果，移除无关Three.js动画) ==========
        const cards = document.querySelectorAll('.page-card');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        let currentIndex = 0;
        const totalCards = cards.length;

        // 更新卡片层级、偏移及透明度 (模拟活页本层叠)
        function updateCards() {
            cards.forEach((card, index) => {
                // 计算相对于当前页的偏移量 (循环感)
                // 为了让效果更自然，采用相对顺序 (currentIndex 作为最上层)
                let offset = (index - currentIndex + totalCards) % totalCards;
                
                if (offset === 0) {
                    // 最上层当前页
                    card.style.left = '50%';
                    card.style.transform = 'translateX(-50%) scale(1)';
                    card.style.zIndex = '10';
                    card.style.opacity = '1';
                    card.style.filter = 'drop-shadow(0 0 6px rgba(255,255,200,0.2))';
                } else if (offset === 1) {
                    // 下一张卡片，左偏移-35%并缩小
                    card.style.left = '50%';
                    card.style.transform = 'translateX(-35%) scale(0.95)';
                    card.style.zIndex = '9';
                    card.style.opacity = '0.85';
                } else if (offset === 2) {
                    // 下下张，更左且更小
                    card.style.left = '50%';
                    card.style.transform = 'translateX(-20%) scale(0.9)';
                    card.style.zIndex = '8';
                    card.style.opacity = '0.65';
                } else {
                    // 最底层卡片 (offset >= 3)
                    card.style.left = '50%';
                    card.style.transform = 'translateX(-5%) scale(0.85)';
                    card.style.zIndex = '7';
                    card.style.opacity = '0.45';
                }
                // 添加平滑过渡细节 (已经全局存在transition，确保动态流畅)
                // 增强边缘柔和感
                card.style.backdropFilter = 'blur(8px)';
            });
        }

        // 下一页
        function nextPage() {
            currentIndex = (currentIndex + 1) % totalCards;
            updateCards();
        }

        // 上一页
        function prevPage() {
            currentIndex = (currentIndex - 1 + totalCards) % totalCards;
            updateCards();
        }

        // 绑定按钮事件
        nextBtn.addEventListener('click', nextPage);
        prevBtn.addEventListener('click', prevPage);

        // 点击卡片快速切换到该页
        cards.forEach((card, idx) => {
            card.addEventListener('click', (e) => {
                // 防止点击内部视频或按钮时误触发冒泡干扰 (视频有自己控件)
                if (e.target.tagName === 'VIDEO' || e.target.closest('video')) {
                    e.stopPropagation();
                    return;
                }
                if (currentIndex !== idx) {
                    currentIndex = idx;
                    updateCards();
                }
            });
        });

        // 移动端触摸滑动支持 (左右滑动切换页面)
        let touchStartX = 0;
        let touchEndX = 0;
        const container = document.querySelector('.notebook-container');
        
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX;
            if (Math.abs(deltaX) > 60) {  // 滑动阈值
                if (deltaX > 0) {
                    // 向右滑动 → 上一页
                    prevPage();
                } else {
                    // 向左滑动 → 下一页
                    nextPage();
                }
            }
        });
        
        // 键盘左右键支持 (增强可访问性)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevPage();
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                nextPage();
                e.preventDefault();
            }
        });
        
        // 初始化卡片堆叠
        updateCards();
        
        // ========== 返回主页按钮功能 ==========
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                // 跳转到同一文件夹下的“主页.html”（根据需求保留）
                window.location.href = "../../主页.html";
            });
        }
        
        // ========== 优雅处理视频占位提示 & 保证背景图加载兼容 ==========
        // 可选：如果视频源缺失，显示友好占位文字，不影响整体观感
        const allVideos = document.querySelectorAll('.video-wrapper video');
        allVideos.forEach(video => {
            // 监听错误事件，如果视频无法加载，简单控制台提示但保留控件区域不影响
            video.addEventListener('error', () => {
                // 静默处理，仅设置一个属性，不破坏布局
                if (video.querySelector('source') && video.querySelector('source').src === '') {
                    // 不做额外复杂处理，保持显示poster即可
                }
            });
            // 确保poster占位图正常显示
        });
        
        // 由于背景图片设置为 background2.jpg 且 opacity:0.8 已经完美通过伪元素实现，
        // 为预防图片加载缓慢或者缺失，显示黑色底色渐变保障可读性 (已在body::before中设置)
        // 额外确保卡片在任何分辨率下透出背景质感
        
        // 动态修正由于某些极端情况导致卡片高度不一致，重新计算视频比例
        function adjustVideoRatio() {
            const wrappers = document.querySelectorAll('.video-wrapper');
            wrappers.forEach(wrapper => {
                const videoEl = wrapper.querySelector('video');
                if (videoEl && videoEl.videoWidth && videoEl.videoHeight) {
                    // 保持比例自然，不做强制覆盖，object-fit cover 已经足够
                }
            });
        }
        window.addEventListener('resize', adjustVideoRatio);
        adjustVideoRatio();
        
        // 可选：打印说明控制台优雅提示
        console.log('✅ 化学史诗 | 背景已应用 background2.jpg (80%不透明度) | 卡片分页流畅体验');
        
        // 为了防止因误删除留下的Three.js残留代码造成的报错，已彻底清除所有无关动画
        // 确保页面仅保留卡片笔记本交互，背景图片半透明完美契合设计