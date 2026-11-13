    // ======================= 化学方程式库（合理挖空版） =======================
    // 挖空类型：
    // 1. 系数挖空：如 "2H₂O" → "___H₂O" ，正确答案是 "2"
    // 2. 整个化学式挖空：如 "H₂O" → "___" ，正确答案是 "H₂O"
    // 3. 下标挖空：如 "H₂O" → "H_O" （只挖掉下标"₂"），正确答案是 "2"（显示为下标数字）
    // 所有挖空都不会拆散元素符号，保持化学式的完整性。
    const EQUATIONS_LIB = [
        {
            name: "氢气燃烧",
            parts: ["2H₂", " + ", "O₂", " → ", "2H₂O"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "H₂", correct: "2", hint: "氢气系数" },
                { type: "coeff", partIndex: 4, before: "", after: "H₂O", correct: "2", hint: "水系数" },
                { type: "subscript", partIndex: 0, before: "2H", after: "", correct: "2", hint: "氢气下标", subscriptOf: "H₂" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "O₂", hint: "氧气化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "2H₂O", hint: "水整个化学式（含系数）" }  // 整体挖掉
            ]
        },
        {
            name: "镁的燃烧",
            parts: ["2Mg", " + ", "O₂", " → ", "2MgO"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "Mg", correct: "2", hint: "镁系数" },
                { type: "coeff", partIndex: 4, before: "", after: "MgO", correct: "2", hint: "氧化镁系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "2Mg", hint: "镁整个化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "O₂", hint: "氧气化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "2MgO", hint: "氧化镁整个化学式" }
            ]
        },
        {
            name: "过氧化氢分解",
            parts: ["2H₂O₂", " → ", "2H₂O", " + ", "O₂"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "H₂O₂", correct: "2", hint: "过氧化氢系数" },
                { type: "coeff", partIndex: 2, before: "", after: "H₂O", correct: "2", hint: "水的系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "2H₂O₂", hint: "过氧化氢化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "2H₂O", hint: "水化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "O₂", hint: "氧气化学式" }
            ]
        },
        {
            name: "铁与硫酸铜",
            parts: ["Fe", " + ", "CuSO₄", " → ", "FeSO₄", " + ", "Cu"],
            slots: [
                { type: "formula", partIndex: 0, before: "", after: "", correct: "Fe", hint: "铁单质" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "CuSO₄", hint: "硫酸铜化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "FeSO₄", hint: "硫酸亚铁化学式" },
                { type: "formula", partIndex: 6, before: "", after: "", correct: "Cu", hint: "铜单质" }
            ]
        },
        {
            name: "碳酸钙分解",
            parts: ["CaCO₃", " → ", "CaO", " + ", "CO₂"],
            slots: [
                { type: "formula", partIndex: 0, before: "", after: "", correct: "CaCO₃", hint: "碳酸钙化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "CaO", hint: "氧化钙化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "CO₂", hint: "二氧化碳化学式" },
                { type: "subscript", partIndex: 0, before: "CaCO", after: "", correct: "3", hint: "碳酸根下标3" }
            ]
        },
        {
            name: "锌与稀盐酸",
            parts: ["Zn", " + ", "2HCl", " → ", "ZnCl₂", " + ", "H₂"],
            slots: [
                { type: "formula", partIndex: 0, before: "", after: "", correct: "Zn", hint: "锌单质" },
                { type: "coeff", partIndex: 2, before: "", after: "HCl", correct: "2", hint: "盐酸系数" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "2HCl", hint: "盐酸化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "ZnCl₂", hint: "氯化锌化学式" },
                { type: "formula", partIndex: 6, before: "", after: "", correct: "H₂", hint: "氢气化学式" },
                { type: "subscript", partIndex: 4, before: "ZnCl", after: "", correct: "2", hint: "氯化锌下标2" },
                { type: "subscript", partIndex: 6, before: "H", after: "", correct: "2", hint: "氢气下标2" }
            ]
        },
        {
            name: "铝与氧气",
            parts: ["4Al", " + ", "3O₂", " → ", "2Al₂O₃"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "Al", correct: "4", hint: "铝系数" },
                { type: "coeff", partIndex: 2, before: "", after: "O₂", correct: "3", hint: "氧气系数" },
                { type: "coeff", partIndex: 4, before: "", after: "Al₂O₃", correct: "2", hint: "氧化铝系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "4Al", hint: "铝化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "3O₂", hint: "氧气化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "2Al₂O₃", hint: "氧化铝化学式" },
                { type: "subscript", partIndex: 4, before: "Al₂O", after: "", correct: "3", hint: "氧化铝下标3" }
            ]
        },
        {
            name: "甲烷燃烧",
            parts: ["CH₄", " + ", "2O₂", " → ", "CO₂", " + ", "2H₂O"],
            slots: [
                { type: "formula", partIndex: 0, before: "", after: "", correct: "CH₄", hint: "甲烷化学式" },
                { type: "coeff", partIndex: 2, before: "", after: "O₂", correct: "2", hint: "氧气系数" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "CO₂", hint: "二氧化碳化学式" },
                { type: "coeff", partIndex: 6, before: "", after: "H₂O", correct: "2", hint: "水的系数" },
                { type: "subscript", partIndex: 0, before: "CH", after: "", correct: "4", hint: "甲烷下标4" },
                { type: "subscript", partIndex: 4, before: "CO", after: "", correct: "2", hint: "二氧化碳下标2" },
                { type: "subscript", partIndex: 6, before: "H₂O", after: "", correct: "2", hint: "水的下标2" }
            ]
        },
        {
            name: "氢氧化钠与硫酸铜",
            parts: ["2NaOH", " + ", "CuSO₄", " → ", "Na₂SO₄", " + ", "Cu(OH)₂"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "NaOH", correct: "2", hint: "氢氧化钠系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "2NaOH", hint: "氢氧化钠化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "CuSO₄", hint: "硫酸铜化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "Na₂SO₄", hint: "硫酸钠化学式" },
                { type: "formula", partIndex: 6, before: "", after: "", correct: "Cu(OH)₂", hint: "氢氧化铜化学式" },
                { type: "subscript", partIndex: 4, before: "Na₂SO", after: "", correct: "4", hint: "硫酸钠下标4" },
                { type: "subscript", partIndex: 6, before: "Cu(OH)", after: "", correct: "2", hint: "氢氧化铜下标2" }
            ]
        },
        {
            name: "电解水",
            parts: ["2H₂O", " → ", "2H₂", " + ", "O₂"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "H₂O", correct: "2", hint: "水的系数" },
                { type: "coeff", partIndex: 2, before: "", after: "H₂", correct: "2", hint: "氢气系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "2H₂O", hint: "水化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "2H₂", hint: "氢气化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "O₂", hint: "氧气化学式" },
                { type: "subscript", partIndex: 0, before: "2H", after: "O", correct: "2", hint: "水的下标2" },
                { type: "subscript", partIndex: 2, before: "2H", after: "", correct: "2", hint: "氢气的下标2" }
            ]
        },
        {
            name: "碳的不完全燃烧",
            parts: ["2C", " + ", "O₂", " → ", "2CO"],
            slots: [
                { type: "coeff", partIndex: 0, before: "", after: "C", correct: "2", hint: "碳系数" },
                { type: "coeff", partIndex: 4, before: "", after: "CO", correct: "2", hint: "一氧化碳系数" },
                { type: "formula", partIndex: 0, before: "", after: "", correct: "2C", hint: "碳化学式" },
                { type: "formula", partIndex: 2, before: "", after: "", correct: "O₂", hint: "氧气化学式" },
                { type: "formula", partIndex: 4, before: "", after: "", correct: "2CO", hint: "一氧化碳化学式" }
            ]
        }
    ];

    // 游戏状态
    let currentScore = 0;
    let currentEquation = null;
    let activeSlots = [];        // { id, type, partIndex, before, after, correct, filled, filledValue }
    let slotCounter = 0;
    let bubblesList = [];        // [{ id, value }]
    let filledSlotsCount = 0;
    let currentBubbleElements = new Map();

    const equationContainer = document.getElementById('equationContainer');
    const bubblesContainer = document.getElementById('bubblesContainer');
    const scoreSpan = document.getElementById('scoreValue');
    const cancelBtn = document.getElementById('cancelBtn');

    function showMessage(text, isSuccess = false) {
        const toast = document.createElement('div');
        toast.className = `chat-toast ${isSuccess ? 'success' : 'error'}`;
        toast.innerText = text;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1800);
    }

    function updateScoreUI() {
        scoreSpan.innerText = currentScore;
    }

    function addScoreAndNext() {
        currentScore++;
        updateScoreUI();
        showMessage("🎉 恭喜你，过关了！ +1分 🎉", true);
        generateNewChallenge();
    }

    function checkAllSlotsFilled() {
        if (filledSlotsCount === activeSlots.length && activeSlots.length > 0) {
            addScoreAndNext();
        }
    }

    function fillSlot(slotId, bubbleValue, bubbleDom, bubbleDataId) {
        const slot = activeSlots.find(s => s.id === slotId);
        if (!slot || slot.filled) return false;
        if (slot.correct !== bubbleValue) {
            showMessage("不对哦，再仔细思考一下", false);
            return false;
        }

        slot.filled = true;
        slot.filledValue = bubbleValue;
        filledSlotsCount++;

        const slotElement = document.querySelector(`.drop-slot[data-slot-id='${slotId}']`);
        if (slotElement) {
            slotElement.innerText = bubbleValue;
            slotElement.classList.add('filled');
        }

        if (bubbleDom && bubbleDom.parentNode) bubbleDom.remove();
        const bubbleIndex = bubblesList.findIndex(b => b.id === bubbleDataId);
        if (bubbleIndex !== -1) bubblesList.splice(bubbleIndex, 1);
        if (currentBubbleElements.has(bubbleDataId)) currentBubbleElements.delete(bubbleDataId);

        showMessage(`✅ 正确！${slot.correct} 填进去了！`, true);
        checkAllSlotsFilled();
        return true;
    }

    function generateDistractors(correctValuesSet, totalNeeded) {
        const commonPool = ["1", "3", "4", "5", "6", "O", "Cl", "Na", "Ca", "Zn", "Al", "H₂O", "O₃", "CO", "Fe", "Cu", "SO₄", "OH", "CO₃", "2H₂O", "3O₂", "Mg", "2Mg", "2H₂"];
        let distractors = [];
        for (let item of commonPool) {
            if (!correctValuesSet.has(item) && !distractors.includes(item)) {
                distractors.push(item);
            }
            if (distractors.length >= totalNeeded) break;
        }
        let fallback = 7;
        while (distractors.length < totalNeeded) {
            let cand = String(fallback);
            if (!correctValuesSet.has(cand) && !distractors.includes(cand)) distractors.push(cand);
            fallback++;
        }
        return distractors.slice(0, totalNeeded);
    }

    function generateBubbles(activeCorrectValues) {
        let correctBubbles = [...activeCorrectValues];
        const totalBubbles = correctBubbles.length + Math.floor(Math.random() * 3) + 2;
        let distractorsNeeded = totalBubbles - correctBubbles.length;
        if (distractorsNeeded < 1) distractorsNeeded = 2;
        const correctSet = new Set(activeCorrectValues);
        const distractors = generateDistractors(correctSet, distractorsNeeded);
        let allValues = [...correctBubbles, ...distractors];
        for (let i = allValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
        }
        return allValues.map((val, idx) => ({
            id: `bubble_${Date.now()}_${idx}_${Math.random()}`,
            value: val
        }));
    }

    function renderEquation() {
        if (!currentEquation) return;
        const container = equationContainer;
        container.innerHTML = '';
        const parts = currentEquation.parts;
        const slotMap = new Map();
        for (let slot of activeSlots) {
            slotMap.set(slot.partIndex, slot);
        }

        for (let i = 0; i < parts.length; i++) {
            const partText = parts[i];
            if (slotMap.has(i)) {
                const slot = slotMap.get(i);
                const wrapper = document.createElement('span');
                wrapper.className = 'eq-part';
                if (slot.before) {
                    const beforeSpan = document.createElement('span');
                    beforeSpan.innerText = slot.before;
                    wrapper.appendChild(beforeSpan);
                }
                const slotDiv = document.createElement('div');
                slotDiv.className = 'drop-slot';
                if (slot.filled) {
                    slotDiv.innerText = slot.filledValue;
                    slotDiv.classList.add('filled');
                } else {
                    slotDiv.innerText = '___';
                }
                slotDiv.setAttribute('data-slot-id', slot.id);
                slotDiv.addEventListener('dragover', (e) => e.preventDefault());
                slotDiv.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const dragData = e.dataTransfer.getData('text/plain');
                    if (!dragData) return;
                    try {
                        const { bubbleId, bubbleValue } = JSON.parse(dragData);
                        const bubbleDom = document.querySelector(`.bubble[data-bubble-id='${bubbleId}']`);
                        if (!bubbleDom) {
                            showMessage("这个气泡已经被用过了！", false);
                            return;
                        }
                        fillSlot(slot.id, bubbleValue, bubbleDom, bubbleId);
                    } catch (err) {}
                });
                wrapper.appendChild(slotDiv);
                if (slot.after) {
                    const afterSpan = document.createElement('span');
                    afterSpan.innerText = slot.after;
                    wrapper.appendChild(afterSpan);
                }
                container.appendChild(wrapper);
            } else {
                const span = document.createElement('span');
                span.className = 'eq-part';
                span.innerText = partText;
                container.appendChild(span);
            }
        }
    }

    function renderBubbles() {
        bubblesContainer.innerHTML = '';
        currentBubbleElements.clear();
        for (let bubble of bubblesList) {
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'bubble';
            bubbleDiv.innerText = bubble.value;
            bubbleDiv.setAttribute('draggable', 'true');
            bubbleDiv.setAttribute('data-bubble-id', bubble.id);
            bubbleDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    bubbleId: bubble.id,
                    bubbleValue: bubble.value
                }));
                e.dataTransfer.effectAllowed = 'copy';
                bubbleDiv.classList.add('dragging');
            });
            bubbleDiv.addEventListener('dragend', (e) => {
                bubbleDiv.classList.remove('dragging');
            });
            bubblesContainer.appendChild(bubbleDiv);
            currentBubbleElements.set(bubble.id, bubbleDiv);
        }
    }

    // 核心随机逻辑：随机选择方程式 + 随机选择1~2个不同的挖空位置
    function selectSlotsForEquation(equation) {
        const allSlots = equation.slots;
        if (!allSlots || allSlots.length === 0) return [];
        // 随机决定挖空数量：1个（约60%）或2个（约40%）
        let count = Math.random() < 0.6 ? 1 : 2;
        if (count > allSlots.length) count = allSlots.length;
        // Fisher-Yates 随机取 count 个不同位置
        const shuffled = [...allSlots];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selected = shuffled.slice(0, count);
        return selected.map(slot => ({
            id: `slot_${slotCounter++}`,
            type: slot.type,
            partIndex: slot.partIndex,
            before: slot.before || '',
            after: slot.after || '',
            correct: slot.correct,
            filled: false,
            filledValue: null
        }));
    }

    function generateNewChallenge() {
        // 随机选择一个方程式（完全随机，可能出现重复，但概率均匀）
        const randomIndex = Math.floor(Math.random() * EQUATIONS_LIB.length);
        const template = EQUATIONS_LIB[randomIndex];
        currentEquation = template;
        // 随机选择挖空位置
        activeSlots = selectSlotsForEquation(template);
        filledSlotsCount = 0;
        const correctValues = activeSlots.map(s => s.correct);
        bubblesList = generateBubbles(correctValues);
        renderEquation();
        renderBubbles();
    }

    function goBack() {
        // file:// 下 document.referrer 恒为空，直接打开页面时 history 也没有上一页；
        // 两种情况都回退到词云主页，保证返回按钮始终可用
        const fromCloud = (document.referrer || '').indexOf('equation_cloud.html') !== -1;
        if (fromCloud && window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'equation_cloud.html';
        }
    }

    function initGame() {
        currentScore = 0;
        updateScoreUI();
        generateNewChallenge(); // 第一次随机题目
        cancelBtn.addEventListener('click', goBack);
        window.addEventListener('dragstart', (e) => {
            if (!e.target.closest('.bubble')) e.preventDefault();
        });
    }

    initGame();