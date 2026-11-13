// 主页应用外壳：Vue 3 负责导航与 AI 助手状态，Three.js / Canvas 渲染仍由 home.js 负责
// 使用本地 UMD 构建，支持 file:// 直接双击打开
const { createApp, ref, reactive, nextTick, onMounted } = Vue;

const BACKEND_BASE = window.location.origin;
const IS_FILE = window.location.protocol === 'file:';
let uid = 0;

// ==================== 导航 ====================
const NAV_APP = createApp({
    methods: {
        go(url) {
            window.location.href = url;
        }
    }
});
NAV_APP.mount('#nav-app');

// ==================== 小幻语 AI 助手 ====================
const AssistantApp = {
    setup() {
        const panelOpen = ref(false);
        const statusMode = ref('');
        const statusText = ref('小幻语 · 网页助手');
        const messages = ref([]);
        const input = ref('');
        const sending = ref(false);
        const cameraBusy = ref(false);
        const bootstrapLoaded = ref(false);
        const messagesRef = ref(null);
        const inputRef = ref(null);
        const imageInputRef = ref(null);
        const evidence = ref(null);
        const docOpen = ref(false);
        const docText = ref('');
        const docQuestion = ref('');
        const docError = ref('');
        const roleMode = ref('');

        let chatHistory = [];
        let currentSpeechAudio = null;
        let currentSpeechUrl = null;
        let speechQueue = [];
        let speechPlaying = false;
        let speechSession = 0;
        let speechBuffer = '';
        let currentSpeechResolve = null;
        let speechPrefetching = false;

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

        function focusInput() {
            nextTick(() => {
                if (inputRef.value) inputRef.value.focus();
            });
        }

        // ---------- 语音合成（跟随流式文本逐句播放） ----------
        function stopSpeech() {
            speechSession += 1;
            speechQueue = [];
            speechPlaying = false;
            speechBuffer = '';
            speechPrefetching = false;
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
        const SPEECH_BOUNDARY = /[。！？!?；;\n]|[，,、]/g;

        function drainSpeechBuffer(force = false) {
            SPEECH_BOUNDARY.lastIndex = 0;
            let match;
            while ((match = SPEECH_BOUNDARY.exec(speechBuffer))) {
                const end = match.index + 1;
                if (cleanForSpeech(speechBuffer.slice(0, end)).length >= SPEECH_MIN_CHARS) {
                    const chunk = speechBuffer.slice(0, end);
                    speechBuffer = speechBuffer.slice(end);
                    return chunk;
                }
            }
            if (force && speechBuffer.trim()) {
                const chunk = speechBuffer;
                speechBuffer = '';
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

        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        function synthesizeSegment(text) {
            return fetch(`${BACKEND_BASE}/speech/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: 'zh-CN' })
            })
                .then((response) => {
                    if (!response.ok) throw new Error(`speech http ${response.status}`);
                    return response.blob();
                })
                .then((blob) => ({ url: URL.createObjectURL(blob) }))
                .catch((error) => {
                    console.warn('TTS synthesize failed', error);
                    return null;
                });
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

        function enqueueSpeech(text) {
            const clean = cleanForSpeech(text);
            if (!clean) return;
            speechQueue.push({ text: clean, task: null });
            startNextPrefetch();
            pumpSpeech();
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
                if (!result) continue;

                const audio = new Audio(result.url);
                currentSpeechAudio = audio;
                currentSpeechUrl = result.url;

                await new Promise((resolve) => {
                    currentSpeechResolve = resolve;
                    audio.addEventListener('ended', resolve, { once: true });
                    audio.addEventListener('error', resolve, { once: true });
                    audio.play().catch(resolve);
                });
                currentSpeechResolve = null;

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
                currentSpeechAudio = null;
                currentSpeechUrl = null;
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
        function togglePanel(force) {
            const willOpen = typeof force === 'boolean' ? force : !panelOpen.value;
            panelOpen.value = willOpen;
            if (willOpen) {
                loadBootstrap().finally(focusInput);
            } else {
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
        async function sendMessage(message, options = {}) {
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
            let degradedNoticeShown = false;
            let sceneName = '';

            const pushDegradeNotice = (text, retryText = '') => {
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
                    body: JSON.stringify({ history: pendingHistory, role: options.roleName || '' })
                });
                if (!response.ok) throw new Error(`http ${response.status}`);
                if (!response.body) throw new Error('stream unsupported');

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
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
                        } else if (event === 'tool') {
                            // 工具调用前若已有正文，先收尾当前气泡，让工具卡片出现在独立位置
                            if (botNode) {
                                botNode.streaming = false;
                                botNode = null;
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
                        } else if (event === 'sources') {
                            if (Array.isArray(data.items) && data.items.length) {
                                citationCount = data.items.length;
                                pushMessage({
                                    type: 'sources',
                                    items: data.items.map((item) => ({
                                        ...item,
                                        snippet: stripMarkup(item.snippet || ''),
                                        quote: stripMarkup(item.quote || item.snippet || '')
                                    }))
                                });
                            }
                        } else if (event === 'delta') {
                            const piece = data.text || '';
                            if (!botNode) {
                                removeMessage(pendingNode);
                                botNode = pushMessage({ type: 'assistant', text: '', streaming: true });
                            }
                            answerText += piece;
                            botNode.text = stripMarkup(answerText);
                            speechBuffer += piece;
                            flushSpeechBuffer();
                            scrollToBottom();
                        } else if (event === 'done') {
                            blocked = !!data.blocked;
                            degraded = !!data.degraded;
                            if (data.scene) sceneName = data.scene;
                            if (Array.isArray(data.citations) && data.citations.length) citationCount = data.citations.length;
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

                if (botNode) {
                    botNode.streaming = false;
                    if (blocked) botNode.blocked = true;
                }

                // 可解释性标注：没有检索到知识库原文时，明确告知这是模型的通识推断
                if (!blocked && answerText && citationCount === 0 && sceneName !== 'chitchat' && !options.skipCitationNotice) {
                    pushMessage({
                        type: 'notice',
                        tone: 'hint',
                        title: '系统建议',
                        text: '本条回答未检索到知识库原文，属于模型的通识推断，建议结合教材手动核对。'
                    });
                }

                // 收尾：把最后一段不足一句的文本也送去合成
                flushSpeechBuffer(true);

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

        onMounted(() => {
            checkBackend();
            window.ElementWhisperAssistant = {
                open: openAssistant,
                ask: openAssistant
            };
        });

        // 供页面其他模块调用：打开面板并按需发送一条消息
        function openAssistant(options = {}) {
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
            cameraBusy,
            messagesRef,
            inputRef,
            imageInputRef,
            evidence,
            openEvidence,
            closeEvidence,
            formatScore,
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
            roleMode
        };
    }
};

createApp(AssistantApp).mount('#assistant-app');
