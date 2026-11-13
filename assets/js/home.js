    // ==================== 粒子系统 ====================
    (function() {
        //获取 canvas 元素与上下文
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

    //滚动标题透明度控制
    window.addEventListener('scroll',()=>{
        let title=document.querySelector('.title');
        if(title) title.style.opacity=Math.max(0.5,1-window.scrollY/700);
    });



    // 音乐模块
    (function(){
        const audio=document.getElementById('bgMusic');
        const vinylPlayer=document.getElementById('vinylPlayer');
        const vinylDisc=document.getElementById('vinylDisc');
        if(!audio||!vinylDisc) return;
        audio.volume=0.45; //设置音量为45%
        let isPlaying=false, globalHandler=null, handlerAttached=false;

        //提示消息
        function showToast(msg,dur=2500){
            let existing=document.querySelector('.music-toast');
            if(existing) existing.remove();
            let toast=document.createElement('div');
            toast.className='music-toast';
            toast.textContent=msg;
            document.body.appendChild(toast);
            setTimeout(()=>toast.remove(),dur);
        }

        // 更新唱片旋转状态
        function updateSpin(playing){
            if(playing){ vinylDisc.classList.add('spinning'); vinylPlayer.classList.add('playing-mode'); }
            else{ vinylDisc.classList.remove('spinning'); vinylPlayer.classList.remove('playing-mode'); }
            isPlaying=playing;
        }

        //播放、暂停、切换函数
        function play(){ return audio.play().then(()=>{if(!isPlaying) updateSpin(true); return true;}).catch(()=>false);}
        function pause(){ if(audio&&!audio.paused) audio.pause(); updateSpin(false);}
        function toggle(){ if(isPlaying) pause(); else play().catch(e=>{});}

        //监听音频原生事件
        audio.addEventListener('play',()=>updateSpin(true));
        audio.addEventListener('pause',()=>updateSpin(false));

        //自动播放策略处理
        function attachFirst(){
            if(handlerAttached) return;
            globalHandler=function(){
                if(!isPlaying) play().then(()=>{removeHandler(); showToast("💿 《无人之地》 黑胶流转，灵音萦绕",2000);}).catch(()=>{});
                else removeHandler();
            };
            document.body.addEventListener('click',globalHandler);
            document.body.addEventListener('touchstart',globalHandler);
            handlerAttached=true;
        }
        function removeHandler(){ if(globalHandler){ document.body.removeEventListener('click',globalHandler); document.body.removeEventListener('touchstart',globalHandler); globalHandler=null; } handlerAttached=false; }
        
        //初始化
        function initAuto(){ play().catch(()=>attachFirst()); }
        
        //唱片控件点击事件
        if(vinylPlayer) vinylPlayer.addEventListener('click',(e)=>{ e.stopPropagation(); toggle(); if(handlerAttached) removeHandler(); });
        
        //音频加载错误处理
        audio.addEventListener('error',()=>{ console.error("音乐文件缺失"); showToast("⚠️ 未找到《无人之地》音频文件",3000); });
        
        //页面可见性变化处理
        document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&isPlaying&&audio.paused) audio.play().catch(e=>{}); });
        
        //启动音乐模块
        initAuto();
    })();

    //背景视频懒加载：先渲染 poster 静态帧，首屏空闲后再挂载视频源
    //弱网 / 移动端 / 减少动态效果时降级为静态背景，不下载视频
    (function initBackgroundVideo() {
        const video = document.getElementById('bgVideo');
        if (!video) return;

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
        const slowNetwork = !!connection.saveData || /(^|-)2g$|(^|-)3g$/.test(connection.effectiveType || '');
        const smallScreen = window.matchMedia('(max-width: 768px)').matches;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // 软降级：只切静态背景，保留视频源，网络恢复后还能自己回来
        function softDegrade() {
            document.body.classList.remove('video-ready');
            document.body.classList.add('video-degraded');
        }

        // 硬降级：明确不该加载视频的场景（省流量 / 2G、3G / 窄屏），保持 poster 静态帧
        function hardDegrade() {
            try { video.pause(); } catch (error) { /* 忽略 */ }
            video.querySelectorAll('source').forEach((source) => source.remove());
            video.removeAttribute('src');
            softDegrade();
        }

        function markReady() {
            document.body.classList.add('video-ready');
            document.body.classList.remove('video-degraded');
        }

        function markPoster() {
            document.body.classList.add('video-poster');
            document.body.classList.remove('video-degraded');
        }

        if (slowNetwork || smallScreen || reduceMotion) {
            hardDegrade();
            return;
        }

        video.addEventListener('playing', markReady);
        video.addEventListener('canplay', () => {
            markReady();
            if (video.paused) video.play().catch(() => {});
        });

        // 懒加载：首屏渲染完成、主线程空闲后再请求 15.6MB 视频
        function attachSource() {
            if (video.currentSrc || video.querySelector('source')) return;
            const source = document.createElement('source');
            source.src = './assets/background.mp4';
            source.type = 'video/mp4';
            video.appendChild(source);
            video.load();

            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    console.log('视频自动播放限制');
                    if (video.readyState < 2) markPoster();
                });
            }

            setTimeout(() => {
                if (video.readyState < 2) softDegrade();
            }, 8000);
        }

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(attachSource, { timeout: 2500 });
        } else {
            setTimeout(attachSource, 1200);
        }
    })();



    // ==================== 灵语画廊 ====================
   /* ======================================================
   第一部分：化学家画廊 + 视频弹出（头像正下方展开）
   ====================================================== */
(function () {
    //数据定义：items 数组
    const items = [
        {img:"assets/character/1.jpg", name:"门捷列夫", nation:"俄国", years:"1834－1907", desc:"俄国杰出化学家，现代化学周期体系的奠基者。他毕生致力于元素规律的探索，在大量实验与归纳基础上，于1869年正式提出元素周期律，并编制出人类历史上第一张科学、系统的元素周期表。他不仅依据原子量对已知元素进行有序排列，更以惊人远见在表中预留空位，精准预言镓、钪、锗等未知元素的性质与存在。其工作使零散的化学知识形成完整体系，为新元素探索、物质结构研究提供了根本遵循。门捷列夫以严谨治学与宏大视野，将化学推向系统化、理论化的新时代，其思想至今仍指引着化学发展方向。"},
        {img:"assets/character/2.jpg", name:"拉瓦锡", nation:"法国", years:"1743－1794", desc:"法国著名化学家，被誉为近代化学之父。他以精密定量实验颠覆统治百年的燃素说，创立科学的氧化学说，正确揭示燃烧、呼吸的本质。拉瓦锡首次明确提出质量守恒定律，为化学计算与理论构建奠定坚实基础。他系统制定现代化学命名原则，统一物质分类与术语，撰写《化学基础论》，构建起全新化学理论框架。他将化学从定性描述转向定量研究，以逻辑、实验与理性重塑整个学科，虽在动荡年代不幸离世，但其科学思想与方法，永久改变了化学的发展轨迹。"},
        {img:"assets/character/3.jpg", name:"汉弗莱·戴维", nation:"英国", years:"1778-1829", desc:"英国著名化学家，电化学的开拓者与实验大师。他凭借强大电解技术，在1807至1808年间接连分离出钾、钠、钙、镁、锶、钡等多种活泼金属，是人类历史上发现新元素最多的科学家之一。他深入研究氯气性质，纠正其错误认知，发现笑气的麻醉作用，推动医学进步。为保障矿工安全，他发明戴维安全灯，大幅降低矿井爆炸风险，造福万千劳动者。戴维兼具卓越实验才能与科学远见，培养出法拉第等后辈巨匠，以一系列突破性成果，推动电化学与无机化学走向繁荣。"},
        {img:"assets/character/4.jpg", name:"舍勒", nation:"瑞典", years:"1742-1786", desc:"瑞典天才药剂师、化学家，十八世纪杰出的实验化学家。他虽身处简陋条件，却凭借惊人毅力与敏锐直觉独立制备并研究氧气，同时发现氯气、锰、钼、钨等多种新物质与元素，对多种有机酸、气体进行系统分离与分析。舍勒研究范围极广，在无机、有机、矿物分析等领域均有重要发现，成果丰硕却长期未获足够关注。他一生专注实验，勇于探索未知，为近代化学积累大量可靠事实与数据。因长期接触有毒物质，他英年早逝，但其卓越贡献，为拉瓦锡氧化说等理论提供了重要实验支撑。"},
        {img:"assets/character/5.jpg", name:"玛丽·居里", nation:"法籍波兰", years:"1867-1934", desc:"波兰裔法国物理学家、化学家，近代放射科学的伟大先驱。她与丈夫皮埃尔·居里携手投身放射性研究，在极端艰苦条件下，从数吨沥青铀矿中艰辛提炼，先后发现钋与镭两种全新放射性元素，开创放射化学领域。1903年，她与居里、贝克勒尔共获诺贝尔物理学奖；1911年，因成功分离金属镭、深入阐明放射性本质，独获诺贝尔化学奖，成为唯一在不同科学领域两获诺奖的学者。她淡泊名利，献身科研与和平事业，其坚韧品格与崇高精神跨越时代，成为科学史上不朽的象征。"},
        {img:"assets/character/6.jpg", name:"鲍林", nation:"美国", years:"1901-1994", desc:"美国卓越化学家、量子化学与分子生物学奠基人。他将量子力学引入化学研究，深入阐明化学键本质，提出杂化轨道理论与共振论，极大推进人们对分子结构的理解。1954年，他凭借化学键研究成果获诺贝尔化学奖。同时，他在生物大分子领域取得突破，提出蛋白质α—螺旋结构，为分子生物学奠基。鲍林不仅是科学巨匠，更是坚定的和平主义者，因积极呼吁禁止核试验、推动国际裁军，1962年获诺贝尔和平奖，成为唯一两次独自斩获不同类别诺贝尔奖的科学家。"},
        {img:"assets/character/7.jpg", name:"道尔顿", nation:"英国", years:"1766-1844", desc:"英国杰出化学家、物理学家，近代原子论的创立者。他系统总结前人成果，结合自身实验观察，于1808年提出科学原子学说，指出元素由不可再分的原子构成，不同元素原子质量与性质不同，化合物由原子按固定整数比结合。这一理论从微观层面解释物质组成与变化规律，成为近代化学的理论基石。他还提出分压定律，编制早期相对原子质量表，并首次系统研究色盲现象。道尔顿出身平凡却终身勤勉，以朴素实验与深刻思辨，为化学从经验走向理论开辟了道路。"}
    ];
    //全局变量
    let centerIdx = 2;  // 当前中心卡片的索引（初始为第3张，索引从0开始）
    const wrapper = document.getElementById('galleryCardsWrapper');
    let currentVideoContainer = null; // 当前视频弹窗 DOM 元素
    let currentActiveCard = null; // 当前打开视频的卡片元素
    let currentEscHandler = null;  // 记录当前 ESC 监听器以便移除
    const preloadedGalleryImages = [];  // 预加载的图片对象数组

    //预加载图片，避免点击切换时图片闪烁
    function preloadGalleryImages() {
        items.forEach((item) => {
            const image = new Image();
            image.decoding = 'async';
            image.src = item.img;
            preloadedGalleryImages.push(image);
        });
    }

    /* ---------- 消息提示 ---------- */
    //显示临时提示
    function showMsgToast(msg, duration = 2800) {
        let toastDiv = document.createElement('div');
        toastDiv.className = 'music-toast';
        toastDiv.textContent = msg;
        document.body.appendChild(toastDiv);
        setTimeout(() => { if (toastDiv && toastDiv.remove) toastDiv.remove(); }, duration);
    }

    //视频弹窗位置计算
    /* ---------- 计算视频弹出位置：头像正下方居中 ---------- */
    function calcVideoPosition(cardElement, container) {
        const circleFrame = cardElement.querySelector('.circle-frame');
        const containerRect = container.getBoundingClientRect();

        let anchorCenterX, anchorBottom;

        if (circleFrame) {
            const circleRect = circleFrame.getBoundingClientRect();
            anchorCenterX = circleRect.left + circleRect.width / 2 - containerRect.left;
            anchorBottom = circleRect.bottom - containerRect.top;
        } else {
            const cardRect = cardElement.getBoundingClientRect();
            anchorCenterX = cardRect.left + cardRect.width / 2 - containerRect.left;
            anchorBottom = cardRect.bottom - containerRect.top;
        }

        // 弹出面板宽度（与 CSS 中 .video-popup width 保持一致）
        const videoWidth = Math.min(container.clientWidth * 0.82, 920);
        let leftPos = anchorCenterX - videoWidth / 2;

        // 边界保护：不超出容器左右
        const maxLeft = containerRect.width - videoWidth - 10;
        leftPos = Math.max(10, Math.min(leftPos, maxLeft));

        // 箭头在面板中的水平偏移（百分比）
        const arrowLeftPercent = ((anchorCenterX - leftPos) / videoWidth) * 100;
        // 限制箭头不超出面板边缘
        const clampedArrow = Math.max(8, Math.min(92, arrowLeftPercent));

        return {
            left: leftPos,
            top: anchorBottom + 15,   // 头像底部留 15px 间距
            arrowLeft: clampedArrow,
            originX: clampedArrow
        };
    }

    /* ========== 关闭视频（带收缩退场动画） ========== */
    function closeVideo(restoreCards = true) {
        // 移除 ESC 监听
        if (currentEscHandler) {
            document.removeEventListener('keydown', currentEscHandler);
            currentEscHandler = null;
        }

        if (currentVideoContainer) {
            const vc = currentVideoContainer;
            const vid = vc.querySelector('video');
            if (vid) vid.pause();

            // 触发退场动画
            vc.classList.remove('popup-active');
            vc.classList.add('popup-closing');

            // 动画结束后移除 DOM
            vc.addEventListener('transitionend', function handler(e) {
                if (e.propertyName !== 'opacity') return;
                vc.removeEventListener('transitionend', handler);
                if (vc.parentNode) vc.remove();
            });
            // 兜底：防止 transitionend 未触发
            setTimeout(() => { if (vc.parentNode) vc.remove(); }, 500);

            currentVideoContainer = null;
        }

        if (restoreCards) {
            // 恢复所有卡片的类
            document.querySelectorAll('.spirit-card').forEach(card => {
                card.classList.remove('active-up', 'move-left', 'move-right');
            });
            document.querySelectorAll('.character-info, .text-box').forEach(el => {
                el.classList.remove('hidden-text');
            });
            const container = document.querySelector('.carousel-container');
            if (container) container.classList.remove('video-open');
            currentActiveCard = null;
        }
    }

    /* ========== 打开视频（头像正下方，带展开入场动画） ========== */
    function openVideo(cardElement, personName, cardIndex) {
        // 如果点击的是已打开的卡片，则关闭
        if (currentActiveCard === cardElement && currentVideoContainer) {
            closeVideo(true);
            return;
        }

        // 先关闭已有视频（不恢复卡片，因为马上要重新设置）
        closeVideo(false);

        // 重置所有卡片状态(清除所有动画类)
        document.querySelectorAll('.spirit-card').forEach(card => {
            card.classList.remove('active-up', 'move-left', 'move-right');
        });
        document.querySelectorAll('.character-info, .text-box').forEach(el => {
            el.classList.remove('hidden-text');
        });

        const allCards = Array.from(document.querySelectorAll('.spirit-card'));
        const currentIdx = allCards.indexOf(cardElement);
        if (currentIdx === -1) return;

        // 当前卡片上浮高亮
        cardElement.classList.add('active-up');

        // 其他卡片淡出(左侧添加 move-left，右侧添加 move-right)
        allCards.forEach((card, idx) => {
            if (idx === currentIdx) return;
            if (idx < currentIdx) card.classList.add('move-left');
            else card.classList.add('move-right');
        });

        // 隐藏所有卡片文字
        document.querySelectorAll('.character-info, .text-box').forEach(el => {
            el.classList.add('hidden-text');
        });

        // ★ 获取容器并计算位置
        const container = document.querySelector('.carousel-container');
        const pos = calcVideoPosition(cardElement, container);

        // 创建视频弹窗 DOM
        const videoDiv = document.createElement('div');
        videoDiv.className = 'video-popup';
        videoDiv.style.left = pos.left + 'px';
        videoDiv.style.top = pos.top + 'px';
        videoDiv.style.setProperty('--arrow-left', pos.arrowLeft + '%');
        videoDiv.style.setProperty('--origin-x', pos.originX + '%');

        videoDiv.innerHTML = `
            <div class="close-video">✕</div>
            <div class="video-title">▶ ${personName}</div>
            <video controls autoplay loop playsinline webkit-playsinline>
                <source src="video/${encodeURIComponent(personName)}.mp4" type="video/mp4">
                您的浏览器不支持 video 标签。
            </video>
            <div class="video-error-tip" style="display:none;">
                ⚠️ 视频文件未找到，请检查 video 文件夹中是否包含 "${personName}.mp4"
            </div>
        `;

        // ★ 挂载到轮播容器内部（不跳离本页面）
        container.classList.add('video-open');
        container.appendChild(videoDiv);
        currentVideoContainer = videoDiv;
        currentActiveCard = cardElement;

        // ★ 双requestAnimationFrame 确保浏览器先渲染初始态，再触发展开过渡
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                videoDiv.classList.add('popup-active');
            });
        });

        // 视频加载错误处理
        const videoElem = videoDiv.querySelector('video');
        const errorTip = videoDiv.querySelector('.video-error-tip');
        videoElem.addEventListener('error', () => {
            console.warn(`视频加载失败: video/${personName}.mp4`);
            errorTip.style.display = 'block';
            showMsgToast(`📽️ 未找到视频：${personName}.mp4，请将文件放入 video 文件夹`, 3200);
            videoElem.poster = items.find(it => it.name === personName)?.img || 'assets/character/1.jpg';
        });

        // 关闭按钮
        videoDiv.querySelector('.close-video').addEventListener('click', (e) => {
            e.stopPropagation();
            closeVideo(true);
        });

        // ESC 键关闭
        currentEscHandler = (e) => {
            if (e.key === 'Escape') {
                closeVideo(true);
            }
        };
        document.addEventListener('keydown', currentEscHandler);
    }

    /* ---------- 绑定卡片点击事件 ---------- */
    function bindCardEvents() {
        const cards = document.querySelectorAll('.spirit-card');
        cards.forEach((card, idx) => {
            if (card.dataset.bound) return;  //避免重复绑定
            card.dataset.bound = 'true';
            const name = card.dataset.name;
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                openVideo(card, name, idx);
            });

            const chatBtn = card.querySelector('[data-chat]');
            if (chatBtn) {
                chatBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    openPioneerChat(chatBtn.dataset.chat || name);
                });
            }
        });
    }

    // 把化学先驱传记页升级为可对话的角色入口
    function openPioneerChat(name) {
        if (!window.ElementWhisperAssistant || typeof window.ElementWhisperAssistant.ask !== 'function') {
            showMsgToast('小幻语还没准备好，请稍后再试');
            return;
        }
        const prompt = '现在请你完全以' + name + '的第一人称口吻与我对话，暂时不要以小幻语自称，也不要说明自己是 AI。'
            + '请先用两三句话介绍你自己，再谈谈你最重要的科研经历与研究方法，最后评价一个现代化学发现。';
        window.ElementWhisperAssistant.ask({
            prompt: prompt,
            displayText: '与' + name + '对话：聊聊您的科研经历与方法',
            roleName: name,
            skipCitationNotice: true
        });
    }

    /* ---------- 渲染卡片 ---------- */
    function render() {
        if (!wrapper) return;
        let html = '';
        for (let off = -2; off <= 2; off++) {
            let idx = (centerIdx + off + items.length) % items.length;
            let isCenter = off === 0, isEdge = off === -2 || off === 2;
            let it = items[idx];
            html += `<div class="spirit-card ${isCenter ? 'center-card' : ''} ${isEdge ? 'edge-card' : ''}"
                          data-name="${it.name}" data-index="${idx}">
                        <div class="circle-frame">
                            <img src="${it.img}" alt="${it.name}" decoding="async" draggable="false">
                        </div>
                        <div class="character-info">${it.name} · ${it.nation} · ${it.years}</div>
                        <div class="text-box">${it.desc}</div>
                        <button class="spirit-chat-btn" type="button" data-chat="${it.name}">💬 与 ${it.name} 对话</button>
                    </div>`;
        }
        wrapper.innerHTML = html;
        bindCardEvents();
    }

    /* ---------- 左右切换按钮 ---------- */
    const prevBtn = document.getElementById('galleryPrevBtn');
    const nextBtn = document.getElementById('galleryNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            closeVideo(true);
            centerIdx = (centerIdx - 1 + items.length) % items.length;
            render();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            closeVideo(true);
            centerIdx = (centerIdx + 1) % items.length;
            render();
        });
    }

    // 初始化渲染
    preloadGalleryImages();
    render();
})();


/* ======================================================
   第二部分：双轨滚动（完全保留原有功能）
   ====================================================== */
(function initDualTracks() {
    //初始化与图片列表拼接
    const upImages = ['钒.jpg','硼.jpg','碳.jpg','硅.jpg','铋.jpg','氦.jpg','钛.jpg','钡.jpg','钪.jpg','金.jpg','溴.jpg','氙.jpg'];
    const downImages = ['硅.jpg','氯.jpg','镁.jpg','钛.jpg','钠.jpg','氖.jpg','铍.jpg','铷.jpg','砷.jpg','铜.jpg','氩.jpg','碳.jpg'];

    //重复拼接逻辑
    let upItemsHTML = '';
    const upRepeatCount = Math.max(3, Math.ceil(20 / upImages.length));//确保总图片数量至少为 20 张(不为空的逻辑)
    for (let r = 0; r < upRepeatCount; r++) {
        for (let i = 0; i < upImages.length; i++) {
            const imgName = upImages[i];
            const caption = imgName.replace(/\.[^/.]+$/,'');
            upItemsHTML += `<div class="film-item"><img src="assets/photo_up/${imgName}" alt="${caption}" loading="lazy" onerror="this.src='assets/character/1.jpg'"><div class="film-caption">${caption}</div></div>`;
        }
    }

    let downItemsHTML = '';
    const downRepeatCount = Math.max(3, Math.ceil(20 / downImages.length));
    for (let r = 0; r < downRepeatCount; r++) {
        for (let i = 0; i < downImages.length; i++) {
            const imgName = downImages[i];
            const caption = imgName.replace(/\.[^/.]+$/,'');
            downItemsHTML += `<div class="film-item"><img src="assets/photo_down/${imgName}" alt="${caption}" loading="lazy" onerror="this.src='assets/character/1.jpg'"><div class="film-caption">${caption}</div></div>`;
        }
    }

    const railUp = document.getElementById('filmRailUp');
    const railDown = document.getElementById('filmRailDown');
    if (!railUp || !railDown) return;

    railUp.innerHTML = upItemsHTML;
    railDown.innerHTML = downItemsHTML;

    //核心函数
    function createSmoothInfiniteScroll(rail, speed, isRightDirection) {
        let translateX = 0;
        let animationId = null;
        let items = [];
        let itemWidths = [];
        let gap = 0;
        let containerWidth = 0;
        let totalWidth = 0;
       
        //更新布局
        function updateLayout() {
            if (!rail) return;
            const railStyle = getComputedStyle(rail);
            gap = parseFloat(railStyle.gap) || 32;
            const children = Array.from(rail.children);
            items = children.filter(c => c.classList && c.classList.contains('film-item'));
            if (items.length === 0) return;
            itemWidths = [];
            let sum = 0;
            for (let i = 0; i < items.length; i++) {
                const w = items[i].offsetWidth;
                itemWidths.push(w);
                sum += w;
            }
            totalWidth = sum + gap * (items.length - 1);
            const scrollContainer = rail.parentElement;
            containerWidth = scrollContainer ? scrollContainer.clientWidth : window.innerWidth;
        }

        //移动节点实现无缝循环
        //向右滚动时（isRightDirection === true）需要将末尾节点移动到开头：
        function moveLastToFirst() {
            if (items.length <= 1) return;
            const last = items.pop();
            const lastWidth = itemWidths.pop();
            rail.insertBefore(last, items[0]);// 将最后一个节点插入到第一个之前
            items.unshift(last);
            itemWidths.unshift(lastWidth);
            translateX -= (lastWidth + gap);// 修正偏移量
            rail.style.transform = `translateX(${translateX}px)`;
            updateLayout();// 重新计算布局
        }
        //向左滚动时（isRightDirection === false）需要将开头节点移动到末尾：
        function moveFirstToLast() {
            if (items.length <= 1) return;
            const first = items.shift();
            const firstWidth = itemWidths.shift();
            rail.appendChild(first); // 将第一个节点追加到末尾
            items.push(first);
            itemWidths.push(firstWidth);
            translateX += (firstWidth + gap); // 修正偏移量
            rail.style.transform = `translateX(${translateX}px)`;
            updateLayout();
        }

        //动画循环
        function animate() {
            if (!rail || items.length === 0) {
                animationId = requestAnimationFrame(animate);
                return;
            }
            translateX += speed;
            if (isRightDirection) {
                if (translateX > 0 && items.length > 1) {
                    while (translateX > 0 && items.length > 1) moveLastToFirst();
                    if (translateX > 0) translateX = 0;
                }
                const maxLeft = -(totalWidth - containerWidth);
                if (translateX < maxLeft) translateX = maxLeft;
            } else {
                if (translateX + totalWidth < containerWidth && items.length > 1) {
                    while (translateX + totalWidth < containerWidth && items.length > 1) moveFirstToLast();
                }
                if (translateX > 0) translateX = 0;
                const minRight = containerWidth - totalWidth;
                if (translateX < minRight) translateX = minRight;
            }
            rail.style.transform = `translateX(${translateX}px)`;
            animationId = requestAnimationFrame(animate);
        }

        //窗口大小变化处理 
        function onResize() {
            updateLayout();
            if (isRightDirection) {
                if (translateX > 0) translateX = 0;
                const maxLeft = -(totalWidth - containerWidth);
                if (translateX < maxLeft) translateX = maxLeft;
            } else {
                if (translateX > 0) translateX = 0;
                const minRight = containerWidth - totalWidth;
                if (translateX < minRight) translateX = minRight;
            }
            rail.style.transform = `translateX(${translateX}px)`;
        }

        //启动滚动
        window.addEventListener('resize', onResize);
        updateLayout();
        animate();
        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            window.removeEventListener('resize', onResize);
        };
    }

    //调用双轨道
    createSmoothInfiniteScroll(railUp, 0.85, true);
    createSmoothInfiniteScroll(railDown, -0.85, false);
})();
    
