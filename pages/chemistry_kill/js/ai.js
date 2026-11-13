// AI难度级别
const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    HELL: 'hell'
};

// 辅助函数：获取区域中的金属
function getMetalsInZone(zone) {
    return zone.filter(substance => {
        // 假设金属单质的id是单个元素符号且为金属
        const metalSymbols = ['Na', 'Ca', 'Fe', 'Zn', 'Mg', 'Cu', 'K', 'Al', 'Ag', 'Ba'];
        return metalSymbols.includes(substance.id);
    });
}

// 辅助函数：检查是否能形成沉淀
function canFormPrecipitate(anionId, metalId) {
    // 简单的沉淀规则
    const precipitateRules = {
        'CO3-2': ['Ca', 'Ba', 'Fe', 'Zn', 'Mg', 'Cu', 'Al', 'Ag'],
        'SO4-2': ['Ca', 'Ba', 'Pb'],
        'Cl-': ['Ag', 'Pb'],
        'OH-': ['Ca', 'Fe', 'Zn', 'Mg', 'Cu', 'Al', 'Ag', 'Ba']
    };
    
    // 转换阴离子格式
    const normalizedAnion = anionId.replace('-', '-');
    
    for (const [anion, metals] of Object.entries(precipitateRules)) {
        if (anion === normalizedAnion && metals.includes(metalId)) {
            return {
                id: `${metalId}${anion.replace('-', '')}`,
                name: `${metalId}${anion}`,
                formula: `${metalId}${anion}`,
                type: 'precipitate',
                damage: 1,
                components: [metalId, anionId]
            };
        }
    }
    
    return null;
}

// 简单难度AI - 小学生水平
class EasyAI {
    constructor() {
        this.name = '小学生';
        this.thinkTime = 2000; // 思考时间（毫秒）
        this.aggression = 0.5; // 攻击性（0-1）
        this.strategyComplexity = 1; // 策略复杂度
    }

    getAction(state) {
        const { hand, opponentZone, playerZone } = state;
        
        // 1. 优先尝试使用功能牌（采购）
        const functionCards = hand.filter(c => c.type === CardTypes.FUNCTION);
        if (functionCards.length > 0 && hand.length < 5) {
            return {
                type: 'function',
                card: functionCards[0]
            };
        }
        
        // 2. 尝试组合物质
        const combinations = this.findValidCombinations(hand);
        if (combinations.length > 0) {
            // 优先选择有伤害的物质
            const damageCombinations = combinations.filter(c => c.substance.damage > 0);
            let selectedCombo;
            
            if (damageCombinations.length > 0) {
                selectedCombo = damageCombinations[0];
                // 伤害物质优先打向玩家
                return {
                    type: 'play',
                    cards: selectedCombo.cards,
                    substance: selectedCombo.substance,
                    target: 'player'
                };
            } else {
                selectedCombo = combinations[0];
                // 普通物质随机选择目标
                return {
                    type: 'play',
                    cards: selectedCombo.cards,
                    substance: selectedCombo.substance,
                    target: Math.random() > 0.5 ? 'player' : 'opponent'
                };
            }
        }
        
        // 3. 使用条件牌
        const conditionCards = hand.filter(c => c.type === CardTypes.CONDITION);
        if (conditionCards.length > 0) {
            const conditionCard = conditionCards[Math.floor(Math.random() * conditionCards.length)];
            return {
                type: 'condition',
                card: conditionCard,
                targetZone: Math.random() > 0.5 ? 'player' : 'opponent'
            };
        }
        
        // 4. 如果手牌满7张，尝试弃牌（通过打一张牌）
        if (hand.length >= 7) {
            const card = hand[0];
            return {
                type: 'play',
                cards: [card],
                substance: null,
                target: 'opponent'
            };
        }
        
        // 结束回合
        return { type: 'end' };
    }

    findValidCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (this.canFormSubstance(cardIds, substance.components)) {
                const cards = substance.components.map(compId => 
                    hand.find(c => c.id === compId)
                ).filter(Boolean);
                if (cards.length === substance.components.length) {
                    results.push({ cards, substance });
                }
            }
        }
        
        return results;
    }

    canFormSubstance(available, required) {
        const availableCopy = [...available];
        for (const req of required) {
            const index = availableCopy.indexOf(req);
            if (index === -1) return false;
            availableCopy.splice(index, 1);
        }
        return true;
    }

    shouldCounter(condition) {
        // 简单AI不会反制
        return false;
    }
}

// 中等难度AI - 初中生水平
class MediumAI {
    constructor() {
        this.name = '初中生';
        this.thinkTime = 1500; // 思考时间（毫秒）
        this.aggression = 0.7; // 攻击性（0-1）
        this.strategyComplexity = 2; // 策略复杂度
    }

    getAction(state) {
        const { hand, opponentZone, playerZone, playerHp } = state;
        
        // 1. 优先使用功能牌（采购）
        const functionCards = hand.filter(c => c.type === CardTypes.FUNCTION);
        if (functionCards.length > 0 && hand.length < 5) {
            return {
                type: 'function',
                card: functionCards[0]
            };
        }
        
        // 2. 优先尝试打出伤害物
        const damageSubstances = this.findDamageCombinations(hand);
        if (damageSubstances.length > 0) {
            // 按伤害排序
            damageSubstances.sort((a, b) => b.substance.damage - a.substance.damage);
            
            // 如果能秒杀，直接打
            const bestDamage = damageSubstances[0].substance.damage;
            if (bestDamage >= playerHp) {
                const { cards, substance } = damageSubstances[0];
                return {
                    type: 'play',
                    cards: cards,
                    substance: substance,
                    target: 'player'
                };
            }
            
            // 否则有80%概率打伤害
            if (Math.random() > 0.2) {
                const { cards, substance } = damageSubstances[0];
                return {
                    type: 'play',
                    cards: cards,
                    substance: substance,
                    target: 'player'
                };
            }
        }
        
        // 3. 尝试使用条件牌触发反应
        const conditionCards = hand.filter(c => c.type === CardTypes.CONDITION);
        for (const conditionCard of conditionCards) {
            if (conditionCard.id === 'heat') {
                // 检查对手区域是否有可分解的物质
                const decomposable = playerZone.filter(s => 
                    ['CaCO3', 'NaHCO3', 'H2CO3'].includes(s.id)
                );
                if (decomposable.length > 0) {
                    return {
                        type: 'condition',
                        card: conditionCard,
                        targetZone: 'player'
                    };
                }
            } else if (conditionCard.id === 'water') {
                // 检查对手区域是否有金属
                const metals = getMetalsInZone(playerZone);
                if (metals.length > 0) {
                    return {
                        type: 'condition',
                        card: conditionCard,
                        targetZone: 'player'
                    };
                }
            }
        }
        
        // 4. 尝试普通组合
        const combinations = this.findValidCombinations(hand);
        if (combinations.length > 0) {
            // 优先选择对玩家有利的组合
            const bestCombo = combinations[0];
            return {
                type: 'play',
                cards: bestCombo.cards,
                substance: bestCombo.substance,
                target: Math.random() > 0.4 ? 'player' : 'opponent' // 60%概率打向玩家
            };
        }
        
        // 5. 如果手牌满7张，尝试弃牌
        if (hand.length >= 7) {
            const card = hand[0];
            return {
                type: 'play',
                cards: [card],
                substance: null,
                target: 'opponent'
            };
        }
        
        return { type: 'end' };
    }

    findDamageCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (substance.damage && substance.damage > 0) {
                if (this.canFormSubstance(cardIds, substance.components)) {
                    const cards = substance.components.map(compId => 
                        hand.find(c => c.id === compId)
                    ).filter(Boolean);
                    if (cards.length === substance.components.length) {
                        results.push({ cards, substance });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.substance.damage - a.substance.damage);
    }

    findValidCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (this.canFormSubstance(cardIds, substance.components)) {
                const cards = substance.components.map(compId => 
                    hand.find(c => c.id === compId)
                ).filter(Boolean);
                if (cards.length === substance.components.length) {
                    results.push({ cards, substance });
                }
            }
        }
        
        return results;
    }

    canFormSubstance(available, required) {
        const availableCopy = [...available];
        for (const req of required) {
            const index = availableCopy.indexOf(req);
            if (index === -1) return false;
            availableCopy.splice(index, 1);
        }
        return true;
    }

    shouldCounter(condition) {
        // 50%概率反制
        return Math.random() > 0.5;
    }
}

// 困难难度AI - 高中生水平
class HardAI {
    constructor() {
        this.name = '高中生';
        this.thinkTime = 1000; // 思考时间（毫秒）
        this.aggression = 0.85; // 攻击性（0-1）
        this.strategyComplexity = 3; // 策略复杂度
    }

    getAction(state) {
        const { hand, opponentZone, playerZone, playerHp, opponentHp } = state;
        
        // 计算斩杀线
        const damageNeeded = playerHp;
        const possibleDamage = this.calculatePotentialDamage(hand);
        
        // 如果能斩杀，直接打出伤害
        if (possibleDamage >= damageNeeded) {
            const combo = this.findKillingCombo(hand, damageNeeded);
            if (combo) {
                return {
                    type: 'play',
                    cards: combo.cards,
                    substance: combo.substance,
                    target: 'player'
                };
            }
        }
        
        // 优先：评估能触发有害反应的出牌（如Na+水、K+水等）
        const reactionDamageCombo = this.findBestReactionDamageCombo(hand, playerZone);
        if (reactionDamageCombo) {
            return {
                type: 'play',
                cards: reactionDamageCombo.cards,
                substance: reactionDamageCombo.substance,
                target: 'player'
            };
        }
        
        // 检查对手区域是否有金属，用阴离子打击
        const metals = getMetalsInZone(playerZone);
        if (metals.length > 0) {
            const anionCombo = this.findAnionMetalCombo(hand, metals);
            if (anionCombo && Math.random() > 0.2) {
                return {
                    type: 'play',
                    cards: anionCombo.cards,
                    substance: anionCombo.substance,
                    target: 'player'
                };
            }
        }
        
        // 尝试触发反应链
        const reactionCombo = this.findReactionCombo(hand, playerZone);
        if (reactionCombo) {
            return {
                type: 'play',
                cards: reactionCombo.cards,
                substance: reactionCombo.substance,
                target: 'player'
            };
        }
        
        // 考虑向自己区域打出物质来中和威胁
        const defenseCombo = this.findBestDefenseCombo(hand, opponentZone);
        if (defenseCombo && this.evaluateDefenseBenefit(defenseCombo.substance, opponentZone) > 1) {
            return {
                type: 'play',
                cards: defenseCombo.cards,
                substance: defenseCombo.substance,
                target: 'opponent'
            };
        }
        
        // 使用升温分解对手的防御物质
        const heatCards = hand.filter(c => c.id === 'heat');
        if (heatCards.length > 0) {
            const decomposable = playerZone.filter(s => 
                ['CaCO3', 'NaHCO3'].includes(s.id)
            );
            if (decomposable.length > 0) {
                return {
                    type: 'condition',
                    card: heatCards[0],
                    targetZone: 'player'
                };
            }
        }
        
        // 保留反制牌，优先使用其他功能牌
        const functionCards = hand.filter(c => c.type === CardTypes.FUNCTION && c.id !== 'counter');
        if (functionCards.length > 0) {
            if (functionCards.some(c => c.id === 'purchase') && hand.length < 6) {
                return {
                    type: 'function',
                    card: functionCards.find(c => c.id === 'purchase')
                };
            }
        }
        
        // 打出非伤害物建立场面对峙
        const nonDamageCombo = this.findNonDamageCombo(hand);
        if (nonDamageCombo && Math.random() > 0.4) {
            return {
                type: 'play',
                cards: nonDamageCombo.cards,
                substance: nonDamageCombo.substance,
                target: 'opponent'
            };
        }
        
        return { type: 'end' };
    }

    // 找到能触发最大反应伤害的组合
    findBestReactionDamageCombo(hand, targetZone) {
        const combinations = this.findValidCombinations(hand);
        let bestCombo = null;
        let bestScore = 0;
        
        for (const combo of combinations) {
            const score = this.evaluateReactionDamage(combo.substance, targetZone);
            if (score > bestScore && score >= 1) { // 至少要有1点预期伤害
                bestScore = score;
                bestCombo = combo;
            }
        }
        
        return bestCombo;
    }

    // 找到最佳防御组合
    findBestDefenseCombo(hand, ownZone) {
        const combinations = this.findValidCombinations(hand);
        let bestCombo = null;
        let bestScore = 0;
        
        for (const combo of combinations) {
            const score = this.evaluateDefenseBenefit(combo.substance, ownZone);
            if (score > bestScore) {
                bestScore = score;
                bestCombo = combo;
            }
        }
        
        return bestCombo;
    }

    calculatePotentialDamage(hand) {
        let total = 0;
        const damageCombos = this.findDamageCombinations(hand);
        for (const combo of damageCombos) {
            total += combo.substance.damage;
        }
        return total;
    }

    findKillingCombo(hand, damageNeeded) {
        const damageCombos = this.findDamageCombinations(hand);
        let accumulated = 0;
        const cards = [];
        
        for (const combo of damageCombos) {
            if (accumulated >= damageNeeded) break;
            accumulated += combo.substance.damage;
            cards.push(...combo.cards);
            
            if (accumulated >= damageNeeded) {
                return { cards, substance: combo.substance };
            }
        }
        
        return null;
    }

    findDamageCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (substance.damage && substance.damage > 0) {
                if (this.canFormSubstance(cardIds, substance.components)) {
                    const cards = substance.components.map(compId => 
                        hand.find(c => c.id === compId)
                    ).filter(Boolean);
                    if (cards.length === substance.components.length) {
                        results.push({ cards, substance });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.substance.damage - a.substance.damage);
    }

    findAnionMetalCombo(hand, metals) {
        const anions = hand.filter(c => c.type === CardTypes.ION && c.charge < 0);
        
        for (const anion of anions) {
            for (const metal of metals) {
                const precipitate = canFormPrecipitate(anion.id, metal.id);
                if (precipitate) {
                    return {
                        cards: [anion],
                        substance: precipitate
                    };
                }
            }
        }
        
        return null;
    }

    findReactionCombo(hand, zone) {
        const combinations = this.findValidCombinations(hand);
        let bestCombo = null;
        let bestScore = 0;
        
        for (const combo of combinations) {
            const score = this.evaluateReactionDamage(combo.substance, zone);
            if (score > bestScore) {
                bestScore = score;
                bestCombo = combo;
            }
        }
        
        return bestCombo;
    }

    // 评估打出物质到目标区域后的反应伤害收益
    evaluateReactionDamage(substance, targetZone) {
        // 创建模拟区域
        const tempZone = [...targetZone, substance];
        const { zone: finalZone, reactions } = resolveReactions(tempZone);
        
        // 计算最终区域中的伤害物总伤害
        const { totalDamage } = calculateDamage(finalZone);
        
        // 额外考虑反应数量（连锁反应越多越好）
        const reactionBonus = reactions.length * 0.5;
        
        // 如果能生成强碱/强酸，给予额外奖励
        let bonus = 0;
        for (const s of finalZone) {
            if (s.damage >= 2) {
                bonus += 1; // 强酸强碱额外加分
            }
        }
        
        return totalDamage + reactionBonus + bonus;
    }

    // 评估向自己区域打出物质的防御收益（中和威胁）
    evaluateDefenseBenefit(substance, ownZone) {
        const tempZone = [...ownZone, substance];
        const { zone: finalZone, reactions } = resolveReactions(tempZone);
        
        // 计算反应前的威胁值（伤害物数量）
        const beforeThreat = ownZone.filter(s => s.damage > 0).length;
        const afterThreat = finalZone.filter(s => s.damage > 0).length;
        
        // 如果威胁减少了，返回正值
        const threatReduction = beforeThreat - afterThreat;
        
        // 额外考虑是否清除了有害气体
        const gasRemoved = ownZone.filter(s => s.type === 'gas').length - 
                          finalZone.filter(s => s.type === 'gas').length;
        
        return threatReduction + gasRemoved * 0.5;
    }

    findNonDamageCombo(hand) {
        const combinations = this.findValidCombinations(hand);
        return combinations.find(c => c.substance.damage === 0);
    }

    findValidCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (this.canFormSubstance(cardIds, substance.components)) {
                const cards = substance.components.map(compId => 
                    hand.find(c => c.id === compId)
                ).filter(Boolean);
                if (cards.length === substance.components.length) {
                    results.push({ cards, substance });
                }
            }
        }
        
        return results;
    }

    canFormSubstance(available, required) {
        const availableCopy = [...available];
        for (const req of required) {
            const index = availableCopy.indexOf(req);
            if (index === -1) return false;
            availableCopy.splice(index, 1);
        }
        return true;
    }

    shouldCounter(condition) {
        // 70%概率反制
        return Math.random() > 0.3;
    }
}

// 地狱难度AI - 知晓一切
class HellAI {
    constructor() {
        this.name = '元素之主';
        this.thinkTime = 500; // 思考时间（毫秒）
        this.aggression = 1.0; // 攻击性（0-1）
        this.strategyComplexity = 4; // 策略复杂度
    }

    getAction(state) {
        const { hand, opponentZone, playerZone, playerHp, opponentHp, deck, playerHand } = state;
        
        // 地狱AI知道牌堆顺序和玩家手牌
        // 执行理论最优解
        
        // 计算最优伤害
        const bestAction = this.findOptimalAction(hand, playerZone, playerHp, deck);
        
        if (bestAction) {
            return bestAction;
        }
        
        return { type: 'end' };
    }

    findOptimalAction(hand, playerZone, playerHp, deck) {
        // 找到能造成最大伤害的组合
        let bestDamage = 0;
        let bestCombo = null;
        
        const combinations = this.findAllCombinations(hand);
        
        for (const combo of combinations) {
            // 计算该物质造成的伤害
            let damage = combo.substance.damage || 0;
            
            // 预测反应链造成的额外伤害
            const tempZone = [...playerZone, combo.substance];
            const { zone: finalZone } = resolveReactions(tempZone);
            const { totalDamage } = calculateDamage(finalZone);
            damage += totalDamage;
            
            if (damage > bestDamage) {
                bestDamage = damage;
                bestCombo = combo;
            }
        }
        
        if (bestCombo && bestDamage > 0) {
            return {
                type: 'play',
                cards: bestCombo.cards,
                substance: bestCombo.substance,
                target: 'player'
            };
        }
        
        // 如果没有伤害组合，尝试生成任何可能的物质
        if (combinations.length > 0) {
            // 选择第一个可用的组合
            const firstCombo = combinations[0];
            return {
                type: 'play',
                cards: firstCombo.cards,
                substance: firstCombo.substance,
                target: 'opponent' // 放到自己的反应区
            };
        }
        
        // 如果没有伤害组合，尝试控制
        const heatCards = hand.filter(c => c.id === 'heat');
        if (heatCards.length > 0) {
            const decomposable = playerZone.filter(s => 
                ['CaCO3', 'NaHCO3'].includes(s.id)
            );
            if (decomposable.length > 0) {
                return {
                    type: 'condition',
                    card: heatCards[0],
                    targetZone: 'player'
                };
            }
        }
        
        // 使用采购过牌
        const purchaseCards = hand.filter(c => c.id === 'purchase');
        if (purchaseCards.length > 0 && hand.length < 7) {
            return {
                type: 'function',
                card: purchaseCards[0]
            };
        }
        
        return null;
    }

    findAllCombinations(hand) {
        const results = [];
        const cardIds = hand.map(c => c.id);
        
        for (const [key, substance] of Object.entries(substances)) {
            if (this.canFormSubstance(cardIds, substance.components)) {
                const cards = substance.components.map(compId => 
                    hand.find(c => c.id === compId)
                ).filter(Boolean);
                if (cards.length === substance.components.length) {
                    results.push({ cards, substance });
                }
            }
        }
        
        return results;
    }

    canFormSubstance(available, required) {
        const availableCopy = [...available];
        for (const req of required) {
            const index = availableCopy.indexOf(req);
            if (index === -1) return false;
            availableCopy.splice(index, 1);
        }
        return true;
    }

    shouldCounter(condition) {
        // 100%反制
        return true;
    }
}

// AI工厂函数
function createAI(difficulty) {
    switch (difficulty) {
        case Difficulty.EASY:
            return new EasyAI();
        case Difficulty.MEDIUM:
            return new MediumAI();
        case Difficulty.HARD:
            return new HardAI();
        case Difficulty.HELL:
            return new HellAI();
        default:
            return new EasyAI();
    }
}

// 检查是否解锁地狱难度
function checkHellUnlocked() {
    const wins = localStorage.getItem('chemistry_kill_hard_wins') || '0';
    return parseInt(wins) >= 50;
}

// 增加胜利次数
function incrementWinCount(difficulty) {
    if (difficulty === Difficulty.HARD) {
        const current = parseInt(localStorage.getItem('chemistry_kill_hard_wins') || '0');
        localStorage.setItem('chemistry_kill_hard_wins', (current + 1).toString());
    }
}

