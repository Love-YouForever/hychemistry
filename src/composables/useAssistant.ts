import { ref, reactive, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import type { AssistantMessage, Evidence, Metrics, Quiz, AssistantOptions } from '../types'

const BACKEND_BASE = window.location.origin
const IS_FILE = window.location.protocol === 'file:'
let uid = 0

export function useAssistant() {
        const panelOpen = ref(false);
        const statusMode = ref('');
        const statusText = ref('小幻语 · 网页助手');
        const messages = ref<AssistantMessage[]>([]);
        const input = ref('');
        const sending = ref(false);
        const cameraBusy = ref(false);
        const bootstrapLoaded = ref(false);
        const messagesRef = ref<HTMLElement | null>(null);
        const inputRef = ref<HTMLInputElement | null>(null);
        const imageInputRef = ref<HTMLInputElement | null>(null);
        const evidence = ref<Evidence | null>(null);
        const docOpen = ref(false);
        const docText = ref('');
        const docQuestion = ref('');
        const docError = ref('');
        const roleMode = ref('');
        const speaking = ref(false);   // 是否正在朗读，用于显示「停止朗读」
        const metricsOpen = ref(false);
        const metrics = ref<Metrics>({});
        const metricsError = ref('');
        const quizOpen = ref(false);
        const quizLoading = ref(false);
        const quiz = ref<Quiz | null>(null);
        const quizError = ref('');
        const quizSelected = ref<number[]>([]);
        const quizSubmitted = ref(false);
        const quizScore = ref(0);

        let chatHistory = [];
        let currentSpeechAudio = null;
        let currentSpeechUrl = null;
        let speechQueue = [];
        let speechPlaying = false;
        let speechSession = 0;
        let speechBuffer = '';
        let currentSpeechResolve = null;
        let speechPrefetching = false;
        // 文字跟随语音展示：revealedBase 为已读完的文字，revealActive 为正在朗读的片段
        let speechPendingDisplay = '';
        let revealedBase = '';
        let revealNodeOffset = 0;
        let revealActive = null;
        let revealRaf = null;
        let speechDisabled = false;
        let speechUi = null;

        function nextId() {
            return ++uid;
        }

        function scrollToBottom() {
            nextTick(() => {
                const el = messagesRef.value;
                if (el) el.scrollTop = el.scrollHeight;
            });
        }

        function pushMessage(message) {
            const item = reactive({ id: nextId(), ...message });
            messages.value.push(item);
            scrollToBottom();
            return item;
        }

        function appendMessage(role, content) {
            return pushMessage({ type: role, text: content });
        }

        function removeMessage(target) {
            const index = messages.value.indexOf(target);
            if (index !== -1) messages.value.splice(index, 1);
        }

        function setStatus(mode, label) {
            statusMode.value = mode;
            statusText.value = label;
        }

        // ---------- 可解释性：查看依据弹窗 ----------
        function openEvidence(item) {
            if (!item) {
                evidence.value = null;
                return;
            }
            evidence.value = {
                ...item,
                snippet: stripMarkup(item.snippet || ''),
                quote: stripMarkup(item.quote || item.snippet || '')
            };
        }

        function closeEvidence() {
            evidence.value = null;
        }

        function formatScore(score) {
            if (score === null || score === undefined || score === '') return '—';
            const num = Number(score);
            if (Number.isNaN(num)) return String(score);
            if (num < 0.01) return num.toFixed(4);
            return num <= 1 ? num.toFixed(3) : num.toFixed(2);
        }

        // ---------- 引用溯源可视化：把回答中的来源名渲染成可点击卡片 ----------
        function parseCitationSegments(text, citations) {
            const body = text == null ? '' : String(text);
            if (!citations || !citations.length || !body) {
                return [{ type: 'text', value: body }];
            }
            const refMap = new Map();
            citations.forEach((item) => {
                if (item && item.ref) refMap.set(item.ref, item);
            });
            const refs = [...refMap.keys()].sort((a, b) => b.length - a.length);
            if (!refs.length) return [{ type: 'text', value: body }];

            const segments = [];
            let i = 0;
            const len = body.length;
            while (i < len) {
                let matched = null;
                for (const ref of refs) {
                    if (body.startsWith(ref, i)) { matched = ref; break; }
                }
                if (matched) {
                    segments.push({ type: 'cite', item: refMap.get(matched) });
                    i += matched.length;
                    continue;
                }
                // 收集到下一处可能命中为止的纯文本
                let j = i + 1;
                while (j < len) {
                    let found = false;
                    for (const ref of refs) {
                        if (body.startsWith(ref, j)) { found = true; break; }
                    }
                    if (found) break;
                    j += 1;
                }
                segments.push({ type: 'text', value: body.slice(i, j) });
                i = j;
            }
            return segments;
        }

        function focusInput() {
            nextTick(() => {
                if (inputRef.value) inputRef.value.focus();
            });
        }

        // ---------- 语音合成（跟随流式文本逐句播放） ----------
        function stopSpeech() {
            speaking.value = false;
            speechSession += 1;
            speechQueue = [];
            speechPlaying = false;
            speechBuffer = '';
            speechStarted = false;
            speechPrefetching = false;
            speechPendingDisplay = '';
            speechDisabled = false;
            if (revealRaf) {
                cancelAnimationFrame(revealRaf);
                revealRaf = null;
            }
            // 打断时把正在朗读的片段补全，避免气泡停在半句
            if (revealActive && speechUi) {
                speechUi.setText(revealActive.base + revealActive.item.display);
                revealActive.item.revealed = true;
            }
            revealActive = null;
            revealedBase = '';
            revealNodeOffset = 0;
            speechUi = null;
            if (currentSpeechResolve) {
                currentSpeechResolve();
                currentSpeechResolve = null;
            }
            if (currentSpeechAudio) {
                currentSpeechAudio.pause();
                currentSpeechAudio = null;
            }
            if (currentSpeechUrl) {
                URL.revokeObjectURL(currentSpeechUrl);
                currentSpeechUrl = null;
            }
        }

        // 打断朗读：立刻停声，已读文字保留，剩余回答改成直接显示不再朗读
        function muteSpeech() {
            if (!speechPlaying && !speechQueue.length && !currentSpeechAudio && !speechBuffer) return;
            speaking.value = false;
            speechSession += 1;
            speechQueue = [];
            speechPlaying = false;
            speechBuffer = '';
            speechStarted = false;
            speechPrefetching = false;
            speechPendingDisplay = '';
            speechDisabled = true;   // 后续文本走即时显示分支，不再合成
            if (revealRaf) {
                cancelAnimationFrame(revealRaf);
                revealRaf = null;
            }
            if (revealActive && speechUi) {
                revealedBase = revealActive.base + revealActive.item.display;
                revealActive.item.revealed = true;
                speechUi.setText(revealedBase);
                scrollToBottom();
            }
            revealActive = null;
            if (currentSpeechResolve) {
                currentSpeechResolve();
                currentSpeechResolve = null;
            }
            if (currentSpeechAudio) {
                currentSpeechAudio.pause();
                currentSpeechAudio = null;
            }
            if (currentSpeechUrl) {
                URL.revokeObjectURL(currentSpeechUrl);
                currentSpeechUrl = null;
            }
        }

        function cleanForSpeech(text) {
            return (text || '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/[#*`>_~]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // 流式文本切句：优先按句末标点，其次按逗号短语；过短的片段并入下一句，保证每段都够长
        const SPEECH_MIN_CHARS = 8;
        const SPEECH_FIRST_MIN_CHARS = 4;   // 首句阈值放低，让第一声更快出来
        const SPEECH_BOUNDARY = /[。！？!?；;\n]|[，,、]/g;
        let speechStarted = false;          // 首段是否已经送出

        function drainSpeechBuffer(force = false) {
            SPEECH_BOUNDARY.lastIndex = 0;
            const minChars = speechStarted ? SPEECH_MIN_CHARS : SPEECH_FIRST_MIN_CHARS;
            let match;
            while ((match = SPEECH_BOUNDARY.exec(speechBuffer))) {
                const end = match.index + 1;
                if (cleanForSpeech(speechBuffer.slice(0, end)).length >= minChars) {
                    const chunk = speechBuffer.slice(0, end);
                    speechBuffer = speechBuffer.slice(end);
                    speechStarted = true;
                    return chunk;
                }
            }
            if (force && speechBuffer.trim()) {
                const chunk = speechBuffer;
                speechBuffer = '';
                speechStarted = true;
                return chunk;
            }
            return '';
        }

        function flushSpeechBuffer(force = false) {
            let chunk = drainSpeechBuffer(force);
            while (chunk) {
                enqueueSpeech(chunk);
                chunk = drainSpeechBuffer(force);
            }
            pumpSpeech();
        }

        // 只预取一段：合成一段的同时播放上一段，避免并发抢占导致每段都变慢
        const SPEECH_BREATH_MS = 160;
        const SPEECH_TIMEOUT_MS = 8000;
        const SPEECH_RATE = 1.2;   // 播放倍速，文字揭示按音频进度同步

        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        function synthesizeSegment(text) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
            return fetch(`${BACKEND_BASE}/speech/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: 'zh-CN' }),
                signal: controller.signal
            })
                .then((response) => {
                    if (!response.ok) throw new Error(`speech http ${response.status}`);
                    return response.blob();
                })
                .then((blob) => ({ url: URL.createObjectURL(blob) }))
                .catch((error) => {
                    console.warn('TTS synthesize failed', error);
                    return null;
                })
                .finally(() => clearTimeout(timer));
        }

        function startNextPrefetch() {
            if (speechPrefetching) return;
            const item = speechQueue.find((entry) => !entry.task);
            if (!item) return;
            speechPrefetching = true;
            item.task = synthesizeSegment(item.text).finally(() => {
                speechPrefetching = false;
                startNextPrefetch();
            });
        }

        function enqueueSpeech(chunk) {
            const clean = cleanForSpeech(chunk);
            const display = stripMarkup(chunk);
            if (!clean) {
                // 纯标点/空白片段不单独合成，并入下一段一起展示
                speechPendingDisplay += display;
                return;
            }
            const item = { text: clean, display: speechPendingDisplay + display, task: null, revealed: false };
            speechPendingDisplay = '';
            if (speechDisabled) {
                revealInstant(item);
                return;
            }
            speechQueue.push(item);
            startNextPrefetch();
            pumpSpeech();
        }

        // ---------- 文字与语音同步：朗读到哪，文字才出现到哪 ----------
        function revealInstant(item) {
            if (!item || item.revealed) return;
            item.revealed = true;
            revealedBase += item.display;
            if (!speechUi) return;
            speechUi.create();
            speechUi.setText(revealedBase);
            scrollToBottom();
        }

        function beginReveal(item) {
            item.revealed = true;
            if (!speechUi) {
                revealedBase += item.display;
                return;
            }
            speechUi.create();
            revealActive = { item, base: revealedBase };
            const total = item.display.length;
            let lastCount = -1;
            const tick = () => {
                revealRaf = null;
                const audio = currentSpeechAudio;
                if (!revealActive || !audio) return;
                const duration = audio.duration;
                let count = 1;
                if (isFinite(duration) && duration > 0) {
                    const ratio = Math.min(1, audio.currentTime / duration);
                    count = Math.max(1, Math.floor(total * ratio));
                }
                if (count !== lastCount) {
                    lastCount = count;
                    speechUi.setText(revealActive.base + item.display.slice(0, count));
                    scrollToBottom();
                }
                if (count < total && !audio.ended) revealRaf = requestAnimationFrame(tick);
            };
            revealRaf = requestAnimationFrame(tick);
        }

        function finishReveal(item) {
            if (revealRaf) {
                cancelAnimationFrame(revealRaf);
                revealRaf = null;
            }
            if (revealActive && revealActive.item === item) {
                revealedBase = revealActive.base + item.display;
                revealActive = null;
                if (speechUi) {
                    speechUi.setText(revealedBase);
                    scrollToBottom();
                }
                item.revealed = true;
                return;
            }
            // 音频未能播放时兜底，保证文字不丢失
            revealInstant(item);
        }

        async function pumpSpeech() {
            if (speechPlaying) return;
            speechPlaying = true;
            const session = speechSession;

            while (speechQueue.length && session === speechSession) {
                const item = speechQueue.shift();
                startNextPrefetch();

                const result = await (item.task || synthesizeSegment(item.text));
                if (session !== speechSession) {
                    if (result) URL.revokeObjectURL(result.url);
                    return;
                }
                if (!result) {
                    // 合成不可用时不再等待，文字直接显示，避免气泡空白
                    speechDisabled = true;
                    revealInstant(item);
                    speechQueue.splice(0).forEach((rest) => revealInstant(rest));
                    continue;
                }

                const audio = new Audio(result.url);
                audio.playbackRate = SPEECH_RATE;
                if ('preservesPitch' in audio) audio.preservesPitch = true;
                currentSpeechAudio = audio;
                currentSpeechUrl = result.url;

                await new Promise((resolve) => {
                    currentSpeechResolve = resolve;
                    audio.addEventListener('ended', resolve, { once: true });
                    audio.addEventListener('error', resolve, { once: true });
                    audio.play().then(() => {
                        speaking.value = true;
                        beginReveal(item);
                    }).catch(resolve);
                });
                currentSpeechResolve = null;
                finishReveal(item);

                URL.revokeObjectURL(result.url);
                currentSpeechUrl = null;
                currentSpeechAudio = null;

                if (session !== speechSession) return;

                if (speechQueue.length) {
                    // 合成音频自带约 150~250ms 尾部静音，这里只补足到自然呼吸的长度
                    await sleep(SPEECH_BREATH_MS);
                }
            }

            if (session === speechSession) {
                speechPlaying = false;
                speaking.value = false;
                currentSpeechAudio = null;
                currentSpeechUrl = null;
                if (speechUi) {
                    if (speechUi.finishOnIdle) {
                        speechUi.finish();
                        speechUi.finishOnIdle = false;
                    }
                    if (speechUi.afterIdle) {
                        const after = speechUi.afterIdle;
                        speechUi.afterIdle = null;
                        after();
                    }
                }
            }
        }

        // ---------- 后端健康检查 ----------
        async function checkBackend() {
            if (IS_FILE) {
                setStatus('failed', '小幻语 · 静态预览');
                return false;
            }
            setStatus('attempt', '小幻语 · 连接中...');
            try {
                const response = await fetch(`${BACKEND_BASE}/api/health`, { method: 'GET' });
                if (!response.ok) throw new Error('bad status');
                setStatus('active', '小幻语 · 在线');
                return true;
            } catch (error) {
                setStatus('failed', '小幻语 · 后端离线');
                return false;
            }
        }

        // ---------- 欢迎语 ----------
        async function loadBootstrap() {
            if (bootstrapLoaded.value) return;
            const available = await checkBackend();
            if (!available) {
                appendMessage('system', IS_FILE
                    ? '当前为静态预览模式，启动本地服务后即可与小幻语对话。'
                    : '当前后端暂时不可用，小幻语还在整理试剂架，请稍后再试。');
                return;
            }
            try {
                const response = await fetch(`${BACKEND_BASE}/api/aigent/bootstrap`);
                const data = await response.json();
                appendMessage('assistant', data.intro || '小幻语已经在网页里待命啦。');
            } catch (error) {
                appendMessage('assistant', '锵锵~小幻语已经在网页里待命啦。');
            }
            bootstrapLoaded.value = true;
        }

        // ---------- 面板展开 / 收起 ----------
        function togglePanel(force?: boolean) {
            const willOpen = typeof force === 'boolean' ? force : !panelOpen.value;
            panelOpen.value = willOpen;
            if (willOpen) {
                loadBootstrap().finally(focusInput);
            } else {
                stopSpeech();
                roleMode.value = '';
            }
        }

        // ---------- SSE 解析 ----------
        function parseSseFrame(frame) {
            const lines = frame.split('\n');
            let event = 'message';
            const dataLines = [];
            for (const line of lines) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
            }
            if (!dataLines.length) return null;
            try {
                return { event, data: JSON.parse(dataLines.join('\n')) };
            } catch (error) {
                return null;
            }
        }

        // ---------- 工具结果摘要 ----------
        function summarizeToolResult(result) {
            if (!result || typeof result !== 'object') return '已完成';
            if (result.ok === false) return '未查到：' + (result.error || '无结果');
            if (result['配平结果']) return result['配平结果'];
            if (result['摩尔质量']) return result['化学式'] + ' = ' + result['摩尔质量'] + ' g/mol';
            if (result['反应类型']) return result['化学方程式'] + '（' + result['实验现象'] + '）';
            if (result['危险性']) return result['化学品'] + '：' + result['危险性'];
            if (result.element) return result.element['中文名'] + ' ' + result.element['元素符号'] + '，相对原子质量 ' + result.element['相对原子质量'];
            if (Array.isArray(result.results)) return result.results.length ? ('命中 ' + result.results.length + ' 条知识片段') : '未命中相关片段';
            if (result['提示']) return result['提示'];
            return '已完成';
        }

        // ---------- 工具调用轨迹：把参数翻译成人类可读的过程提示 ----------
        function shortText(value, limit = 18) {
            const text = String(value == null ? '' : value).trim();
            return text.length > limit ? text.slice(0, limit) + '…' : text;
        }

        // 模型偶尔会输出 Markdown 加粗，聊天气泡按纯文本展示
        function stripMarkup(text) {
            return String(text || '')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/`{1,3}/g, '')
                .replace(/^#{1,6}\s+/gm, '');
        }

        function buildToolArgs(name, args) {
            const a = args || {};
            switch (name) {
                case 'query_element':
                    return a.query ? '元素：' + a.query : '元素查询';
                case 'molar_mass':
                    return a.formula ? '化学式：' + a.formula : '摩尔质量';
                case 'balance_equation':
                    return a.equation ? '方程式：' + shortText(a.equation, 24) : '方程式配平';
                case 'lookup_reaction':
                    return Array.isArray(a.reactants) && a.reactants.length
                        ? '反应物：' + a.reactants.join(' + ')
                        : '反应检索';
                case 'get_safety_info':
                    return a.chemical ? '化学品：' + a.chemical : '危化品安全';
                case 'search_knowledge':
                    return a.query ? '检索：' + shortText(a.query, 24) : '知识库检索';
                default:
                    return '';
            }
        }

        function buildToolHint(name, args) {
            const a = args || {};
            switch (name) {
                case 'query_element':
                    return a.query ? '正在查询「' + a.query + '」的熔点、密度等性质…' : '正在查询元素性质…';
                case 'molar_mass':
                    return a.formula ? '正在计算 ' + a.formula + ' 的摩尔质量…' : '正在计算摩尔质量…';
                case 'balance_equation':
                    return a.equation ? '正在配平 ' + shortText(a.equation, 24) + '…' : '正在配平化学方程式…';
                case 'lookup_reaction':
                    return Array.isArray(a.reactants) && a.reactants.length
                        ? '正在检索 ' + a.reactants.join(' + ') + ' 的反应现象…'
                        : '正在检索反应现象…';
                case 'get_safety_info':
                    return a.chemical ? '正在查询「' + a.chemical + '」的危化品安全信息…' : '正在查询危化品安全信息…';
                case 'search_knowledge':
                    return a.query ? '正在检索知识库：' + shortText(a.query, 20) : '正在检索本地知识库…';
                default:
                    return '正在调用工具…';
            }
        }

        // ---------- 发送消息 ----------
        async function sendMessage(message: string, options: AssistantOptions = {}) {
            if (IS_FILE) {
                appendMessage('system', '当前为静态预览模式，启动本地服务后即可与小幻语对话。');
                return;
            }
            const pendingHistory = [...chatHistory, { role: 'user', content: message }];
            appendMessage('user', options.displayText || message);

            if (Array.isArray(options.sources) && options.sources.length) {
                pushMessage({ type: 'sources', items: options.sources });
            }
            if (options.notice) {
                pushMessage({
                    type: 'notice',
                    tone: 'hint',
                    title: options.notice.title || '提示',
                    text: options.notice.text || ''
                });
            }

            stopSpeech();

            input.value = '';
            sending.value = true;
            const pendingNode = pushMessage({ type: 'pending', text: '小幻语正在思考…' });
            setStatus('attempt', '小幻语 · 思考中');

            let botNode = null;
            let answerText = '';
            let toolCard = null;
            let blocked = false;
            let degraded = false;
            let citationCount = Array.isArray(options.sources) ? options.sources.length : 0;
            let currentCitations = null;
            let degradedNoticeShown = false;
            let sceneActionNoticeShown = false;
            let sceneName = '';

            // 文字气泡由语音进度驱动创建与增长
            speechUi = {
                finishOnIdle: false,
                create() {
                    if (botNode) return;
                    removeMessage(pendingNode);
                    botNode = pushMessage({
                        type: 'assistant',
                        text: revealedBase.slice(revealNodeOffset),
                        streaming: true
                    });
                    scrollToBottom();
                },
                setText(text) {
                    if (!botNode) this.create();
                    if (botNode) botNode.text = text.slice(revealNodeOffset);
                },
                finish() {
                    if (botNode) botNode.streaming = false;
                },
                // 工具调用把当前气泡收尾，后续文字在新气泡里继续
                detach() {
                    if (revealActive) {
                        if (revealRaf) {
                            cancelAnimationFrame(revealRaf);
                            revealRaf = null;
                        }
                        revealedBase = revealActive.base + revealActive.item.display;
                        revealActive.item.revealed = true;
                        revealActive = null;
                    }
                    if (botNode) botNode.text = revealedBase.slice(revealNodeOffset);
                    revealNodeOffset = revealedBase.length;
                    botNode = null;
                }
            };

            const pushDegradeNotice = (text = '', retryText = '') => {
                if (degradedNoticeShown) return;
                degradedNoticeShown = true;
                pushMessage({
                    type: 'notice',
                    tone: 'warn',
                    title: '降级链路已触发',
                    text: text || '主模型不可用，已自动切换到备用模型。',
                    retryText
                });
            };

            try {
                const response = await fetch(`${BACKEND_BASE}/api/aigent/chat/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ history: pendingHistory, role: options.roleName || '', surface: 'home' })
                });
                if (!response.ok) throw new Error(`http ${response.status}`);
                if (!response.body) throw new Error('stream unsupported');

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const frames = buffer.split('\n\n');
                    buffer = frames.pop() || '';

                    for (const frame of frames) {
                        const parsed = parseSseFrame(frame);
                        if (!parsed) continue;
                        const { event, data = {} } = parsed;

                        if (event === 'status') {
                            pendingNode.text = data.text || '正在思考…';
                            if (data.scene) sceneName = data.scene;
                            if (data.stage === 'degraded') pushDegradeNotice(data.chain);
                            if (data.stage === 'cache') {
                                pushMessage({
                                    type: 'notice',
                                    tone: 'hint',
                                    title: '语义缓存命中',
                                    text: '这个问题和之前问过的内容高度相似，直接复用了上次的结论，省去了模型推理。'
                                });
                            }
                            if (data.stage === 'doc_guard' && data.hits > 0) {
                                pushMessage({
                                    type: 'notice',
                                    tone: 'warn',
                                    title: '资料中的可疑指令已屏蔽',
                                    text: `在你提供的资料里识别到 ${data.hits} 处指令性内容，已按普通文字处理，不会影响回答规则。`
                                });
                            }
                        } else if (event === 'tool') {
                            // 工具调用前若已有正文，先收尾当前气泡，让工具卡片出现在独立位置
                            if (botNode) {
                                if (speechUi) speechUi.detach();
                                else {
                                    botNode.streaming = false;
                                    botNode = null;
                                }
                            }
                            toolCard = pushMessage({
                                type: 'tool',
                                label: data.label || data.name,
                                detail: buildToolArgs(data.name, data.arguments) || '正在调用…',
                                done: false
                            });
                            pendingNode.text = buildToolHint(data.name, data.arguments);
                            scrollToBottom();
                        } else if (event === 'tool_result') {
                            if (toolCard) {
                                toolCard.done = true;
                                toolCard.detail = summarizeToolResult(data.result);
                                toolCard = null;
                            }
                        } else if (event === 'scene_action') {
                            // 主页不执行 3D 动作；异常或误路由事件不影响正文与语音。
                            if (!sceneActionNoticeShown) {
                                sceneActionNoticeShown = true;
                                const targetName = data.target === 'periodic'
                                    ? '3D 元素周期表'
                                    : (data.target === 'lab' ? '3D 化学实验室' : '对应 3D 页面');
                                pushMessage({
                                    type: 'notice',
                                    tone: 'hint',
                                    title: '场景动作未在主页执行',
                                    text: `请前往${targetName}后重新提出该操作请求。`
                                });
                            }
                        } else if (event === 'sources') {
                            if (Array.isArray(data.items) && data.items.length) {
                                citationCount = data.items.length;
                                const items = data.items.map((item) => ({
                                    ...item,
                                    snippet: stripMarkup(item.snippet || ''),
                                    quote: stripMarkup(item.quote || item.snippet || '')
                                }));
                                currentCitations = items;
                                if (botNode) botNode.citations = items;
                                pushMessage({ type: 'sources', items });
                            }
                        } else if (event === 'verify') {
                            const issues = Array.isArray(data.mismatches) ? data.mismatches : [];
                            if (issues.length) {
                                pushMessage({
                                    type: 'notice',
                                    tone: 'warn',
                                    title: '数值核对已拦截',
                                    text: issues
                                        .map((item) => `${item.expected}，与上文中的 ${item.claimed} 不一致`)
                                        .join('；')
                                });
                            } else if ((data.checked || 0) > 0) {
                                pushMessage({
                                    type: 'notice',
                                    tone: 'hint',
                                    title: '数值核对通过',
                                    text: `已用工具计算结果核对回答中的 ${data.checked} 处数值，全部一致。`
                                });
                            }
                        } else if (event === 'delta') {
                            const piece = data.text || '';
                            // 文本只入缓冲，等语音读到对应片段时再显示
                            answerText += piece;
                            speechBuffer += piece;
                            flushSpeechBuffer();
                        } else if (event === 'done') {
                            blocked = !!data.blocked;
                            degraded = !!data.degraded;
                            if (data.scene) sceneName = data.scene;
                            if (Array.isArray(data.citations) && data.citations.length) {
                                citationCount = data.citations.length;
                                if (!currentCitations) {
                                    currentCitations = data.citations.map((item) => ({
                                        ...item,
                                        snippet: stripMarkup(item.snippet || ''),
                                        quote: stripMarkup(item.quote || item.snippet || '')
                                    }));
                                }
                            }
                            if (currentCitations && botNode) botNode.citations = currentCitations;
                            if (degraded) {
                                const chain = data.chain || '';
                                pushDegradeNotice(chain, chain.indexOf('均不可用') >= 0 ? message : '');
                            }
                        } else if (event === 'error') {
                            throw new Error(data.error || 'stream error');
                        }
                    }
                }

                removeMessage(pendingNode);

                if (degraded) pushDegradeNotice();

                // 收尾：把最后一段不足一句的文本也送去合成
                flushSpeechBuffer(true);

                if (botNode && blocked) botNode.blocked = true;

                const finishAnswer = () => {
                    if (botNode) botNode.streaming = false;
                    // 可解释性标注：没有检索到知识库原文时，明确告知这是模型的通识推断
                    if (!blocked && answerText && citationCount === 0 && sceneName !== 'chitchat' && !options.skipCitationNotice) {
                        pushMessage({
                            type: 'notice',
                            tone: 'hint',
                            title: '系统建议',
                            text: '本条回答未检索到知识库原文，属于模型的通识推断，建议结合教材手动核对。'
                        });
                    }
                };

                // 文字还在随语音逐句出现时，等朗读结束再收起光标、追加提示
                if (speechPlaying || speechQueue.length) {
                    if (speechUi) {
                        speechUi.finishOnIdle = true;
                        speechUi.afterIdle = finishAnswer;
                    }
                } else {
                    finishAnswer();
                }

                if (answerText) {
                    chatHistory = [...pendingHistory, { role: 'assistant', content: answerText }];
                }
                setStatus('active', '小幻语 · 在线');
            } catch (error) {
                removeMessage(pendingNode);
                if (botNode) removeMessage(botNode);
                stopSpeech();
                pushMessage({
                    type: 'error',
                    text: '这次通信出了点问题，小幻语没有成功接上后端。可以检查网络后点下方按钮重试。',
                    retryText: message
                });
                setStatus('failed', '小幻语 · 后端离线');
            } finally {
                sending.value = false;
                focusInput();
            }
        }

        // ---------- 失败重试 ----------
        function retry(node) {
            if (!node) return;
            const index = messages.value.indexOf(node);
            if (index >= 0) messages.value.splice(index, 1);
            if (node.retryFile) {
                if (!cameraBusy.value) handleImageFile(node.retryFile);
                return;
            }
            const text = node.retryText;
            if (!text || sending.value) return;
            sendMessage(text);
        }

        function submit() {
            const message = input.value.trim();
            if (!message || sending.value) return;
            sendMessage(message);
        }

        // 空态快捷提问：填入并直接发送
        function quickAsk(text, label) {
            if (sending.value) return;
            input.value = '';
            sendMessage(text, label ? { displayText: label } : {});
        }

        // ---------- 多模态：图片压缩 ----------
        function compressImage(file, maxSize = 1024) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                const objectUrl = URL.createObjectURL(file);
                image.onload = () => {
                    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(image.width * scale);
                    canvas.height = Math.round(image.height * scale);
                    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(objectUrl);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                image.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('图片读取失败'));
                };
                image.src = objectUrl;
            });
        }

        // ---------- 多模态：上传识别 ----------
        function pickImage() {
            if (imageInputRef.value) imageInputRef.value.click();
        }

        async function onImageChange(event) {
            const file = event.target.files && event.target.files[0];
            if (file) await handleImageFile(file);
            event.target.value = '';
        }

        async function handleImageFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                appendMessage('system', '请选择图片文件');
                return;
            }

            pushMessage({ type: 'image', src: URL.createObjectURL(file) });

            const pendingNode = pushMessage({ type: 'pending', text: '小幻语正在看图…' });
            cameraBusy.value = true;

            try {
                const dataUrl = await compressImage(file);
                const response = await fetch(`${BACKEND_BASE}/api/aigent/vision`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: dataUrl, question: input.value.trim() })
                });
                const data = await response.json();
                if (!response.ok || !data.ok) throw new Error(data.error || '识别失败');

                removeMessage(pendingNode);

                const typeLabel = {
                    equation: '化学方程式',
                    apparatus: '实验装置',
                    reagent: '试剂 / 元素',
                    other: '其他'
                }[data.result.type] || '其他';

                pushMessage({
                    type: 'vision',
                    label: typeLabel,
                    result: data.result,
                    degraded: !!data.degraded,
                    chain: data.chain || '',
                    model: data.model || ''
                });

                chatHistory = [...chatHistory,
                    { role: 'user', content: '[上传了一张图片，识别结果为：' + (data.result.content || '') + ']' },
                    { role: 'assistant', content: (data.result.explanation || '') }
                ];
            } catch (error) {
                removeMessage(pendingNode);
                pushMessage({
                    type: 'error',
                    text: '图片识别没有成功：' + error.message,
                    retryFile: file
                });
            } finally {
                cameraBusy.value = false;
            }
        }

        // ---------- 文档问答：本地分块 + 词面检索，回答带出处 ----------
        function openDoc() {
            docError.value = '';
            docOpen.value = true;
            nextTick(() => {
                const area = document.getElementById('docTextArea');
                if (area) area.focus();
            });
        }

        function closeDoc() {
            if (sending.value) return;
            docOpen.value = false;
        }

        // ---------- 运行指标：缓存命中率与首字延迟 ----------
        async function openMetrics() {
            metricsOpen.value = true;
            metricsError.value = '';
            try {
                const response = await fetch(`${BACKEND_BASE}/api/metrics`);
                if (!response.ok) throw new Error('bad status');
                metrics.value = await response.json();
            } catch (error) {
                metricsError.value = '暂时取不到运行指标，请确认后端服务在线。';
            }
        }

        function closeMetrics() {
            metricsOpen.value = false;
        }

        // ---------- 随堂小测：按最近的问题出题，答完立即判分并给出解析 ----------
        function lastUserTopic() {
            for (let i = chatHistory.length - 1; i >= 0; i -= 1) {
                if (chatHistory[i].role === 'user') return chatHistory[i].content;
            }
            return '';
        }

        async function loadQuiz() {
            quizLoading.value = true;
            quizError.value = '';
            quiz.value = null;
            quizSelected.value = [];
            quizSubmitted.value = false;
            quizScore.value = 0;

            const topic = lastUserTopic();
            if (!topic) {
                quizLoading.value = false;
                quizError.value = '先在对话里问一个化学问题，我再按最近的问题出题。';
                return;
            }

            try {
                const response = await fetch(`${BACKEND_BASE}/api/aigent/quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, history: chatHistory.slice(-6) })
                });
                const data = await response.json();
                if (!response.ok || !data.ok) throw new Error(data.error || 'bad status');
                quiz.value = data.quiz;
                quizSelected.value = data.quiz.questions.map(() => -1);
            } catch (error) {
                quizError.value = '暂时出不了题，请确认后端在线后再试一次。';
            } finally {
                quizLoading.value = false;
            }
        }

        function openQuiz() {
            quizOpen.value = true;
            loadQuiz();
        }

        function closeQuiz() {
            quizOpen.value = false;
        }

        function selectOption(questionIndex, optionIndex) {
            if (quizSubmitted.value) return;
            const next = [...quizSelected.value];
            next[questionIndex] = optionIndex;
            quizSelected.value = next;
            quizError.value = '';
        }

        function optionClass(questionIndex, question, optionIndex) {
            const picked = quizSelected.value[questionIndex] === optionIndex;
            if (!quizSubmitted.value) return { picked };
            if (optionIndex === question.answer_index) return { correct: true };
            return { picked, wrong: picked };
        }

        function submitQuiz() {
            if (!quiz.value) return;
            if (quizSelected.value.some((value) => value < 0)) {
                quizError.value = '还有题目没有作答，全部选完再提交。';
                return;
            }
            quizScore.value = quiz.value.questions.filter(
                (question, index) => question.answer_index === quizSelected.value[index]
            ).length;
            quizError.value = '';
            quizSubmitted.value = true;
        }

        function onDocFile(event) {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file) return;
            if (file.size > 200 * 1024) {
                docError.value = '文件过大，请上传 200KB 以内的纯文本。';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                docText.value = String(reader.result || '').slice(0, 8000);
                docError.value = '';
            };
            reader.onerror = () => {
                docError.value = '文件读取失败，请改用粘贴。';
            };
            reader.readAsText(file, 'utf-8');
        }

        function splitDocument(text) {
            const normalized = String(text || '').replace(/\r/g, '').trim();
            if (!normalized) return [];
            const pieces = normalized
                .split(/\n{2,}/)
                .flatMap((part) => part.split(/(?<=[。！？!?；;])/))
                .map((part) => part.trim())
                .filter(Boolean);

            const chunks = [];
            let buffer = '';
            pieces.forEach((piece) => {
                if (buffer && (buffer + piece).length > 170) {
                    chunks.push(buffer);
                    buffer = piece;
                } else {
                    buffer += piece;
                }
            });
            if (buffer) chunks.push(buffer);
            return chunks.slice(0, 40);
        }

        function bigramSet(text) {
            const clean = String(text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
            const grams = new Set();
            for (let i = 0; i < clean.length - 1; i += 1) {
                grams.add(clean.slice(i, i + 2));
            }
            return grams;
        }

        function rankChunks(chunks, question) {
            const questionGrams = bigramSet(question);
            const questionChars = new Set(
                Array.from(String(question || '').toLowerCase()).filter((ch) => /[\u4e00-\u9fa5a-z0-9]/.test(ch))
            );
            return chunks.map((text, index) => {
                const grams = bigramSet(text);
                let overlap = 0;
                questionGrams.forEach((gram) => {
                    if (grams.has(gram)) overlap += 1;
                });
                let charHits = 0;
                const lower = text.toLowerCase();
                questionChars.forEach((ch) => {
                    if (lower.indexOf(ch) >= 0) charHits += 1;
                });
                return { index, text, score: overlap * 2 + charHits * 0.15 };
            }).sort((a, b) => b.score - a.score);
        }

        function submitDoc() {
            if (sending.value) return;
            const text = docText.value.trim();
            const question = docQuestion.value.trim();

            if (text.length < 80) {
                docError.value = '请粘贴至少 80 字的化学相关文本。';
                return;
            }
            if (!question) {
                docError.value = '请输入一个具体问题。';
                return;
            }

            const chunks = splitDocument(text);
            if (!chunks.length) {
                docError.value = '没有识别到可检索的段落，请换一段文字。';
                return;
            }

            const ranked = rankChunks(chunks, question).slice(0, 3);
            const sources = ranked.map((chunk, i) => ({
                ref: '资料[' + (i + 1) + ']',
                source_ref: '本地文档 · 第 ' + (chunk.index + 1) + ' 段',
                match: 'bigram',
                score: chunk.score,
                snippet: chunk.text.slice(0, 110),
                quote: chunk.text
            }));
            const excerpt = ranked
                .map((chunk, i) => '[' + (i + 1) + '] ' + chunk.text)
                .join('\n\n');
            const prompt = '【用户提供的资料】\n' + excerpt +
                '\n\n请只依据以上资料回答问题：' + question +
                '\n要求：1. 先给结论；2. 引用资料时标注[1][2]；3. 资料没有覆盖的部分明确写“资料未提及”，不要补充资料外的知识。';

            docOpen.value = false;
            docQuestion.value = '';
            sendMessage(prompt, {
                displayText: '📄 文档问答：' + question,
                sources: sources,
                notice: {
                    title: '已在你提供的文本中检索',
                    text: '命中 ' + ranked.length + ' 段依据，回答只基于这些片段。'
                }
            });
        }

        const handleToggleChatPanel = () => togglePanel();

        onMounted(() => {
            checkBackend();
            window.ElementWhisperAssistant = {
                open: openAssistant,
                ask: openAssistant
            };
            window.addEventListener('toggle-chat-panel', handleToggleChatPanel);
            window.__assistantPanelOpen = panelOpen.value;
            document.body.classList.toggle('assistant-open', panelOpen.value);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('toggle-chat-panel', handleToggleChatPanel);
            document.body.classList.remove('assistant-open');
        });

        watch(panelOpen, (open) => {
            window.__assistantPanelOpen = open;
            document.body.classList.toggle('assistant-open', open);
        });

        // 供页面其他模块调用：打开面板并按需发送一条消息
        function openAssistant(options: AssistantOptions = {}) {
            panelOpen.value = true;
            roleMode.value = options.roleName || '';
            if (!options.prompt) {
                loadBootstrap().finally(focusInput);
                return;
            }
            if (roleMode.value) {
                pushMessage({
                    type: 'notice',
                    tone: 'hint',
                    title: '🎭 角色模式 · ' + roleMode.value,
                    text: '接下来由小幻语扮演 ' + roleMode.value + '，以第一人称与你对话。'
                });
            } else {
                loadBootstrap();
            }
            setTimeout(() => {
                if (sending.value) return;
                sendMessage(options.prompt, {
                    displayText: options.displayText || options.prompt,
                    skipCitationNotice: !!options.skipCitationNotice,
                    roleName: options.roleName || ''
                });
            }, 260);
        }


        return {
            panelOpen,
            statusMode,
            statusText,
            messages,
            input,
            sending,
            speaking,
            muteSpeech,
            cameraBusy,
            messagesRef,
            inputRef,
            imageInputRef,
            evidence,
            openEvidence,
            closeEvidence,
            formatScore,
            parseCitationSegments,
            togglePanel,
            submit,
            quickAsk,
            retry,
            pickImage,
            onImageChange,
            docOpen,
            docText,
            docQuestion,
            docError,
            openDoc,
            closeDoc,
            submitDoc,
            onDocFile,
            roleMode,
            metricsOpen,
            metrics,
            metricsError,
            openMetrics,
            closeMetrics,
            quizOpen,
            quizLoading,
            quiz,
            quizError,
            quizSelected,
            quizSubmitted,
            quizScore,
            openQuiz,
            closeQuiz,
            loadQuiz,
            selectOption,
            optionClass,
            submitQuiz
        };
}
