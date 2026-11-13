        // 返回按钮点击处理函数
        function handleBackClick() {
            // 视觉反馈：改变按钮样式
            var btn = document.getElementById('backBtn');
            if (btn) {
                btn.style.background = 'rgba(100, 255, 218, 0.3)';
                btn.style.transform = 'scale(0.95)';
            }
            
            // 输出调试日志
            console.log('=== 返回按钮点击事件触发 ===');
            console.log('时间:', new Date().toISOString());
            console.log('目标URL:', '../../主页.html');
            
            // 强制导航
            try {
                window.location.href = '../../主页.html';
                console.log('导航已执行');
            } catch (e) {
                console.error('导航失败:', e.message);
                // 备用导航方式
                window.location.replace('../主页.html');
            }
        }

        // 滑动相关变量
        var currentSlide = 0;
        var totalSlides = 3;
        var scrollWrapper = null;
        var containerWidth = 0;
        var cardWidth = 0;
        var gap = 0;
        var isDragging = false;
        var startX = 0;
        var currentX = 0;
        var initialTransform = 0;

        // 初始化滑动功能
        function initScroll() {
            scrollWrapper = document.getElementById('gamesScrollWrapper');
            var container = document.querySelector('.games-container');
            var cards = document.querySelectorAll('.game-card');
            
            if (scrollWrapper && container && cards.length > 0) {
                containerWidth = container.offsetWidth;
                cardWidth = cards[0].offsetWidth;
                gap = 32; // 2rem = 32px
                
                // 创建指示器
                createIndicators();
                
                // 更新按钮状态
                updateScrollButtons();
                
                // 添加触摸/鼠标拖拽事件
                scrollWrapper.addEventListener('mousedown', startDrag);
                scrollWrapper.addEventListener('touchstart', startDrag);
                
                // 添加键盘事件
                document.addEventListener('keydown', handleKeydown);
            }
        }

        // 创建滑动指示器
        function createIndicators() {
            var indicatorsContainer = document.getElementById('scrollIndicators');
            indicatorsContainer.innerHTML = '';
            
            for (var i = 0; i < totalSlides; i++) {
                var indicator = document.createElement('span');
                indicator.className = 'indicator' + (i === currentSlide ? ' active' : '');
                indicator.onclick = function(index) {
                    return function() {
                        scrollToSlide(index);
                    };
                }(i);
                indicatorsContainer.appendChild(indicator);
            }
        }

        // 更新指示器状态
        function updateIndicators() {
            var indicators = document.querySelectorAll('.indicator');
            indicators.forEach(function(indicator, index) {
                indicator.classList.toggle('active', index === currentSlide);
            });
        }

        // 更新滑动按钮状态
        function updateScrollButtons() {
            var leftBtn = document.getElementById('scrollLeftBtn');
            var rightBtn = document.getElementById('scrollRightBtn');
            
            if (leftBtn) {
                leftBtn.classList.toggle('hidden', currentSlide === 0);
            }
            if (rightBtn) {
                rightBtn.classList.toggle('hidden', currentSlide >= totalSlides - 1);
            }
        }

        // 滑动到上一张
        function scrollToPrev() {
            if (currentSlide > 0) {
                scrollToSlide(currentSlide - 1);
            }
        }

        // 滑动到下一张
        function scrollToNext() {
            if (currentSlide < totalSlides - 1) {
                scrollToSlide(currentSlide + 1);
            }
        }

        // 滑动到指定位置
        function scrollToSlide(index) {
            if (index < 0 || index >= totalSlides || !scrollWrapper) return;
            
            currentSlide = index;
            var translateX = -index * (cardWidth + gap);
            
            // 确保最后一张卡片完全可见
            var maxTranslate = -(totalSlides - 1) * (cardWidth + gap) + (containerWidth - cardWidth - gap);
            translateX = Math.max(translateX, maxTranslate);
            
            scrollWrapper.style.transform = 'translateX(' + translateX + 'px)';
            
            updateIndicators();
            updateScrollButtons();
        }

        // 开始拖拽
        function startDrag(e) {
            isDragging = true;
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            currentX = startX;
            initialTransform = getCurrentTransform();
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onDrag);
            document.addEventListener('touchend', endDrag);
            
            // 禁用过渡动画
            scrollWrapper.style.transition = 'none';
        }

        // 拖拽中
        function onDrag(e) {
            if (!isDragging || !scrollWrapper) return;
            
            currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            var diff = currentX - startX;
            var newTransform = initialTransform + diff;
            
            // 限制拖拽范围
            var maxTransform = 0;
            var minTransform = -(totalSlides - 1) * (cardWidth + gap) + (containerWidth - cardWidth - gap);
            newTransform = Math.max(Math.min(newTransform, maxTransform), minTransform);
            
            scrollWrapper.style.transform = 'translateX(' + newTransform + 'px)';
        }

        // 结束拖拽
        function endDrag() {
            if (!isDragging || !scrollWrapper) return;
            
            isDragging = false;
            var diff = currentX - startX;
            var threshold = cardWidth / 3;
            
            // 恢复过渡动画
            scrollWrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // 根据拖拽方向和距离决定滑动方向
            if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentSlide > 0) {
                    scrollToSlide(currentSlide - 1);
                } else if (diff < 0 && currentSlide < totalSlides - 1) {
                    scrollToSlide(currentSlide + 1);
                } else {
                    scrollToSlide(currentSlide);
                }
            } else {
                scrollToSlide(currentSlide);
            }
            
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', endDrag);
        }

        // 获取当前transform值
        function getCurrentTransform() {
            if (!scrollWrapper) return 0;
            var transform = scrollWrapper.style.transform;
            if (transform) {
                var match = transform.match(/-?\d+/);
                return match ? parseInt(match[0]) : 0;
            }
            return 0;
        }

        // 键盘事件处理
        function handleKeydown(e) {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                e.preventDefault();
                scrollToPrev();
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                e.preventDefault();
                scrollToNext();
            }
        }

        // 页面加载完成后的初始化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM加载完成，脚本已就绪');
            initScroll();
            
            // 窗口大小改变时重新计算
            window.addEventListener('resize', function() {
                initScroll();
                scrollToSlide(currentSlide);
            });
        });

        // 粒子效果实现
        (function() {
            const canvas = document.getElementById('particle-canvas');
            if (!canvas) return;
            let ctx = canvas.getContext('2d');
            let width = 0, height = 0, particles = [], animationId = null;
            let pixelRatio = window.devicePixelRatio || 1;

            //粒子数量与颜色配置
            const PARTICLE_COUNT_BASE = 140;
            const MOBILE_THRESHOLD = 768;
            let particleCount = PARTICLE_COUNT_BASE;
            const config = {
                minRadius: 1.2, maxRadius: 4.8,
                colors: ['rgba(100,210,255,0.8)','rgba(80,180,245,0.7)','rgba(130,220,255,0.9)','rgba(70,200,240,0.75)','rgba(150,230,255,0.85)','rgba(50,170,220,0.8)']
            };

            //生成随机数
            function randomRange(min,max){return min+Math.random()*(max-min);}

            //粒子类
            class Particle {
                constructor(x,y,radius,color,vx,vy,opacity){
                    this.x=x;this.y=y;this.radius=radius;this.color=color;
                    this.vx=vx;this.vy=vy;this.opacity=opacity;this.originalOpacity=opacity;
                    this.twinkleSpeed=0.5+Math.random()*1.5;
                    this.twinklePhase=Math.random()*Math.PI*2;
                }
        
                //更新位置与透明度
                update(w,h){
                    this.x+=this.vx; this.y+=this.vy; 
                    // 边界反弹（碰到边缘则反转速度并移回边界内）
                    if(this.x-this.radius<0){this.x=this.radius; this.vx=-this.vx;}
                    else if(this.x+this.radius>w){this.x=w-this.radius; this.vx=-this.vx;}
                    if(this.y-this.radius<0){this.y=this.radius; this.vy=-this.vy;}
                    else if(this.y+this.radius>h){this.y=h-this.radius; this.vy=-this.vy;}
                    // 闪烁效果：透明度在 originalOpacity 上下 ±0.12 范围内正弦变化
                    this.opacity=this.originalOpacity+Math.sin(Date.now()*0.002*this.twinkleSpeed+this.twinklePhase)*0.12;
                    // 限制透明度范围 [0.45, 0.95]
                    this.opacity=Math.min(0.95,Math.max(0.45,this.opacity));
                }

                //绘制粒子
                draw(ctx){
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
                    // 发光阴影
                    ctx.shadowColor=`rgba(100,200,255,${this.opacity*0.7})`;
                    ctx.shadowBlur=this.radius*1.6;
                    // 动态替换颜色中的透明度值
                    let colorWithAlpha=this.color.replace(/[\d\.]+\)$/g,`${this.opacity})`);
                    ctx.fillStyle=colorWithAlpha;
                    ctx.fill();
                    // 绘制高光（左上角小亮点）
                    ctx.beginPath();
                    ctx.arc(this.x-this.radius*0.25,this.y-this.radius*0.25,this.radius*0.3,0,Math.PI*2);
                    ctx.fillStyle=`rgba(255,255,255,${this.opacity*0.5})`;
                    ctx.fill();
                    ctx.restore();
                }
            }

            //初始化粒子
            function initParticles(w,h){
                // 根据屏幕宽度调整粒子数量
                if(w<MOBILE_THRESHOLD) particleCount=Math.floor(PARTICLE_COUNT_BASE*0.65);
                else if(w>1920) particleCount=Math.floor(PARTICLE_COUNT_BASE*1.2);
                else particleCount=PARTICLE_COUNT_BASE;
                particles=[];
                for(let i=0;i<particleCount;i++){
                    let r=randomRange(config.minRadius,config.maxRadius);
                    let x=randomRange(r,w-r), y=randomRange(r,h-r);
                    let color=config.colors[Math.floor(Math.random()*config.colors.length)];
                    let vx=randomRange(-0.28,0.28), vy=randomRange(-0.24,0.24);//速度范围
                    let op=randomRange(0.5,0.85);
                    particles.push(new Particle(x,y,r,color,vx,vy,op));
                }
            }

            //画布尺寸适配
            function resizeCanvas(){
                let w=window.innerWidth, h=window.innerHeight;
                canvas.width=w*pixelRatio; canvas.height=h*pixelRatio;
                canvas.style.width=w+'px'; canvas.style.height=h+'px';
                ctx.setTransform(1,0,0,1,0,0);  // 重置变换矩阵
                ctx.scale(pixelRatio,pixelRatio); // 缩放到设备像素比
                width=w; height=h;
                initParticles(width,height);
            }

            //绘制粒子连线
            function drawConnections(){
                if(!ctx||particles.length===0) return;
                let maxDist=Math.min(width,height)*0.12; // 最大连线距离（视口较小边的12%）
                let lineWidth=Math.max(0.6,Math.min(1.2,pixelRatio*0.8)); //线宽根据 pixelRatio 微调
                for(let i=0;i<particles.length;i++){
                    for(let j=i+1;j<particles.length;j++){
                        let dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
                        let dist=Math.sqrt(dx*dx+dy*dy);
                        if(dist<maxDist){
                            let opacity=(1-dist/maxDist)*0.35;
                            ctx.beginPath();
                            ctx.moveTo(particles[i].x,particles[i].y);
                            ctx.lineTo(particles[j].x,particles[j].y);
                            ctx.strokeStyle=`rgba(120,210,255,${opacity*0.7})`;
                            ctx.lineWidth=lineWidth;
                            ctx.stroke();
                        }
                    }
                }
            }

            //动画循环
            function animate(){
                if(!ctx||width===0||height===0) return;
                ctx.clearRect(0,0,width,height);
                // 额外光晕：对大粒子（半径>3.2）绘制更大的半透明光晕
                for(let p of particles){p.update(width,height); p.draw(ctx);}
                drawConnections();
                
                ctx.save();
                ctx.globalCompositeOperation='lighter'; // 颜色叠加模式，增强发光感

                for(let p of particles){
                    if(p.radius>3.2){
                        ctx.beginPath();
                        ctx.arc(p.x,p.y,p.radius*1.8,0,Math.PI*2);
                        ctx.fillStyle=`rgba(80,180,255,${p.opacity*0.18})`;
                        ctx.fill();
                    }
                }
                ctx.restore();
                animationId=requestAnimationFrame(animate);
            }

            // 启动与响应窗口变化
            window.addEventListener('load',()=>{
                if(canvas){
                    ctx=canvas.getContext('2d');
                    if(ctx){
                        ctx.imageSmoothingEnabled=true;
                        resizeCanvas();
                        animate();
                        window.addEventListener('resize',()=>{pixelRatio=window.devicePixelRatio||1; resizeCanvas();});
                    }
                }
            });
            window.addEventListener('beforeunload',()=>{if(animationId) cancelAnimationFrame(animationId);});
        })();