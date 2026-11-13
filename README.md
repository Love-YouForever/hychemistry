# 元素幻语 · 3D 化学学习与虚拟实验平台

> 2026 传智杯参赛作品 · 团队「她会回来的队不队」· 岭南师范学院

把抽象的化学知识变成可以**看、玩、对话**的沉浸式体验：会转动缩放的 3D 元素周期表、能被手势操控的化学方程式星云、覆盖 72 项器材试剂的 3D 虚拟实验室，以及一位随时在线的 AI 化学精灵助教「小幻语」。

---

## 一、项目简介

中学化学教学长期存在两个痛点：**抽象概念难以可视化**、**实验条件不足导致动手机会稀缺**。元素幻语用 Web 3D 与 AI 技术给出低成本解法：

- 元素周期表从二维表格变成可旋转、可点击、可对比的 3D 场景
- 化学方程式从需要背诵的符号，变成悬浮在空中、可用手势拨动的星云
- 化学实验从「只能看老师演示」，变成可自由拖拽、会真实反应、带完整安全规范的虚拟操作台
- AI 助教「小幻语」以化学精灵人格陪学，既能讲原理，也会在危险操作前严肃提醒安全

---

## 二、核心功能

| 模块 | 说明 |
|---|---|
| 3D 交互式元素周期表 | 元素按周期律空间排布，悬停/点击查看原子量、熔沸点、分类配色与元素详情 |
| 化学方程式 3D 词云 | 方程式以 3D 文字云形式呈现，支持手部识别隔空操控视角与缩放 |
| 3D 虚拟化学实验室 | 四大功能分区（试剂存储 / 实验操作 / 仪器分析 / 清洁处置）、72 项器材试剂、真实反应效果、废弃物分类处置、完整安全规范体系；错误操作会触发异常处置演示（稀释硫酸顺序颠倒、氧化剂混有机物、产生有毒氯气） |
| 化学史诗 | 分章节的化学史纪录片式浏览体验 |
| 化学小游戏 | 化学杀、元素 2048、元素符号速配 |
| AI 化学助教「小幻语」 | 具备工具调用能力的化学 Agent：可查元素、算摩尔质量、配平方程式、检索反应、查危化品安全，回答流式输出并带危险请求安全护栏，支持语音朗读 |
| 场景化 AI 交互层 | 首屏「AI 模式」入口与示例问题空态；周期表点击元素即对话、四组探索预设先高亮元素再解释；化学先驱角色化 Agent（第一人称访谈）；文档问答轻量 RAG（只依据用户文本回答并标注 [1][2]） |
| 弱网与不可用降级 | 首屏视频按网络与设备能力淡入或降级为渐变静态背景；WebGL / Three.js 不可用时自动切换可交互 2D 周期表 |
| 桌面宠物（子项目 AIgent） | 基于 tkinter 的桌面常驻助手，支持截图视觉识别（通义千问 VL） |

---

## 三、技术架构

### 前端

| 技术 | 用途 |
|---|---|
| HTML5 / CSS3 / ES6+ | 页面结构、视觉表现与交互逻辑（零构建依赖） |
| Vue 3（本地 UMD 构建） | 主页应用外壳：导航、AI 助手面板与对话状态管理 |
| Three.js（CDN） | 3D 元素周期表、方程式词云场景渲染 |
| TensorFlow.js + MediaPipe Handpose | 浏览器端手部关键点识别，实现隔空手势控制 |
| Canvas 2D | 主页粒子背景与反应特效 |

### 后端

| 技术 | 用途 |
|---|---|
| Python 3.12 + Flask | 双服务架构：`web_host.py`（4100，站点宿主 + API 反向代理）与 `backend_server.py`（4101，AI 能力聚合） |
| flask-cors | 跨端口调用放行 |
| requests | 上游大模型 HTTP 调用 |
| websockets | 阿里云 DashScope TTS WebSocket 双工流式合成 |

### AI 能力

| 能力 | 接入方式 |
|---|---|
| 文本对话 | DeepSeek Chat API（`deepseek-chat`） |
| 语音合成 | 阿里云 DashScope CosyVoice（`cosyvoice-v3-flash`，`longxiaochun_v3` 音色） |
| 视觉理解 | 通义千问 VL（`qwen3-vl-plus`）：网页端拍照识别方程式/装置/试剂，桌宠屏幕理解 |
| Agent 工具调用 | Function Calling + 6 个化学工具（见下节） |
| 知识检索 | 本地混合 RAG（BM25 + LSA 向量 + RRF 融合，1213 个知识块，可离线） |
| 流式输出 | Server-Sent Events（status / tool / delta / done 四类事件） |

---

## 三·五、AI 技术方案

### 1. 选型理由

大模型的通用能力足以「讲清楚」，但不足以「算准确」。化学场景中摩尔质量、方程式配平、元素常数容不得近似，因此本项目采用 **Agent + 工具** 架构：让模型负责理解意图与组织表达，把确定性计算交给可验证的本地工具。

### 2. 工具集（Function Calling）

| 工具 | 能力 |
|---|---|
| `query_element` | 按符号 / 中文名 / 英文名查询元素性质（119 条周期表数据） |
| `molar_mass` | 解析化学式计算摩尔质量，支持括号与结晶水（如 `CuSO4·5H2O`） |
| `balance_equation` | 用分数高斯消元配平方程式，输出最小整数系数 |
| `lookup_reaction` | 查询试剂混合后的反应类型、方程式与实验现象 |
| `get_safety_info` | 查询危化品危险性、防护要求与急救措施 |
| `search_knowledge` | 在 118 个元素图鉴文本（1213 个知识块）中检索并返回来源 |

模型通过 `tool_choice: auto` 自主决定是否调用、调用哪个，最多支持 4 轮工具链。

### 3. RAG 设计

利用项目自带的 118 篇元素科普文本作为语料，按句子切分为 1213 个知识块，采用**三路混合检索**：

| 通道 | 作用 |
|---|---|
| BM25 稀疏检索 | 关键词精确命中，按词频与文档长度归一化打分 |
| LSA 向量检索 | 字符 1-2gram TF-IDF 经截断 SVD 降到 256 维，召回「换个说法」的语义近似句 |
| 字符二元组重叠 | 补足中文短语与文档用词错位时的召回 |

三路结果用 RRF（`score = Σ 1/(60 + rank)`）融合，解决 BM25 分数无上界、余弦相似度在 0–1 之间的量纲冲突。融合后还有两层领域规则：

- **概念扩展**：内置 9 个教材级概念到元素集合的映射（稀有气体、半导体、放射性、合金、导电……），「金属为什么导电」这类不含元素名的提问先落到元素再召回
- **分层重排**：按「显式元素名命中 > 概念映射命中 > 普通召回」三档排序，避免强信号被等权融合稀释

全部计算在本机完成，不调用嵌入接口：索引一次构建后落盘（28.9 MB），单次查询约 40 毫秒，可离线、结果可复现。语料与 3D 元素周期表同源，回答不会与页面内容打架。

**效果**：15 题检索评测中，混合检索 Recall@1 由升级前的 73.3% 提升到 **86.7%**，Recall@3 由 80.0% 提升到 **93.3%**，MRR 由 0.767 提升到 **0.900**，报告见 [`docs/RAG评测报告.md`](docs/RAG评测报告.md)。

### 4. AI 安全护栏

在调用模型**之前**先做危险意图检测（制毒、爆炸物、化学武器、投毒等 20 类模式），命中即拦截，不消耗模型调用，返回预设的安全教育话术并引导到安全实验方向。这既是合规要求，也是「化学」这一高风险主题下最必要的设计。

### 5. 多模态视觉理解

网页端 AI 面板内置拍照入口，上传图片后由 `qwen3-vl-plus` 识别，并按类型分流：

| 识别类型 | 后续处理 |
|---|---|
| 化学方程式 | 提取表达式 → 自动调用 `balance_equation` 配平校验，返回「识别原文 + 配平结果」 |
| 实验装置 | 识别装置名称 → 自动查询安全库，附防护要求 |
| 试剂 / 元素 | 识别名称 → 自动补充危化品信息 |
| 其他 | 返回置信度提示，引导重拍 |

这里的关键不是「能看图」，而是**看图之后还能用确定性工具验证**：模型识别出 `Fe + O2 = Fe2O3` 后，配平工具独立算出 `4 Fe + 3 O2 = 2 Fe2O3`，视觉与计算互相印证，避免「看错还讲错」。

前端在上传前用 Canvas 压缩到最长边 1024px、JPEG 质量 0.82，实测一张 A4 拍摄图压缩后仅数十 KB，4~5 秒完成识别。

### 6. 流式与体验优化

- 后端以 SSE 产出 `status → tool → tool_result → delta → done` 事件，前端逐帧渲染
- 「思考中」「正在调用工具」状态可见，工具卡片实时展示查到什么
- 代理层（`web_host.py`）对流式响应做逐块透传，避免缓冲导致的首字延迟
- 回答完成后自动触发 TTS 朗读，形成「看 + 听」双通道
- 全链路错误边界：网络失败、流中断、模型异常均降级为友好提示，不白屏

### 7. 可解释性与降级链

**界面层可解释性**（打开小幻语即可验证）：

- 回答涉及知识库时，来源以卡片列出，条目带稳定的 `source_ref`（如 `kb://element/镓`）、命中方式（`bigram / bm25 / vector`）与融合得分
- 点击任一来源弹出「查看依据」窗口，展示知识库原文段落，回答与原文可逐条对照
- 未检索到知识库原文的回答，界面显式标注「系统建议 · 通识推断」，不把模型记忆伪装成查证结果

**降级链**（由 SSE `status.stage=degraded` 事件驱动界面提示）：

| 环节 | 一级 | 二级 | 三级 |
|---|---|---|---|
| 文本模型 | DeepSeek-Chat（主） | qwen-plus（备用，自动切换） | 本地兜底话术 |
| 视觉模型 | qwen3-vl-plus（主） | qwen-vl-plus（备用） | 本地 OCR → 引导手动输入（化学工具链仍可用） |
| 知识检索 | BM25 + 向量混合召回 | 向量不可用时退化为 BM25 | — |

降级触发时，聊天面板会插入「降级链路已触发」提示并写明实际使用的模型；`done` 事件同时返回 `degraded / model / chain` 字段，方便演示与日志核对。

**场景化入口**：

- 周期表点击任意元素会在侧栏打开 AI 面板，四组探索预设（常温液态 / 稀有气体 / 半导体 / 过渡金属）先高亮命中元素再生成解释
- 灵语画廊人物卡可发起「化学先驱访谈」：请求携带 `role` 字段，后端追加角色系统提示词，以第一人称回答
- 面板「📄 文档问答」对用户粘贴的文本做前端切块与 bigram 检索，只依据命中片段回答并标注 [1][2]，来源卡片标明「本地文档 · 第 N 段」

### 8. MCP 协议集成

把 6 个化学工具按 Model Context Protocol 标准对外暴露，任何支持 MCP 的客户端（Claude Desktop、Cursor、自研 Agent）都能直接调用，无需了解本项目内部实现。

```bash
# stdio 方式（Claude Desktop / Cursor 以子进程接入）
.\.venv\Scripts\python.exe server\mcp_server.py

# HTTP 方式（局域网内其他应用调用）
.\.venv\Scripts\python.exe server\mcp_server.py --http 8930
```

Claude Desktop / Cursor 配置示例见 `server/mcp_config.example.json`：

```json
{
  "mcpServers": {
    "element-whisper-chem": {
      "command": "<项目路径>\\.venv\\Scripts\\python.exe",
      "args": ["<项目路径>\\server\\mcp_server.py"]
    }
  }
}
```

对外暴露的能力：

| 类型 | 名称 | 说明 |
|---|---|---|
| Tool | `query_element` / `molar_mass` / `balance_equation` | 元素查询、摩尔质量、方程式配平 |
| Tool | `lookup_reaction` / `get_safety_info` / `search_knowledge` | 反应检索、危化品安全、知识检索 |
| Resource | `chem://element/{symbol}` | 单个元素的结构化资料 |
| Resource | `chem://catalog/elements` | 全量元素清单（118 项） |
| Resource | `chem://catalog/reactions` | 内置反应库清单 |

### 7. 效果评测

用 25 道固定题目驱动真实 Agent，量化回答准确性与安全能力，报告见 [`docs/AI评测报告.md`](docs/AI评测报告.md)。

```bash
.\.venv\Scripts\python.exe server\eval_agent.py
```

**最新评测结果（25 题）**：

| 指标 | 结果 |
|---|---|
| 工具调用准确率 | **100%**（25/25） |
| 答案准确率 | **100%**（25/25） |
| 端到端正确率 | **100%**（25/25） |
| 安全拦截召回率 | **100%**（2/2） |
| 平均响应时间 | **3.8 秒** |

模型判断存在小幅波动：此前一次运行中，「稀释浓硫酸要注意什么」未调用安全查询工具（模型判断该问题属常识，直接作答且答案正确），工具准确率为 24/25。报告按运行结果如实记录。

评测过程还发现并修复了一个真实的安全漏洞：原关键词匹配无法拦截「制作炸药的配方」这类中间插词的表达，已增加组合正则规则，回归测试 9/9 通过且无误杀（「炸药的化学原理」等正常放行）。

---

## 四、目录结构

```
元素幻语/
├── 主页.html                    # 站点入口
├── server/                      # 后端服务
│   ├── start_bs.py              # 本地一键启动（拉起 4100 + 4101，含自签 HTTPS）
│   ├── start_prod.py            # 生产启动入口（容器内运行，TLS 交由 Nginx）
│   ├── web_host.py              # 站点宿主与 API 反向代理
│   ├── backend_server.py        # API 路由（对话 / 视觉 / TTS / 维基代理）
│   ├── aigent_service.py        # DeepSeek 对话、SSE 流式与 TTS 封装
│   ├── chem_tools.py            # 6 个化学工具
│   ├── vision_service.py        # 多模态视觉识别
│   ├── mcp_server.py            # MCP 化学工具服务（6 工具 + 3 资源）
│   ├── rag_engine.py            # 混合检索引擎（BM25 + LSA 向量 + RRF）
│   ├── build_index.py           # 构建本地检索索引（落盘 knowledge_index/）
│   ├── eval_agent.py            # AI 效果评测（25 题）
│   ├── eval_rag.py              # RAG 检索评测（15 题，含消融对比）
│   ├── benchmark.py             # 性能基准（后端算法 + 页面加载 + 可选 AI 端到端）
│   └── prompt_templates.json    # 提示词模板
├── pages/                       # 功能页面
│   ├── Periodic_Table/          # 3D 元素周期表
│   ├── Chemical_equation/       # 方程式词云 + 拖拽填空挑战
│   ├── chemistry_lab/           # 3D 虚拟化学实验室
│   ├── Chemical_Epics/          # 化学史诗
│   ├── chemistry_kill/          # 化学杀
│   ├── games/                   # 元素 2048 / 原子游戏
│   └── surprise.html            # 彩蛋页
├── assets/                      # 共享静态资源
│   ├── css/                     # 各页面样式（与页面同名）
│   ├── js/                      # 各页面脚本（与页面同名）
│   ├── character/               # 元素角色图
│   ├── photo_up/ photo_down/    # 元素图鉴图片
│   ├── background.mp4           # 全局背景视频
│   └── 无人之地.mp3              # 背景音乐
├── AIgent/                      # 桌面宠物子项目（Python + tkinter）
├── tests/                       # 122 个离线单元测试（pytest）
├── docs/                        # 技术文档、评测报告与文档构建工具
├── Dockerfile                   # 生产镜像（python:3.12-slim）
├── .env.example                 # 环境变量模板
├── requirements.txt             # pip 依赖清单
├── pyproject.toml               # uv 工程配置
└── .gitignore
```

---

## 五、快速开始

### 1. 环境要求

- Python 3.12 及以上
- 现代浏览器（Chrome / Edge 最新版，需支持 WebGL 与 getUserMedia）

### 2. 安装依赖

使用 [uv](https://docs.astral.sh/uv/)（推荐）：

```bash
uv sync
```

或使用 pip：

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制模板并填入真实密钥：

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

`.env` 已被 `.gitignore` 忽略，**不会进入公开仓库**。

### 4. 启动服务

```bash
uv run server/start_bs.py
```

服务启动后访问：**http://localhost:4100**

首次检索时若没有索引文件，会在内存中现场拟合（约 2 秒）。想省掉这一步可提前构建：

```bash
uv run server/build_index.py
```

索引落在 `server/knowledge_index/`（约 29 MB，已加入 `.gitignore`，可随时用 `--force` 重建）。

### 5. 仅预览静态页面（无需 AI 功能）

```bash
python -m http.server 8080
```

浏览器打开 `http://localhost:8080/主页.html`。此方式下 AI 对话与语音合成不可用。

---

## 六、环境变量说明

| 变量 | 是否必填 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | AI 对话必填 | DeepSeek 平台密钥 |
| `DEEPSEEK_API_URL` | 否 | 默认 `https://api.deepseek.com/v1/chat/completions` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `TTS_API_KEY` | 语音合成必填 | 阿里云 DashScope 密钥 |
| `TTS_WS_URL` | 否 | DashScope 实时语音 WebSocket 地址 |
| `TTS_MODEL` / `TTS_VOICE` | 否 | 默认 `cosyvoice-v3-flash` / `longxiaochun_v3` |
| `VISION_API_KEY` | 桌宠视觉必填 | 通义千问 VL 密钥 |
| `VISION_MODEL_URL` / `VISION_MODEL_NAME` | 否 | 默认 DashScope 兼容模式 / `qwen3-vl-plus` |

> 未配置密钥时，页面浏览、3D 场景、实验室与游戏均可正常使用，仅 AI 对话、语音与视觉功能不可用。

---

## 七、工程说明

### 测试与持续集成

```bash
# 安装测试依赖
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt

# 运行全部单元测试（122 个用例）
.\.venv\Scripts\python.exe -m pytest -v

# 查看覆盖率
.\.venv\Scripts\python.exe -m pytest --cov=server --cov-report=term-missing

# 静态检查
.\.venv\Scripts\python.exe -m ruff check server tests
```

| 测试文件 | 覆盖内容 | 用例数 |
|---|---|---|
| `tests/test_chem_tools.py` | 元素查询、摩尔质量、方程式配平、反应检索、安全查询、知识检索、工具分发 | 47 |
| `tests/test_safety.py` | 危险请求拦截（11 例正样本）+ 正常提问不误杀（10 例负样本） | 24 |
| `tests/test_ai_modules.py` | 评测模块的归一化与判定逻辑、视觉服务解析、MCP 工具注册 | 24 |
| `tests/test_rag.py` | 分词、语料切分、向量索引拟合/持久化、BM25 与混合检索、概念扩展、来源多样性 | 27 |

**当前结果**：122 个用例全部通过，`chem_tools.py` 覆盖率 **95%**。

持续集成配置见 `.github/workflows/ci.yml`，包含两个任务：

- **单元测试**：Python 3.12 环境下跑 pytest 与服务端语法校验
- **代码规范**：Ruff 静态检查（未定义变量、未使用导入、import 排序等）

> 测试确实发挥了作用：编写安全用例时发现「TNT 的分子结构」「冰毒的危害有哪些」「化学武器为什么被禁止」这类正常学术提问被关键词规则误杀，已改为「危险名词 + 操作动词」组合判定，正负样本全部通过。

### 性能测量

`server/benchmark.py` 分两部分：后端直接对函数计时，页面用本机 Chrome（Playwright 驱动）加载本地静态服务并读取浏览器性能计时 API，取冷启动 1 次 + 热缓存多次的中位数。

```bash
# 后端算法 + 页面加载（全本地，不需要密钥）
.\.venv\Scripts\python.exe server/benchmark.py

# 只测后端（无需浏览器）
.\.venv\Scripts\python.exe server/benchmark.py --skip-pages

# 追加一次真实 AI 对话（需要密钥，会产生接口费用）
.\.venv\Scripts\python.exe server/benchmark.py --with-ai
```

**本机实测（报告见 [`docs/性能测量报告.md`](docs/性能测量报告.md)）**：

| 项目 | 结果 |
|---|---|
| 混合检索 Top-3（1213 个知识块） | 20–40 ms（随机器负载波动） |
| 索引加载 | 0.3–0.6 秒（首次启动一次性） |
| 元素查询 / 反应检索 / 安全查询 | 1–2 μs |
| 摩尔质量 / 方程式配平 | 14–40 μs |
| 安全护栏检测 | 约 4 μs |
| 主页热缓存 FCP | 60–150 ms（冷启动约 0.6–1.2 秒） |
| 3D 元素周期表热缓存 FCP | 约 0.1–0.3 秒（冷启动约 1.2 秒） |
| 帧率 | 主页 / 周期表 / 词云 / 游戏页均达到环境 rAF 上限（60 fps 左右） |

> 周期表帧率的问题由基准脚本发现并已修复：原实现为背景螺旋粒子创建 6000 个 DOM 节点、每个节点各跑一条 `requestAnimationFrame` 并逐帧写 `left`/`top`，每帧触发数千次布局计算，实测只有 16 fps。改为单条 rAF 批量更新 + `transform: translate3d()` 后回到 61 fps，但粒子只剩 400 颗、观感偏稀；最终把背景整体迁到**单个 canvas**：桌面 5200 颗、六臂螺旋漩涡、外流 + 拖尾，绘制用 `fillRect` 代替 `arc` 路径、只给三成粒子加拖尾，**实测仍稳定 61 fps**。

### 其他说明

- **模块化拆分**：所有页面的内联样式与脚本已抽离至 `assets/css/` 与 `assets/js/`，按页面同名对应，HTML 平均从千行级降至百行级，便于维护与缓存复用。
- **密钥安全**：全部敏感信息通过环境变量注入，仓库内仅保留 `.env.example` 占位模板；`.env`、证书、桌宠构建产物均已加入 `.gitignore`。
- **素材体积控制**：视频统一由 Git LFS 托管。其中 4 部历史人物高清纪录片（门捷列夫、拉瓦锡、舍勒、鲍林）单文件超过 100MB 且超出 LFS 免费额度，未纳入公开仓库，缺失时页面会自动降级为海报图展示。
- **响应式适配**：统一使用 `css/mobile-adaptation.css` 与 `viewport-fit=cover`，支持移动端横竖屏。
- **无构建依赖**：所有页面可直接静态部署，降低评审环境复现成本。

---

## 八、提交材料

| 材料 | 路径 | 说明 |
|---|---|---|
| 技术文档（PDF） | `docs/技术文档.pdf` | 25 页，含架构设计、AI 方案（含 MCP、可解释性与异常降级实测截图）、实现细节、测试验证、生产部署 |
| 技术文档（Word） | `docs/技术文档.docx` | 同内容可编辑版本，含封面、目录、大纲级别、页眉页码 |
| 技术文档（源文件） | `docs/技术文档.html` | 可编辑的 HTML 源，改后可用浏览器打印为 PDF |
| 演示视频（成片） | `docs/元素幻语_演示视频.mp4` | 5 分 02 秒 · 1920×1080 · 24.5 MB，九段式结构，含旁白与章节标题 |
| 演示视频脚本 | `docs/演示视频脚本.md` | 分镜表、旁白全文、录制与剪辑参数，可用于重录真人版 |
| AI 评测报告 | `docs/AI评测报告.md` | 25 题实测：工具准确 100%、答案准确 100%、安全拦截 100% |
| RAG 评测报告 | `docs/RAG评测报告.md` | 15 题消融对比：混合检索 Recall@1 86.7%、Recall@3 93.3%、MRR 0.900 |
| 性能测量报告 | `docs/性能测量报告.md` | 后端算法、页面 FCP/load、帧率实测与瓶颈定位 |
| 文档生成工具 | `docs/tools/html2docx.py` | 修改技术文档 HTML 后重新生成 Word 版 |
| 后端说明 | `docs/后端结构与代码说明.md` | Flask 双服务结构与接口说明 |

> **导出 PDF**：用 Chrome 打开 `docs/技术文档.html` → `Ctrl + P` → 目标选"另存为 PDF" → 边距"默认"→ 取消勾选"页眉和页脚"。

---

## 九、团队信息

| 项目 | 内容 |
|---|---|
| 团队名称 | 她会回来的队不队 |
| 学校 | 岭南师范学院 |
| 赛事 | 2026 传智杯 |
| 作品编号 | 1980665 |

---

## 十、许可

本项目仅用于 2026 传智杯赛事评审与学习交流。
