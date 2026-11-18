export function initPet(): void {
    const pet = document.getElementById('pet-container') as HTMLElement | null;
    const img = document.getElementById('pet-img') as HTMLImageElement | null;
    const bubble = document.getElementById('pet-bubble') as HTMLElement | null;
    if (!pet || !img) return;

    // 形象图已压缩到 280×280，加版本参数避免浏览器复用旧的大图缓存
    const IMG_VER = '?v=20261116s';
    const IMG = {
        happy: './images/normal1.png' + IMG_VER,   // 开心
        idle: './images/normal2.png' + IMG_VER,    // 中性/发呆
        shy: './images/shy.png' + IMG_VER,         // 害羞
        surprised: './images/amazing.png' + IMG_VER, // 惊讶
        angry: './images/angry.png' + IMG_VER,     // 生气
        cry: './images/cry.png' + IMG_VER,         // 哭泣
        afraid: './images/afraid.png' + IMG_VER,   // 害怕
        amazed: './images/amazing2.png' + IMG_VER, // 惊叹
        care: './images/care.png' + IMG_VER,       // 关心
        hi: './images/hi.png' + IMG_VER,           // 打招呼
        salute: './images/salute.png' + IMG_VER,   // 敬礼
        tired: './images/tierd.png' + IMG_VER,     // 疲惫
        pull: './images/pull.png' + IMG_VER         // 被拖拽
    };
    const EXPRESSIONS = ['happy', 'idle', 'shy', 'surprised', 'sleepy', 'angry', 'cool', 'love', 'dizzy', 'excited', 'thinking', 'cry', 'afraid', 'amazed', 'care', 'hi', 'salute', 'tired'];
    const ACTIONS = ['jump', 'spin', 'wave', 'shake', 'heart', 'bounce', 'flip', 'wiggle', 'fall', 'dance', 'nod', 'cheer', 'roll', 'salute'];
    // 表情 → 形象图片映射：有专属图片的用专属图，其余回退到 normal1/normal2
    const EXPR_IMG = {
        happy: 'happy', idle: 'idle', shy: 'shy', surprised: 'surprised',
        sleepy: 'idle', angry: 'angry', cool: 'happy', love: 'happy',
        dizzy: 'idle', excited: 'happy', thinking: 'idle', cry: 'cry',
        afraid: 'afraid', amazed: 'amazed', care: 'care', hi: 'hi',
        salute: 'salute', tired: 'tired'
    };

    // 状态
    let expression = 'happy';     // 当前表情
    let state = 'idle';           // idle | dragging
    let posX = 24;                // 水平位置（left）
    let velX = 0.35;              // 水平速度
    let wandering = true;
    let lastAction = 0;
    let lastExprSwitch = 0;
    // 心情状态机
    let mood = 'happy';           // 当前心情（表情英文名）
    let moodLocked = false;       // 触发心情锁定（害羞/生气/疲倦期间不随机切表情）
    let moodTimer = null;
    let pokeCount = 0;            // 连续戳的次数
    let lastPokeTime = 0;         // 上次戳的时间
    const onlineStart = Date.now();
    const POKE_WINDOW = 8000;     // 戳的时间窗口（8秒）
    const POKE_ANGRY = 5;         // 连续戳多少次会生气
    const MOOD_DURATION = 5000;   // 触发心情持续时长
    const TIRE_TIME = 8 * 60 * 1000; // 在线多久会疲倦（8分钟）
    // 闲置漫游时可用的表情池（排除需触发的害羞/生气/疲倦）
    const IDLE_EXPRS = ['happy', 'idle', 'surprised', 'sleepy', 'cool', 'love',
        'dizzy', 'excited', 'thinking', 'afraid', 'cry', 'amazed', 'care', 'hi', 'salute'];
    const bubbleTexts = [
        '你好呀～', '要聊聊化学吗？', '点我开始对话！', '今天学点什么？',
        '元素的世界很奇妙～', '有什么想问的吗？', '我是小幻语！', '在发呆呢…',
        '戳戳我！', '一起来探索吧～', '化学好有趣！'
    ];

    const PET_SIZE = 110;
    const BOTTOM = 24;           // 固定距底部距离

    // 当前形象名称（避免用 img.src 绝对路径与相对路径比较导致失效）
    let currentImg = 'happy';
    // 设置形象图片
    function setImage(name) {
        if (currentImg === name) return;
        currentImg = name;
        img.src = IMG[name];
    }

    // 设置表情（CSS 滤镜类）
    function setExpression(expr) {
        expression = expr;
        EXPRESSIONS.forEach(e => img.classList.remove('expr-' + e));
        img.classList.add('expr-' + expr);
    }

    // 设置心情：切换表情+对应形象图片，持续一段时间后解除锁定恢复漫游
    function setMood(expr, duration = MOOD_DURATION) {
        mood = expr;
        moodLocked = true;
        setExpression(expr);
        setImage(EXPR_IMG[expr]);
        lastExprSwitch = Date.now();
        clearTimeout(moodTimer);
        moodTimer = setTimeout(() => {
            moodLocked = false;
        }, duration || MOOD_DURATION);
    }

    // 播放动作（临时动画，播完即止）
    let actionTimer = null;
    function playAction(action) {
        ACTIONS.forEach(a => img.classList.remove('act-' + a));
        // 强制重绘后再添加，确保动画重新触发
        void img.offsetWidth;
        img.classList.add('act-' + action);
        clearTimeout(actionTimer);
        actionTimer = setTimeout(() => {
            img.classList.remove('act-' + action);
        }, 950);
    }

    // 显示气泡
    let bubbleTimer = null;
    function showBubble(text) {
        if (!bubble) return;
        bubble.textContent = text;
        bubble.classList.add('show');
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
    }

    // 应用水平位置（bottom 固定）
    function applyPos() {
        pet.style.left = posX + 'px';
        pet.style.bottom = BOTTOM + 'px';
    }
    applyPos();

    // 自主左右漫游
    function wander() {
        if (!wandering || state === 'dragging') return;
        const w = window.innerWidth;
        const margin = 12;

        posX += velX;

        // 左右边界反弹
        if (posX < margin) { posX = margin; velX = Math.abs(velX); }
        if (posX > w - PET_SIZE - margin) { posX = w - PET_SIZE - margin; velX = -Math.abs(velX); }

        // 偶尔随机改变方向/速度
        if (Math.random() < 0.006) {
            velX = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.6);
        }

        applyPos();
    }
    setInterval(wander, 33); // ~30fps

    // 闲置时随机切换表情 + 偶尔做动作 + 在线疲倦检测
    setInterval(() => {
        if (state === 'dragging') return;
        const now = Date.now();
        // 在线时间过长 → 疲倦（每次检测触发，不打断已锁定的心情）
        if (!moodLocked && now - onlineStart > TIRE_TIME) {
            setMood('tired');
        }
        // 心情锁定期间不随机切换表情
        if (!moodLocked) {
            // 每 5-9 秒切换表情（从闲置表情池随机，且保证画面和当前不同）
            if (now - lastExprSwitch > 5000 + Math.random() * 4000) {
                let next = IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
                for (let i = 0; i < 5 && EXPR_IMG[next] === currentImg; i++) {
                    next = IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
                }
                setExpression(next);
                setImage(EXPR_IMG[next]);
                lastExprSwitch = now;
            }
            // 每 8-15 秒做一个随机动作
            if (now - lastAction > 8000 + Math.random() * 7000) {
                playAction(ACTIONS[Math.floor(Math.random() * ACTIONS.length)]);
                lastAction = now;
            }
        }
    }, 1000);

    // 拖拽（仅水平）
    let dragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let startLeft = 0;

    pet.addEventListener('pointerdown', (e) => {
        dragging = true;
        dragMoved = false;
        wandering = false;
        state = 'dragging';
        setImage('pull');
        pet.classList.add('dragging');
        try { pet.setPointerCapture(e.pointerId); } catch (_) { /* 指针捕获失败时忽略，拖拽仍可用 */ }
        dragStartX = e.clientX;
        startLeft = posX;
    });

    pet.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        if (Math.abs(dx) > 4) dragMoved = true;
        const w = window.innerWidth;
        const margin = 8;
        posX = Math.max(margin, Math.min(w - PET_SIZE - margin, startLeft + dx));
        applyPos();
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        wandering = true;
        state = 'idle';
        pet.classList.remove('dragging');
        try { pet.releasePointerCapture(e.pointerId); } catch (_) { /* 已释放或未捕获时忽略 */ }
        // 只有拖拽才触发害羞
        if (dragMoved) {
            setMood('shy');
            playAction('heart');
            lastAction = Date.now();
        }
    }    pet.addEventListener('pointerup', endDrag);
    pet.addEventListener('pointercancel', endDrag);

    // 点击（戳）：连续戳生气，单次戳害羞
    pet.addEventListener('click', (e) => {
        if (dragMoved || state === 'dragging') return;
        const now = Date.now();
        // 超出时间窗口则重置计数
        if (now - lastPokeTime > POKE_WINDOW) pokeCount = 0;
        pokeCount++;
        lastPokeTime = now;
        if (pokeCount >= POKE_ANGRY) {
            // 一直戳 → 生气
            setMood('angry', 6000);
            showBubble('别戳啦！生气了！');
            pokeCount = 0;
        } else {
            // 戳一下 → 随机表情 + 随机动作（害羞只在拖拽后出现）
            const expr = IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
            setMood(expr, 3000);
            playAction(ACTIONS[Math.floor(Math.random() * ACTIONS.length)]);
            showBubble(bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)]);
        }
        lastAction = Date.now();
        // 打开对话面板
        window.dispatchEvent(new CustomEvent('toggle-chat-panel'));
    });

    // 对话面板打开时桌宠发光（由 useAssistant 维护 body.assistant-open）
    function syncActiveState() {
        pet.classList.toggle('active', document.body.classList.contains('assistant-open'));
    }
    setInterval(syncActiveState, 300);

    // 初始化
    setExpression('happy');
    setImage('happy');
}
