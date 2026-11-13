/* ============================================================
   周期表 AI 交互层
   - 点击元素：把静态展品变成可对话对象
   - 探索问题：高亮相关元素并让 AI 解释
   - 回答附知识来源，可点击查看原文
   - WebGL / CDN 不可用时保留 2D 周期表
   ============================================================ */

(function () {
    'use strict';

    const API_BASE = window.location.origin;
    const IS_FILE = window.location.protocol === 'file:';

    const PRESETS = [
        {
            key: 'liquid',
            label: '常温液态元素',
            symbols: ['Hg', 'Br'],
            prompt: '在元素周期表里找出常温（约 25℃）下呈液态的元素，并解释它们的共同用途。'
        },
        {
            key: 'noble',
            label: '稀有气体',
            symbols: ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'],
            prompt: '找出元素周期表中的稀有气体，并解释它们为什么化学性质稳定。'
        },
        {
            key: 'semiconductor',
            label: '半导体元素',
            symbols: ['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'Se'],
            prompt: '找出常见的半导体元素，并解释它们在现代电子工业中的用途。'
        },
        {
            key: 'transition',
            label: '过渡金属',
            symbols: [
                'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
                'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
                'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
                'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn'
            ],
            prompt: '找出元素周期表中的过渡金属，并解释它们的共同特征与典型用途。'
        }
    ];

    const TOOL_HINTS = {
        query_element: (a) => a.query ? '正在查询「' + a.query + '」的熔点、密度等性质…' : '正在查询元素性质…',
        molar_mass: (a) => a.formula ? '正在计算 ' + a.formula + ' 的摩尔质量…' : '正在计算摩尔质量…',
        balance_equation: () => '正在配平化学方程式…',
        lookup_reaction: (a) => Array.isArray(a.reactants) && a.reactants.length
            ? '正在检索 ' + a.reactants.join(' + ') + ' 的反应现象…'
            : '正在检索反应现象…',
        get_safety_info: (a) => a.chemical ? '正在查询「' + a.chemical + '」的危化品安全信息…' : '正在查询危化品安全信息…',
        search_knowledge: (a) => a.query ? '正在检索知识库：' + shortText(a.query, 18) : '正在检索本地知识库…'
    };

    const TOOL_ARGS = {
        query_element: (a) => a.query ? '元素：' + a.query : '元素查询',
        molar_mass: (a) => a.formula ? '化学式：' + a.formula : '摩尔质量',
        balance_equation: (a) => a.equation ? '方程式：' + shortText(a.equation, 22) : '方程式配平',
        lookup_reaction: (a) => Array.isArray(a.reactants) && a.reactants.length ? '反应物：' + a.reactants.join(' + ') : '反应检索',
        get_safety_info: (a) => a.chemical ? '化学品：' + a.chemical : '危化品安全',
        search_knowledge: (a) => a.query ? '检索：' + shortText(a.query, 22) : '知识库检索'
    };

    let panel;
    let bodyEl;
    let inputEl;
    let formEl;
    let sendBtn;
    let contextEl;
    let quickEl;
    let presetsEl;
    let hitline;
    let evidenceMask;

    let busy = false;
    let currentElement = null;
    let session = [];
    let lastPrompt = '';
    let activeSymbols = [];
    let activePresetKey = '';
    let currentToolNode = null;
    let contextAnnounced = false;

    function shortText(value, limit) {
        const text = String(value == null ? '' : value).trim();
        return text.length > limit ? text.slice(0, limit) + '…' : text;
    }

    function stripMarkup(text) {
        return String(text || '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/`{1,3}/g, '')
            .replace(/^#{1,6}\s+/gm, '');
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    /* ------------------------------------------------------------
       一、界面注入
       ------------------------------------------------------------ */
    function injectUI() {
        const root = el('div');
        root.id = 'pt-ai-root';

        const headerBtn = el('button', 'pt-ai-header-btn', '🧪 AI 探索');
        headerBtn.type = 'button';
        headerBtn.title = '用自然语言探索元素周期表';
        headerBtn.addEventListener('click', () => {
            openPanel(true);
            showPresets(true);
        });

        const pageHeader = document.querySelector('.container > header');
        if (pageHeader) {
            pageHeader.appendChild(headerBtn);
        } else {
            headerBtn.style.position = 'fixed';
            headerBtn.style.top = '16px';
            headerBtn.style.zIndex = '1500';
            root.appendChild(headerBtn);
        }

        const launcher = el('button', 'pt-ai-launcher');
        launcher.type = 'button';
        launcher.innerHTML = '<span class="pulse-dot"></span><span>问小幻语</span>';
        launcher.setAttribute('aria-label', '打开元素周期表 AI 助手');
        launcher.addEventListener('click', () => openPanel());

        panel = el('section', 'pt-ai-panel');
        panel.setAttribute('aria-hidden', 'true');

        const head = el('div', 'pt-ai-head');
        const headMain = el('div');
        headMain.appendChild(el('div', 'pt-ai-title', '小幻语 · 元素探索'));
        const sub = el('div', 'pt-ai-sub');
        sub.appendChild(document.createTextNode('当前元素：'));
        contextEl = el('span', 'pt-ai-context', '未选择');
        sub.appendChild(contextEl);
        headMain.appendChild(sub);

        const closeBtn = el('button', 'pt-ai-close', '×');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', '关闭 AI 面板');
        closeBtn.addEventListener('click', () => openPanel(false));

        head.appendChild(headMain);
        head.appendChild(closeBtn);

        bodyEl = el('div', 'pt-ai-body');
        bodyEl.appendChild(el('div', 'pt-ai-msg sys', '点击任意元素，或在下方选择一个探索问题。回答会标注知识来源，可点击核对原文。'));

        quickEl = el('div', 'pt-ai-quick');
        presetsEl = el('div', 'pt-ai-presets');

        formEl = el('form', 'pt-ai-form');
        inputEl = el('input', 'pt-ai-input');
        inputEl.type = 'text';
        inputEl.placeholder = '比如：帮我找三个常温液态元素';
        inputEl.setAttribute('autocomplete', 'off');
        const sendBtnEl = el('button', 'pt-ai-send', '发送');
        sendBtnEl.type = 'submit';
        sendBtn = sendBtnEl;
        formEl.appendChild(inputEl);
        formEl.appendChild(sendBtnEl);
        formEl.addEventListener('submit', (event) => {
            event.preventDefault();
            const question = inputEl.value.trim();
            if (!question || busy) return;
            inputEl.value = '';
            ask(question);
        });

        panel.appendChild(head);
        panel.appendChild(bodyEl);
        panel.appendChild(quickEl);
        panel.appendChild(presetsEl);
        panel.appendChild(formEl);
        panel.appendChild(el('div', 'pt-ai-foot', '回答基于本地知识库与确定性化学工具，来源可逐条核对'));

        hitline = el('div', 'pt-ai-hitline');
        const hitText = el('span', 'pt-ai-hit-text', '');
        const clearBtn = el('button', '', '清除高亮');
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', clearHighlight);
        hitline.appendChild(hitText);
        hitline.appendChild(clearBtn);

        evidenceMask = el('div', 'pt-ai-evidence-mask');
        evidenceMask.addEventListener('click', (event) => {
            if (event.target === evidenceMask) closeEvidence();
        });

        root.appendChild(launcher);
        root.appendChild(panel);
        root.appendChild(hitline);
        root.appendChild(evidenceMask);
        document.body.appendChild(root);

        renderPresets();
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (evidenceMask.classList.contains('open')) closeEvidence();
                else openPanel(false);
            }
        });
    }

    function renderPresets() {
        presetsEl.innerHTML = '';
        const title = el('div', 'pt-ai-msg sys', '试试这样问');
        title.style.width = '100%';
        title.style.textAlign = 'left';
        title.style.padding = '0 0 2px';
        presetsEl.appendChild(title);

        PRESETS.forEach((preset) => {
            const chip = el('button', 'pt-ai-chip', preset.label);
            chip.type = 'button';
            chip.dataset.key = preset.key;
            chip.addEventListener('click', () => runPreset(preset, chip));
            presetsEl.appendChild(chip);
        });
    }

    function showPresets(force) {
        if (force || !currentElement) {
            presetsEl.style.display = 'flex';
        } else {
            presetsEl.style.display = 'flex';
        }
    }

    function openPanel(open) {
        if (open === undefined) open = !panel.classList.contains('open');
        panel.classList.toggle('open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) {
            showPresets();
            setTimeout(() => inputEl && inputEl.focus({ preventScroll: true }), 220);
        }
    }

    /* ------------------------------------------------------------
       二、消息渲染
       ------------------------------------------------------------ */
    function scrollBottom() {
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function pushUser(text) {
        const node = el('div', 'pt-ai-msg user', text);
        bodyEl.appendChild(node);
        scrollBottom();
        return node;
    }

    function pushPending(text) {
        const node = el('div', 'pt-ai-pending');
        const dots = el('span', 'pt-ai-dots');
        dots.innerHTML = '<i></i><i></i><i></i>';
        const label = el('span', '', text || '正在思考…');
        node.appendChild(dots);
        node.appendChild(label);
        bodyEl.appendChild(node);
        scrollBottom();
        return { node, label };
    }

    function pushAnswer() {
        const node = el('div', 'pt-ai-msg assistant streaming', '');
        bodyEl.appendChild(node);
        scrollBottom();
        return node;
    }

    function pushTool(label, detail) {
        const node = el('div', 'pt-ai-tool');
        node.appendChild(el('div', 'pt-ai-tool-title', '⚙️ ' + (label || '调用工具')));
        const detailNode = el('div', 'pt-ai-tool-detail', detail || '正在调用…');
        node.appendChild(detailNode);
        bodyEl.appendChild(node);
        scrollBottom();
        return { node, detailNode };
    }

    function pushSources(items) {
        if (!items || !items.length) return;
        const box = el('div', 'pt-ai-sources');
        box.appendChild(el('div', 'pt-ai-sources-title', '📎 知识来源 · 点击查看依据'));
        items.forEach((item) => {
            const row = el('div', 'pt-ai-source-item');
            row.setAttribute('role', 'button');
            row.tabIndex = 0;
            const head = el('div');
            head.appendChild(el('span', 'pt-ai-source-ref', item.ref || '知识库片段'));
            if (item.source_ref) head.appendChild(el('span', 'pt-ai-source-id', item.source_ref));
            head.appendChild(el('span', 'pt-ai-source-more', '查看依据 ›'));
            row.appendChild(head);
            row.appendChild(el('div', 'pt-ai-source-snippet', stripMarkup(item.snippet || '')));
            const open = () => openEvidence(item);
            row.addEventListener('click', open);
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            });
            box.appendChild(row);
        });
        bodyEl.appendChild(box);
        scrollBottom();
    }

    function pushNotice(title, text) {
        const box = el('div', 'pt-ai-notice');
        box.appendChild(el('div', 'title', title));
        box.appendChild(el('div', '', text));
        bodyEl.appendChild(box);
        scrollBottom();
    }

    function pushError(text, retryPrompt) {
        const box = el('div', 'pt-ai-error');
        box.appendChild(el('div', '', text));
        if (retryPrompt) {
            const retry = el('button', 'pt-ai-retry', '重新试一次');
            retry.type = 'button';
            retry.addEventListener('click', () => {
                box.remove();
                ask(retryPrompt, { displayText: retryPrompt, skipUser: true });
            });
            box.appendChild(retry);
        }
        bodyEl.appendChild(box);
        scrollBottom();
    }

    function openEvidence(item) {
        evidenceMask.innerHTML = '';
        const dialog = el('div', 'pt-ai-evidence');
        const head = el('div', 'pt-ai-evidence-head');
        head.appendChild(el('span', '', '🔍 查看依据'));
        const close = el('button', '', '×');
        close.type = 'button';
        close.addEventListener('click', closeEvidence);
        head.appendChild(close);
        dialog.appendChild(head);

        const meta = el('div', 'pt-ai-evidence-meta');
        const rows = [
            ['来源', item.ref || '—'],
            ['编号', item.source_ref || '—'],
            ['命中方式', item.match || '混合检索'],
            ['融合得分', formatScore(item.score)]
        ];
        rows.forEach(([key, value]) => {
            const row = el('div', 'pt-ai-evidence-row');
            row.appendChild(el('span', 'k', key));
            row.appendChild(el('span', 'v', value));
            meta.appendChild(row);
        });
        dialog.appendChild(meta);
        dialog.appendChild(el('div', 'pt-ai-evidence-quote', stripMarkup(item.quote || item.snippet || '')));
        dialog.appendChild(el('div', 'pt-ai-evidence-foot', '原文取自本地化学知识库（BM25 + 向量召回 + RRF 融合 + 领域重排），可逐条核对后再采信。'));
        evidenceMask.appendChild(dialog);
        evidenceMask.classList.add('open');
    }

    function closeEvidence() {
        evidenceMask.classList.remove('open');
    }

    function formatScore(score) {
        if (score === null || score === undefined || score === '') return '—';
        const value = Number(score);
        if (!Number.isFinite(value)) return String(score);
        return value >= 100 ? value.toFixed(0) : value.toFixed(3);
    }

    /* ------------------------------------------------------------
       三、元素上下文
       ------------------------------------------------------------ */
    function readElementFromCell(cell) {
        if (!cell) return null;
        const symbolEl = cell.querySelector('.symbol');
        if (!symbolEl) return null;
        const symbol = symbolEl.textContent.trim();
        if (!/^[A-Z][a-z]?$/.test(symbol)) return null;
        const nameEl = cell.querySelector('.name');
        const name = nameEl ? nameEl.textContent.trim() : symbol;
        return {
            number: cell.dataset.number || '',
            symbol: symbol,
            name: name || symbol
        };
    }

    function setElementContext(element, autoOpen) {
        currentElement = element;
        contextEl.textContent = element.name + ' ' + element.symbol;
        renderElementQuick(element);
        if (autoOpen && !panel.classList.contains('open')) {
            openPanel(true);
            if (!contextAnnounced) {
                bodyEl.appendChild(el('div', 'pt-ai-msg sys',
                    '已选中 ' + element.name + ' ' + element.symbol + '，点下面的问题或直接输入。'));
                contextAnnounced = true;
                scrollBottom();
            }
        }
    }

    function renderElementQuick(element) {
        quickEl.innerHTML = '';
        const questions = [
            element.name + '在生活中有哪些应用？请检索知识库并标注来源。',
            element.name + '的发现历史有什么故事？请检索知识库并标注来源。',
            element.name + '的熔点和沸点是多少？'
        ];
        questions.forEach((question) => {
            const chip = el('button', 'pt-ai-chip', question);
            chip.type = 'button';
            chip.addEventListener('click', () => ask(question));
            quickEl.appendChild(chip);
        });
    }

    function bindElementClicks() {
        document.addEventListener('click', (event) => {
            const cell = event.target.closest('[data-number]');
            if (!cell) return;
            if (!cell.querySelector('.symbol')) return;
            const element = readElementFromCell(cell);
            if (!element) return;
            setElementContext(element, true);
        }, true);
    }

    /* ------------------------------------------------------------
       四、探索问题与高亮
       ------------------------------------------------------------ */
    function runPreset(preset, chip) {
        activePresetKey = preset.key;
        document.querySelectorAll('.pt-ai-chip.active').forEach((node) => node.classList.remove('active'));
        if (chip) chip.classList.add('active');
        highlightSymbols(preset.symbols);
        ask('【元素周期表探索】' + preset.prompt + '请先调用 search_knowledge 检索元素知识库，并在回答末尾标注来源；请用纯文本回答，控制在 220 字以内。', {
            displayText: preset.label + '：' + preset.prompt
        });
    }

    function highlightSymbols(symbols) {
        activeSymbols = symbols.slice();
        applyHighlight();
        [1200, 3200].forEach((delay) => setTimeout(applyHighlight, delay));
        if (hitline) {
            hitline.classList.add('show');
            const text = hitline.querySelector('.pt-ai-hit-text');
            if (text) text.textContent = '已高亮 ' + symbols.length + ' 个元素：' + symbols.join('、');
        }
    }

    function applyHighlight() {
        if (!activeSymbols.length) return;
        const wanted = new Set(activeSymbols);
        let hits = 0;
        document.querySelectorAll('[data-number]').forEach((cell) => {
            const symbolEl = cell.querySelector('.symbol');
            if (!symbolEl) return;
            const symbol = symbolEl.textContent.trim();
            cell.classList.remove('pt-ai-hit');
            cell.classList.remove('pt-ai-dim');
            if (wanted.has(symbol)) {
                cell.classList.add('pt-ai-hit');
                hits += 1;
            }
        });
        if (hits > 0) {
            document.body.classList.add('pt-ai-focus');
        }
    }

    function clearHighlight() {
        activeSymbols = [];
        activePresetKey = '';
        document.body.classList.remove('pt-ai-focus');
        document.querySelectorAll('.pt-ai-hit, .pt-ai-dim').forEach((cell) => {
            cell.classList.remove('pt-ai-hit');
            cell.classList.remove('pt-ai-dim');
        });
        document.querySelectorAll('.pt-ai-chip.active').forEach((node) => node.classList.remove('active'));
        if (hitline) hitline.classList.remove('show');
    }

    /* ------------------------------------------------------------
       五、SSE 对话
       ------------------------------------------------------------ */
    function parseFrame(raw) {
        let event = 'message';
        const dataLines = [];
        raw.split('\n').forEach((line) => {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        });
        if (!dataLines.length) return null;
        try {
            return { event, data: JSON.parse(dataLines.join('\n')) };
        } catch (error) {
            return null;
        }
    }

    function summarizeToolResult(result) {
        if (!result || typeof result !== 'object') return '已完成';
        if (result.ok === false) return '未查到：' + (result.error || '无结果');
        if (result['配平结果']) return result['配平结果'];
        if (result['摩尔质量']) return result['化学式'] + ' = ' + result['摩尔质量'] + ' g/mol';
        if (result['反应类型']) return result['化学方程式'] + '（' + result['实验现象'] + '）';
        if (result['危险性']) return result['化学品'] + '：' + result['危险性'];
        if (result.element) return result.element['中文名'] + ' ' + result.element['元素符号'];
        if (Array.isArray(result.results)) return result.results.length ? '命中 ' + result.results.length + ' 条知识片段' : '未命中相关片段';
        if (result['提示']) return result['提示'];
        return '已完成';
    }

    function buildPrompt(text) {
        if (!currentElement) return text;
        if (text.indexOf('【元素周期表探索】') === 0) return text;
        return '（当前聚焦元素：' + currentElement.name + ' ' + currentElement.symbol +
            '，原子序数 ' + currentElement.number + '）\n' + text;
    }

    async function ask(text, options) {
        options = options || {};
        if (busy) return;
        const prompt = buildPrompt(text);
        lastPrompt = prompt;

        if (IS_FILE) {
            pushError('当前为静态预览模式，启动本地服务后即可与小幻语对话。');
            return;
        }

        openPanel(true);
        busy = true;
        if (sendBtn) sendBtn.disabled = true;
        if (!options.skipUser) pushUser(options.displayText || text);
        else if (options.displayText) pushUser(options.displayText);

        const pending = pushPending('正在理解你的问题…');
        let answerNode = null;
        let answerText = '';
        let degraded = false;
        currentToolNode = null;

        const history = session.concat([{ role: 'user', content: prompt }]).slice(-10);

        try {
            const response = await fetch(API_BASE + '/api/aigent/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: history })
            });
            if (!response.ok) throw new Error('http ' + response.status);
            if (!response.body) throw new Error('stream unsupported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const step = await reader.read();
                if (step.done) break;
                buffer += decoder.decode(step.value, { stream: true });
                const frames = buffer.split('\n\n');
                buffer = frames.pop() || '';

                for (const frame of frames) {
                    const parsed = parseFrame(frame);
                    if (!parsed) continue;
                    const event = parsed.event;
                    const data = parsed.data || {};

                    if (event === 'status') {
                        if (data.stage === 'degraded' && data.chain) {
                            degraded = true;
                            pushNotice('降级链路已触发', data.chain);
                        } else if (data.text) {
                            pending.label.textContent = data.text;
                        }
                    } else if (event === 'tool') {
                        if (answerNode) {
                            answerNode.classList.remove('streaming');
                            answerNode = null;
                        }
                        const hint = (TOOL_HINTS[data.name] || (() => '正在调用工具…'))(data.arguments || {});
                        pending.label.textContent = hint;
                        currentToolNode = pushTool(data.label || data.name, (TOOL_ARGS[data.name] || (() => '正在调用…'))(data.arguments || {}));
                    } else if (event === 'tool_result') {
                        if (currentToolNode) {
                            currentToolNode.node.classList.add('done');
                            currentToolNode.detailNode.textContent = summarizeToolResult(data.result);
                            currentToolNode = null;
                        }
                    } else if (event === 'sources') {
                        pushSources(data.items);
                    } else if (event === 'delta') {
                        if (!answerNode) {
                            pending.node.remove();
                            answerNode = pushAnswer();
                        }
                        const piece = data.text || '';
                        answerText += piece;
                        answerNode.textContent = stripMarkup(answerText);
                        scrollBottom();
                    } else if (event === 'done') {
                        degraded = degraded || !!data.degraded;
                        if (data.chain && data.degraded) pushNotice('降级链路已触发', data.chain);
                    } else if (event === 'error') {
                        throw new Error(data.error || 'stream error');
                    }
                }
            }

            pending.node.remove();
            if (answerNode) answerNode.classList.remove('streaming');
            if (!answerText) {
                pushNotice('本轮没有生成文字回答', '可以换一种问法，或稍后重试。');
            }
            session = history.concat(answerText ? [{ role: 'assistant', content: answerText }] : []);
            if (degraded && !answerText) {
                pushError('主模型与备用模型均不可用，这次没有成功回答。', prompt);
            }
        } catch (error) {
            pending.node.remove();
            if (answerNode) answerNode.classList.remove('streaming');
            pushError('这次通信出了点问题：' + (error.message || '未知错误'), prompt);
        } finally {
            busy = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    /* ------------------------------------------------------------
       六、WebGL / CDN 降级
       ------------------------------------------------------------ */
    function showFallback(message) {
        document.body.classList.add('pt-no-webgl');
        let banner = document.querySelector('.pt-ai-fallback-banner');
        if (!banner) {
            banner = el('div', 'pt-ai-fallback-banner');
            const main = document.querySelector('.container > main');
            const target = main || document.body;
            target.insertBefore(banner, target.firstChild);
        }
        banner.textContent = '⚠️ ' + message;
        banner.classList.add('show');

        const toggle = document.getElementById('viewToggle');
        if (toggle) {
            toggle.disabled = true;
            toggle.textContent = '3D 不可用';
            toggle.title = '当前环境不支持 WebGL 或 Three.js 未加载，已保留 2D 周期表';
        }
    }

    function check3dCapability() {
        let webgl = false;
        try {
            const canvas = document.createElement('canvas');
            webgl = !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (error) {
            webgl = false;
        }
        const threeReady = !!(window.THREE && window.THREE.OrbitControls);
        if (!webgl || !threeReady) {
            showFallback('当前设备或网络无法加载 3D 视图，已自动使用 2D 周期表；元素详情与 AI 问答仍可正常使用。');
            return;
        }
        setTimeout(() => {
            const container = document.getElementById('periodic-table');
            if (container && /加载元素数据失败/.test(container.textContent || '')) {
                showFallback('3D 元素数据加载失败（可能被网络拦截），已保留 2D 周期表；元素详情与 AI 问答仍可用。');
            }
        }, 12000);
    }

    /* ------------------------------------------------------------
       七、启动
       ------------------------------------------------------------ */
    function start() {
        injectUI();
        bindElementClicks();
        check3dCapability();

        const toggle = document.getElementById('viewToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                if (activeSymbols.length) setTimeout(applyHighlight, 350);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
