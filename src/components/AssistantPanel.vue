<template>
    <!-- 桌宠形象：固定屏幕底部，左右漫游，点击/拖拽切换表情动作 -->
    <div class="pet-container" id="pet-container">
        <div class="pet-hint" id="pet-hint">戳一戳我进行对话 👉</div>
        <div class="pet-bubble" id="pet-bubble"></div>
        <img id="pet-img" :src="petImgSrc" alt="小幻语" class="pet-img" draggable="false">
        <div class="pet-shadow"></div>
    </div>
    <div class="assistant-panel" :class="{ open: panelOpen }" :aria-hidden="panelOpen ? 'false' : 'true'">
        <div class="assistant-header">
            <div class="assistant-header-main">
                <img :src="avatarSrc" alt="小幻语头像" class="assistant-avatar">
                <div>
                    <div class="assistant-title">{{ roleMode || '小幻语' }}</div>
                    <div class="assistant-subtitle">{{ roleMode ? '历史人物访谈 · 第一人称对话' : '网页助手 · 化学灵感待命中' }}</div>
                </div>
            </div>
            <button class="assistant-close" type="button" @click="togglePanel(false)">×</button>
        </div>
        <div class="assistant-messages" ref="messagesRef">
            <template v-for="m in messages" :key="m.id">
                <div v-if="m.type === 'pending'" class="assistant-message system assistant-pending">
                    <span class="assistant-dots"><i></i><i></i><i></i></span>
                    <span class="assistant-pending-text">{{ m.text }}</span>
                </div>
                <div v-else-if="m.type === 'tool'" class="assistant-tool" :class="{ done: m.done }">
                    <div class="assistant-tool-title">⚙️ {{ m.label }}</div>
                    <div class="assistant-tool-detail">{{ m.detail }}</div>
                </div>
                <div v-else-if="m.type === 'vision'" class="assistant-vision">
                    <div class="assistant-vision-type">🔍 视觉识别 · {{ m.label }}</div>
                    <div v-if="m.degraded && m.chain" class="assistant-vision-degrade">⚠️ {{ m.chain }}</div>
                    <div class="assistant-vision-content">{{ m.result.content || '无法识别' }}</div>
                    <div v-if="m.result.balance" class="assistant-vision-balance" :class="{ invalid: !m.result.balance.ok }">
                        ⚖️ {{ m.result.balance.ok ? '自动配平校验：' + m.result.balance['配平结果'] : '配平校验：' + (m.result.balance.error || '无法配平') }}
                    </div>
                    <div v-if="m.result.explanation" class="assistant-vision-row"><span class="label">💡 讲解</span><span>{{ m.result.explanation }}</span></div>
                    <div v-if="m.result.safety" class="assistant-vision-safety">⚠️ {{ m.result.safety }}</div>
                    <div v-if="m.result.confidence === 'low'" class="assistant-vision-low">识别把握较低，建议换一张更清晰的图片</div>
                </div>
                <div v-else-if="m.type === 'sources'" class="assistant-sources">
                    <div class="assistant-sources-title">📎 知识来源 · 点击条目查看依据</div>
                    <div v-for="(s, i) in m.items" :key="i" class="assistant-source-item" role="button" tabindex="0" @click="openEvidence(s)">
                        <div class="assistant-source-head">
                            <span class="assistant-source-ref">{{ s.ref }}</span>
                            <span v-if="s.source_ref" class="assistant-source-id">{{ s.source_ref }}</span>
                            <span class="assistant-source-more">查看依据 ›</span>
                        </div>
                        <div class="assistant-source-snippet">{{ s.snippet }}</div>
                    </div>
                </div>
                <div v-else-if="m.type === 'notice'" class="assistant-notice" :class="m.tone">
                    <div class="assistant-notice-title">{{ m.title }}</div>
                    <div class="assistant-notice-text">{{ m.text }}</div>
                    <button v-if="m.retryText" type="button" class="assistant-retry" @click="retry(m)">重新试一次</button>
                </div>
                <div v-else-if="m.type === 'error'" class="assistant-error">
                    <div class="assistant-error-text">{{ m.text }}</div>
                    <button v-if="m.retryText" type="button" class="assistant-retry" @click="retry(m)">重新试一次</button>
                </div>
                <div v-else-if="m.type === 'image'" class="assistant-message user">
                    <img class="assistant-thumb" :src="m.src" alt="上传的图片">
                </div>
                <div v-else class="assistant-message" :class="[m.type, { blocked: m.blocked, streaming: m.streaming }]">
                    <template v-for="(seg, i) in parseCitationSegments(m.text, m.citations)" :key="i">
                        <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                        <span
                            v-else-if="seg.type === 'cite'"
                            class="citation-chip"
                            role="button"
                            tabindex="0"
                            @click="openEvidence(seg.item)"
                            @keyup.enter="openEvidence(seg.item)"
                        >📎 {{ seg.item.ref }}</span>
                    </template>
                </div>
            </template>
            <div v-if="!messages.some(m => m.type === 'user')" class="assistant-empty">
                <div v-if="!messages.length" class="assistant-empty-title">🤖 AI 模式已就绪</div>
                <div v-if="!messages.length" class="assistant-empty-text">我是小幻语，可以直接问我化学问题，也可以让我检索知识库并标注出处。</div>
                <div class="assistant-empty-chips">
                    <button type="button" class="assistant-chip" @click="quickAsk('在元素周期表里找出常温（约 25℃）下呈液态的元素，并解释它们的共同用途。请先调用 search_knowledge 检索元素知识库，并在回答末尾标注来源。', '帮我找三个常温液态元素')">帮我找三个常温液态元素</button>
                    <button type="button" class="assistant-chip" @click="quickAsk('钠为什么和水反应这么快？请结合元素性质与反应机理解释，并检索知识库标注来源。', '钠为什么和水反应这么快？')">钠为什么和水反应这么快？</button>
                    <button type="button" class="assistant-chip" @click="quickAsk('硫酸铜溶液和氢氧化钠溶液反应会有什么现象？请写出方程式并解释现象，检索知识库标注来源。', '硫酸铜与氢氧化钠反应')">硫酸铜与氢氧化钠反应</button>
                </div>
            </div>
        </div>
        <div class="assistant-tools">
            <button type="button" class="assistant-tool-btn" @click="openDoc" :disabled="sending">📄 文档问答</button>
            <button type="button" class="assistant-tool-btn" @click="openMetrics">⚡ 运行指标</button>
            <button type="button" class="assistant-tool-btn" @click="openQuiz" :disabled="sending">🎯 随堂小测</button>
            <span class="assistant-tools-tip">粘贴一段文字，我只依据它回答并标出处</span>
        </div>
        <div v-if="speaking" class="assistant-speaking">
            <span class="assistant-speaking-dot" aria-hidden="true"></span>
            <span>正在朗读…</span>
            <button type="button" class="assistant-stop" @click="muteSpeech">⏸ 停止朗读</button>
        </div>
        <form class="assistant-form" @submit.prevent="submit">
            <button class="assistant-camera" type="button" title="拍照识别化学方程式或实验装置" @click="pickImage" :disabled="cameraBusy">📷</button>
            <input class="assistant-input" ref="inputRef" v-model="input" type="text" placeholder="想问点什么？比如：钠为什么和水反应这么快？" :disabled="sending">
            <button class="assistant-send" type="submit" :disabled="sending">发送</button>
        </form>
        <input ref="imageInputRef" type="file" accept="image/*" capture="environment" hidden @change="onImageChange">
    </div>

    <!-- 可解释性：查看依据弹窗 -->
    <div v-if="evidence" class="evidence-mask" @click.self="closeEvidence">
        <div class="evidence-dialog" role="dialog" aria-modal="true">
            <div class="evidence-head">
                <span class="evidence-title">🔍 查看依据</span>
                <button type="button" class="evidence-close" @click="closeEvidence">×</button>
            </div>
            <div class="evidence-meta">
                <div class="evidence-row"><span class="k">来源</span><span class="v">{{ evidence.ref }}</span></div>
                <div class="evidence-row"><span class="k">编号</span><span class="v">{{ evidence.source_ref || '—' }}</span></div>
                <div class="evidence-row"><span class="k">命中方式</span><span class="v">{{ evidence.match || '混合检索' }}</span></div>
                <div class="evidence-row"><span class="k">融合得分</span><span class="v">{{ formatScore(evidence.score) }}</span></div>
            </div>
            <div class="evidence-quote">{{ evidence.quote || evidence.snippet }}</div>
            <div class="evidence-foot">原文取自本地化学知识库（BM25 + 向量召回 + RRF 融合 + 领域重排），可逐条核对后再采信。</div>
        </div>
    </div>

    <!-- 运行指标：语义缓存命中率与响应延迟 -->
    <div v-if="metricsOpen" class="evidence-mask" @click.self="closeMetrics">
        <div class="evidence-dialog" role="dialog" aria-modal="true">
            <div class="evidence-head">
                <span class="evidence-title">⚡ 运行指标</span>
                <button type="button" class="evidence-close" @click="closeMetrics">×</button>
            </div>
            <div class="evidence-meta">
                <div class="evidence-row"><span class="k">累计请求</span><span class="v">{{ metrics.requests || 0 }} 次</span></div>
                <div class="evidence-row"><span class="k">缓存命中</span><span class="v">{{ metrics.cache_hits || 0 }} 次 · {{ metrics.cache_hit_rate || 0 }}%</span></div>
                <div class="evidence-row"><span class="k">平均首字</span><span class="v">{{ ((metrics.avg_first_token_ms || 0) / 1000).toFixed(2) }} s</span></div>
                <div class="evidence-row"><span class="k">平均总耗时</span><span class="v">{{ ((metrics.avg_total_ms || 0) / 1000).toFixed(2) }} s</span></div>
                <div class="evidence-row"><span class="k">降级次数</span><span class="v">{{ metrics.degraded || 0 }} 次</span></div>
                <div class="evidence-row"><span class="k">数值校验拦截</span><span class="v">{{ metrics.verify_flags || 0 }} 次</span></div>
                <div class="evidence-row"><span class="k">缓存条目</span><span class="v">{{ metrics.cache_entries || 0 }} 条</span></div>
            </div>
            <div class="evidence-foot">{{ metricsError || '相似问题会命中语义缓存直接复用结论，省去模型推理时间；首字延迟为本轮从提问到第一个字返回的耗时。' }}</div>
        </div>
    </div>

    <!-- 随堂小测：讲解后立刻练习，答完判分并给解析 -->
    <div v-if="quizOpen" class="doc-mask" @click.self="closeQuiz">
        <div class="doc-dialog quiz-dialog" role="dialog" aria-modal="true">
            <div class="doc-head">
                <span class="doc-title">🎯 随堂小测</span>
                <button type="button" class="doc-close" @click="closeQuiz">×</button>
            </div>
            <div v-if="quizLoading" class="quiz-loading">正在围绕你最近的问题出题…</div>
            <template v-else-if="quiz">
                <p class="doc-tip">主题：{{ quiz.topic }} · 共 {{ quiz.questions.length }} 题，全部选完后提交判分。</p>
                <div class="quiz-body">
                    <div v-for="(q, qi) in quiz.questions" :key="qi" class="quiz-item">
                        <div class="quiz-stem">{{ qi + 1 }}. {{ q.stem }}</div>
                        <button
                            v-for="(opt, oi) in q.options"
                            :key="oi"
                            type="button"
                            class="quiz-option"
                            :class="optionClass(qi, q, oi)"
                            :disabled="quizSubmitted"
                            @click="selectOption(qi, oi)"
                        >
                            <span class="quiz-option-key">{{ 'ABCD'[oi] }}</span>
                            <span class="quiz-option-text">{{ opt }}</span>
                        </button>
                        <div v-if="quizSubmitted" class="quiz-explain" :class="{ wrong: quizSelected[qi] !== q.answer_index }">
                            {{ quizSelected[qi] === q.answer_index ? '✅ 回答正确' : '❌ 正确答案：' + 'ABCD'[q.answer_index] }}
                            <span v-if="q.explanation">· {{ q.explanation }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="quizSubmitted" class="quiz-score">本轮得分：{{ quizScore }} / {{ quiz.questions.length }}</div>
            </template>
            <div v-if="quizError" class="doc-error">{{ quizError }}</div>
            <div class="doc-actions">
                <button type="button" class="doc-cancel" @click="closeQuiz">关闭</button>
                <button v-if="quiz && !quizSubmitted" type="button" class="doc-submit" @click="submitQuiz">提交答案</button>
                <button v-else-if="quizLoading" type="button" class="doc-submit" disabled>出题中…</button>
                <button v-else type="button" class="doc-submit" @click="loadQuiz">再来一组</button>
            </div>
        </div>
    </div>

    <!-- 轻量 RAG：粘贴文档提问 -->
    <div v-if="docOpen" class="doc-mask" @click.self="closeDoc">
        <div class="doc-dialog" role="dialog" aria-modal="true">
            <div class="doc-head">
                <span class="doc-title">📄 文档问答</span>
                <button type="button" class="doc-close" @click="closeDoc">×</button>
            </div>
            <p class="doc-tip">粘贴一段化学文章或教材片段（至少 80 字），我会先在这段文字里检索，再只依据命中的片段回答，并标注出处。</p>
            <div class="doc-upload">
                <label class="doc-upload-btn">
                    📎 选择 .txt / .md 文件
                    <input type="file" accept=".txt,.md,text/plain" hidden @change="onDocFile">
                </label>
                <span class="doc-upload-tip">或在下方直接粘贴，文本只在浏览器本地处理</span>
            </div>
            <textarea id="docTextArea" v-model="docText" class="doc-textarea" maxlength="8000" placeholder="在这里粘贴文本，例如一篇元素科普文章……"></textarea>
            <div class="doc-counter">{{ docText.length }} / 8000</div>
            <input v-model="docQuestion" class="doc-question" type="text" placeholder="针对这段文字问一个问题，例如：文中提到的元素有哪些共同用途？" @keyup.enter="submitDoc">
            <div v-if="docError" class="doc-error">{{ docError }}</div>
            <div class="doc-actions">
                <button type="button" class="doc-cancel" @click="closeDoc">取消</button>
                <button type="button" class="doc-submit" @click="submitDoc" :disabled="sending">开始提问</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAssistant } from '../composables/useAssistant'

const {
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
  submitQuiz,
} = useAssistant()

// 静态资源使用页面相对路径，避免被 Vite 按组件文件位置解析
const petImgSrc = './images/normal1.png?v=20261116s'
const avatarSrc = './AIgent/oc图标.ico'
</script>
