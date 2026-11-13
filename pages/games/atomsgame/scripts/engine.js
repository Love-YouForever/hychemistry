'use strict';

function debug(text) {
    console.log(text);
}

// SoundTracks
const soundIntro = document.getElementById("intro");
const soundBackground = document.getElementById("background");
const soundExplosion = document.getElementById("explosion");
const soundUp = document.getElementById("up");
const soundLose = document.getElementById("lose");

// Set initial volume
soundIntro.volume = 0.2;
soundBackground.volume = 0.2;

// Game Variables
var context;
var img;

let canvas, width, height;
let gameStatus = 0;
let record = 0;
let gravity = 2;
let life = 3;
let score = 0;
let quizElementSpawned = false;
let frames = 0;

// Language Config
const LANGUAGES = {
    PT: 'pt',
    EN: 'en',
    CN: 'cn'
};
let currentLanguage = LANGUAGES.CN;

// Difficulty Config
const DIFFICULTY = {
    EASY: 'easy',
    HARD: 'hard',
    HELL: 'hell'
};
let currentDifficulty = DIFFICULTY.EASY;

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
    [DIFFICULTY.EASY]: {
        elementCount: 20,
        enableRotation: false,
        name: '简单'
    },
    [DIFFICULTY.HARD]: {
        elementCount: 40,
        enableRotation: false,
        name: '困难'
    },
    [DIFFICULTY.HELL]: {
        elementCount: PERIODIC_TABLE.length,
        enableRotation: true,
        name: '地狱'
    }
};

const TEXTS = {
    pt: {
        record: "Recorde: ",
        welcome: "Ei! Neste jogo, você deve selecionar o elemento apresentado pelo gato (à esquerda da tela).\n\nVocê começa com três vidas. Se perder o elemento correto, perde uma vida. Para cada elemento correto, você ganha um ponto!\n\nDivirta-se! :)\n\n\nEste jogo foi desenvolvido por Allex Lima, Daniel Bispo, Paulo Moraes e Renan Barroncas (2015).\nAtualizado em 2025.",
        credits: "Desenvolvido por Allex Lima..."
    },
    en: {
        record: "Record: ",
        welcome: "Hey! In this game, you must select the element shown by the cat (on the left of the screen).\n\nYou start with three lives. If you miss the correct element, you lose a life. For each correct element selected, you get a point!\n\nHave fun! :)\n\n\nThis game was developed by Allex Lima, Daniel Bispo, Paulo Moraes and Renan Barroncas (2015).\nUpdated in 2025.",
        credits: "Developed by Allex Lima..."
    },
    cn: {
        record: "记录: ",
        welcome: "嗨！在这个游戏中，你需要选择宇航员（屏幕左侧）展示的元素。\n\n你有三条生命。错过正确的元素将失去一条生命。选择正确的元素可以获得一分！\n\n祝你玩得开心！\n\n\n本游戏由 Allex Lima, Daniel Bispo, Paulo Moraes 和 Renan Barroncas 开发 (2015)。\n2025年更新。",
        credits: "由 Allex Lima 开发..."
    }
};

const quiz = {
    name: " ",
    symbol: null
};

const STATUS = {
    START: 0,
    PLAYING: 1,
};

// Starfield for cosmic background
const stars = [];
const nebulae = [];

function initStars() {
    stars.length = 0;
    nebulae.length = 0;
    
    const starCount = isMobile() ? 100 : 200;
    
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random(),
            twinkleSpeed: Math.random() * 0.02 + 0.01
        });
    }
    for (let i = 0; i < 5; i++) {
        nebulae.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 100 + 50,
            opacity: Math.random() * 0.1 + 0.05,
            hue: Math.random() * 60 + 180
        });
    }
}

function drawStarfield() {
    context.fillStyle = "#0a0a1a";
    context.fillRect(0, 0, width, height);
    
    for (let neb of nebulae) {
        const gradient = context.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
        gradient.addColorStop(0, `hsla(${neb.hue}, 70%, 60%, ${neb.opacity})`);
        gradient.addColorStop(1, `hsla(${neb.hue}, 70%, 40%, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        context.fill();
        
        neb.x += 0.02;
        if (neb.x > width + 100) neb.x = -100;
    }
    
    for (let star of stars) {
        star.brightness += star.twinkleSpeed;
        if (star.brightness >= 1 || star.brightness <= 0.3) {
            star.twinkleSpeed *= -1;
        }
        
        context.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
        
        star.y += star.size * 0.3;
        if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
        }
    }
}

// 检测是否为移动端（更可靠的检测方式）
function isMobile() {
    // 通过多种方式检测移动端
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 检测常见移动设备特征
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
    
    // 如果是移动设备，再检查屏幕宽度
    if (isMobileUA || hasTouchSupport) {
        return true;
    }
    
    // 桌面端小窗口情况
    return false;
}

const fallingElements = {
    items: [],
    spawnDelay: 0,
    baseLevel: 100,

    spawn: function() {
        const settings = DIFFICULTY_SETTINGS[currentDifficulty];
        const elementCount = settings.elementCount;
        
        // 移动端使用更大的元素尺寸以提高触控体验
        const elementSize = isMobile() ? 100 : 80;
        // 移动端元素生成区域更窄，避免边缘点击困难
        const spawnMinX = isMobile() ? width * 0.25 : 300;
        const spawnMaxX = isMobile() ? width * 0.75 : 871;
        
        if (!quizElementSpawned && (this.items.length > Math.floor(3 * Math.random()))) {
            this.items.push({
                width: elementSize,
                height: elementSize,
                gravity: gravity,
                velocity: 0,
                x: spawnMinX + Math.floor((spawnMaxX - spawnMinX) * Math.random()),
                y: Math.floor(50 * Math.random()),
                name: quiz.name,
                symbol: quiz.symbol,
                rotation: 0,
                rotationSpeed: settings.enableRotation ? (Math.random() - 0.5) * 0.1 : 0,
                isQuiz: true
            });
            quizElementSpawned = true;
        } else {
            const randomIndex = Math.floor(elementCount * Math.random());
            const randomEl = PERIODIC_TABLE[randomIndex];
            const displayName = currentLanguage === LANGUAGES.PT ? randomEl.name : 
                               currentLanguage === LANGUAGES.CN ? randomEl.nameCn : randomEl.nameEn;
            this.items.push({
                width: elementSize,
                height: elementSize,
                gravity: gravity,
                velocity: 0,
                x: spawnMinX + Math.floor((spawnMaxX - spawnMinX) * Math.random()),
                y: 0,
                name: displayName,
                symbol: randomEl.id,
                rotation: 0,
                rotationSpeed: settings.enableRotation ? (Math.random() - 0.5) * 0.1 : 0,
                isQuiz: false
            });
        }
        this.spawnDelay = this.baseLevel + Math.floor(51 * Math.random());
    },

    update: function() {
        if (this.spawnDelay <= 0) {
            this.spawn();
            if (this.baseLevel >= 30)
                this.baseLevel--;
        } else {
            this.spawnDelay--;
        }

        for (let i = 0; i < this.items.length; i++) {
            let obs = this.items[i];
            obs.velocity += obs.gravity;
            obs.y = obs.velocity;
            obs.rotation += obs.rotationSpeed;
            const limit = height - obs.height / 2 - 110;

            if (obs.y >= limit) {
                this.items.splice(i, 1);
                i--;

                if (life > 0 && obs.isQuiz) {
                    pickRandomQuizElement();
                    life--;
                    soundExplosion.play();
                    quizElementSpawned = false;
                }

                if (life === 0) {
                    soundLose.play();
                }
            }
        }
    },

    draw: function() {
        for (let i = 0; i < this.items.length; i++) {
            let obs = this.items[i];
            context.save();
            context.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
            context.rotate(obs.rotation);
            
            this.drawMeteor(obs);
            
            context.restore();
        }
    },
    
    drawMeteor: function(obs) {
        const centerX = 0;
        const centerY = 0;
        const w = obs.width / 2;
        const h = obs.height / 2;
        
        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, w);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.4, '#654321');
        gradient.addColorStop(0.7, '#3d2817');
        gradient.addColorStop(1, '#1a0f08');
        
        context.beginPath();
        context.moveTo(centerX, centerY - h);
        context.lineTo(centerX + w * 0.8, centerY - h * 0.3);
        context.lineTo(centerX + w * 0.6, centerY + h * 0.8);
        context.lineTo(centerX, centerY + h * 0.6);
        context.lineTo(centerX - w * 0.6, centerY + h * 0.8);
        context.lineTo(centerX - w * 0.8, centerY - h * 0.3);
        context.closePath();
        context.fillStyle = gradient;
        context.fill();
        context.strokeStyle = '#1a0f08';
        context.lineWidth = isMobile() ? 3 : 2;
        context.stroke();
        
        context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        context.beginPath();
        context.arc(centerX - w * 0.2, centerY - h * 0.2, w * 0.15, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(centerX + w * 0.3, centerY + h * 0.2, w * 0.1, 0, Math.PI * 2);
        context.fill();
        
        const glowGradient = context.createRadialGradient(centerX, centerY, w * 0.8, centerX, centerY, w * 1.5);
        glowGradient.addColorStop(0, 'rgba(255, 150, 50, 0.4)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(centerX, centerY, w * 1.5, 0, Math.PI * 2);
        context.fill();
        
        // 移动端使用更大的字体以提高可读性
        const fontSize = isMobile() ? 'bold 36px Arial' : 'bold 28px Arial';
        const textOffset = isMobile() ? 10 : 8;
        
        context.fillStyle = '#fff';
        context.textAlign = "center";
        context.font = fontSize;
        context.shadowColor = '#ffaa00';
        context.shadowBlur = isMobile() ? 15 : 10;
        context.fillText(obs.symbol, centerX, centerY + textOffset);
        context.shadowBlur = 0;
    },

    handleClick: function(x, y) {
        for (let i = 0; i < this.items.length; i++) {
            let obs = this.items[i];
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            if (distance <= obs.width / 2) {
                this.items.splice(i, 1);
                i--;

                if (life > 0 && obs.isQuiz) {
                    score++;
                    fallingElements.items = [];
                    gravity += 0.1;
                    pickRandomQuizElement();
                    soundUp.play();
                    quizElementSpawned = false;
                } else {
                    if (life > 0)
                        life--;
                    soundExplosion.play();
                }

                if (life === 0)
                    soundLose.play();
            }
        }
    }
};

const panel = {
    quizElement: function() {
        // 移动端调整元素显示区域位置和大小
        const isMobileDevice = isMobile();
        const panelX = isMobileDevice ? width * 0.02 : 40;
        const panelWidth = isMobileDevice ? width * 0.25 : 180;
        const panelY = isMobileDevice ? height * 0.35 : 220;
        const panelHeight = isMobileDevice ? height * 0.15 : 80;
        const textY = isMobileDevice ? panelY + panelHeight * 0.65 : 268;
        const fontSize = isMobileDevice ? Math.max(24, height * 0.05) : 28;
        
        context.fillStyle = '#1a237e';
        context.fillRect(panelX, panelY, panelWidth, panelHeight);
        context.strokeStyle = '#42a5f5';
        context.lineWidth = isMobileDevice ? 4 : 3;
        context.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        const screenGradient = context.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        screenGradient.addColorStop(0, 'rgba(66, 165, 245, 0.3)');
        screenGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = screenGradient;
        context.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.font = `bold ${fontSize}px Arial`;
        context.shadowColor = '#42a5f5';
        context.shadowBlur = isMobileDevice ? 20 : 15;
        context.fillText(quiz.name, panelX + panelWidth / 2, textY);
        context.shadowBlur = 0;
    },
    pointsBoard: function() {
        // 移动端调整分数面板大小和位置
        const isMobileDevice = isMobile();
        const boardX = isMobileDevice ? width * 0.02 : 20;
        const boardY = isMobileDevice ? height * 0.02 : 10;
        const boardWidth = isMobileDevice ? width * 0.25 : 200;
        const boardHeight = isMobileDevice ? height * 0.22 : 130;
        const fontSize = isMobileDevice ? Math.max(36, height * 0.08) : 45;
        const heartSize = isMobileDevice ? height * 0.05 : 25;
        const heartSpacing = isMobileDevice ? width * 0.06 : 50;
        
        context.fillStyle = 'rgba(10, 10, 40, 0.8)';
        context.fillRect(boardX, boardY, boardWidth, boardHeight);
        context.strokeStyle = '#42a5f5';
        context.lineWidth = isMobileDevice ? 3 : 2;
        context.strokeRect(boardX, boardY, boardWidth, boardHeight);
        
        context.fillStyle = "#aaa";
        context.textAlign = "center";
        context.font = isMobileDevice ? "14px Arial" : "16px Arial";
        context.fillText(TEXTS[currentLanguage].record + record, boardX + boardWidth / 2, boardY + 25);
        
        context.fillStyle = "#fff";
        context.font = `bold ${fontSize}px Arial`;
        context.shadowColor = '#42a5f5';
        context.shadowBlur = isMobileDevice ? 15 : 10;
        context.fillText(score, boardX + boardWidth / 2, boardY + boardHeight * 0.55);
        context.shadowBlur = 0;

        if (life > 0 && life <= 3) {
            for (let i = 0; i < life; i++) {
                this.drawHeart(boardX + boardWidth * 0.2 + i * heartSpacing, boardY + boardHeight * 0.75, isMobileDevice);
            }
        }
    },
    
    drawHeart: function(x, y, isMobileDevice) {
        const scale = isMobileDevice ? 1.5 : 1;
        context.fillStyle = '#e53935';
        context.beginPath();
        context.moveTo(x, y + 5 * scale);
        context.bezierCurveTo(x, y, x - 10 * scale, y, x - 10 * scale, y + 10 * scale);
        context.bezierCurveTo(x - 10 * scale, y + 20 * scale, x, y + 25 * scale, x, y + 35 * scale);
        context.bezierCurveTo(x, y + 25 * scale, x + 10 * scale, y + 20 * scale, x + 10 * scale, y + 10 * scale);
        context.bezierCurveTo(x + 10 * scale, y, x, y, x, y + 5 * scale);
        context.fill();
        
        context.strokeStyle = '#c62828';
        context.lineWidth = isMobileDevice ? 2 : 1;
        context.stroke();
    },
    
    astronaut: function() {
        // 移动端调整宇航员大小和位置
        const isMobileDevice = isMobile();
        const scale = isMobileDevice ? 1.2 : 1;
        const baseX = isMobileDevice ? width * 0.08 : 130;
        const baseY = isMobileDevice ? height * 0.65 : 420;
        
        context.fillStyle = '#e0e0e0';
        context.beginPath();
        context.ellipse(baseX, baseY, 45 * scale, 55 * scale, 0, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#1565c0';
        context.beginPath();
        context.ellipse(baseX, baseY - 70 * scale, 35 * scale, 30 * scale, 0, 0, Math.PI * 2);
        context.fill();
        
        const visorGradient = context.createLinearGradient(baseX - 20 * scale, baseY - 90 * scale, baseX + 20 * scale, baseY - 50 * scale);
        visorGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        visorGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = visorGradient;
        context.beginPath();
        context.ellipse(baseX - 12 * scale, baseY - 80 * scale, 10 * scale, 8 * scale, -0.5, 0, Math.PI * 2);
        context.fill();
        
        context.strokeStyle = '#bdbdbd';
        context.lineWidth = isMobileDevice ? 4 : 3;
        context.beginPath();
        context.ellipse(baseX, baseY - 70 * scale, 35 * scale, 30 * scale, 0, 0, Math.PI * 2);
        context.stroke();
        
        context.fillStyle = '#bdbdbd';
        context.beginPath();
        context.ellipse(baseX + 35 * scale, baseY, 15 * scale, 35 * scale, 0, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#e0e0e0';
        context.beginPath();
        context.ellipse(baseX - 60 * scale, baseY - 40 * scale, 18 * scale, 45 * scale, -0.8, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#e0e0e0';
        context.beginPath();
        context.ellipse(baseX + 60 * scale, baseY - 40 * scale, 18 * scale, 45 * scale, 0.8, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#e0e0e0';
        context.beginPath();
        context.ellipse(baseX - 20 * scale, baseY + 80 * scale, 18 * scale, 40 * scale, -0.2, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.ellipse(baseX + 20 * scale, baseY + 80 * scale, 18 * scale, 40 * scale, 0.2, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#424242';
        context.fillRect(baseX - 35 * scale, baseY + 110 * scale, 30 * scale, 15 * scale);
        context.fillRect(baseX + 5 * scale, baseY + 110 * scale, 30 * scale, 15 * scale);
    },
    splashScreen: function() {
        context.fillStyle = '#fff';
        context.textAlign = "center";
        context.font = "bold 60px Arial";
        context.shadowColor = '#42a5f5';
        context.shadowBlur = 20;
        context.fillText('化学元素', 500, 180);
        context.font = "bold 45px Arial";
        context.fillText('大作战', 500, 245);
        context.shadowBlur = 0;
        
        context.fillStyle = '#aaa';
        context.font = "20px Arial";
        context.fillText('选择难度开始游戏', 500, 300);
        
        const buttonY = 340;
        const buttonWidth = 180;
        const buttonHeight = 50;
        const gap = 30;
        const totalWidth = buttonWidth * 3 + gap * 2;
        const startX = (1000 - totalWidth) / 2;
        
        const easyGradient = context.createLinearGradient(startX, buttonY, startX, buttonY + buttonHeight);
        easyGradient.addColorStop(0, '#43a047');
        easyGradient.addColorStop(1, '#2e7d32');
        context.fillStyle = easyGradient;
        context.beginPath();
        context.roundRect(startX, buttonY, buttonWidth, buttonHeight, 8);
        context.fill();
        context.strokeStyle = '#66bb6a';
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = '#fff';
        context.font = "bold 24px Arial";
        context.fillText('简单', startX + buttonWidth / 2, buttonY + 33);
        
        const hardGradient = context.createLinearGradient(startX + buttonWidth + gap, buttonY, startX + buttonWidth + gap, buttonY + buttonHeight);
        hardGradient.addColorStop(0, '#ff9800');
        hardGradient.addColorStop(1, '#f57c00');
        context.fillStyle = hardGradient;
        context.beginPath();
        context.roundRect(startX + buttonWidth + gap, buttonY, buttonWidth, buttonHeight, 8);
        context.fill();
        context.strokeStyle = '#ffb74d';
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = '#fff';
        context.fillText('困难', startX + buttonWidth + gap + buttonWidth / 2, buttonY + 33);
        
        const hellGradient = context.createLinearGradient(startX + buttonWidth * 2 + gap * 2, buttonY, startX + buttonWidth * 2 + gap * 2, buttonY + buttonHeight);
        hellGradient.addColorStop(0, '#e53935');
        hellGradient.addColorStop(1, '#c62828');
        context.fillStyle = hellGradient;
        context.beginPath();
        context.roundRect(startX + buttonWidth * 2 + gap * 2, buttonY, buttonWidth, buttonHeight, 8);
        context.fill();
        context.strokeStyle = '#ef5350';
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = '#fff';
        context.fillText('地狱', startX + buttonWidth * 2 + gap * 2 + buttonWidth / 2, buttonY + 33);
        
        context.fillStyle = '#888';
        context.font = "16px Arial";
        context.fillText('简单: 前20个元素 | 困难: 前40个元素 | 地狱: 全部元素', 500, 440);
        context.fillText('根据宇航员显示的元素名称，点击对应下落的化学元素符号', 500, 480);
        
        return {
            easyButton: { x: startX, y: buttonY, width: buttonWidth, height: buttonHeight },
            hardButton: { x: startX + buttonWidth + gap, y: buttonY, width: buttonWidth, height: buttonHeight },
            hellButton: { x: startX + buttonWidth * 2 + gap * 2, y: buttonY, width: buttonWidth, height: buttonHeight }
        };
    },
    draw: function() {
        this.astronaut();
        this.quizElement();
        this.pointsBoard();
    }
};

function pickRandomQuizElement() {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const elementCount = settings.elementCount;
    const rand = Math.floor(elementCount * Math.random());
    const el = PERIODIC_TABLE[rand];
    quiz.name = currentLanguage === LANGUAGES.PT ? el.name : 
                currentLanguage === LANGUAGES.CN ? el.nameCn : el.nameEn;
    quiz.symbol = el.id;
}

function play() {
    frames++;

    drawStarfield();

    panel.draw();

    if (life === 0) {
        gameStatus = STATUS.START;
    }

    if (gameStatus === STATUS.START) {
        record = localStorage.getItem("record");
        if (record == null)
            record = 0;

        if (score > record)
            localStorage.setItem("record", score);

        panel.splashScreen();
        quiz.name = "";

        soundBackground.pause();
    } else if (gameStatus === STATUS.PLAYING) {
        fallingElements.draw();
        fallingElements.update();
        soundIntro.pause();
        soundBackground.play().catch(e => console.log("Audio play error: ", e));
    }

    window.requestAnimationFrame(play);
}

function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    let pos;
    
    // 判断传入的是完整事件对象还是已计算的坐标对象
    if (event.clientX !== undefined && event.clientY !== undefined) {
        // click事件：需要计算相对坐标
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        pos = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    } else if (event.x !== undefined && event.y !== undefined) {
        // touch事件：已经是计算好的canvas相对坐标
        pos = {
            x: event.x,
            y: event.y
        };
    } else {
        console.warn('Invalid click event received');
        return;
    }

    if (gameStatus === STATUS.START) {
        const buttons = panel.splashScreen();
        
        if (pos.x >= buttons.easyButton.x && pos.x <= buttons.easyButton.x + buttons.easyButton.width &&
            pos.y >= buttons.easyButton.y && pos.y <= buttons.easyButton.y + buttons.easyButton.height) {
            currentDifficulty = DIFFICULTY.EASY;
        } else if (pos.x >= buttons.hardButton.x && pos.x <= buttons.hardButton.x + buttons.hardButton.width &&
                   pos.y >= buttons.hardButton.y && pos.y <= buttons.hardButton.y + buttons.hardButton.height) {
            currentDifficulty = DIFFICULTY.HARD;
        } else if (pos.x >= buttons.hellButton.x && pos.x <= buttons.hellButton.x + buttons.hellButton.width &&
                   pos.y >= buttons.hellButton.y && pos.y <= buttons.hellButton.y + buttons.hellButton.height) {
            currentDifficulty = DIFFICULTY.HELL;
        } else {
            return;
        }
        
        score = 0;
        life = 3;
        fallingElements.items = [];
        quizElementSpawned = false;
        gravity = 2;
        fallingElements.baseLevel = 100;
        pickRandomQuizElement();

        soundIntro.play().catch(e => console.log("Audio play error: ", e));

        gameStatus = STATUS.PLAYING;
    } else if (gameStatus === STATUS.PLAYING) {
        fallingElements.handleClick(pos.x, pos.y);
    }
}

function resizeCanvas() {
    // 获取容器尺寸，如果在iframe中，使用父容器尺寸
    const container = document.body;
    const newWidth = container.clientWidth || window.innerWidth;
    const newHeight = container.clientHeight || window.innerHeight;

    // 只在尺寸实际变化时重新设置画布
    if (newWidth !== width || newHeight !== height) {
        width = newWidth;
        height = newHeight;

        // 移动端使用窗口大小，PC端保持原始尺寸
        if (isMobile()) {
            // 横屏模式下使用全屏
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
        }

        // 重新初始化星空背景
        initStars();
    }
}

function main() {
    // 获取容器尺寸，如果在iframe中，使用父容器尺寸
    const container = document.body;
    height = container.clientHeight || window.innerHeight;
    width = container.clientWidth || window.innerWidth;

    // 移动端使用窗口大小，PC端保持原始尺寸
    if (isMobile()) {
        // 横屏模式下使用全屏
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    } else {
        // PC端保持原始1000x600尺寸
        canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 600;
    }

    context = canvas.getContext("2d");
    document.body.appendChild(canvas);

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        // 计算canvas相对坐标，考虑缩放因子
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pos = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
        // 正确传递计算后的canvas相对坐标
        onCanvasClick(pos);
    });

    // 添加触摸事件支持（多点触控）
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
    });
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
    });

    img = new Image();
    img.src = "sprites/images.png";

    initStars();

    gameStatus = STATUS.START;
    play();

    // 监听窗口大小变化（用于移动端旋转和窗口调整）
    window.addEventListener('resize', resizeCanvas);
}

main();