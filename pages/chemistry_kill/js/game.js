// 游戏状态
let gameState = {
    playerHp: 10,
    opponentHp: 10,
    playerHand: [],
    opponentHand: [],
    playerZone: [],
    opponentZone: [],
    deck: [],
    turn: 'player',
    selectedCards: [],
    selectedConditionCard: null,
    targetSubstance: null,
    difficulty: 'easy',
    turnCount: 1,
    isPlayerTurn: true,
    gameOver: false,
    winner: null,
    // 连锁反应相关
    chainReactions: [],
    activeCountdown: null,
    countdownTimer: null
};

// 全局异常处理
window.onerror = function(message, source, lineno, colno, error) {
    console.error('全局异常:', message, '在', source, '第', lineno, '行');
    if (error) {
        console.error('错误堆栈:', error.stack);
    }
    
    // 显示友好的错误提示
    showMessage('游戏发生错误，请刷新页面重试', 'error');
    
    // 尝试恢复游戏状态
    try {
        if (gameState && !gameState.gameOver) {
            gameState.isPlayerTurn = true;
            updateUI();
        }
    } catch (e) {
        console.error('恢复游戏状态时出错:', e);
    }
    
    return true; // 阻止默认错误处理
};

// 全局Promise异常处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise异常:', event.reason);
    showMessage('游戏发生错误，请刷新页面重试', 'error');
    event.preventDefault();
});

let ai = null;

// DOM元素
const elements = {
    playerHp: document.getElementById('playerHp'),
    playerHpText: document.getElementById('playerHpText'),
    opponentHp: document.getElementById('opponentHp'),
    opponentHpText: document.getElementById('opponentHpText'),
    opponentHandCount: document.getElementById('opponentHandCount'),
    handCards: document.getElementById('handCards'),
    playerZoneCards: document.getElementById('playerZoneCards'),
    opponentZoneCards: document.getElementById('opponentZoneCards'),
    messageArea: document.getElementById('messageArea'),
    turnIndicator: document.getElementById('turnIndicator'),
    playBtn: document.getElementById('playBtn'),
    useConditionBtn: document.getElementById('useConditionBtn'),
    endTurnBtn: document.getElementById('endTurnBtn'),
    passBtn: document.getElementById('passBtn'),
    
    gameMenu: document.getElementById('gameMenu'),
    gameMain: document.getElementById('gameMain'),
    welcomeModal: document.getElementById('welcomeModal'),
    difficultyModal: document.getElementById('difficultyModal'),
    helpModal: document.getElementById('helpModal'),
    counterModal: document.getElementById('counterModal'),
    targetModal: document.getElementById('targetModal'),
    gameOverModal: document.getElementById('gameOverModal'),
    achievementToast: document.getElementById('achievementToast'),
    hellBtn: document.getElementById('hellBtn')
};

// 初始化游戏
function initGame(difficulty = 'easy') {
    gameState = {
        playerHp: 10,
        opponentHp: 10,
        playerHand: [],
        opponentHand: [],
        playerZone: [],
        opponentZone: [],
        deck: [],
        turn: 'player',
        selectedCards: [],
        selectedConditionCard: null,
        targetSubstance: null,
        difficulty: difficulty,
        turnCount: 1,
        isPlayerTurn: true,
        gameOver: false,
        winner: null
    };
    
    // 根据难度加载反应规则
    const rulesDifficulty = convertDifficulty(difficulty);
    const ruleCount = loadRulesByDifficulty(rulesDifficulty);
    
    // 更新UI显示当前难度已解锁的反应数量
    updateDifficultyInfo(difficulty, ruleCount);
    
    ai = createAI(difficulty);
    
    // 设置当前难度用于牌堆生成
    if (typeof setCurrentDifficulty === 'function') {
        setCurrentDifficulty(difficulty);
    }
    
    // 生成牌堆
    gameState.deck = generateDeck();
    
    // 初始化手牌
    for (let i = 0; i < 5; i++) {
        if (gameState.deck.length > 0) {
            gameState.playerHand.push(gameState.deck.pop());
            gameState.opponentHand.push(gameState.deck.pop());
        }
    }

    // 显示难度提示
    showMessage(`游戏开始！难度: ${getDifficultyLabel(difficulty)}，已解锁 ${ruleCount} 个反应`);
    
    // 设置初始按钮状态（玩家回合，按钮可用）
    setPlayerButtonsEnabled(true);
    
    // 更新UI
    updateUI();
}

// 转换难度名称（游戏内使用的名称 vs 规则库使用的名称）
function convertDifficulty(difficulty) {
    const mapping = {
        'easy': 'simple',
        'medium': 'middle',
        'hard': 'hard',
        'hell': 'hard' // 地狱难度使用与困难相同的规则库
    };
    return mapping[difficulty] || 'simple';
}

// 更新难度信息显示
function updateDifficultyInfo(difficulty, ruleCount) {
    const infoElement = document.getElementById('difficultyInfo');
    if (infoElement) {
        infoElement.innerHTML = `
            <span class="difficulty-badge">${getDifficultyLabel(difficulty)}</span>
        `;
    }
}

// 更新UI
function updateUI() {
    // 更新生命值
    elements.playerHp.style.width = `${(gameState.playerHp / 10) * 100}%`;
    elements.playerHpText.textContent = `${gameState.playerHp}/10`;
    
    elements.opponentHp.style.width = `${(gameState.opponentHp / 10) * 100}%`;
    elements.opponentHpText.textContent = `${gameState.opponentHp}/10`;
    
    // 更新手牌数量
    elements.opponentHandCount.textContent = gameState.opponentHand.length;
    
    // 更新手牌区
    renderHand();
    
    // 更新反应区
    renderZone('player');
    renderZone('opponent');
    
    // 更新回合指示器
    if (gameState.isPlayerTurn) {
        elements.turnIndicator.innerHTML = '<span>🔵 你的回合</span>';
        document.querySelector('.beaker-status .status-text').textContent = '你的回合';
    } else {
        elements.turnIndicator.innerHTML = `<span>🔴 ${ai.name}的回合</span>`;
        document.querySelector('.beaker-status .status-text').textContent = `${ai.name}的回合`;
    }
    
    // 更新按钮状态
    updateButtons();
    
    // 更新地狱难度解锁状态
    elements.hellBtn.disabled = !checkHellUnlocked();
}

// 渲染手牌
function renderHand() {
    elements.handCards.innerHTML = '';
    
    gameState.playerHand.forEach(card => {
        const cardElement = createCardElement(card);
        cardElement.addEventListener('click', () => {
            // 添加点击动画
            cardElement.classList.add('card-click');
            setTimeout(() => {
                cardElement.classList.remove('card-click');
            }, 200);
            
            toggleCardSelection(card);
        });
        elements.handCards.appendChild(cardElement);
    });
}

// 创建卡牌元素
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = `card ${card.type}`;
    
    if (gameState.selectedCards.some(c => c.uniqueId === card.uniqueId)) {
        div.classList.add('selected');
    }
    
    if (card.type === CardTypes.ATOM) {
        div.innerHTML = `
            <span class="card-symbol">${card.symbol}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-type">原子</span>
        `;
    } else if (card.type === CardTypes.ION) {
        div.innerHTML = `
            <span class="card-symbol">${card.symbol}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-type">离子</span>
        `;
    } else if (card.type === CardTypes.CONDITION) {
        div.innerHTML = `
            <span class="card-symbol">${card.symbol}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-type">条件</span>
        `;
    } else if (card.type === CardTypes.FUNCTION) {
        div.innerHTML = `
            <span class="card-symbol">${card.symbol}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-type">功能</span>
        `;
    }
    
    div.dataset.uniqueId = card.uniqueId;
    return div;
}

// 创建物质牌元素
function createSubstanceElement(substance, zoneType) {
    const div = document.createElement('div');
    
    // 检查物质是否已经播放过动画
    const isFirstTime = !substance.hasAnimated;
    
    // 只有首次创建时才添加enter类，避免每次都触发动画
    let classes = `card substance ${substance.type}`;
    
    if (isFirstTime) {
        classes += ' enter';
        substance.hasAnimated = true; // 标记为已动画
    }
    
    div.className = classes;
    
    if (substance.damage && substance.damage > 0) {
        div.classList.add(`damage-${substance.damage}`);
    }
    
    div.innerHTML = `
        <span class="card-symbol">${substance.formula}</span>
        <span class="card-name">${substance.name}</span>
        <span class="card-type">${getSubstanceTypeLabel(substance.type)}</span>
    `;
    
    // 如果是玩家回合且是对手区域，允许点击选择目标
    if (gameState.isPlayerTurn && zoneType === 'opponent' && gameState.selectedConditionCard) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => selectTargetSubstance(substance));
    }
    
    div.dataset.uniqueId = substance.uniqueId;
    div.dataset.substanceId = substance.id;
    
    // 只有首次创建时才设置动画完成后的处理
    if (isFirstTime) {
        // 动画完成后移除enter类（为了后续可能的重用）
        setTimeout(() => {
            div.classList.remove('enter');
        }, 500);
    }
    
    return div;
}

// 获取物质类型标签
function getSubstanceTypeLabel(type) {
    const labels = {
        'acid': '酸',
        'base': '碱',
        'precipitate': '沉淀',
        'metal': '金属',
        'oxide': '氧化物',
        'gas': '气体',
        'salt': '盐'
    };
    return labels[type] || type;
}

// 渲染反应区
function renderZone(zoneType) {
    const container = zoneType === 'player' ? elements.playerZoneCards : elements.opponentZoneCards;
    const zone = zoneType === 'player' ? gameState.playerZone : gameState.opponentZone;
    
    container.innerHTML = '';
    
    zone.forEach(substance => {
        const element = createSubstanceElement(substance, zoneType);
        container.appendChild(element);
    });
    
    if (zone.length === 0) {
        container.innerHTML = '<span style="color:#666;">空</span>';
    }
}

// 切换卡牌选择
function toggleCardSelection(card) {
    if (!gameState.isPlayerTurn || gameState.gameOver) return;
    
    const index = gameState.selectedCards.findIndex(c => c.uniqueId === card.uniqueId);
    
    if (index !== -1) {
        // 取消选择
        gameState.selectedCards.splice(index, 1);
    } else {
        // 添加选择（最多选5张）
        if (gameState.selectedCards.length < 5) {
            gameState.selectedCards.push(card);
        } else {
            showMessage('最多选择5张牌！', 'warning');
            return;
        }
    }
    
    // 更新UI
    renderHand();
    
    // 检查是否能组成物质
    checkCombination();
}

// 检查组合
function checkCombination() {
    if (gameState.selectedCards.length === 0) {
        elements.playBtn.disabled = true;
        elements.playBtn.innerHTML = '打出物质';
        updateCombinationPreview(null);
        return;
    }
    
    // 检查是否选中了功能牌（功能牌可以直接使用，不需要组合）
    const selectedFunctionCards = gameState.selectedCards.filter(c => c.type === CardTypes.FUNCTION);
    
    if (selectedFunctionCards.length > 0) {
        // 功能牌只能单独使用
        if (gameState.selectedCards.length === 1) {
            const funcCard = selectedFunctionCards[0];
            elements.playBtn.disabled = false;
            elements.playBtn.innerHTML = `⚡ 使用: ${funcCard.name}`;
            updateCombinationPreview({ 
                formula: funcCard.symbol + ' ' + funcCard.name, 
                name: funcCard.name, 
                damage: 0,
                description: funcCard.effect 
            });
        } else {
            // 功能牌不能和其他牌组合
            elements.playBtn.disabled = true;
            elements.playBtn.innerHTML = '打出物质';
            updateCombinationPreview(null, true);
        }
        return;
    }
    
    // 检查是否能组成物质
    const substance = findSubstanceByComponents(gameState.selectedCards);
    
    if (substance) {
        // 可以组成物质
        elements.playBtn.disabled = false;
        elements.playBtn.innerHTML = `⚡ 打出: ${substance.formula}`;
        updateCombinationPreview(substance);
    } else if (gameState.selectedCards.length === 1) {
        // 只选中一张牌，可以直接打出单个牌到反应区
        const card = gameState.selectedCards[0];
        elements.playBtn.disabled = false;
        elements.playBtn.innerHTML = `⚡ 打出: ${card.symbol}`;
        updateCombinationPreview({ 
            formula: card.symbol, 
            name: card.name, 
            damage: 0,
            description: card.category || '化学元素' 
        });
    } else {
        // 既不能组成物质，也没有选中单张牌
        elements.playBtn.disabled = true;
        elements.playBtn.innerHTML = '打出物质';
        updateCombinationPreview(null, true);
    }
}

// 更新组合预览显示
function updateCombinationPreview(substance, invalid = false) {
    const previewArea = document.getElementById('combinationPreview');
    if (!previewArea) {
        // 创建预览区域
        const handArea = document.getElementById('handArea');
        const preview = document.createElement('div');
        preview.id = 'combinationPreview';
        preview.className = 'combination-preview';
        handArea.insertBefore(preview, document.getElementById('handCards'));
    }
    
    const preview = document.getElementById('combinationPreview');
    
    if (invalid) {
        preview.innerHTML = '<span style="color:#ff4444;">❌ 不符合出牌规则</span>';
    } else if (substance) {
        let damageText = '';
        if (substance.damage > 0) {
            damageText = ` (伤害: ${substance.damage})`;
        }
        preview.innerHTML = `
            <span style="color:#00ffcc;">✨ 打出物质：</span>
            <span style="color:#ffff00; font-weight:bold;">${substance.formula}</span>
            <span style="color:#aaa;">(${substance.name})</span>
            <span style="color:#ff8800;">${damageText}</span>
            <span style="color:#888; font-size:0.8rem;"> | ${substance.description}</span>
        `;
    } else {
        preview.innerHTML = '';
    }
}

// 更新按钮状态
function updateButtons() {
    const hasSelectedCards = gameState.selectedCards.length > 0;
    const hasConditionCard = gameState.playerHand.some(c => c.type === CardTypes.CONDITION);
    const isPlayerTurn = gameState.isPlayerTurn && !gameState.gameOver;
    
    // 检查是否选中了功能牌
    const hasFunctionCard = gameState.selectedCards.length === 1 && 
                           gameState.selectedCards[0]?.type === CardTypes.FUNCTION;
    
    // 打出按钮：选中功能牌时可用，或者选中的牌能组成物质时可用
    elements.playBtn.disabled = !hasSelectedCards || 
                               (!hasFunctionCard && !findSubstanceByComponents(gameState.selectedCards));
    
    elements.useConditionBtn.disabled = !hasConditionCard || !isPlayerTurn;
    elements.endTurnBtn.disabled = !isPlayerTurn;
    elements.passBtn.disabled = !isPlayerTurn;
    
    // 调试信息：显示当前状态
    console.log(`[按钮状态] isPlayerTurn: ${gameState.isPlayerTurn}, gameOver: ${gameState.gameOver}, 
                endTurnBtn.disabled: ${elements.endTurnBtn.disabled}, passBtn.disabled: ${elements.passBtn.disabled}`);
}

// 打出物质/使用功能牌
function playSelectedCards() {
    if (!gameState.isPlayerTurn || gameState.gameOver) return;
    
    // 检查是否选中了功能牌
    const functionCards = gameState.selectedCards.filter(c => c.type === CardTypes.FUNCTION);
    
    if (functionCards.length === 1) {
        // 执行功能牌效果
        useFunctionCard(functionCards[0]);
        return;
    }
    
    const substance = findSubstanceByComponents(gameState.selectedCards);
    if (substance) {
        // 可以组成物质，显示目标选择
        showTargetModal();
        return;
    }
    
    if (gameState.selectedCards.length === 1) {
        // 直接打出单个牌
        showTargetModal();
        return;
    }
    
    showMessage('无法组成物质！请选择正确的元素组合', 'error');
}

// 使用功能牌
function useFunctionCard(card) {
    // 从手牌中移除
    const index = gameState.playerHand.findIndex(c => c.uniqueId === card.uniqueId);
    if (index !== -1) {
        gameState.playerHand.splice(index, 1);
    }
    
    // 清空选择
    gameState.selectedCards = [];
    
    // 根据功能牌类型执行效果
    switch (card.id) {
        case 'purchase':
            // 抽2张牌
            for (let i = 0; i < 2; i++) {
                if (gameState.deck.length > 0) {
                    gameState.playerHand.push(gameState.deck.pop());
                }
            }
            showMessage(`🛒 采购！抽了2张牌，当前手牌: ${gameState.playerHand.length}张`, 'success');
            break;
            
        case 'filter':
            // 仅移除气体形态或沉淀形态的伤害物质
            const removableSubstances = gameState.playerZone.filter(s => 
                s.damage > 0 && (s.type === 'gas' || s.type === 'precipitate')
            );
            
            if (removableSubstances.length > 0) {
                // 移除第一个符合条件的物质
                const removeIndex = gameState.playerZone.findIndex(s => 
                    s.damage > 0 && (s.type === 'gas' || s.type === 'precipitate')
                );
                const removed = gameState.playerZone.splice(removeIndex, 1)[0];
                showMessage(`⚗️ 过滤！移除了 ${removed.formula || removed.name}`, 'success');
            } else {
                showMessage('⚗️ 过滤！没有可移除的气体或沉淀伤害物质', 'warning');
            }
            break;
            
        case 'counter':
            // 反制（保存起来用于抵消条件）
            gameState.counterCard = card;
            showMessage('🛡️ 反制已就绪！', 'success');
            break;
    }
    
    // 更新UI
    updateUI();
}

// 显示目标选择弹窗
function showTargetModal() {
    elements.targetModal.classList.add('show');
}

// 选择目标
function selectTarget(target) {
    const substance = findSubstanceByComponents(gameState.selectedCards);
    const isSingleCard = gameState.selectedCards.length === 1 && !substance;
    
    if (!substance && !isSingleCard) return;
    
    // 从手牌中移除选中的牌
    for (const card of gameState.selectedCards) {
        const index = gameState.playerHand.findIndex(c => c.uniqueId === card.uniqueId);
        if (index !== -1) {
            gameState.playerHand.splice(index, 1);
        }
    }
    
    if (isSingleCard) {
        // 直接打出单个牌
        const card = gameState.selectedCards[0];
        const newSubstance = {
            id: card.id,
            name: card.name,
            formula: card.symbol,
            type: 'atom',
            uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        if (target === 'opponent') {
            gameState.opponentZone.push(newSubstance);
            showMessage(`打出 ${card.symbol} 到对手反应区`);
        } else {
            gameState.playerZone.push(newSubstance);
            showMessage(`打出 ${card.symbol} 到我方反应区`);
        }
        
        // 清空选择
        gameState.selectedCards = [];
        
        // 关闭弹窗
        elements.targetModal.classList.remove('show');
        
        // 触发反应
        resolveZoneReactions(target);
        
        // 更新UI
        updateUI();
        
        // 添加卡牌进入动画
        setTimeout(() => {
            const zoneElement = target === 'opponent' ? elements.opponentZoneCards : elements.playerZoneCards;
            const lastCard = zoneElement.lastElementChild;
            if (lastCard) {
                lastCard.classList.add('card-enter');
                setTimeout(() => {
                    lastCard.classList.remove('card-enter');
                }, 500);
            }
        }, 100);
        
        return;
    }
    
    // 添加物质到目标区域
    const newSubstance = { ...substance, uniqueId: `${substance.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    
    if (target === 'opponent') {
        gameState.opponentZone.push(newSubstance);
        showMessage(`打出 ${substance.formula} 到对手反应区`);
    } else {
        gameState.playerZone.push(newSubstance);
        showMessage(`打出 ${substance.formula} 到我方反应区`);
    }
    
    // 清空选择
    gameState.selectedCards = [];
    
    // 关闭弹窗
    elements.targetModal.classList.remove('show');
    
    // 处理特殊效果
    handleSpecialSubstance(substance, target);
    
    // 触发反应
    resolveZoneReactions(target);
    
    // 更新UI
    updateUI();
    
    // 添加物质进入动画
    setTimeout(() => {
        const zoneElement = target === 'opponent' ? elements.opponentZoneCards : elements.playerZoneCards;
        const lastCard = zoneElement.lastElementChild;
        if (lastCard) {
            lastCard.classList.add('card-enter');
            setTimeout(() => {
                lastCard.classList.remove('card-enter');
            }, 500);
        }
    }, 100);
}

// 处理特殊物质效果
function handleSpecialSubstance(substance, target) {
    if (substance.id === 'O2') {
        // 氧气回复生命
        if (target === 'opponent') {
            gameState.opponentHp = Math.min(10, gameState.opponentHp + 1);
            showMessage('O₂ 回复1点生命！');
        } else {
            gameState.playerHp = Math.min(10, gameState.playerHp + 1);
            showMessage('O₂ 回复1点生命！');
        }
        // 移除O2
        const zone = target === 'opponent' ? gameState.opponentZone : gameState.playerZone;
        const index = zone.findIndex(s => s.id === 'O2');
        if (index !== -1) {
            zone.splice(index, 1);
        }
    }
    
    if (substance.id === 'H2O') {
        // 水回复生命
        if (target === 'opponent') {
            gameState.opponentHp = Math.min(10, gameState.opponentHp + 1);
        } else {
            gameState.playerHp = Math.min(10, gameState.playerHp + 1);
        }
        showMessage('H₂O 回复1点生命！');
        
        // 水的特殊效果 - 扑灭燃烧反应
        if (gameState.activeCountdown) {
            extinguishChainReaction();
            showMessage('💧 水扑灭了燃烧反应！');
        }
    }
    
    // 沙子效果（假设沙子是SiO2）
    if (substance.id === 'SiO2') {
        // 沙子的特殊效果 - 扑灭燃烧反应
        if (gameState.activeCountdown) {
            extinguishChainReaction();
            showMessage('🏖️ 沙子扑灭了燃烧反应！');
        }
    }
}

// 触发区域反应
function resolveZoneReactions(zoneType) {
    const zone = zoneType === 'player' ? gameState.playerZone : gameState.opponentZone;
    const { zone: newZone, reactions } = resolveReactions(zone);
    
    // 更新区域（总是更新，即使没有反应也可能有特殊效果）
    if (zoneType === 'player') {
        gameState.playerZone = newZone;
    } else {
        gameState.opponentZone = newZone;
    }
    
    if (reactions.length > 0) {
        showMessage(`触发 ${reactions.length} 个连锁反应！`);
        
        // 依次显示每个反应的动画
        let delay = 0;
        reactions.forEach((reaction, index) => {
            setTimeout(() => {
                showReactionAnimation(reaction.rule.equation);
                showMessage(`反应 ${index + 1}: ${reaction.rule.name}`);
                
                // 检查是否是放热反应且具有伤害
                if (reaction.rule.isExothermic && reaction.rule.damage) {
                    handleExothermicReaction(reaction.rule, zoneType);
                }
            }, delay);
            delay += 1500;
        });
    }
}

// 显示反应动画
function showReactionAnimation(equation) {
    elements.reactionAnimation.textContent = equation;
    elements.reactionAnimation.classList.add('show');
    
    setTimeout(() => {
        elements.reactionAnimation.classList.remove('show');
    }, 2000);
}

// 处理放热反应
function handleExothermicReaction(rule, zoneType) {
    // 检查是否是连锁反应
    if (rule.chainReaction) {
        // 创建连锁反应对象
        const chainReaction = {
            id: rule.id,
            name: rule.name,
            damage: rule.damage,
            countdown: rule.countdown || 10,
            remainingTime: rule.countdown || 10,
            zoneType: zoneType,
            startTime: Date.now(),
            extinguished: false
        };
        
        // 停止当前的倒计时（如果有）
        stopCountdown();
        
        // 添加到连锁反应列表
        gameState.chainReactions.push(chainReaction);
        gameState.activeCountdown = chainReaction;
        
        // 显示倒计时
        startCountdown(chainReaction);
        showMessage(`⚠️ ${rule.name} 触发连锁反应！${rule.countdown}秒后造成${rule.damage}点伤害！`);
    } else {
        // 直接造成伤害
        applyReactionDamage(rule.damage, zoneType);
        showMessage(`${rule.name} 释放热量，造成${rule.damage}点伤害！`);
    }
}

// 开始倒计时
function startCountdown(chainReaction) {
    // 创建倒计时元素（如果不存在）
    let countdownElement = document.getElementById('countdownTimer');
    if (!countdownElement) {
        countdownElement = document.createElement('div');
        countdownElement.id = 'countdownTimer';
        countdownElement.className = 'countdown-timer';
        elements.gameMain.appendChild(countdownElement);
    }
    
    // 添加启动动画
    countdownElement.classList.add('countdown-start');
    setTimeout(() => {
        countdownElement.classList.remove('countdown-start');
    }, 500);
    
    // 更新倒计时显示
    function updateCountdown() {
        if (!gameState.activeCountdown) return;
        
        gameState.activeCountdown.remainingTime--;
        
        if (gameState.activeCountdown.remainingTime > 0) {
            // 根据剩余时间改变颜色
            let timeColor = '#ffffff';
            let backgroundColor = 'rgba(255, 100, 100, 0.9)';
            
            if (gameState.activeCountdown.remainingTime <= 3) {
                timeColor = '#ff0000';
                backgroundColor = 'rgba(255, 50, 50, 0.95)';
                // 添加紧急动画
                countdownElement.classList.add('countdown-emergency');
            } else if (gameState.activeCountdown.remainingTime <= 5) {
                timeColor = '#ffaa00';
                backgroundColor = 'rgba(255, 150, 50, 0.9)';
            }
            
            countdownElement.style.backgroundColor = backgroundColor;
            
            countdownElement.innerHTML = `
                <div class="countdown-content">
                    <h3 style="color: ${timeColor};">⚠️ 连锁反应</h3>
                    <p>${gameState.activeCountdown.name}</p>
                    <div class="countdown-time" style="color: ${timeColor}; font-size: 24px; font-weight: bold;">
                        ${gameState.activeCountdown.remainingTime}秒
                    </div>
                    <p>将造成${gameState.activeCountdown.damage}点伤害</p>
                    <div class="countdown-progress">
                        <div class="countdown-bar" style="width: ${(gameState.activeCountdown.remainingTime / gameState.activeCountdown.countdown) * 100}%;"></div>
                    </div>
                    <p style="font-size: 12px; margin-top: 5px;">使用水或沙子可以扑灭</p>
                </div>
            `;
            
            // 继续倒计时
            gameState.countdownTimer = setTimeout(updateCountdown, 1000);
        } else {
            // 倒计时结束，造成伤害
            completeCountdown();
        }
    }
    
    // 启动倒计时
    updateCountdown();
}

// 停止倒计时
function stopCountdown() {
    if (gameState.countdownTimer) {
        clearTimeout(gameState.countdownTimer);
        gameState.countdownTimer = null;
    }
    
    // 隐藏倒计时元素
    const countdownElement = document.getElementById('countdownTimer');
    if (countdownElement) {
        countdownElement.innerHTML = '';
        countdownElement.style.display = 'none';
    }
    
    gameState.activeCountdown = null;
}

// 完成倒计时（造成伤害）
function completeCountdown() {
    if (gameState.activeCountdown && !gameState.activeCountdown.extinguished) {
        const damage = gameState.activeCountdown.damage;
        const zoneType = gameState.activeCountdown.zoneType;
        
        // 造成伤害
        applyReactionDamage(damage, zoneType);
        showMessage(`💥 连锁反应爆发！造成${damage}点伤害！`);
    }
    
    // 清理
    stopCountdown();
    gameState.chainReactions = gameState.chainReactions.filter(cr => cr.id !== gameState.activeCountdown?.id);
}

// 应用反应伤害
function applyReactionDamage(damage, zoneType) {
    if (zoneType === 'player') {
        gameState.playerHp = Math.max(0, gameState.playerHp - damage);
    } else {
        gameState.opponentHp = Math.max(0, gameState.opponentHp - damage);
    }
    
    // 检查游戏结束
    checkGameOver();
}

// 扑灭连锁反应
function extinguishChainReaction() {
    if (gameState.activeCountdown) {
        gameState.activeCountdown.extinguished = true;
        showMessage('✅ 成功扑灭连锁反应！');
        stopCountdown();
        gameState.chainReactions = gameState.chainReactions.filter(cr => cr.id !== gameState.activeCountdown.id);
    }
}

// 使用条件牌
function useConditionCard() {
    if (!gameState.isPlayerTurn || gameState.gameOver) return;
    
    const conditionCards = gameState.playerHand.filter(c => c.type === CardTypes.CONDITION);
    if (conditionCards.length === 0) {
        showMessage('没有条件牌！');
        return;
    }
    
    // 简单实现：使用第一张条件牌
    const conditionCard = conditionCards[0];
    
    if (conditionCard.id === 'water') {
        // 水牌作为物质打出
        const water = substances['H2O'];
        const newWater = { ...water, uniqueId: `H2O_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        gameState.playerZone.push(newWater);
        gameState.playerHand = gameState.playerHand.filter(c => c.uniqueId !== conditionCard.uniqueId);
        
        // 水的效果
        gameState.playerHp = Math.min(10, gameState.playerHp + 1);
        showMessage('💧 使用水牌，回复1点生命！');
        
        resolveZoneReactions('player');
        updateUI();
        return;
    }
    
    // 选择目标区域的物质
    gameState.selectedConditionCard = conditionCard;
    showMessage(`选择要对其使用 ${conditionCard.name} 的物质`);
    
    // 更新UI以显示可点击的物质
    renderZone('opponent');
}

// 选择目标物质
function selectTargetSubstance(substance) {
    if (!gameState.selectedConditionCard || !gameState.isPlayerTurn) return;
    
    const conditionCard = gameState.selectedConditionCard;
    
    // 从手牌移除条件牌
    gameState.playerHand = gameState.playerHand.filter(c => c.uniqueId !== conditionCard.uniqueId);
    
    // 应用条件触发反应
    const { zone: newZone, reactions } = resolveReactions(gameState.opponentZone, conditionCard.id);
    gameState.opponentZone = newZone;
    
    if (reactions.length > 0) {
        showReactionAnimation(reactions[0].rule.equation);
        showMessage(`使用 ${conditionCard.name}，触发 ${reactions[0].rule.name}！`);
    } else {
        showMessage(`${conditionCard.name} 未触发任何反应`);
    }
    
    gameState.selectedConditionCard = null;
    updateUI();
}

// 使用功能牌
function useFunctionCard(card) {
    switch (card.id) {
        case 'purchase':
            // 抽2张牌
            for (let i = 0; i < 2; i++) {
                if (gameState.deck.length > 0) {
                    gameState.playerHand.push(gameState.deck.pop());
                }
            }
            showMessage('🛒 采购：抽2张牌');
            break;
            
        case 'filter':
            // 过滤气体或固体
            // 简单实现：移除对手区域的气体
            const filteredZone = gameState.opponentZone.filter(s => s.type !== 'gas');
            const removedCount = gameState.opponentZone.length - filteredZone.length;
            gameState.opponentZone = filteredZone;
            showMessage(`⚗️ 过滤：移除 ${removedCount} 个气体`);
            break;
    }
    
    // 移除使用的牌
    gameState.playerHand = gameState.playerHand.filter(c => c.uniqueId !== card.uniqueId);
}

// 结束玩家回合（带伤害结算）
function endPlayerTurn() {
    console.log('[回合管理] endPlayerTurn 被调用');
    
    if (!gameState.isPlayerTurn) {
        showMessage('还没到你的回合！');
        return;
    }
    
    if (gameState.gameOver) {
        showMessage('游戏已结束！');
        return;
    }
    
    // 禁用按钮防止重复点击
    setPlayerButtonsEnabled(false);
    
    showMessage('结束出牌，回合结算中...');
    
    // 1. 结算伤害（玩家回合结束，结算玩家反应区的伤害）
    settleDamage(true);
    
    // 检查游戏结束
    if (checkGameOver()) {
        console.log('[回合管理] 游戏结束检测通过');
        return;
    }
    
    // 2. 弃掉超出手牌上限的牌（上限7张）
    discardExcessCards('player');
    
    // 3. 切换到AI回合
    gameState.isPlayerTurn = false;
    gameState.selectedCards = [];
    gameState.selectedConditionCard = null;
    
    updateUI();
    
    // 4. 启动AI回合
    if (ai && typeof ai.getAction === 'function') {
        console.log('[回合管理] 启动AI回合');
        const thinkTime = ai.thinkTime || 1000;
        setTimeout(() => startAITurn(), thinkTime);
    } else {
        showMessage('错误：AI未初始化！');
        console.error('AI未正确初始化');
        setPlayerButtonsEnabled(true); // 恢复按钮状态
    }
}

// 跳过回合（不结算伤害）
function skipPlayerTurn() {
    console.log('[回合管理] skipPlayerTurn 被调用');
    
    if (!gameState.isPlayerTurn) {
        showMessage('还没到你的回合！');
        return;
    }
    
    if (gameState.gameOver) {
        showMessage('游戏已结束！');
        return;
    }
    
    // 禁用按钮防止重复点击
    setPlayerButtonsEnabled(false);
    
    showMessage('跳过回合，不进行任何操作');
    
    // 结算伤害（玩家回合结束，结算玩家反应区的伤害）
    settleDamage(true);
    
    // 检查游戏结束
    if (checkGameOver()) {
        console.log('[回合管理] 游戏结束检测通过');
        return;
    }
    
    // 弃掉超出手牌上限的牌
    discardExcessCards('player');
    
    // 切换到AI回合
    gameState.isPlayerTurn = false;
    gameState.selectedCards = [];
    gameState.selectedConditionCard = null;
    
    updateUI();
    
    // 启动AI回合
    if (ai && typeof ai.getAction === 'function') {
        console.log('[回合管理] 跳过回合后启动AI回合');
        const thinkTime = ai.thinkTime || 1000;
        setTimeout(() => startAITurn(), thinkTime);
    } else {
        showMessage('错误：AI未初始化！');
        console.error('AI未正确初始化');
        setPlayerButtonsEnabled(true);
    }
}

// 弃掉超出手牌上限的牌
function discardExcessCards(playerType) {
    const hand = playerType === 'player' ? gameState.playerHand : gameState.opponentHand;
    while (hand.length > 7) {
        hand.pop();
    }
}

// 设置玩家按钮状态
function setPlayerButtonsEnabled(enabled) {
    elements.endTurnBtn.disabled = !enabled;
    elements.passBtn.disabled = !enabled;
    elements.playBtn.disabled = !enabled;
    elements.useConditionBtn.disabled = !enabled;
}

// AI回合自动化流程
function startAITurn() {
    console.log('[AI回合] startAITurn 开始');
    
    if (gameState.gameOver) {
        console.log('[AI回合] 游戏已结束，跳过AI回合');
        return;
    }
    
    showMessage(`${ai.name} 的回合...`);
    
    // AI摸牌
    for (let i = 0; i < 2; i++) {
        if (gameState.deck.length > 0) {
            gameState.opponentHand.push(gameState.deck.pop());
        }
    }
    updateUI();
    
    // AI决策与出牌（异步执行，避免阻塞UI）
    aiTakeAction();
}

// AI决策执行（分步执行，避免阻塞UI）
function aiTakeAction() {
    console.log('[AI回合] AI开始思考...');
    
    const state = {
        hand: gameState.opponentHand,
        opponentZone: gameState.playerZone,
        playerZone: gameState.opponentZone,
        playerHp: gameState.playerHp,
        opponentHp: gameState.opponentHp,
        deck: gameState.deck
    };
    
    const action = ai.getAction(state);
    
    // 分步执行AI动作，避免阻塞
    setTimeout(() => {
        executeAIAction(action);
    }, 1500);
}

// AI回合结束
function endAITurn() {
    console.log('[AI回合] endAITurn 开始');
    
    if (gameState.gameOver) {
        console.log('[AI回合] 游戏已结束，跳过AI回合结束');
        return;
    }
    
    // 结算伤害（AI回合结束，结算AI反应区的伤害）
    settleDamage(false);
    
    // 检查游戏结束
    if (checkGameOver()) {
        console.log('[AI回合] 游戏结束检测通过');
        return;
    }
    
    // AI弃牌
    discardExcessCards('opponent');
    
    // 切换到玩家回合
    gameState.isPlayerTurn = true;
    gameState.turnCount++;
    
    // 玩家摸牌
    for (let i = 0; i < 2; i++) {
        if (gameState.deck.length > 0) {
            gameState.playerHand.push(gameState.deck.pop());
        }
    }
    
    // 启用玩家按钮
    setPlayerButtonsEnabled(true);
    
    showMessage(`--- 回合 ${gameState.turnCount} ---`);
    updateUI();
    
    console.log(`[AI回合] 切换到玩家回合，isPlayerTurn: ${gameState.isPlayerTurn}, 回合: ${gameState.turnCount}`);
}

// 计算伤害
function calculateDamage(zone) {
    let totalDamage = 0;
    
    zone.forEach(substance => {
        if (substance.damage && substance.damage > 0) {
            totalDamage += substance.damage;
        }
    });
    
    return { totalDamage };
}

// 结算伤害（伤害物造成一次伤害后立即移除）
// 参数 isPlayerTurnEnd: true表示玩家回合结束，false表示AI回合结束
function settleDamage(isPlayerTurnEnd) {
    if (isPlayerTurnEnd) {
        // 玩家回合结束：结算玩家反应区的伤害物质对玩家造成的伤害（AI之前打出的伤害）
        const playerDamage = calculateDamage(gameState.playerZone);
        gameState.playerHp -= playerDamage.totalDamage;
        
        if (playerDamage.totalDamage > 0) {
            showMessage(`你受到 ${playerDamage.totalDamage} 点伤害！`);
            // 移除玩家反应区中的所有伤害物
            const damageCount = gameState.playerZone.filter(s => s.damage && s.damage > 0).length;
            gameState.playerZone = gameState.playerZone.filter(s => !(s.damage && s.damage > 0));
            if (damageCount > 0) {
                console.log(`[伤害结算] 玩家回合结束，移除了 ${damageCount} 个玩家反应区的伤害物`);
            }
        }
    } else {
        // AI回合结束：结算AI反应区的伤害物质对AI造成的伤害（玩家之前打出的伤害）
        const aiDamage = calculateDamage(gameState.opponentZone);
        gameState.opponentHp -= aiDamage.totalDamage;
        
        if (aiDamage.totalDamage > 0) {
            showMessage(`对手受到 ${aiDamage.totalDamage} 点伤害！`);
            // 移除AI反应区中的所有伤害物
            const damageCount = gameState.opponentZone.filter(s => s.damage && s.damage > 0).length;
            gameState.opponentZone = gameState.opponentZone.filter(s => !(s.damage && s.damage > 0));
            if (damageCount > 0) {
                console.log(`[伤害结算] AI回合结束，移除了 ${damageCount} 个AI反应区的伤害物`);
            }
        }
    }
}

// 检查游戏结束
function checkGameOver() {
    if (gameState.opponentHp <= 0) {
        gameState.gameOver = true;
        gameState.winner = 'player';
        showGameOver('胜利！', '🎉 恭喜你击败了对手！');
        
        // 更新胜利次数
        incrementWinCount(gameState.difficulty);
        
        return true;
    }
    
    if (gameState.playerHp <= 0) {
        gameState.gameOver = true;
        gameState.winner = 'opponent';
        showGameOver('失败！', '😢 你被对手击败了！');
        return true;
    }
    
    return false;
}

// AI回合
function aiTurn() {
    if (gameState.gameOver) return;
    
    showMessage(`${ai.name} 的回合...`);
    
    // AI思考
    const state = {
        hand: gameState.opponentHand,
        opponentZone: gameState.playerZone,
        playerZone: gameState.opponentZone,
        playerHp: gameState.playerHp,
        opponentHp: gameState.opponentHp,
        deck: gameState.deck
    };
    
    const action = ai.getAction(state);
    
    setTimeout(() => executeAIAction(action), 1500);
}

// 执行AI动作
function executeAIAction(action) {
    if (gameState.gameOver) return;
    
    switch (action.type) {
        case 'play':
            handleAIPlayAction(action);
            break;
        case 'condition':
            handleAIConditionAction(action);
            break;
        case 'function':
            handleAIFunctionAction(action);
            break;
        default:
            // AI回合结束（默认情况）
            setTimeout(() => endAITurn(), 1000);
    }
}

// 处理AI打出物质的动作
function handleAIPlayAction(action) {
    const { cards, substance, target } = action;
    
    // 从AI手牌移除
    removeAICards(cards);
    
    // 添加到目标区域
    addSubstanceToZone(substance, target);
    
    // 处理特殊效果
    handleSpecialSubstance(substance, target);
    
    // 立即更新UI，显示AI的动作
    updateUI();
    
    // 触发反应
    const zone = target === 'player' ? gameState.playerZone : gameState.opponentZone;
    const { zone: newZone, reactions } = resolveReactions(zone);
    
    // 更新区域
    updateZoneAfterReaction(newZone, target);
    
    // 立即更新UI，显示反应结果
    updateUI();
    
    // 等待反应动画完成后再结束回合
    const reactionDelay = reactions.length * 1500;
    setTimeout(() => endAITurn(), 1000 + reactionDelay);
}

// 处理AI使用条件牌的动作
function handleAIConditionAction(action) {
    const { card, targetZone } = action;
    
    // 检查是否可以反制
    if ((card.id === 'heat' || card.id === 'ignite') && canCounter()) {
        showCounterModal(card);
        return; // 等待玩家反制
    }
    
    // 从手牌移除
    gameState.opponentHand = gameState.opponentHand.filter(c => c.id === card.id);
    
    // 应用条件
    const zone = targetZone === 'player' ? gameState.playerZone : gameState.opponentZone;
    const { zone: newZone, reactions } = resolveReactions(zone, card.id);
    
    // 更新区域
    if (targetZone === 'player') {
        gameState.playerZone = newZone;
    } else {
        gameState.opponentZone = newZone;
    }
    
    // 立即更新UI，显示条件牌效果
    updateUI();
    
    if (reactions.length > 0) {
        showReactionAnimation(reactions[0].rule.equation);
        showMessage(`${ai.name} 使用 ${card.name}，触发 ${reactions[0].rule.name}！`);
    }
    
    // 等待反应动画完成后再结束回合
    const reactionDelay = reactions.length * 1500;
    setTimeout(() => endAITurn(), 1000 + reactionDelay);
}

// 处理AI使用功能牌的动作
function handleAIFunctionAction(action) {
    const { card } = action;
    
    if (card.id === 'purchase') {
        for (let i = 0; i < 2; i++) {
            if (gameState.deck.length > 0) {
                gameState.opponentHand.push(gameState.deck.pop());
            }
        }
        showMessage(`${ai.name} 使用采购，抽了2张牌`);
    }
    
    // 移除使用的牌
    gameState.opponentHand = gameState.opponentHand.filter(c => c.id === card.id);
    
    // 立即更新UI，显示功能牌效果
    updateUI();
    
    // 结束回合
    setTimeout(() => endAITurn(), 1000);
}

// 从AI手牌移除卡片
function removeAICards(cards) {
    for (const card of cards) {
        const index = gameState.opponentHand.findIndex(c => c.id === card.id);
        if (index !== -1) {
            gameState.opponentHand.splice(index, 1);
        }
    }
}

// 添加物质到目标区域
function addSubstanceToZone(substance, target) {
    const newSubstance = { ...substance, uniqueId: `${substance.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    
    if (target === 'player') {
        gameState.playerZone.push(newSubstance);
        showMessage(`${ai.name} 打出 ${substance.formula} 到你的反应区`);
    } else {
        gameState.opponentZone.push(newSubstance);
        showMessage(`${ai.name} 打出 ${substance.formula}`);
    }
}

// 更新反应后的区域
function updateZoneAfterReaction(newZone, target) {
    if (target === 'player') {
        gameState.playerZone = newZone;
    } else {
        gameState.opponentZone = newZone;
    }
}

// 检查是否可以反制
function canCounter() {
    return gameState.playerHand.some(c => c.id === 'water');
}

// 显示反制弹窗
function showCounterModal(card) {
    document.getElementById('counterCondition').textContent = card.name;
    elements.counterModal.classList.add('show');
}

// 反制动作
function counterAction(doCounter) {
    elements.counterModal.classList.remove('show');
    
    if (doCounter) {
        // 使用水牌反制
        const waterCard = gameState.playerHand.find(c => c.id === 'water');
        if (waterCard) {
            gameState.playerHand = gameState.playerHand.filter(c => c.uniqueId !== waterCard.uniqueId);
            showMessage('💧 成功反制！对方的条件无效！');
        }
    } else {
        showMessage('不使用反制');
        // 继续执行AI的条件牌效果
        // 这里需要重新执行之前的动作
    }
    
    // AI回合继续
    setTimeout(() => endAITurn(), 500);
}

// AI回合结束
function endAITurn() {
    if (gameState.gameOver) {
        console.log('[回合结束] 游戏已结束，跳过AI回合结束');
        return;
    }
    
    console.log('[回合结束] AI回合结束，开始结算');
    
    // 结算伤害
    settleDamage();
    
    if (checkGameOver()) {
        console.log('[回合结束] 游戏结束检测通过');
        return;
    }
    
    // AI摸牌
    for (let i = 0; i < 2; i++) {
        if (gameState.deck.length > 0) {
            gameState.opponentHand.push(gameState.deck.pop());
        }
    }
    
    // AI弃牌
    while (gameState.opponentHand.length > 7) {
        gameState.opponentHand.pop();
    }
    
    // 切换到玩家回合
    gameState.isPlayerTurn = true;
    gameState.turnCount++;
    gameState.selectedCards = [];
    gameState.selectedConditionCard = null;
    
    // 玩家摸牌
    for (let i = 0; i < 2; i++) {
        if (gameState.deck.length > 0) {
            gameState.playerHand.push(gameState.deck.pop());
        }
    }
    
    showMessage(`--- 回合 ${gameState.turnCount} ---`);
    updateUI();
    
    console.log(`[回合结束] 切换到玩家回合，isPlayerTurn: ${gameState.isPlayerTurn}, 回合: ${gameState.turnCount}`);
}

// 显示消息
function showMessage(message, type = 'info') {
    // 清除之前的消息和动画
    elements.messageArea.textContent = '';
    elements.messageArea.className = 'message-area';
    
    // 添加消息类型类
    elements.messageArea.classList.add(`message-${type}`);
    
    // 设置消息内容
    elements.messageArea.textContent = message;
    
    // 添加显示动画
    elements.messageArea.classList.add('message-show');
    
    // 3秒后自动清除
    setTimeout(() => {
        if (elements.messageArea.textContent === message) {
            elements.messageArea.classList.remove('message-show');
            elements.messageArea.classList.add('message-hide');
            setTimeout(() => {
                elements.messageArea.textContent = '';
                elements.messageArea.className = 'message-area';
            }, 300);
        }
    }, 3000);
}

// 显示游戏结束
function showGameOver(title, message) {
    document.getElementById('gameOverTitle').textContent = title;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('finalDifficulty').textContent = getDifficultyLabel(gameState.difficulty);
    document.getElementById('finalTurns').textContent = gameState.turnCount;
    elements.gameOverModal.classList.add('show');
}

// 获取难度标签
function getDifficultyLabel(difficulty) {
    const labels = {
        'easy': '简单',
        'medium': '中等',
        'hard': '困难',
        'hell': '地狱'
    };
    return labels[difficulty] || difficulty;
}

// 显示成就
function showAchievement(text) {
    document.getElementById('achievementText').textContent = text;
    elements.achievementToast.classList.add('show');
    
    setTimeout(() => {
        elements.achievementToast.classList.remove('show');
    }, 3000);
}

// 菜单功能
function showMenu() {
    elements.gameMenu.classList.add('show');
}

function closeMenu() {
    elements.gameMenu.classList.remove('show');
}

function restartGame() {
    elements.gameMenu.classList.remove('show');
    elements.gameOverModal.classList.remove('show');
    initGame(gameState.difficulty);
}

function changeDifficulty() {
    elements.gameMenu.classList.remove('show');
    elements.difficultyModal.classList.add('show');
}

function closeWelcomeModal() {
    console.log('[界面管理] closeWelcomeModal 被调用');
    
    // 隐藏欢迎弹窗
    elements.welcomeModal.classList.remove('show');
    
    // 显示游戏主界面
    elements.gameMain.style.display = '';
    
    // 如果还没有初始化游戏，使用默认难度初始化
    if (!gameState.playerHand || gameState.playerHand.length === 0) {
        console.log('[界面管理] 游戏未初始化，使用默认难度启动');
        initGame(gameState.difficulty || 'easy');
    }
}

function closeDifficultyModal() {
    elements.difficultyModal.classList.remove('show');
}

function setDifficulty(difficulty) {
    console.log('[界面管理] setDifficulty: ' + difficulty);
    
    // 关闭欢迎弹窗
    elements.welcomeModal.classList.remove('show');
    elements.difficultyModal.classList.remove('show');
    
    // 显示游戏主界面
    elements.gameMain.style.display = '';
    
    // 设置难度并初始化游戏
    gameState.difficulty = difficulty;
    initGame(difficulty);
}

function showHelp() {
    elements.gameMenu.classList.remove('show');
    elements.helpModal.classList.add('show');
}

function closeHelpModal() {
    elements.helpModal.classList.remove('show');
}

function goHome() {
    window.location.href = '../../主页.html';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查地狱难度解锁状态
    elements.hellBtn.disabled = !checkHellUnlocked();
    
    // 显示欢迎引导页面（作为模态遮罩层，覆盖游戏主界面）
    elements.welcomeModal.classList.add('show');
});

// 更新主页的小游戏按钮链接
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否在游戏页面
    if (window.location.pathname.includes('chemistry_kill')) {
        // 初始化游戏逻辑
    }
});