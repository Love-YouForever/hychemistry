/* 实验室 AI：流式问答、器材聚焦与安全装载，不执行混合或加热。 */
(function () {
    'use strict';

    const API_BASE = window.location.origin;
    const IS_FILE = window.location.protocol === 'file:';
    const SAFE_REACTIONS = new Set([
        'AgNO3+NaCl', 'BaCl2+Na2CO3', 'CuSO4+NaOH', 'FeCl3+NaOH',
        'NaOH+Phenolphthalein', 'FeCl3+KSCN', 'CuSO4+Fe'
    ]);
    const CONTAINERS = new Set(['beaker', 'test-tube', 'flask']);

    let panel;
    let bodyEl;
    let inputEl;
    let sendBtn;
    let sceneStatusEl;
    let busy = false;
    let session = [];
    let currentTool = null;
    let pendingActions = [];

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function stripMarkup(text) {
        return String(text || '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/`{1,3}/g, '')
            .replace(/^#{1,6}\s+/gm, '');
    }

    function scrollBottom() {
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function pushMessage(role, text) {
        const node = el('div', 'lab-ai-msg ' + role, text);
        bodyEl.appendChild(node);
        scrollBottom();
        return node;
    }

    function pushNotice(text, isError) {
        const node = el('div', isError ? 'lab-ai-error' : 'lab-ai-notice', text);
        bodyEl.appendChild(node);
        scrollBottom();
        return node;
    }

    function openPanel(open) {
        if (open === undefined) open = !panel.classList.contains('open');
        panel.classList.toggle('open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) window.setTimeout(() => inputEl.focus({ preventScroll: true }), 180);
    }

    function injectUI() {
        const root = el('div');
        root.id = 'lab-ai-root';
        const launcher = el('button', 'lab-ai-launcher', '问小幻语');
        launcher.type = 'button';
        launcher.setAttribute('aria-label', '打开实验室 AI 助手');
        launcher.addEventListener('click', () => openPanel());

        panel = el('section', 'lab-ai-panel');
        panel.setAttribute('aria-hidden', 'true');
        const head = el('div', 'lab-ai-head');
        const heading = el('div');
        heading.appendChild(el('div', 'lab-ai-title', '小幻语 · 实验准备'));
        heading.appendChild(el('div', 'lab-ai-sub', '仅辅助定位器材与安全装载'));
        const close = el('button', 'lab-ai-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', '关闭 AI 面板');
        close.addEventListener('click', () => openPanel(false));
        head.appendChild(heading);
        head.appendChild(close);

        bodyEl = el('div', 'lab-ai-body');
        pushMessage('system', '可以让我找器材，或摆放安全反应所需物品。所有反应操作仍由你手动完成。');
        sceneStatusEl = el('div', 'lab-ai-scene-status');
        sceneStatusEl.setAttribute('role', 'status');
        sceneStatusEl.setAttribute('aria-live', 'polite');

        const quick = el('div', 'lab-ai-quick');
        [
            ['找烧杯', '请帮我聚焦烧杯'],
            ['准备沉淀反应物品', '请装载硝酸银与氯化钠反应所需的物品，只摆放，不要混合或加热']
        ].forEach(([label, prompt]) => {
            const chip = el('button', 'lab-ai-chip', label);
            chip.type = 'button';
            chip.addEventListener('click', () => ask(prompt));
            quick.appendChild(chip);
        });

        const form = el('form', 'lab-ai-form');
        inputEl = el('input', 'lab-ai-input');
        inputEl.type = 'text';
        inputEl.placeholder = '例如：准备铜盐与铁反应的物品';
        inputEl.autocomplete = 'off';
        sendBtn = el('button', 'lab-ai-send', '发送');
        sendBtn.type = 'submit';
        form.appendChild(inputEl);
        form.appendChild(sendBtn);
        form.addEventListener('submit', event => {
            event.preventDefault();
            const question = inputEl.value.trim();
            if (!question || busy) return;
            inputEl.value = '';
            ask(question);
        });

        panel.appendChild(head);
        panel.appendChild(bodyEl);
        panel.appendChild(sceneStatusEl);
        panel.appendChild(quick);
        panel.appendChild(form);
        panel.appendChild(el('div', 'lab-ai-foot', '安全边界：不会自动混合、倾倒、加热、点燃，也不会伪造反应条件或现象。'));
        root.appendChild(launcher);
        root.appendChild(panel);
        document.body.appendChild(root);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') openPanel(false);
        });
    }

    function parseFrame(raw) {
        let event = 'message';
        const dataLines = [];
        raw.split('\n').forEach(line => {
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

    function setSceneStatus(text, tone) {
        sceneStatusEl.textContent = text || '';
        sceneStatusEl.dataset.tone = tone || 'ok';
    }

    function onlyKeys(value, allowed) {
        return Object.keys(value).every(key => allowed.includes(key));
    }

    function validReagent(value) {
        return typeof value === 'string' && /^[A-Za-z0-9-]{1,30}$/.test(value);
    }

    function isValidAction(action) {
        if (!action || action.target !== 'lab' || typeof action.id !== 'string' ||
            !/^scene-[A-Za-z0-9-]{8,80}$/.test(action.id)) return false;
        const params = action.params;
        if (!params || typeof params !== 'object' || Array.isArray(params)) return false;
        if (action.action === 'focus_equipment') {
            return onlyKeys(params, ['equipment', 'reagent']) &&
                typeof params.equipment === 'string' && /^[a-z][a-z0-9-]{1,40}$/.test(params.equipment) &&
                (params.reagent === undefined || validReagent(params.reagent));
        }
        if (action.action !== 'load_reaction') return false;
        if (!onlyKeys(params, ['reaction', 'container', 'items', 'note', 'loaded_only']) ||
            !SAFE_REACTIONS.has(params.reaction) || !CONTAINERS.has(params.container) ||
            params.loaded_only !== true || typeof params.note !== 'string' || params.note.length > 240 ||
            !Array.isArray(params.items) || params.items.length !== 3) return false;
        return params.items.every((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item) || !onlyKeys(item, ['type', 'reagent'])) return false;
            if (index === 0) return item.type === params.container && item.reagent === undefined;
            return ['reagent-liquid', 'solid-bottle'].includes(item.type) && validReagent(item.reagent);
        });
    }

    function performAction(action) {
        if (!window.ChemistryLab3D) {
            setSceneStatus('实验台尚未就绪，请稍后重试', 'warn');
            return;
        }
        try {
            if (action.action === 'focus_equipment') {
                const params = action.params;
                const result = window.ChemistryLab3D.focusEquipment(params.equipment, params.reagent || '');
                if (!result.ok) throw new Error(result.error || '定位失败');
                setSceneStatus('已定位：' + result.name + '；聚焦不会启动器材');
                return;
            }
            const result = window.ChemistryLab3D.loadReaction(action.params.items);
            if (!result.ok || result.loadedOnly !== true) throw new Error(result.error || '安全装载失败');
            setSceneStatus('已摆放 1 个容器和 2 个独立试剂瓶，未混合或加热。注意事项：' + action.params.note);
        } catch (error) {
            setSceneStatus('场景动作未完成：' + (error.message || '未知错误'), 'warn');
        }
    }

    function flushActions() {
        const queued = pendingActions.splice(0);
        queued.forEach(entry => {
            window.clearTimeout(entry.timer);
            performAction(entry.action);
        });
    }

    function executeAction(action, executedIds) {
        if (!isValidAction(action)) {
            setSceneStatus('已忽略未通过安全校验的实验室动作', 'warn');
            return;
        }
        if (executedIds.has(action.id)) return;
        executedIds.add(action.id);
        if (!window.ChemistryLab3D) {
            setSceneStatus('实验台正在初始化，动作已排队', 'warn');
            const entry = { action, timer: null };
            entry.timer = window.setTimeout(() => {
                const index = pendingActions.indexOf(entry);
                if (index >= 0) pendingActions.splice(index, 1);
                setSceneStatus('实验台初始化超时，未执行该动作', 'warn');
            }, 8000);
            pendingActions.push(entry);
            return;
        }
        performAction(action);
    }

    function pushTool(name, label) {
        const node = el('div', 'lab-ai-tool');
        node.appendChild(el('div', 'lab-ai-tool-title', label || name || '调用工具'));
        const detail = el('div', '', '正在执行…');
        node.appendChild(detail);
        bodyEl.appendChild(node);
        scrollBottom();
        return { node, detail };
    }

    function pushSources(items) {
        if (!Array.isArray(items) || !items.length) return;
        const box = el('div', 'lab-ai-sources');
        box.appendChild(el('div', 'lab-ai-source-title', '知识来源'));
        items.forEach(item => {
            box.appendChild(el('div', 'lab-ai-source-item',
                (item.ref || '本地知识库') + '：' + stripMarkup(item.snippet || '')));
        });
        bodyEl.appendChild(box);
        scrollBottom();
    }

    async function ask(text) {
        if (busy) return;
        openPanel(true);
        if (IS_FILE) {
            pushNotice('当前为静态预览，启动本地服务后才能使用 AI。', true);
            return;
        }
        busy = true;
        sendBtn.disabled = true;
        pushMessage('user', text);
        const pending = el('div', 'lab-ai-pending', '正在理解你的请求…');
        bodyEl.appendChild(pending);
        scrollBottom();
        const history = session.concat([{ role: 'user', content: text }]).slice(-10);
        const executedIds = new Set();
        let answerNode = null;
        let answerText = '';
        currentTool = null;

        try {
            const response = await fetch(API_BASE + '/api/aigent/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history, surface: 'lab' })
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
                        if (data.text) pending.textContent = data.text;
                    } else if (event === 'tool') {
                        if (answerNode) answerNode = null;
                        currentTool = pushTool(data.name, data.label);
                        pending.textContent = data.name === 'control_scene' ? '正在校验实验室安全动作…' : '正在查询…';
                    } else if (event === 'tool_result') {
                        const result = data.result || {};
                        if (currentTool) {
                            currentTool.node.classList.add('done');
                            currentTool.detail.textContent = result.ok === false
                                ? '已拦截：' + (result.error || '请求不符合安全规则')
                                : (result.message || '已完成');
                            currentTool = null;
                        }
                        if (result.ok === false) pushNotice('安全护栏：' + (result.error || '动作已拒绝'));
                    } else if (event === 'scene_action') {
                        executeAction(data, executedIds);
                    } else if (event === 'sources') {
                        pushSources(data.items);
                    } else if (event === 'delta') {
                        if (!answerNode) {
                            pending.remove();
                            answerNode = pushMessage('assistant', '');
                        }
                        answerText += data.text || '';
                        answerNode.textContent = stripMarkup(answerText);
                        scrollBottom();
                    } else if (event === 'done') {
                        if (data.degraded && data.chain) pushNotice(data.chain);
                    } else if (event === 'error') {
                        throw new Error(data.error || 'stream error');
                    }
                }
            }
            pending.remove();
            if (!answerText) pushNotice('本轮没有生成文字回答，可换一种问法重试。');
            session = history.concat(answerText ? [{ role: 'assistant', content: answerText }] : []);
        } catch (error) {
            pending.remove();
            pushNotice('通信失败：' + (error.message || '未知错误'), true);
        } finally {
            busy = false;
            sendBtn.disabled = false;
        }
    }

    function start() {
        injectUI();
        document.addEventListener('chemistry-lab-ready', flushActions);
        if (window.ChemistryLab3D) flushActions();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
