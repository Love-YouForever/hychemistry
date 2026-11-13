        // 试剂颜色配置
        const reagentColors = {
            'HCl': 'rgba(220, 220, 220, 0.7)',
            'H2SO4': 'rgba(200, 200, 200, 0.8)',
            'HNO3': 'rgba(255, 255, 200, 0.7)',
            'NaOH': 'rgba(200, 200, 200, 0.6)',
            'AgNO3': 'rgba(245, 245, 245, 0.8)',
            'NaCl': 'rgba(235, 235, 235, 0.6)',
            'CuSO4': 'rgba(64, 164, 223, 0.8)',
            'FeCl3': 'rgba(200, 150, 100, 0.8)',
            'BaCl2': 'rgba(240, 240, 240, 0.7)',
            'Na2CO3': 'rgba(235, 235, 235, 0.7)',
            'Phenolphthalein': 'rgba(255, 230, 230, 0.5)',
            'KSCN': 'rgba(240, 240, 240, 0.6)',
            'H2O2': 'rgba(230, 240, 250, 0.7)',
            'Fe': '#808080',
            'Zn': '#C0C0C0',
            'Cu': '#B87333',
            'Mg': '#E8E8E8',
            'CaCO3': '#F5F5F5',
            'NaOH-solid': '#FFFFFF',
            'CuO': '#2F2F2F',
            'MnO2': '#1A1A1A',
            'CH3COOH': 'rgba(240, 240, 235, 0.65)',
            'NH3H2O': 'rgba(235, 242, 248, 0.55)',
            'NaHCO3': 'rgba(240, 245, 250, 0.6)',
            'MethylOrange': 'rgba(255, 190, 110, 0.65)',
            'Ethanol': 'rgba(245, 250, 255, 0.45)',
            'H2O': 'rgba(190, 220, 245, 0.45)',
            'KMnO4': '#4B0082',
            'S': '#E8D44D',
            'Fe2O3': '#8B2500'
        };

        // 化学反应规则
        const reactions = {
            'HCl+NaOH': {
                result: 'neutralization',
                color: 'rgba(200, 200, 200, 0.6)',
                effect: 'heat',
                description: '中和反应：HCl + NaOH → NaCl + H₂O，放出热量'
            },
            'HCl+Zn': {
                result: 'gas',
                color: 'rgba(220, 220, 220, 0.7)',
                effect: 'bubbles',
                description: '置换反应：Zn + 2HCl → ZnCl₂ + H₂↑，产生氢气'
            },
            'H2SO4+Zn': {
                result: 'gas',
                color: 'rgba(220, 220, 220, 0.7)',
                effect: 'bubbles',
                description: '置换反应：Zn + H₂SO₄ → ZnSO₄ + H₂↑'
            },
            'HCl+Fe': {
                result: 'gas',
                color: 'rgba(200, 220, 180, 0.7)',
                effect: 'bubbles',
                description: '置换反应：Fe + 2HCl → FeCl₂ + H₂↑，溶液变为浅绿色'
            },
            'HCl+Mg': {
                result: 'gas',
                color: 'rgba(220, 220, 220, 0.7)',
                effect: 'bubbles',
                description: '剧烈反应：Mg + 2HCl → MgCl₂ + H₂↑，产生大量气泡'
            },
            'AgNO3+NaCl': {
                result: 'precipitate',
                color: 'rgba(230, 230, 230, 0.7)',
                precipitateColor: '#FFFFFF',
                effect: 'precipitate',
                description: '复分解反应：AgNO₃ + NaCl → AgCl↓ + NaNO₃，白色沉淀'
            },
            'AgNO3+HCl': {
                result: 'precipitate',
                color: 'rgba(230, 230, 230, 0.7)',
                precipitateColor: '#FFFFFF',
                effect: 'precipitate',
                description: '复分解反应：AgNO₃ + HCl → AgCl↓ + HNO₃，白色沉淀'
            },
            'BaCl2+H2SO4': {
                result: 'precipitate',
                color: 'rgba(230, 230, 230, 0.7)',
                precipitateColor: '#FFFFFF',
                effect: 'precipitate',
                description: '复分解反应：BaCl₂ + H₂SO₄ → BaSO₄↓ + 2HCl，白色沉淀'
            },
            'BaCl2+Na2CO3': {
                result: 'precipitate',
                color: 'rgba(230, 230, 230, 0.7)',
                precipitateColor: '#FFFFFF',
                effect: 'precipitate',
                description: '复分解反应：BaCl₂ + Na₂CO₃ → BaCO₃↓ + 2NaCl，白色沉淀'
            },
            'CuSO4+NaOH': {
                result: 'precipitate',
                color: 'rgba(100, 180, 220, 0.7)',
                precipitateColor: '#4169E1',
                effect: 'precipitate',
                description: '复分解反应：CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄，蓝色沉淀'
            },
            'FeCl3+NaOH': {
                result: 'precipitate',
                color: 'rgba(180, 150, 120, 0.7)',
                precipitateColor: '#8B4513',
                effect: 'precipitate',
                description: '复分解反应：FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl，红褐色沉淀'
            },
            'CaCO3+HCl': {
                result: 'gas',
                color: 'rgba(220, 220, 220, 0.7)',
                effect: 'bubbles',
                description: '复分解反应：CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑'
            },
            'HCl+Na2CO3': {
                result: 'gas',
                color: 'rgba(220, 220, 220, 0.7)',
                effect: 'bubbles',
                description: '复分解反应：Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑'
            },
            'NaOH+Phenolphthalein': {
                result: 'colorChange',
                color: 'rgba(255, 105, 180, 0.7)',
                effect: 'colorChange',
                description: '酸碱指示剂：酚酞遇碱变红色'
            },
            'FeCl3+KSCN': {
                result: 'colorChange',
                color: 'rgba(200, 50, 50, 0.8)',
                effect: 'colorChange',
                description: '显色反应：FeCl₃ + 3KSCN → Fe(SCN)₃，血红色溶液'
            },
            'CuSO4+Fe': {
                result: 'displacement',
                color: 'rgba(180, 200, 180, 0.7)',
                effect: 'colorChange',
                description: '置换反应：Fe + CuSO₄ → FeSO₄ + Cu，铁表面析出红色铜'
            },
            'CuSO4+Zn': {
                result: 'displacement',
                color: 'rgba(200, 200, 200, 0.6)',
                effect: 'colorChange',
                description: '置换反应：Zn + CuSO₄ → ZnSO₄ + Cu，锌表面析出红色铜'
            },
            'H2O2+MnO2': {
                result: 'gas',
                color: 'rgba(230, 240, 250, 0.7)',
                effect: 'bubbles',
                description: '催化分解：2H₂O₂ --MnO₂--> 2H₂O + O₂↑，产生氧气'
            },
            // 先加水、再缓慢注入浓硫酸是正确操作，放热但可控
            'H2O+H2SO4': {
                result: 'neutralization',
                color: 'rgba(205, 205, 205, 0.75)',
                effect: 'heat',
                description: '正确稀释：将浓硫酸沿器壁缓慢注入水中并不断搅拌，放热但可控'
            }
        };

        // 异常操作：这些组合不是「正常反应」，而是会引发事故的错误操作。
        // 命中后不执行 reactions 中的正常流程，直接进入异常处置演示。
        const hazardReactions = {
            // 注意：稀释浓硫酸的风险与顺序强相关——水倒入浓硫酸才危险
            'H2SO4+H2O': {
                title: '稀释浓硫酸顺序错误',
                reason: '把水直接倒入浓硫酸会局部剧烈放热，导致酸液暴沸飞溅',
                guide: '立即停止加注并远离容器；正确做法是把浓硫酸沿器壁缓慢注入水中，边加边搅拌',
                equation: 'H₂SO₄(浓) + H₂O → 大量热'
            },
            'Ethanol+KMnO4': {
                title: '强氧化剂与有机物混放',
                reason: '高锰酸钾遇乙醇会剧烈氧化，可能引燃甚至爆炸',
                guide: '立即远离火源并用大量水稀释；氧化剂与有机物必须分区存放',
                equation: 'KMnO₄ + C₂H₅OH → 剧烈氧化'
            },
            'HCl+KMnO4': {
                title: '产生有毒氯气',
                reason: '高锰酸钾在酸性条件下氧化氯离子，释放剧毒的氯气',
                guide: '立即停止操作并撤到通风处、开启通风橱；严禁在开放环境混合',
                equation: '2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂↑ + 8H₂O'
            }
        };

        // ========== 实验安全数据 ==========
        // 试剂危险性：level 危险等级(high/medium/low)，icon 危险性标识，risk 危害描述，protect 防护要求
        const safetyInfo = {
            'HCl':             { level: 'high',   icon: '🧪', name: '盐酸',       risk: '强腐蚀性，挥发出的氯化氢会刺激呼吸道', protect: '戴护目镜和手套，在通风处取用' },
            'H2SO4':           { level: 'high',   icon: '🧪', name: '硫酸',       risk: '强腐蚀性，稀释时剧烈放热',             protect: '必须"酸入水"，缓慢沿器壁注入并搅拌' },
            'HNO3':            { level: 'high',   icon: '💥', name: '硝酸',       risk: '强氧化性、强腐蚀性，见光易分解',       protect: '避光保存，远离还原性物质' },
            'NaOH':            { level: 'high',   icon: '🧪', name: '氢氧化钠',   risk: '强碱性，会腐蚀皮肤和眼睛',             protect: '戴手套，溅到皮肤立即用大量清水冲洗' },
            'AgNO3':           { level: 'medium', icon: '⚠️', name: '硝酸银',     risk: '腐蚀皮肤，见光分解，沾染后皮肤留黑斑', protect: '避光保存，避免直接接触' },
            'BaCl2':           { level: 'high',   icon: '☠️', name: '氯化钡',     risk: '可溶性钡盐有毒，误食可致中毒',         protect: '严禁入口，操作后洗手' },
            'H2O2':            { level: 'medium', icon: '💥', name: '过氧化氢',   risk: '受热或遇催化剂剧烈分解放出氧气，助燃', protect: '远离火源，避免与有机物混放' },
            'FeCl3':           { level: 'medium', icon: '⚠️', name: '氯化铁',     risk: '溶液呈酸性，对皮肤和衣物有腐蚀性',     protect: '避免接触皮肤和衣物' },
            'CuSO4':           { level: 'medium', icon: '☠️', name: '硫酸铜',     risk: '铜盐有毒，误食会引起恶心呕吐',         protect: '严禁入口，操作后洗手' },
            'Na2CO3':          { level: 'low',    icon: '⚠️', name: '碳酸钠',     risk: '弱碱性，粉尘刺激眼睛和呼吸道',         protect: '避免扬尘，勿入眼' },
            'NaCl':            { level: 'low',    icon: '✅', name: '氯化钠',     risk: '基本无危险性',                         protect: '常规操作即可' },
            'Phenolphthalein': { level: 'low',    icon: '⚠️', name: '酚酞',       risk: '酒精溶液，易燃，误食有害',             protect: '远离明火，避免入口' },
            'KSCN':            { level: 'medium', icon: '⚠️', name: '硫氰化钾',   risk: '误食有害，与酸反应产生有毒气体',       protect: '避免与酸直接混合，操作后洗手' },
            'Fe':              { level: 'low',    icon: '⚠️', name: '铁粉',       risk: '细粉可燃，粉尘有爆炸风险',             protect: '远离明火，避免粉尘飞扬' },
            'Zn':              { level: 'low',    icon: '⚠️', name: '锌粒',       risk: '与酸反应会生成易燃的氢气',             protect: '反应时远离明火' },
            'Cu':              { level: 'low',    icon: '✅', name: '铜片',       risk: '基本无危险性',                         protect: '常规操作即可' },
            'Mg':              { level: 'medium', icon: '🔥', name: '镁条',       risk: '易燃，燃烧发出强光，不能用水扑灭',     protect: '远离火源，着火用干沙覆盖' },
            'CaCO3':           { level: 'low',    icon: '✅', name: '碳酸钙',     risk: '基本无危险性',                         protect: '常规操作即可' },
            'NaOH-solid':      { level: 'high',   icon: '🧪', name: '氢氧化钠固体', risk: '强腐蚀性，潮解时放热',               protect: '用药匙取用，切勿用手直接接触' },
            'CuO':             { level: 'medium', icon: '☠️', name: '氧化铜',     risk: '粉尘有害，吸入刺激呼吸道',             protect: '避免扬尘，勿吸入' },
            'MnO2':            { level: 'medium', icon: '⚠️', name: '二氧化锰',   risk: '粉尘吸入有害，属强氧化剂',             protect: '避免扬尘，远离还原性物质' },
            'CH3COOH':         { level: 'medium', icon: '🧪', name: '醋酸',       risk: '有腐蚀性，蒸气刺激眼睛和呼吸道',       protect: '通风处取用，避免接触皮肤和眼睛' },
            'NH3H2O':          { level: 'high',   icon: '☠️', name: '氨水',       risk: '挥发出氨气，强烈刺激呼吸道和眼睛',     protect: '必须在通风橱内取用，避免吸入' },
            'NaHCO3':          { level: 'low',    icon: '✅', name: '碳酸氢钠',   risk: '基本无危险性',                         protect: '常规操作即可' },
            'MethylOrange':    { level: 'low',    icon: '⚠️', name: '甲基橙',     risk: '指示剂染料，误食有害',                 protect: '避免入口，沾染后洗手' },
            'Ethanol':         { level: 'high',   icon: '🔥', name: '乙醇',       risk: '易燃，闪点 13 ℃，蒸气与空气可形成爆炸性混合物', protect: '远离明火，密封存放于防火柜' },
            'H2O':             { level: 'low',    icon: '✅', name: '蒸馏水',     risk: '无危险性',                             protect: '常规操作即可' },
            'KMnO4':           { level: 'medium', icon: '💥', name: '高锰酸钾',   risk: '强氧化剂，与有机物或还原剂混合研磨可燃烧爆炸', protect: '严禁与还原性物质混合研磨，避免受热' },
            'S':               { level: 'medium', icon: '🔥', name: '硫粉',       risk: '易燃固体，燃烧生成刺激性二氧化硫',     protect: '远离火源，在通风处少量取用' },
            'Fe2O3':           { level: 'low',    icon: '✅', name: '氧化铁',     risk: '基本无危险性',                         protect: '避免扬尘吸入' }
        };

        // 反应产物安全提示（key 与 reactions 保持一致）
        const reactionSafety = {
            'HCl+NaOH':             '中和反应会放出大量热，容器可能发烫，切勿用手直接触摸',
            'HCl+Zn':               '生成氢气！氢气易燃易爆，实验必须远离明火',
            'H2SO4+Zn':             '生成氢气！严禁在酒精灯附近进行本实验',
            'HCl+Fe':               '生成氢气，注意通风并远离火源',
            'HCl+Mg':               '反应剧烈并生成氢气，可能发生飞溅，务必戴护目镜',
            'AgNO3+NaCl':           '生成氯化银沉淀，硝酸银会使皮肤染黑，避免接触',
            'AgNO3+HCl':            '生成氯化银沉淀，反应物具腐蚀性，避免溅到皮肤',
            'BaCl2+H2SO4':          '生成硫酸钡沉淀，同时产生强酸，注意腐蚀防护',
            'BaCl2+Na2CO3':         '钡盐有毒！实验后必须洗手，严禁接触口部',
            'CuSO4+NaOH':           '生成氢氧化铜沉淀，铜盐和强碱均有害，避免接触',
            'FeCl3+NaOH':           '生成氢氧化铁沉淀，强碱腐蚀性强，注意防护',
            'CaCO3+HCl':            '生成二氧化碳，反应较快易起泡溢出，注意通风',
            'HCl+Na2CO3':           '生成二氧化碳，气泡剧烈，应缓慢加入防止飞溅',
            'NaOH+Phenolphthalein': '酚酞遇碱变红，溶液为强碱性，勿接触皮肤',
            'FeCl3+KSCN':           '生成血红色配合物，试剂有害，操作后洗手',
            'CuSO4+Fe':             '置换出铜，溶液含铜离子，注意回收处理',
            'CuSO4+Zn':             '置换出铜，溶液含铜离子，注意回收处理',
            'H2O2+MnO2':            '剧烈分解放出氧气！氧气助燃，严禁靠近明火'
        };

        // ========== 实验室配置元数据 ==========
        // 器材规格表：spec 规格 / qty 配备数量 / loc 存放位置 / usage 使用规范
        // 侧栏卡片徽标与"配置清单"面板均由此表生成，保证规则与器材一一对应
        const EQUIPMENT_SPEC = {
            'beaker':              { spec: '250 mL 高硼硅', qty: '6 只', loc: '操作区 A1 抽屉', usage: '配制溶液、加热液体；加热必须垫石棉网' },
            'test-tube':           { spec: '18×180 mm', qty: '20 支', loc: '操作区 试管架', usage: '少量反应；加热时管口不得对着人' },
            'flask':               { spec: '250 mL 锥形瓶', qty: '4 只', loc: '操作区 A1 抽屉', usage: '滴定、振荡反应；加热需垫石棉网' },
            'round-bottom-flask':  { spec: '250 mL 圆底烧瓶', qty: '2 只', loc: '操作区 A2 抽屉', usage: '回流、蒸馏；需铁架台固定并垫石棉网' },
            'volumetric-flask':    { spec: '100 mL 容量瓶', qty: '4 只', loc: '操作区 A2 抽屉', usage: '精确配制标准溶液；定容至刻度线' },
            'graduated-cylinder':  { spec: '100 mL 量筒', qty: '2 只', loc: '操作区 A3 抽屉', usage: '量取液体体积；视线与凹液面最低处平齐' },
            'alcohol-lamp':        { spec: '150 mL', qty: '2 盏', loc: '操作区 加热台', usage: '加热热源；用外焰加热，用完用灯帽盖灭' },
            'bunsen-burner':       { spec: '本生灯', qty: '1 台', loc: '操作区 加热台', usage: '高温加热；先点火后开气，用毕关闭燃气阀' },
            'test-tube-rack':      { spec: '12 孔木质', qty: '2 个', loc: '操作区 台面', usage: '放置试管；空试管倒置晾干' },
            'iron-stand':          { spec: '含铁夹铁圈', qty: '2 套', loc: '操作区 台面', usage: '固定加热装置；铁夹夹持玻璃器皿须垫软垫' },
            'tripod':              { spec: '三脚架', qty: '2 个', loc: '操作区 台面', usage: '支撑加热容器；需配合石棉网使用' },
            'asbestos-net':        { spec: '12×12 cm', qty: '2 张', loc: '操作区 台面', usage: '使受热均匀；烧杯、烧瓶加热前必须放置' },
            'medicine-spoon':      { spec: '不锈钢', qty: '3 把', loc: '操作区 工具格', usage: '取用固体试剂；用后擦拭，专匙专用' },
            'dropper':             { spec: '1 mL 胶头滴管', qty: '5 支', loc: '操作区 工具格', usage: '滴加少量液体；不可倒置、不可共用' },
            'thermometer':         { spec: '0–200 ℃', qty: '2 支', loc: '操作区 工具格', usage: '测量温度；感温泡浸入液体中部且不触壁' },
            'evaporating-dish':    { spec: '60 mm 瓷质', qty: '2 个', loc: '操作区 A3 抽屉', usage: '蒸发浓缩；加热时用坩埚钳夹取' },
            'crucible':            { spec: '30 mL 瓷坩埚', qty: '2 个', loc: '操作区 A3 抽屉', usage: '高温灼烧；须用坩埚钳取放，不可骤冷' },
            'watch-glass':         { spec: '直径 60 mm', qty: '4 块', loc: '操作区 A3 抽屉', usage: '覆盖蒸发皿、承载固体；不可直接加热' },
            'glass-rod':           { spec: 'φ6×200 mm', qty: '4 支', loc: '操作区 工具格', usage: '搅拌、引流；搅拌时勿碰撞器壁' },
            'funnel':              { spec: '60 mm 短颈', qty: '2 个', loc: '操作区 A4 抽屉', usage: '过滤、转移液体；遵循一贴二低三靠' },
            'separatory-funnel':   { spec: '250 mL 梨形', qty: '2 个', loc: '操作区 A4 抽屉', usage: '萃取分液；下层液体从下口放出' },
            'gas-jar':             { spec: '125 mL', qty: '4 个', loc: '操作区 A4 抽屉', usage: '收集并检验气体；集满后盖玻璃片' },
            'combustion-spoon':    { spec: '黄铜勺', qty: '2 把', loc: '操作区 工具格', usage: '灼烧固体；灼烧后不可直接放回台面' },
            'test-tube-clamp':     { spec: '木质/金属', qty: '4 把', loc: '操作区 工具格', usage: '夹持试管加热；夹在距管口 1/3 处' },
            'crucible-tongs':      { spec: '30 cm 不锈钢', qty: '2 把', loc: '操作区 工具格', usage: '夹取高温坩埚、蒸发皿；前端须预热' },
            'tweezers':            { spec: '不锈钢', qty: '3 把', loc: '操作区 工具格', usage: '夹取金属片等小件固体' },
            'mortar':              { spec: '60 mm 瓷研钵', qty: '1 套', loc: '操作区 A3 抽屉', usage: '研碎固体；严禁研磨氧化剂与还原剂混合物' },
            'balance':             { spec: '200 g / 0.1 g', qty: '1 台', loc: '操作区 称量角', usage: '称量固体；左物右码，称量物不得直接接触托盘' },
            'wash-bottle':         { spec: '500 mL 塑料', qty: '2 个', loc: '清洁区 水槽旁', usage: '冲洗器皿、定容；只装蒸馏水' },
            'test-tube-brush':     { spec: '中号', qty: '3 把', loc: '清洁区 水槽旁', usage: '刷洗试管内壁；刷毛定期更换' },
            'drying-rack':         { spec: '12 柱', qty: '1 个', loc: '清洁区 台面', usage: '倒置晾干洗净器皿' },
            'cloth':               { spec: '超细纤维', qty: '4 块', loc: '清洁区 抽屉', usage: '擦拭台面；沾染试剂后按危废处理' },
            'waste-liquid':        { spec: '5 L 聚乙烯桶', qty: '3 只', loc: '清洁区 危废柜', usage: '分类收集酸/碱/重金属废液，贴标签注明成分' },
            'waste-solid':         { spec: '10 L 带盖桶', qty: '2 只', loc: '清洁区 危废柜', usage: '收集废试剂、滤纸等固体废物；严禁倒入下水道' },
            'sharps-box':          { spec: '1 L 防穿刺', qty: '1 只', loc: '清洁区 台面', usage: '投放破损玻璃与锐器；装至 3/4 即封口' },
            'ph-meter':            { spec: '0.01 级台式', qty: '1 台', loc: '仪器分析区 I-1', usage: '测定溶液 pH；用前以标准缓冲液两点校准' },
            'spectrophotometer':   { spec: '320–1000 nm', qty: '1 台', loc: '仪器分析区 I-2', usage: '吸光度测定；比色皿须配对并擦净外壁' },
            'analytical-balance':  { spec: '220 g / 0.1 mg', qty: '1 台', loc: '仪器分析区 I-3', usage: '精密称量；称量前调平，关门后读数' },
            'magnetic-stirrer':    { spec: '加热型', qty: '1 台', loc: '仪器分析区 I-4', usage: '搅拌控温；搅拌子用后取出洗净' },
            'water-bath':          { spec: '6 孔恒温', qty: '1 台', loc: '仪器分析区 I-5', usage: '恒温加热；水位不得低于最低刻度' },
            'burette':             { spec: '50 mL 酸式', qty: '2 支', loc: '仪器分析区 I-6', usage: '滴定；用前检漏润洗，读数读弯月面' },
            'pipette':             { spec: '10 mL 单标线', qty: '2 支', loc: '仪器分析区 I-6', usage: '准确移取液体；用洗耳球吸取，不得用嘴吸' }
        };

        // 试剂规格表：[规格浓度, 试剂柜位置]
        const REAGENT_SPEC = {
            'HCl':             ['500 mL · 2 mol/L', 'A1 酸类'],
            'H2SO4':           ['500 mL · 1 mol/L', 'A1 酸类'],
            'HNO3':            ['500 mL · 1 mol/L', 'A1 酸类'],
            'CH3COOH':         ['500 mL · 1 mol/L', 'A1 酸类'],
            'NaOH':            ['500 mL · 2 mol/L', 'A2 碱类'],
            'NH3H2O':          ['500 mL · 2 mol/L', 'A2 碱类'],
            'Na2CO3':          ['500 mL · 0.5 mol/L', 'A3 盐类'],
            'NaHCO3':          ['500 mL · 0.5 mol/L', 'A3 盐类'],
            'NaCl':            ['500 mL · 0.5 mol/L', 'A3 盐类'],
            'CuSO4':           ['500 mL · 0.5 mol/L', 'A3 盐类'],
            'FeCl3':           ['500 mL · 0.2 mol/L', 'A3 盐类'],
            'BaCl2':           ['500 mL · 0.2 mol/L', 'A3 盐类'],
            'AgNO3':           ['100 mL · 0.1 mol/L', 'A3 盐类（避光）'],
            'KSCN':            ['100 mL · 0.1 mol/L', 'A3 盐类'],
            'H2O2':            ['500 mL · 3%', 'A4 氧化剂（避光）'],
            'Phenolphthalein': ['100 mL 乙醇溶液', 'A4 指示剂'],
            'MethylOrange':    ['100 mL 水溶液', 'A4 指示剂'],
            'Ethanol':         ['500 mL · 95%', 'B1 有机柜（防火）'],
            'H2O':             ['1 L 蒸馏水', 'B2 纯水架'],
            'Fe':              ['100 g 铁粉', 'C1 固体柜'],
            'Zn':              ['100 g 锌粒', 'C1 固体柜'],
            'Cu':              ['100 g 铜片', 'C1 固体柜'],
            'Mg':              ['50 g 镁条', 'C1 固体柜'],
            'CaCO3':           ['100 g 粉末', 'C1 固体柜'],
            'NaOH-solid':      ['100 g 粒状', 'C2 碱类固体'],
            'CuO':             ['100 g 粉末', 'C1 固体柜'],
            'MnO2':            ['100 g 粉末', 'C1 固体柜'],
            'KMnO4':           ['100 g 晶体', 'C3 氧化剂柜'],
            'S':               ['100 g 硫粉', 'C3 氧化剂柜'],
            'Fe2O3':           ['100 g 粉末', 'C1 固体柜']
        };

        // ========== 实验室规范体系 ==========
        const LAB_RULES = [
            {
                key: 'safety', title: '安全操作规范', icon: '🛡️',
                sections: [
                    { h: '一、个人防护（PPE）', items: [
                        '进入实验室必须穿<b>实验服</b>并扣好衣扣，长发束起，不得穿拖鞋、凉鞋或短裤。',
                        '接触酸碱及有机溶剂时须佩戴<b>护目镜</b>与<b>丁腈手套</b>；操作腐蚀性试剂可加戴面罩。',
                        '操作挥发性、刺激性试剂（浓盐酸、硝酸、氨水）必须在<b>通风橱</b>内进行。'
                    ]},
                    { h: '二、试剂取用', items: [
                        '取用前核对标签，<b>严禁使用无标签或标签模糊的试剂</b>；取用后立即盖塞归位。',
                        '固体用药匙、液体用倾倒或滴管；<b>不得用手直接接触任何试剂</b>。',
                        '倾倒液体时标签朝向手心，瓶口紧靠容器口，防止液体流下腐蚀标签。',
                        '浓硫酸稀释必须<b>把酸缓缓注入水中</b>并不断搅拌，严禁将水倒入浓硫酸。'
                    ]},
                    { h: '三、加热与用电', items: [
                        '烧杯、烧瓶、锥形瓶加热前必须置于<b>石棉网</b>上，使受热均匀防止炸裂。',
                        '酒精灯用外焰加热，禁止用一盏酒精灯引燃另一盏；用毕用灯帽盖灭，<b>不可用嘴吹</b>。',
                        '试管加热时液体不超过容积 1/3，管口<b>不得对着自己或他人</b>。',
                        '加热后的器皿不得立即接触冷水或放回台面，须置于石棉网上冷却。'
                    ]},
                    { h: '四、仪器使用', items: [
                        '精密仪器须按操作规程使用，<b>未经培训不得独立操作</b>；使用前预热、校准并登记。',
                        '仪器故障应立即停止使用、断电并报告，<b>严禁私自拆装维修</b>。'
                    ]}
                ]
            },
            {
                key: 'process', title: '实验流程管控', icon: '📋',
                sections: [
                    { h: '一、实验前', items: [
                        '明确实验目的、反应原理与风险点，完成<b>实验方案与风险评估</b>。',
                        '检查器材是否洁净完好，试剂标签清晰、在有效期内。',
                        '确认通风橱、洗眼器、灭火器、废液容器<b>位置与可用状态</b>。',
                        '穿戴 PPE，清理台面，只保留本次实验所需物品。'
                    ]},
                    { h: '二、实验中', items: [
                        '严格按<b>实验步骤</b>操作，不得擅自更改试剂用量与顺序。',
                        '实验中不得离岗；离开前须停止加热、关闭气源并告知同组人员。',
                        '出现异常（剧烈放热、异常气味、颜色突变）立即停止操作并报告。',
                        '同时进行的多组实验应分区摆放，避免交叉污染。'
                    ]},
                    { h: '三、实验后', items: [
                        '先<b>熄灭热源</b>，待器皿冷却后清洗；洗净器皿倒置晾干。',
                        '试剂归位、台面擦拭、废弃物按类别投放，最后关闭水电与通风。',
                        '填写实验记录：现象、数据、异常情况及处理措施。'
                    ]},
                    { h: '四、记录与追溯', items: [
                        '实验数据须<b>实时、如实</b>记录，不得涂改或事后补记。',
                        '危化品领用、废弃物移交须登记<b>时间、种类、数量、经办人</b>。'
                    ]}
                ]
            },
            {
                key: 'waste', title: '废弃物处理要求', icon: '♻️',
                sections: [
                    { h: '一、分类原则', items: [
                        '废弃物按<b>废液、固体废物、锐器、废气</b>四类分别收集，严禁混装。',
                        '各类容器须<b>贴标签注明成分、浓度、日期</b>，装至 3/4 即封口更换。',
                        '禁止将任何化学废弃物直接倒入下水道或投入生活垃圾。'
                    ]},
                    { h: '二、废液', items: [
                        '<b>酸性废液</b>与<b>碱性废液</b>分开收集，防止中和放热飞溅；中和至 pH 6–9 后方可进一步处理。',
                        '<b>含重金属废液</b>（含铜、钡、银、铁等）单独收集，交有资质单位处置。',
                        '<b>含有机物废液</b>（乙醇、酚酞母液等）收集于防爆容器，远离火源。'
                    ]},
                    { h: '三、固体废物', items: [
                        '废试剂、滤纸、称量纸、污染抹布投入<b>废固桶</b>。',
                        '剧毒、强氧化性固体废物须<b>单独封装并标注</b>。'
                    ]},
                    { h: '四、锐器', items: [
                        '破损玻璃器皿、针头、刀片投入<b>锐器盒</b>，不得混入普通垃圾。',
                        '锐器盒装至 3/4 即封口，交由专门渠道处理。'
                    ]}
                ]
            },
            {
                key: 'emergency', title: '应急处置预案', icon: '🚨',
                sections: [
                    { h: '一、化学灼伤', items: [
                        '<b>酸溅到皮肤</b>：立即用大量流动清水冲洗 15 分钟，再涂 3% 碳酸氢钠溶液。',
                        '<b>碱溅到皮肤</b>：大量清水冲洗 15 分钟，再涂 2% 硼酸溶液。',
                        '<b>试剂入眼</b>：立即用洗眼器冲洗 15 分钟以上，翻开眼睑冲洗，随后就医。',
                        '严重灼伤不得自行涂抹药膏，冲洗后立即送医。'
                    ]},
                    { h: '二、火灾', items: [
                        '酒精灯或少量溶剂着火：用<b>湿抹布或石棉网盖灭</b>，<b>严禁用水浇</b>。',
                        '电器着火：先<b>切断电源</b>，使用干粉或二氧化碳灭火器，禁止用水。',
                        '火势无法控制时立即撤离并报警，关闭气源与电源总闸。'
                    ]},
                    { h: '三、泄漏与吸入', items: [
                        '少量泄漏用<b>吸附棉或干沙</b>吸附收集，再按危废处理；大量泄漏须疏散并报告。',
                        '吸入刺激性气体：迅速转移至通风处，保持呼吸道通畅，必要时吸氧并就医。',
                        '汞泄漏不得用吸尘器清理，须用硫粉覆盖后收集。'
                    ]},
                    { h: '四、报告流程', items: [
                        '任何事故须在<b>第一时间</b>报告指导教师或实验室负责人，并保护现场。',
                        '填写事故记录，分析原因并落实整改措施后，方可恢复实验。'
                    ]}
                ]
            },
            {
                key: 'conduct', title: '人员准入与行为准则', icon: '👤',
                sections: [
                    { h: '一、准入条件', items: [
                        '须完成<b>实验室安全培训并考核合格</b>，签署安全责任承诺书。',
                        '了解本实验室危险源分布、应急通道与急救设施位置。',
                        '外来人员参观须经批准并由工作人员全程陪同。'
                    ]},
                    { h: '二、行为准则', items: [
                        '实验区内<b>禁止饮食、吸烟、化妆</b>，不得存放食物与饮料。',
                        '保持台面与通道整洁，物品用完归位，不得占用公共区域。',
                        '禁止在实验室追逐打闹、独自进行危险性实验。'
                    ]},
                    { h: '三、禁止行为', items: [
                        '严禁<b>未经许可</b>擅自使用、移动或拆装仪器设备。',
                        '严禁将试剂带出实验室，严禁私自改变试剂存放位置。',
                        '严禁用嘴吸取液体、直接闻气体或品尝任何试剂。'
                    ]},
                    { h: '四、责任', items: [
                        '个人对自身操作安全负责，对共同使用的器材与环境负有维护义务。',
                        '因违规操作造成事故或设备损坏的，按实验室管理规定追责。'
                    ]}
                ]
            }
        ];

        // ====== 安全提示逻辑 ======
        let safetyAlertTimer = null;
        const warnedReagents = new Set();   // 已提示过的试剂，避免反复打扰

        /**
         * 顶部滑入式安全提示条
         * @param {string} title 标题
         * @param {string} text 内容
         * @param {number} duration 显示时长(ms)
         * @param {string} variant 样式变体，传 'danger' 显示红色异常样式
         */
        function showSafetyAlert(title, text, duration = 4500, variant = '') {
            const alert = document.getElementById('safetyAlert');
            if (!alert) return;
            document.getElementById('safetyAlertTitle').textContent = title;
            document.getElementById('safetyAlertText').textContent = text;
            alert.classList.toggle('danger', variant === 'danger');
            alert.classList.add('show');
            if (safetyAlertTimer) clearTimeout(safetyAlertTimer);
            safetyAlertTimer = setTimeout(() => alert.classList.remove('show'), duration);
        }

        /**
         * 在试剂卡片右上角注入危险性标识徽章
         */
        function initSafetyBadges() {
            document.querySelectorAll('.item[data-reagent]').forEach(item => {
                const info = safetyInfo[item.dataset.reagent];
                if (!info || item.querySelector('.safety-badge')) return;
                const badge = document.createElement('div');
                badge.className = 'safety-badge';
                badge.textContent = info.icon;
                badge.title = `${info.name}：${info.risk}\n防护：${info.protect}`;
                item.appendChild(badge);
            });
        }

        /**
         * 取用高危险试剂时给出一次性提示
         * @param {string} reagent 试剂代码
         */
        function checkReagentSafety(reagent) {
            const info = safetyInfo[reagent];
            if (!info || info.level !== 'high' || warnedReagents.has(reagent)) return;
            warnedReagents.add(reagent);
            showSafetyAlert(`⚠️ 危险试剂：${info.name}`, `${info.risk}。防护要求：${info.protect}`);
        }

        /**
         * 反应发生时给出产物安全提示
         * @param {string} reactionKey 形如 "HCl+Zn"
         */
        function showReactionSafety(reactionKey) {
            const tip = reactionSafety[reactionKey];
            if (tip) showSafetyAlert('🛡️ 安全提示', tip, 5000);
        }

        /**
         * 首次进入实验室时的安全须知确认
         */
        function setupSafetyModal() {
            const modal = document.getElementById('safetyModal');
            const ack = document.getElementById('safetyAck');
            const enterBtn = document.getElementById('safetyEnterBtn');
            if (!modal || !ack || !enterBtn) return;

            let acknowledged = false;
            try {
                acknowledged = localStorage.getItem('chemLabSafetyAck') === '1';
            } catch (e) { /* 隐私模式下忽略存储异常 */ }

            if (acknowledged) return;   // 已确认过则不再打断

            modal.classList.add('show');

            ack.addEventListener('change', () => {
                enterBtn.disabled = !ack.checked;
            });

            enterBtn.addEventListener('click', () => {
                if (!ack.checked) return;
                try {
                    localStorage.setItem('chemLabSafetyAck', '1');
                } catch (e) { /* 忽略存储失败 */ }
                modal.classList.remove('show');
                showSafetyAlert('✅ 安全确认完成', '请佩戴护目镜与手套后开始实验，祝实验顺利！', 3200);
            });
        }

        // ====== 实验室配置与规范逻辑 ======

        /**
         * 读取卡片上的显示图标与名称（用于通用器材渲染）
         * @param {string} type 器材类型
         */
        function getItemMeta(type) {
            const card = document.querySelector('.item[data-type="' + type + '"]');
            const iconEl = card ? card.querySelector('.item-icon') : null;
            const nameEl = card ? card.querySelector('.item-name') : null;
            return {
                icon: (iconEl && iconEl.textContent.trim()) || '🔧',
                name: (nameEl && nameEl.textContent.trim()) || type
            };
        }

        /**
         * 给侧栏卡片注入规格徽标，使每件物品都标注规格
         */
        function injectSpecBadges() {
            document.querySelectorAll('.item').forEach(item => {
                if (item.querySelector('.item-spec')) return;
                const type = item.dataset.type;
                const reagent = item.dataset.reagent;
                let text = '';
                if (type === 'reagent-liquid' || type === 'solid-bottle') {
                    const conf = REAGENT_SPEC[reagent];
                    if (conf) text = conf[0];
                } else {
                    const meta = EQUIPMENT_SPEC[type];
                    if (meta) text = meta.spec;
                }
                if (!text) return;
                const span = document.createElement('span');
                span.className = 'item-spec';
                span.textContent = text;
                item.appendChild(span);
            });
        }

        /**
         * 依据当前场景实际配置生成配置清单表格
         * 数据源为侧栏 DOM + 规格表，保证清单与场景完全一致
         */
        function buildConfigTable() {
            const rows = [];
            let zoneCount = 0;
            let itemCount = 0;

            document.querySelectorAll('.zone-block').forEach(zone => {
                zoneCount++;
                const zoneNameEl = zone.querySelector('.zone-name');
                const zoneName = zoneNameEl ? zoneNameEl.textContent : '';

                zone.querySelectorAll('.category').forEach(cat => {
                    const groupEl = cat.querySelector('h3');
                    const groupName = groupEl ? groupEl.textContent.trim() : '';

                    cat.querySelectorAll('.item').forEach(item => {
                        itemCount++;
                        const type = item.dataset.type;
                        const reagent = item.dataset.reagent;
                        const nameEl = item.querySelector('.item-name');
                        const name = nameEl ? nameEl.textContent : '';
                        let spec = '—';
                        let qty = '—';
                        let loc = '—';
                        let usage = '—';

                        if (type === 'reagent-liquid' || type === 'solid-bottle') {
                            const conf = REAGENT_SPEC[reagent];
                            if (conf) {
                                spec = conf[0];
                                loc = '试剂柜 ' + conf[1];
                            }
                            qty = '1 瓶';
                            usage = type === 'reagent-liquid'
                                ? '直接倾倒或用滴管精确滴加；取后立即盖塞归位'
                                : '用药匙取用，不得用手直接接触；取后立即盖塞';
                        } else {
                            const meta = EQUIPMENT_SPEC[type];
                            if (meta) {
                                spec = meta.spec;
                                qty = meta.qty;
                                loc = meta.loc;
                                usage = meta.usage;
                            }
                        }

                        rows.push(
                            '<tr>' +
                            '<td class="cfg-zone">' + zoneName + '</td>' +
                            '<td>' + groupName + '</td>' +
                            '<td>' + name + '</td>' +
                            '<td>' + spec + '</td>' +
                            '<td>' + qty + '</td>' +
                            '<td>' + loc + '</td>' +
                            '<td class="cfg-usage">' + usage + '</td>' +
                            '</tr>'
                        );
                    });
                });
            });

            const toolbar = document.getElementById('cfgToolbar');
            const wrap = document.getElementById('cfgTableWrap');
            if (!toolbar || !wrap) return;

            toolbar.innerHTML =
                '<span class="cfg-stat">功能分区 ' + zoneCount + ' 个</span>' +
                '<span class="cfg-stat">配置条目 ' + itemCount + ' 项</span>' +
                '<span class="cfg-stat">数据源：当前场景实际配置</span>';

            wrap.innerHTML =
                '<table class="cfg-table"><thead><tr>' +
                '<th>功能分区</th><th>类别</th><th>名称</th><th>规格 / 浓度</th>' +
                '<th>数量</th><th>存放位置</th><th>使用规范</th>' +
                '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
        }

        /**
         * 渲染实验室规范体系（五个模块标签页）
         */
        function initRulesPanel() {
            const tabs = document.getElementById('ruleTabs');
            const panes = document.getElementById('rulePanes');
            if (!tabs || !panes) return;

            tabs.innerHTML = LAB_RULES.map((rule, i) =>
                '<button class="rule-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + rule.key + '">' +
                rule.icon + ' ' + rule.title + '</button>'
            ).join('');

            panes.innerHTML = LAB_RULES.map((rule, i) => {
                const sections = rule.sections.map(sec =>
                    '<div class="rule-section">' +
                    '<h4>' + sec.h + '</h4>' +
                    '<ul class="rule-list">' + sec.items.map(t => '<li>' + t + '</li>').join('') + '</ul>' +
                    '</div>'
                ).join('');
                return '<div class="rule-pane' + (i === 0 ? ' active' : '') + '" data-pane="' + rule.key + '">' +
                    sections + '</div>';
            }).join('');

            tabs.addEventListener('click', e => {
                const btn = e.target.closest('.rule-tab');
                if (!btn) return;
                tabs.querySelectorAll('.rule-tab').forEach(b => b.classList.toggle('active', b === btn));
                panes.querySelectorAll('.rule-pane').forEach(p =>
                    p.classList.toggle('active', p.dataset.pane === btn.dataset.tab)
                );
            });
        }

        /**
         * 打开/关闭实验室大面板
         */
        function setupLabModals() {
            const openModal = id => {
                const modal = document.getElementById(id);
                if (modal) modal.classList.add('show');
            };

            const configBtn = document.getElementById('configBtn');
            const rulesBtn = document.getElementById('rulesBtn');

            if (configBtn) {
                configBtn.addEventListener('click', () => {
                    buildConfigTable();   // 每次打开按当前场景重建，确保清单与配置一致
                    openModal('configModal');
                });
            }

            if (rulesBtn) {
                rulesBtn.addEventListener('click', () => openModal('rulesModal'));
            }

            document.querySelectorAll('.lab-modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modal = document.getElementById(btn.dataset.close);
                    if (modal) modal.classList.remove('show');
                });
            });

            document.querySelectorAll('.lab-modal').forEach(modal => {
                modal.addEventListener('click', e => {
                    if (e.target === modal) modal.classList.remove('show');
                });
            });
        }

        // ====== 器材展示完整性自检 ======
        // 所有可拖拽器材都必须在此登记，且 createEquipment 中必须有对应的实物绘制分支
        const RENDERED_EQUIPMENT_TYPES = [
            'beaker', 'test-tube', 'flask', 'round-bottom-flask', 'volumetric-flask', 'graduated-cylinder',
            'alcohol-lamp', 'bunsen-burner', 'test-tube-rack', 'iron-stand', 'tripod', 'asbestos-net',
            'medicine-spoon', 'dropper', 'thermometer',
            'evaporating-dish', 'crucible', 'watch-glass', 'glass-rod', 'funnel', 'separatory-funnel',
            'gas-jar', 'combustion-spoon', 'test-tube-clamp', 'crucible-tongs', 'tweezers', 'mortar', 'balance',
            'wash-bottle', 'test-tube-brush', 'drying-rack', 'cloth',
            'waste-liquid', 'waste-solid', 'sharps-box'
        ];

        /**
         * 全量校验：检查场景中每件可拖拽器材是否都配置了实物绘制
         * @returns {string[]} 缺少实物绘制的器材类型列表
         */
        function verifyEquipmentRendering() {
            const missing = [];

            document.querySelectorAll('.item[data-type]').forEach(item => {
                const type = item.dataset.type;
                // 试剂由 reagent-liquid / solid-bottle 统一绘制
                if (type === 'reagent-liquid' || type === 'solid-bottle') return;
                // 仪器分析区为固定设备，不参与拖拽渲染
                if (item.dataset.static === 'true') return;

                if (RENDERED_EQUIPMENT_TYPES.indexOf(type) === -1 && missing.indexOf(type) === -1) {
                    missing.push(type);
                }
            });

            if (missing.length > 0) {
                console.warn('[实验室] 以下器材仅显示图标，缺少实物绘制：', missing);
            }
            return missing;
        }

        // ====== 废弃物分类处置 ======
        const WASTE_HEAVY = ['CuSO4', 'FeCl3', 'BaCl2', 'AgNO3', 'CuO', 'Fe2O3', 'KMnO4', 'Cu'];
        const WASTE_ACID = ['HCl', 'H2SO4', 'HNO3', 'CH3COOH'];
        const WASTE_BASE = ['NaOH', 'NH3H2O', 'NaOH-solid'];

        /**
         * 依据容器内试剂判定废液类别
         * @param {string[]} reagents 试剂代码列表
         */
        function classifyWaste(reagents) {
            if (reagents.some(r => WASTE_HEAVY.indexOf(r) !== -1)) {
                return { name: '含重金属废液桶', tip: '重金属离子有毒，严禁与酸碱废液混装，须交有资质单位处置' };
            }
            if (reagents.some(r => WASTE_ACID.indexOf(r) !== -1)) {
                return { name: '酸性废液桶', tip: '禁止直接排入下水道，需中和至 pH 6~9 并登记' };
            }
            if (reagents.some(r => WASTE_BASE.indexOf(r) !== -1)) {
                return { name: '碱性废液桶', tip: '与酸性废液分开收集，避免混合放热飞溅' };
            }
            return { name: '一般废液桶', tip: '可溶性无机盐溶液，回收后统一处理' };
        }

        /**
         * 将容器内废液倒入废液缸：清空容器并按类别提示
         */
        function disposeLiquidWaste(container, data) {
            if (!data.reagents || data.reagents.length === 0) {
                showExperimentInfo('🪣 该容器内没有废液，无需倾倒');
                return;
            }

            const waste = classifyWaste(data.reagents);

            data.reagents = [];
            data.solids = [];

            const liquid = container.querySelector(
                '.beaker-liquid, .test-tube-liquid, .flask-liquid, .round-flask-liquid, .volumetric-liquid, .cylinder-liquid'
            );
            if (liquid) {
                liquid.style.height = '0%';
                liquid.style.background = 'transparent';
            }
            container.querySelectorAll('.solid-particle, .precipitate, .bubble').forEach(el => el.remove());

            showSafetyAlert('♻️ 废液已倒入' + waste.name, waste.tip, 6500);
        }

        let equipmentCounter = 0;
        let selectedEquipment = null;
        const equipmentData = new Map();

        // 可以附着到铁架台的器材类型
        const attachableTypes = ['beaker', 'flask', 'test-tube', 'asbestos-net', 'tripod', 'round-bottom-flask'];
        
        // 需要石棉网才能加热的容器（烧杯和圆底烧瓶）
        const needsAsbestosNet = ['beaker', 'round-bottom-flask'];

        /**
         * 检测是否为移动设备
         */
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        // 拖拽开始（鼠标事件 - 仅PC端）
        document.querySelectorAll('.item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                // 仪器分析区为固定安装设备，禁止拖入操作台
                if (item.dataset.static === 'true') {
                    e.preventDefault();
                    showExperimentInfo('🔒 仪器分析区设备固定安装，禁止搬动，请到仪器前操作');
                    return;
                }
                e.dataTransfer.setData('type', item.dataset.type);
                e.dataTransfer.setData('reagent', item.dataset.reagent || '');
            });
        });

        // 拖拽到实验台（鼠标事件 - 仅PC端）
        const dropZone = document.getElementById('dropZone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            const reagent = e.dataTransfer.getData('reagent');
            
            const rect = dropZone.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            createEquipment(type, reagent, x, y);
        });

        // 创建3D器材
        function createEquipment(type, reagent, x, y) {
            const equipment = document.createElement('div');
            equipment.className = 'lab-equipment-3d';
            equipment.style.left = x + 'px';
            equipment.style.top = y + 'px';
            equipment.id = 'equipment-' + (++equipmentCounter);
            
            const data = {
                type: type,
                reagent: reagent,
                reagents: [],
                solids: [],
                isLit: false,
                spoonContent: null,
                dropperContent: null,
                attachedTo: null,
                attachments: [],
                hasAsbestosNetBelow: false  // 新增：标记下方是否有石棉网
            };
            
            equipmentData.set(equipment.id, data);
            
            // 根据类型创建不同的器材
            switch(type) {
                case 'beaker':
                    equipment.innerHTML = `
                        <div class="beaker-3d">
                            <div class="beaker-rim"></div>
                            <div class="beaker-body">
                                <div class="beaker-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'test-tube':
                    equipment.innerHTML = `
                        <div class="test-tube-3d">
                            <div class="test-tube-body">
                                <div class="test-tube-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'flask':
                    equipment.innerHTML = `
                        <div class="flask-3d">
                            <div class="flask-neck-3d"></div>
                            <div class="flask-body-3d">
                                <div class="flask-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'round-bottom-flask':
                    equipment.innerHTML = `
                        <div class="round-bottom-flask">
                            <div class="round-flask-neck"></div>
                            <div class="round-flask-body">
                                <div class="round-flask-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'volumetric-flask':
                    equipment.innerHTML = `
                        <div class="volumetric-flask">
                            <div class="volumetric-neck"></div>
                            <div class="volumetric-bulb">
                                <div class="volumetric-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'graduated-cylinder':
                    equipment.innerHTML = `
                        <div class="graduated-cylinder">
                            <div class="cylinder-body">
                                <div class="cylinder-liquid"></div>
                                <div class="solid-particles-container"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'alcohol-lamp':
                    equipment.innerHTML = `
                        <div class="alcohol-lamp-3d">
                            <div class="lamp-wick-3d"></div>
                            <div class="flame-3d"></div>
                            <div class="lamp-base-3d"></div>
                        </div>
                    `;
                    // 同时绑定鼠标和触摸事件
                    const toggleLampHandler = () => toggleLamp(equipment.id);
                    equipment.addEventListener('click', toggleLampHandler);
                    equipment.addEventListener('touchstart', toggleLampHandler, { passive: false });
                    break;
                
                case 'bunsen-burner':
                    equipment.innerHTML = `
                        <div class="bunsen-burner">
                            <div class="burner-tube">
                                <div class="burner-flame"></div>
                            </div>
                            <div class="burner-base"></div>
                        </div>
                    `;
                    // 同时绑定鼠标和触摸事件
                    const toggleBurnerHandler = () => toggleBurner(equipment.id);
                    equipment.addEventListener('click', toggleBurnerHandler);
                    equipment.addEventListener('touchstart', toggleBurnerHandler, { passive: false });
                    break;
                
                case 'test-tube-rack':
                    equipment.innerHTML = `
                        <div class="test-tube-rack">
                            <div class="rack-holes">
                                <div class="rack-hole"></div>
                                <div class="rack-hole"></div>
                                <div class="rack-hole"></div>
                                <div class="rack-hole"></div>
                            </div>
                            <div class="rack-base"></div>
                        </div>
                    `;
                    break;
                
                case 'iron-stand':
                    equipment.innerHTML = `
                        <div class="iron-stand">
                            <div class="stand-rod">
                                <div class="stand-clamp"></div>
                            </div>
                            <div class="stand-base"></div>
                            <div class="stand-attachments"></div>
                        </div>
                    `;
                    break;
                
                case 'tripod':
                    equipment.innerHTML = `
                        <div class="tripod">
                            <div class="tripod-ring"></div>
                            <div class="tripod-legs">
                                <div class="tripod-leg"></div>
                                <div class="tripod-leg"></div>
                                <div class="tripod-leg"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'asbestos-net':
                    equipment.innerHTML = `
                        <div class="asbestos-net">
                            <div class="net-frame">
                                <div class="net-mesh"></div>
                                <div class="net-center"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'medicine-spoon':
                    equipment.innerHTML = `
                        <div class="medicine-spoon">
                            <div class="spoon-handle"></div>
                            <div class="spoon-head"></div>
                        </div>
                    `;
                    break;
                
                case 'dropper':
                    equipment.innerHTML = `
                        <div class="dropper">
                            <div class="dropper-bulb"></div>
                            <div class="dropper-tube">
                                <div class="dropper-liquid"></div>
                            </div>
                        </div>
                    `;
                    break;
                
                case 'thermometer':
                    equipment.innerHTML = `
                        <div class="thermometer">
                            <div class="thermo-tube"></div>
                            <div class="thermo-bulb"></div>
                        </div>
                    `;
                    break;
                
                case 'reagent-liquid':
                    equipment.innerHTML = `
                        <div class="reagent-bottle-3d">
                            <div class="bottle-cap-3d"></div>
                            <div class="bottle-body-3d">
                                <div class="bottle-liquid-3d" style="background: ${reagentColors[reagent]}"></div>
                                <div class="bottle-label-3d">${reagent}</div>
                            </div>
                        </div>
                    `;
                    data.reagents = [reagent];
                    break;
                
                case 'solid-bottle':
                    equipment.innerHTML = `
                        <div class="wide-mouth-bottle">
                            <div class="wide-bottle-cap"></div>
                            <div class="wide-bottle-body">
                                <div class="wide-bottle-solid" style="background: ${reagentColors[reagent]}"></div>
                                <div class="wide-bottle-label">${reagent}</div>
                            </div>
                        </div>
                    `;
                    data.reagents = [reagent];
                    data.isSolidBottle = true;
                    break;

                case 'evaporating-dish':
                    equipment.innerHTML = `
                        <div class="evap-dish">
                            <div class="evap-dish-rim"></div>
                            <div class="evap-dish-liquid"></div>
                        </div>
                    `;
                    break;

                case 'crucible':
                    equipment.innerHTML = `<div class="crucible"></div>`;
                    break;

                case 'watch-glass':
                    equipment.innerHTML = `<div class="watch-glass"></div>`;
                    break;

                case 'glass-rod':
                    equipment.innerHTML = `<div class="glass-rod"></div>`;
                    break;

                case 'funnel':
                    equipment.innerHTML = `
                        <div class="funnel">
                            <div class="funnel-cone"></div>
                            <div class="funnel-stem"></div>
                        </div>
                    `;
                    break;

                case 'separatory-funnel':
                    equipment.innerHTML = `
                        <div class="sep-funnel">
                            <div class="sep-funnel-stopper"></div>
                            <div class="sep-funnel-body"></div>
                            <div class="sep-funnel-stopcock"></div>
                            <div class="sep-funnel-stem"></div>
                        </div>
                    `;
                    break;

                case 'gas-jar':
                    equipment.innerHTML = `
                        <div class="gas-jar">
                            <div class="gas-jar-body"></div>
                            <div class="gas-jar-plate"></div>
                        </div>
                    `;
                    break;

                case 'combustion-spoon':
                    equipment.innerHTML = `
                        <div class="comb-spoon">
                            <div class="comb-spoon-handle"></div>
                            <div class="comb-spoon-head"></div>
                        </div>
                    `;
                    break;

                case 'test-tube-clamp':
                    equipment.innerHTML = `
                        <div class="tube-clamp">
                            <div class="tube-clamp-handle"></div>
                            <div class="tube-clamp-jaw left"></div>
                            <div class="tube-clamp-jaw right"></div>
                        </div>
                    `;
                    break;

                case 'crucible-tongs':
                    equipment.innerHTML = `
                        <div class="crucible-tongs">
                            <div class="tong-arm top"></div>
                            <div class="tong-arm bottom"></div>
                            <div class="tong-joint"></div>
                        </div>
                    `;
                    break;

                case 'tweezers':
                    equipment.innerHTML = `
                        <div class="tweezers">
                            <div class="tweezer-arm top"></div>
                            <div class="tweezer-arm bottom"></div>
                        </div>
                    `;
                    break;

                case 'mortar':
                    equipment.innerHTML = `
                        <div class="mortar">
                            <div class="mortar-bowl"></div>
                            <div class="mortar-pestle"></div>
                        </div>
                    `;
                    break;

                case 'balance':
                    equipment.innerHTML = `
                        <div class="balance">
                            <div class="balance-base"></div>
                            <div class="balance-pillar"></div>
                            <div class="balance-beam"></div>
                            <div class="balance-pan left"></div>
                            <div class="balance-pan right"></div>
                        </div>
                    `;
                    break;

                case 'wash-bottle':
                    equipment.innerHTML = `
                        <div class="wash-bottle">
                            <div class="wash-bottle-tube"></div>
                            <div class="wash-bottle-body">
                                <div class="wash-bottle-liquid"></div>
                            </div>
                            <div class="wash-bottle-cap"></div>
                        </div>
                    `;
                    break;

                case 'test-tube-brush':
                    equipment.innerHTML = `
                        <div class="tube-brush">
                            <div class="tube-brush-handle"></div>
                            <div class="tube-brush-bristles"></div>
                        </div>
                    `;
                    break;

                case 'drying-rack':
                    equipment.innerHTML = `
                        <div class="drying-rack">
                            <div class="drying-rack-base"></div>
                            <div class="drying-rack-pillar"></div>
                            <div class="drying-rack-bar b1"></div>
                            <div class="drying-rack-bar b2"></div>
                            <div class="drying-rack-bar b3"></div>
                        </div>
                    `;
                    break;

                case 'cloth':
                    equipment.innerHTML = `
                        <div class="cloth-wrap">
                            <div class="cloth-fold"></div>
                        </div>
                    `;
                    break;

                case 'waste-liquid':
                    equipment.innerHTML = `
                        <div class="waste-bin">
                            <div class="waste-bin-body">
                                <div class="waste-bin-liquid"></div>
                            </div>
                            <div class="waste-bin-label">废液</div>
                            <div class="waste-bin-lid"></div>
                        </div>
                    `;
                    break;

                case 'waste-solid':
                    equipment.innerHTML = `
                        <div class="waste-bin solid">
                            <div class="waste-bin-body"></div>
                            <div class="waste-bin-label">废固</div>
                            <div class="waste-bin-lid"></div>
                        </div>
                    `;
                    break;

                case 'sharps-box':
                    equipment.innerHTML = `
                        <div class="sharps-box">
                            <div class="sharps-box-lid"></div>
                        </div>
                    `;
                    break;

                default: {
                    // 兜底：若命中说明该器材尚未配置实物绘制，控制台会给出明确告警
                    console.warn('[实验室] 器材缺少实物绘制配置：', type);
                    const info = getItemMeta(type);
                    equipment.innerHTML =
                        '<div class="eq-generic">' +
                        '<span class="eq-glyph">' + info.icon + '</span>' +
                        '<span class="eq-tag">' + info.name + '</span>' +
                        '</div>';
                    break;
                }
            }
            
            dropZone.appendChild(equipment);
            makeDraggable(equipment);
        }

        // 使器材可拖拽（优化版 - 支持触摸和鼠标）
        function makeDraggable(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            let isDragging = false;
            let animationFrame = null;
            
            // 绑定鼠标事件
            element.addEventListener('mousedown', dragStart);
            // 绑定触摸事件（支持移动端）
            element.addEventListener('touchstart', dragStart, { passive: false });
            
            /**
             * 获取事件坐标（兼容鼠标和触摸事件）
             * @param {Event} e - 事件对象
             * @returns {Object} 包含clientX和clientY的坐标对象
             */
            function getEventCoords(e) {
                if (e.touches && e.touches.length > 0) {
                    return {
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY
                    };
                }
                return {
                    clientX: e.clientX,
                    clientY: e.clientY
                };
            }
            
            /**
             * 拖拽开始（同时处理鼠标和触摸事件）
             */
            function dragStart(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const data = equipmentData.get(element.id);
                if (data && data.attachedTo) {
                    showExperimentInfo('⚠️ 请先双击从铁架台上取下器材');
                    return;
                }
                
                const coords = getEventCoords(e);
                pos3 = coords.clientX;
                pos4 = coords.clientY;
                
                // 绑定移动和结束事件
                document.addEventListener('mouseup', dragEnd);
                document.addEventListener('mousemove', dragMove);
                document.addEventListener('touchend', dragEnd, { passive: false });
                document.addEventListener('touchmove', dragMove, { passive: false });
                
                isDragging = false;
                element.classList.add('dragging');
                selectedEquipment = element;
                
                document.querySelectorAll('.lab-equipment-3d').forEach(eq => {
                    eq.classList.remove('selected');
                });
                element.classList.add('selected');
            }
            
            /**
             * 拖拽移动（同时处理鼠标和触摸事件）
             */
            function dragMove(e) {
                e.preventDefault();
                isDragging = true;
                
                const coords = getEventCoords(e);
                pos1 = pos3 - coords.clientX;
                pos2 = pos4 - coords.clientY;
                pos3 = coords.clientX;
                pos4 = coords.clientY;
                
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                animationFrame = requestAnimationFrame(() => {
                    const newTop = element.offsetTop - pos2;
                    const newLeft = element.offsetLeft - pos1;
                    
                    const dropZone = document.getElementById('dropZone');
                    const maxX = dropZone.clientWidth - element.offsetWidth;
                    const maxY = dropZone.clientHeight - element.offsetHeight;
                    
                    element.style.top = Math.max(0, Math.min(newTop, maxY)) + "px";
                    element.style.left = Math.max(0, Math.min(newLeft, maxX)) + "px";
                });
                
                const deleteZone = document.getElementById('deleteZone');
                const deleteRect = deleteZone.getBoundingClientRect();
                const equipRect = element.getBoundingClientRect();
                
                if (isOverlapping(equipRect, deleteRect)) {
                    deleteZone.classList.add('active');
                } else {
                    deleteZone.classList.remove('active');
                }
            }
            
            /**
             * 拖拽结束（同时处理鼠标和触摸事件）
             */
            function dragEnd(e) {
                // 解绑事件
                document.removeEventListener('mouseup', dragEnd);
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('touchend', dragEnd);
                document.removeEventListener('touchmove', dragMove);
                
                element.classList.remove('dragging');
                
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                if (isDragging) {
                    const deleteZone = document.getElementById('deleteZone');
                    const deleteRect = deleteZone.getBoundingClientRect();
                    const equipRect = element.getBoundingClientRect();
                    
                    if (isOverlapping(equipRect, deleteRect)) {
                        element.remove();
                        equipmentData.delete(element.id);
                        deleteZone.classList.remove('active');
                        return;
                    }
                    
                    checkCollision(element);
                }
            }
        }

        // 检查重叠
        function isOverlapping(rect1, rect2) {
            return !(rect1.right < rect2.left || 
                    rect1.left > rect2.right || 
                    rect1.bottom < rect2.top || 
                    rect1.top > rect2.bottom);
        }

        // 检查碰撞
        function checkCollision(element) {
            const rect1 = element.getBoundingClientRect();
            const data1 = equipmentData.get(element.id);
            
            document.querySelectorAll('.lab-equipment-3d').forEach(other => {
                if (other.id !== element.id) {
                    const rect2 = other.getBoundingClientRect();
                    
                    if (isOverlapping(rect1, rect2)) {
                        const data2 = equipmentData.get(other.id);
                        handleInteraction(element, data1, other, data2);
                    }
                }
            });
        }

        // 处理交互
        function handleInteraction(eq1, data1, eq2, data2) {
            const containerTypes = ['beaker', 'test-tube', 'flask', 'volumetric-flask', 'graduated-cylinder', 'round-bottom-flask'];

            // ===== 废弃物分类处置 =====
            if (data2.type === 'waste-liquid' && containerTypes.includes(data1.type)) {
                disposeLiquidWaste(eq1, data1);
                return;
            }

            if (data1.type === 'waste-liquid' && containerTypes.includes(data2.type)) {
                disposeLiquidWaste(eq2, data2);
                return;
            }

            if (data1.type === 'waste-solid' || data2.type === 'waste-solid') {
                showSafetyAlert('🗑️ 废固桶', '固体废物、滤纸、废试剂应投入废固桶，严禁倒入下水道或与废液混装', 6000);
                return;
            }

            if (data1.type === 'sharps-box' || data2.type === 'sharps-box') {
                showSafetyAlert('🧯 锐器盒', '仅破损玻璃器皿与锐器投入锐器盒；完好器皿请清洗后倒置晾干归位', 6000);
                return;
            }

            // 检查是否可以附着到铁架台
            if (data2.type === 'iron-stand' && attachableTypes.includes(data1.type)) {
                attachToStand(eq1, data1, eq2, data2);
                return;
            }
            
            if (data1.type === 'iron-stand' && attachableTypes.includes(data2.type)) {
                attachToStand(eq2, data2, eq1, data1);
                return;
            }
            
            // 检查是否将容器放置在三脚架上
            if (data2.type === 'tripod' && containerTypes.includes(data1.type)) {
                checkAsbestosNetForTripod(eq1, data1, eq2, data2);
                return;
            }
            
            if (data1.type === 'tripod' && containerTypes.includes(data2.type)) {
                checkAsbestosNetForTripod(eq2, data2, eq1, data1);
                return;
            }
            
            // 液体试剂瓶直接倒入容器
            if (data1.type === 'reagent-liquid' && containerTypes.includes(data2.type)) {
                addLiquidToContainer(eq2, data2, data1.reagents[0]);
                eq1.remove();
                equipmentData.delete(eq1.id);
                return;
            }
            
            if (data2.type === 'reagent-liquid' && containerTypes.includes(data1.type)) {
                addLiquidToContainer(eq1, data1, data2.reagents[0]);
                eq2.remove();
                equipmentData.delete(eq2.id);
                return;
            }
            
            // 滴管吸取液体试剂
            if (data1.type === 'dropper' && data2.type === 'reagent-liquid') {
                absorbReagentWithDropper(eq1, data1, data2.reagents[0]);
                return;
            }
            
            if (data2.type === 'dropper' && data1.type === 'reagent-liquid') {
                absorbReagentWithDropper(eq2, data2, data1.reagents[0]);
                return;
            }
            
            // 滴管吸取容器中的液体
            if (data1.type === 'dropper' && containerTypes.includes(data2.type) && data2.reagents.length > 0) {
                const lastReagent = data2.reagents[data2.reagents.length - 1];
                absorbReagentWithDropper(eq1, data1, lastReagent);
                return;
            }
            
            if (data2.type === 'dropper' && containerTypes.includes(data1.type) && data1.reagents.length > 0) {
                const lastReagent = data1.reagents[data1.reagents.length - 1];
                absorbReagentWithDropper(eq2, data2, lastReagent);
                return;
            }
            
            // 带液体的滴管滴入容器
            if (data1.type === 'dropper' && data1.dropperContent && containerTypes.includes(data2.type)) {
                dropReagentIntoContainer(eq1, data1, eq2, data2);
                return;
            }
            
            if (data2.type === 'dropper' && data2.dropperContent && containerTypes.includes(data1.type)) {
                dropReagentIntoContainer(eq2, data2, eq1, data1);
                return;
            }
            
            // 药匙从广口瓶中取固体
            if (data1.type === 'medicine-spoon' && data2.isSolidBottle) {
                takeSolidWithSpoon(eq1, data1, data2.reagents[0]);
                showExperimentInfo(`🥄 药匙取得 ${data2.reagents[0]}`);
                return;
            }
            
            if (data2.type === 'medicine-spoon' && data1.isSolidBottle) {
                takeSolidWithSpoon(eq2, data2, data1.reagents[0]);
                showExperimentInfo(`🥄 药匙取得 ${data1.reagents[0]}`);
                return;
            }
            
            // 带固体的药匙倒入容器
            if (data1.type === 'medicine-spoon' && data1.spoonContent && containerTypes.includes(data2.type)) {
                addSolidToContainer(eq2, data2, data1.spoonContent);
                clearSpoon(eq1, data1);
                return;
            }
            
            if (data2.type === 'medicine-spoon' && data2.spoonContent && containerTypes.includes(data1.type)) {
                addSolidToContainer(eq1, data1, data2.spoonContent);
                clearSpoon(eq2, data2);
                return;
            }
        }

        // 检查三脚架上是否有石棉网（新增）
        function checkAsbestosNetForTripod(container, containerData, tripod, tripodData) {
            // 检查三脚架的附件中是否有石棉网
            const hasAsbestosNet = tripodData.attachments.some(id => {
                const attachedEq = document.getElementById(id);
                const attachedData = equipmentData.get(id);
                return attachedData && attachedData.type === 'asbestos-net';
            });
            
            if (needsAsbestosNet.includes(containerData.type) && !hasAsbestosNet) {
                showExperimentInfo('⚠️ 警告：' + getEquipmentName(containerData.type) + '需要先在三脚架上放置石棉网！');
                return;
            }
            
            // 附着到三脚架
            attachToStand(container, containerData, tripod, tripodData);
            containerData.hasAsbestosNetBelow = hasAsbestosNet;
        }

        // 附着到铁架台或三脚架
        function attachToStand(equipment, equipData, stand, standData) {
            if (equipData.attachedTo) {
                showExperimentInfo('⚠️ 器材已经固定在支架上');
                return;
            }
            
            // 如果是需要石棉网的容器附着到三脚架
            if (standData.type === 'tripod' && needsAsbestosNet.includes(equipData.type)) {
                const hasAsbestosNet = standData.attachments.some(id => {
                    const attachedData = equipmentData.get(id);
                    return attachedData && attachedData.type === 'asbestos-net';
                });
                
                if (!hasAsbestosNet) {
                    showExperimentInfo('⚠️ 请先将石棉网放在三脚架上！');
                    return;
                }
                equipData.hasAsbestosNetBelow = true;
            }
            
            // 将器材附着到铁架台/三脚架
            equipData.attachedTo = stand.id;
            standData.attachments.push(equipment.id);
            
            // 相对位置略作调整
            const standRect = stand.getBoundingClientRect();
            const equipRect = equipment.getBoundingClientRect();
            
            let relativeX = equipRect.left - standRect.left;
            let relativeY = equipRect.top - standRect.top;
            
            // 移除器材并添加到支架的附件容器
            equipment.remove();
            
            if (standData.type === 'iron-stand') {
                const attachmentContainer = stand.querySelector('.stand-attachments');
                attachmentContainer.appendChild(equipment);
            } else {
                // 三脚架直接添加
                stand.appendChild(equipment);
            }
            
            equipment.style.left = relativeX + 'px';
            equipment.style.top = relativeY + 'px';
            equipment.classList.add('attached');
            
            // 高亮支架
            if (standData.type === 'iron-stand') {
                const clamp = stand.querySelector('.stand-clamp');
                if (clamp) {
                    clamp.classList.add('has-equipment');
                }
            }
            
            let msg = `✅ ${getEquipmentName(equipData.type)} 已固定`;
            if (equipData.hasAsbestosNetBelow) {
                msg += '（石棉网已就位）';
            }
            // 更新提示信息（支持双击和长按）
            msg += '，双击或长按可取下';
            showExperimentInfo(msg);
            
            /**
             * 取下器材的处理函数
             */
            function handleDetach(e) {
                e.stopPropagation();
                detachFromStand(equipment, equipData, stand, standData);
            }
            
            // 双击可取下（桌面端）
            equipment.ondblclick = handleDetach;
            
            // 长按可取下（移动端）
            let longPressTimer = null;
            
            equipment.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // 长按500ms触发取下操作
                longPressTimer = setTimeout(() => {
                    handleDetach(e);
                }, 500);
            }, { passive: false });
            
            // 触摸结束时清除定时器
            equipment.addEventListener('touchend', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }, { passive: false });
            
            // 触摸移动时清除定时器（防止误触发）
            equipment.addEventListener('touchmove', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }, { passive: false });
        }

        // 从铁架台/三脚架取下
        function detachFromStand(equipment, equipData, stand, standData) {
            equipData.attachedTo = null;
            equipData.hasAsbestosNetBelow = false;
            standData.attachments = standData.attachments.filter(id => id !== equipment.id);
            
            // 计算绝对位置
            const equipRect = equipment.getBoundingClientRect();
            const dropZoneRect = document.getElementById('dropZone').getBoundingClientRect();
            
            const absoluteX = equipRect.left - dropZoneRect.left;
            const absoluteY = equipRect.top - dropZoneRect.top;
            
            // 从附件容器移除并添加到主区域
            equipment.remove();
            document.getElementById('dropZone').appendChild(equipment);
            
            equipment.style.left = absoluteX + 'px';
            equipment.style.top = absoluteY + 'px';
            equipment.classList.remove('attached');
            
            // 移除高亮
            if (standData.type === 'iron-stand' && standData.attachments.length === 0) {
                const clamp = stand.querySelector('.stand-clamp');
                if (clamp) {
                    clamp.classList.remove('has-equipment');
                }
            }
            
            showExperimentInfo(`✅ ${getEquipmentName(equipData.type)} 已取下`);
            
            // 移除事件绑定
            equipment.ondblclick = null;
        }

        // 获取器材名称
        function getEquipmentName(type) {
            const names = {
                'beaker': '烧杯',
                'test-tube': '试管',
                'flask': '锥形瓶',
                'round-bottom-flask': '圆底烧瓶',
                'asbestos-net': '石棉网',
                'tripod': '三角架'
            };
            return names[type] || type;
        }

        // 添加液体到容器
        function addLiquidToContainer(container, data, reagent) {
            data.reagents.push(reagent);
            checkReagentSafety(reagent);   // 新增：危险试剂取用提示
            
            let liquidElement;
            const liquidSelectors = {
                'beaker': '.beaker-liquid',
                'test-tube': '.test-tube-liquid',
                'flask': '.flask-liquid',
                'round-bottom-flask': '.round-flask-liquid',
                'volumetric-flask': '.volumetric-liquid',
                'graduated-cylinder': '.cylinder-liquid'
            };
            
            liquidElement = container.querySelector(liquidSelectors[data.type]);
            
            if (liquidElement) {
                const currentHeight = parseInt(liquidElement.style.height) || 0;
                liquidElement.style.height = Math.min(currentHeight + 25, 75) + '%';
                
                checkReaction(container, data, liquidElement);
            }
        }

        // 滴管吸取试剂
        function absorbReagentWithDropper(dropper, dropperData, reagent) {
            dropperData.dropperContent = reagent;
            const dropperLiquid = dropper.querySelector('.dropper-liquid');
            if (dropperLiquid) {
                dropperLiquid.style.height = '60%';
                dropperLiquid.style.background = reagentColors[reagent];
                showExperimentInfo(`💉 滴管吸取了 ${reagent}`);
            }
        }

        // 滴管滴入容器
        function dropReagentIntoContainer(dropper, dropperData, container, containerData) {
            const reagent = dropperData.dropperContent;
            
            containerData.reagents.push(reagent);
            
            let liquidElement;
            const liquidSelectors = {
                'beaker': '.beaker-liquid',
                'test-tube': '.test-tube-liquid',
                'flask': '.flask-liquid',
                'round-bottom-flask': '.round-flask-liquid',
                'volumetric-flask': '.volumetric-liquid',
                'graduated-cylinder': '.cylinder-liquid'
            };
            
            liquidElement = container.querySelector(liquidSelectors[containerData.type]);
            
            if (liquidElement) {
                const currentHeight = parseInt(liquidElement.style.height) || 0;
                liquidElement.style.height = Math.min(currentHeight + 10, 75) + '%';
                
                showExperimentInfo(`💧 滴入 ${reagent}`);
                
                const dropperLiquid = dropper.querySelector('.dropper-liquid');
                if (dropperLiquid) {
                    dropperLiquid.style.height = '0%';
                }
                dropperData.dropperContent = null;
                
                checkReaction(container, containerData, liquidElement);
            }
        }

        // 药匙取固体
        function takeSolidWithSpoon(spoon, spoonData, solidReagent) {
            spoonData.spoonContent = solidReagent;
            const spoonHead = spoon.querySelector('.spoon-head');
            spoonHead.classList.add('has-solid');
            spoonHead.style.setProperty('--solid-color', reagentColors[solidReagent]);
        }

        // 清空药匙
        function clearSpoon(spoon, spoonData) {
            spoonData.spoonContent = null;
            const spoonHead = spoon.querySelector('.spoon-head');
            spoonHead.classList.remove('has-solid');
        }

        // 添加固体到容器
        function addSolidToContainer(container, data, solidReagent) {
            data.solids.push(solidReagent);
            data.reagents.push(solidReagent);
            checkReagentSafety(solidReagent);   // 新增：危险固体取用提示
            
            const particlesContainer = container.querySelector('.solid-particles-container');
            if (particlesContainer) {
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const particle = document.createElement('div');
                        particle.className = 'solid-particle';
                        const size = Math.random() * 4 + 3;
                        particle.style.width = size + 'px';
                        particle.style.height = size + 'px';
                        particle.style.background = reagentColors[solidReagent];
                        particle.style.left = (Math.random() * 80 + 10) + '%';
                        particle.style.bottom = (Math.random() * 15 + 5) + 'px';
                        particle.style.animationDelay = (Math.random() * 0.3) + 's';
                        particlesContainer.appendChild(particle);
                    }, i * 100);
                }
                
                showExperimentInfo(`✨ 已加入固体 ${solidReagent}`);
                
                const liquidSelectors = {
                    'beaker': '.beaker-liquid',
                    'test-tube': '.test-tube-liquid',
                    'flask': '.flask-liquid',
                    'round-bottom-flask': '.round-flask-liquid',
                    'volumetric-flask': '.volumetric-liquid',
                    'graduated-cylinder': '.cylinder-liquid'
                };
                const liquidElement = container.querySelector(liquidSelectors[data.type]);
                if (liquidElement) {
                    setTimeout(() => {
                        checkReaction(container, data, liquidElement);
                    }, 1000);
                }
            }
        }

        // 检查反应
        function checkReaction(container, data, liquidElement) {
            if (data.reagents.length >= 2) {
                const lastTwo = data.reagents.slice(-2);
                const reagents = lastTwo.slice().sort();
                const reactionKey = reagents.join('+');

                // 先判异常操作：既看「后加试剂」的顺序（稀释硫酸与顺序相关），
                // 也看无序组合（氧化剂混有机物等与顺序无关）
                const hazard = hazardReactions[lastTwo.join('+')] || hazardReactions[reactionKey];
                if (hazard) {
                    triggerHazard(container, hazard);
                    return;
                }

                if (reactions[reactionKey]) {
                    const reaction = reactions[reactionKey];
                    liquidElement.style.background = reaction.color;
                    
                    showExperimentInfo(reaction.description);
                    playReactionEffect(container, reaction);
                    showReactionSafety(reactionKey);   // 新增：给出产物安全提示
                }
            } else if (data.reagents.length === 1) {
                liquidElement.style.background = reagentColors[data.reagents[0]];
            }
        }

        /**
         * 异常操作演示：容器警示闪烁 + 烟雾 + 红色提示条 + 处置说明
         * @param {HTMLElement} container 反应容器
         * @param {object} hazard 异常规则
         */
        function triggerHazard(container, hazard) {
            // 警示动画加在器皿本身（.beaker-3d 等均设了 position: relative），保证定位正确
            const vessel = container.querySelector('.beaker-3d, .test-tube-3d, .flask-3d') || container;
            vessel.classList.add('lab-hazard');
            setTimeout(() => vessel.classList.remove('lab-hazard'), 2600);

            // 体系失控后液体呈浑浊灰白，与正常反应的清亮颜色区分开
            const liquidElement = container.querySelector(
                '.beaker-liquid, .test-tube-liquid, .flask-liquid, ' +
                '.round-flask-liquid, .volumetric-liquid, .cylinder-liquid'
            );
            if (liquidElement) liquidElement.style.background = 'rgba(120, 110, 100, 0.85)';

            createHazardEffect(vessel);
            showSafetyAlert(
                `⚠️ 操作异常：${hazard.title}`,
                `${hazard.reason}。处置：${hazard.guide}`,
                9000,
                'danger'
            );
            showExperimentInfo(`⚠️ 异常：${hazard.title} —— ${hazard.equation}。${hazard.guide}`);
        }

        // 异常烟雾：向上飘散的灰白烟团
        function createHazardEffect(container) {
            let count = 0;
            const interval = setInterval(() => {
                if (count++ > 8) {
                    clearInterval(interval);
                    return;
                }
                const smoke = document.createElement('div');
                smoke.className = 'hazard-smoke';
                smoke.style.left = (Math.random() * 50 + 25) + 'px';
                smoke.style.bottom = '70px';
                smoke.style.animationDelay = Math.random() * 0.4 + 's';
                container.appendChild(smoke);
                setTimeout(() => smoke.remove(), 2600);
            }, 260);
        }

        // 播放反应效果
        function playReactionEffect(container, reaction) {
            if (reaction.effect === 'bubbles') {
                createBubbles(container);
            } else if (reaction.effect === 'precipitate') {
                createPrecipitate(container, reaction.precipitateColor);
            } else if (reaction.effect === 'heat') {
                createHeatEffect(container);
            } else if (reaction.effect === 'colorChange') {
                createColorChangeEffect(container);
            }
        }

        // 创建气泡
        function createBubbles(container) {
            let count = 0;
            const interval = setInterval(() => {
                if (count++ > 15) {
                    clearInterval(interval);
                    return;
                }
                
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                const size = Math.random() * 8 + 6;
                bubble.style.width = size + 'px';
                bubble.style.height = size + 'px';
                bubble.style.left = (Math.random() * 60 + 20) + 'px';
                bubble.style.bottom = '15px';
                bubble.style.animationDelay = Math.random() * 0.5 + 's';
                bubble.style.animationDuration = (Math.random() * 1 + 2) + 's';
                container.appendChild(bubble);
                
                setTimeout(() => bubble.remove(), 2500);
            }, 200);
        }

        // 创建沉淀
        function createPrecipitate(container, color) {
            let count = 0;
            const interval = setInterval(() => {
                if (count++ > 20) {
                    clearInterval(interval);
                    return;
                }
                
                const particle = document.createElement('div');
                particle.className = 'precipitate';
                const size = Math.random() * 6 + 4;
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                particle.style.background = color;
                particle.style.left = (Math.random() * 70 + 15) + 'px';
                particle.style.top = '25px';
                particle.style.animationDelay = Math.random() * 0.8 + 's';
                particle.style.animationDuration = (Math.random() * 1.5 + 2.5) + 's';
                container.appendChild(particle);
                
                setTimeout(() => particle.remove(), 3000);
            }, 150);
        }

        // 创建加热效果
        function createHeatEffect(container) {
            let count = 0;
            const interval = setInterval(() => {
                if (count++ > 10) {
                    clearInterval(interval);
                    return;
                }
                
                const steam = document.createElement('div');
                steam.className = 'steam';
                steam.style.left = (Math.random() * 60 + 20) + 'px';
                steam.style.bottom = '80px';
                steam.style.animationDelay = Math.random() * 0.5 + 's';
                container.appendChild(steam);
                
                setTimeout(() => steam.remove(), 3000);
            }, 300);
            
            container.style.filter = 'brightness(1.15)';
            setTimeout(() => {
                container.style.filter = '';
            }, 3000);
        }

        // 创建变色效果
        function createColorChangeEffect(container) {
            container.style.transition = 'filter 0.8s';
            container.style.filter = 'brightness(1.3) saturate(1.5)';
            setTimeout(() => {
                container.style.filter = '';
            }, 1500);
        }

        // 切换酒精灯
        function toggleLamp(id) {
            const equipment = document.getElementById(id);
            const data = equipmentData.get(id);
            const lamp = equipment.querySelector('.alcohol-lamp-3d');
            
            data.isLit = !data.isLit;
            
            if (data.isLit) {
                lamp.classList.add('lit');
                showExperimentInfo('🔥 酒精灯已点燃');
            } else {
                lamp.classList.remove('lit');
                showExperimentInfo('酒精灯已熄灭');
            }
        }

        // 切换本生灯
        function toggleBurner(id) {
            const equipment = document.getElementById(id);
            const data = equipmentData.get(id);
            const burner = equipment.querySelector('.bunsen-burner');
            
            data.isLit = !data.isLit;
            
            if (data.isLit) {
                burner.classList.add('lit');
                showExperimentInfo('🔥 本生灯已点燃（蓝色火焰）');
            } else {
                burner.classList.remove('lit');
                showExperimentInfo('本生灯已熄灭');
            }
        }

        // 显示实验信息
        function showExperimentInfo(text) {
            const info = document.getElementById('experimentInfo');
            const textElement = document.getElementById('experimentText');
            textElement.textContent = text;
            info.classList.add('show');
            
            setTimeout(() => {
                info.classList.remove('show');
            }, 6000);
        }

        // ========== 下拉面板交互逻辑 ==========
        // 面板元素引用
        const experimentsBtn = document.getElementById('experimentsBtn');
        const experimentsPanel = document.getElementById('experimentsPanel');
        const helpBtn = document.getElementById('helpBtn');
        const helpPanel = document.getElementById('helpPanel');
        const safetyBtn = document.getElementById('safetyBtn');
        const safetyPanel = document.getElementById('safetyPanel');

        /**
         * 切换面板显示状态（三个面板互斥，同时只显示一个）
         * @param {HTMLElement} panel - 要切换的面板元素
         */
        function togglePanel(panel) {
            const isVisible = panel.classList.contains('show');
            
            // 先关闭全部面板，保证互斥
            closeAllPanels();
            
            if (!isVisible) {
                // 打开当前面板
                repositionPanel(panel);
                panel.classList.add('show');
            }
        }

        /**
         * 重新定位面板位置（响应窗口大小变化）
         * @param {HTMLElement} panel - 要定位的面板元素
         */
        function repositionPanel(panel) {
            const container = panel.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            // 设置面板位置
            panel.style.left = 'auto';
            panel.style.right = '0';
            
            // 检查是否超出视口右侧
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.right > window.innerWidth) {
                panel.style.right = 'auto';
                panel.style.left = '0';
                // 调整箭头位置
                const arrow = panel.querySelector('.dropdown-arrow');
                if (arrow) {
                    arrow.style.right = 'auto';
                    arrow.style.left = '20px';
                }
            } else {
                // 恢复箭头位置
                const arrow = panel.querySelector('.dropdown-arrow');
                if (arrow) {
                    arrow.style.left = 'auto';
                    arrow.style.right = '20px';
                }
            }
        }

        /**
         * 关闭所有面板
         */
        function closeAllPanels() {
            experimentsPanel.classList.remove('show');
            helpPanel.classList.remove('show');
            safetyPanel.classList.remove('show');
        }

        /**
         * 点击外部区域关闭面板
         * 关键技术点：使用composedPath检测点击目标是否在面板或按钮内部
         */
        document.addEventListener('click', function(event) {
            const path = event.composedPath ? event.composedPath() : [];
            const isExperimentsBtn = path.includes(experimentsBtn);
            const isExperimentsPanel = path.includes(experimentsPanel);
            const isHelpBtn = path.includes(helpBtn);
            const isHelpPanel = path.includes(helpPanel);
            const isSafetyBtn = path.includes(safetyBtn);
            const isSafetyPanel = path.includes(safetyPanel);
            
            // 如果点击的不是按钮或面板，则关闭所有面板
            if (!isExperimentsBtn && !isExperimentsPanel && !isHelpBtn && !isHelpPanel && !isSafetyBtn && !isSafetyPanel) {
                closeAllPanels();
            }
        });

        /**
         * 按钮点击事件绑定
         */
        experimentsBtn.addEventListener('click', function(event) {
            // 阻止事件冒泡，避免触发外部点击关闭逻辑
            event.stopPropagation();
            togglePanel(experimentsPanel);
        });

        helpBtn.addEventListener('click', function(event) {
            // 阻止事件冒泡，避免触发外部点击关闭逻辑
            event.stopPropagation();
            togglePanel(helpPanel);
        });

        safetyBtn.addEventListener('click', function(event) {
            // 阻止事件冒泡，避免触发外部点击关闭逻辑
            event.stopPropagation();
            togglePanel(safetyPanel);
        });

        /**
         * 窗口大小变化时重新定位面板
         */
        window.addEventListener('resize', function() {
            if (experimentsPanel.classList.contains('show')) {
                repositionPanel(experimentsPanel);
            }
            if (helpPanel.classList.contains('show')) {
                repositionPanel(helpPanel);
            }
            if (safetyPanel.classList.contains('show')) {
                repositionPanel(safetyPanel);
            }
        });

        /**
         * 键盘事件：按Escape键关闭面板
         */
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeAllPanels();
            }
        });

        // 清空实验台
        function clearWorkbench() {
            if (confirm('确定要清空实验台吗？')) {
                document.querySelectorAll('.lab-equipment-3d').forEach(eq => eq.remove());
                equipmentData.clear();
                equipmentCounter = 0;
                showExperimentInfo('✨ 实验台已清空');
            }
        }

        // 初始化
        window.onload = function() {
            showExperimentInfo('🎉 新增圆底烧瓶！烧杯和圆底烧瓶在三脚架上需先放石棉网！');
            
            // ========== 横屏模式自动检测功能 ==========
            // 检测是否为移动设备
            function isMobileDevice() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }

            // 获取横屏遮罩元素
            const landscapeOverlay = document.getElementById('landscapeOverlay');

            // 检测屏幕方向并显示/隐藏遮罩
            function checkOrientation() {
                // 仅在移动设备上显示横屏提示
                if (!isMobileDevice()) {
                    if (landscapeOverlay) {
                        landscapeOverlay.classList.remove('show');
                    }
                    return;
                }

                // 判断当前是否为竖屏状态
                const isPortrait = window.matchMedia("(orientation: portrait)").matches;
                
                if (landscapeOverlay) {
                    if (isPortrait) {
                        landscapeOverlay.classList.add('show');
                    } else {
                        landscapeOverlay.classList.remove('show');
                    }
                }
            }

            // 初始化检测
            checkOrientation();

            // 监听屏幕方向变化
            window.addEventListener('orientationchange', checkOrientation);

            // 监听窗口大小变化（处理resize情况）
            window.addEventListener('resize', checkOrientation);

            // 页面离开时的回退机制
            window.addEventListener('beforeunload', function() {
                // 恢复设备默认的屏幕方向设置
                // 在移动设备上，我们无法强制恢复，但可以清除任何设置
                if (landscapeOverlay) {
                    landscapeOverlay.classList.remove('show');
                }
            });

            // ========== 移动端触摸拖拽支持 ==========
            if (isMobileDevice()) {
                // 拖拽状态变量
                let isDraggingFromPanel = false;
                let draggedItemData = null;
                let dragPreview = null;
                
                // 为仪器栏项目添加触摸拖拽支持
                document.querySelectorAll('.item').forEach(item => {
                    item.addEventListener('touchstart', handleTouchStartFromPanel, { passive: true });
                });
                
                /**
                 * 触摸开始（从仪器栏拖拽）
                 */
                function handleTouchStartFromPanel(e) {
                    const touch = e.touches[0];
                    const item = e.currentTarget;

                    // 仪器分析区固定设备不允许拖入操作台
                    if (item.dataset.static === 'true') {
                        e.preventDefault();
                        showExperimentInfo('🔒 仪器分析区设备固定安装，禁止搬动，请到仪器前操作');
                        return;
                    }
                    
                    // 记录拖拽数据
                    isDraggingFromPanel = true;
                    draggedItemData = {
                        type: item.dataset.type,
                        reagent: item.dataset.reagent || '',
                        // 优先取名称元素，避免把规格徽标文字带进提示
                        name: (item.querySelector('.item-name') || {}).textContent || item.textContent.trim()
                    };
                    
                    // 创建拖拽预览元素
                    createDragPreview(touch.clientX, touch.clientY);
                    
                    // 添加触摸移动和结束事件监听
                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                    document.addEventListener('touchend', handleTouchEnd);
                }
                
                /**
                 * 创建拖拽预览元素
                 */
                function createDragPreview(x, y) {
                    // 移除已存在的预览
                    if (dragPreview) {
                        dragPreview.remove();
                    }
                    
                    // 创建预览元素
                    dragPreview = document.createElement('div');
                    dragPreview.className = 'drag-preview';
                    dragPreview.innerHTML = `
                        <div style="font-size: 24px; text-align: center;">📦</div>
                        <div style="font-size: 12px; text-align: center; color: #fff; margin-top: 4px;">${draggedItemData.name}</div>
                    `;
                    dragPreview.style.cssText = `
                        position: fixed;
                        top: ${y - 30}px;
                        left: ${x - 30}px;
                        width: 60px;
                        height: 60px;
                        background: rgba(30, 60, 114, 0.9);
                        border: 2px solid #64ffda;
                        border-radius: 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        pointer-events: none;
                        transform: scale(1);
                        box-shadow: 0 4px 20px rgba(100, 255, 218, 0.4);
                    `;
                    
                    document.body.appendChild(dragPreview);
                }
                
                /**
                 * 触摸移动
                 */
                function handleTouchMove(e) {
                    e.preventDefault();
                    
                    if (!isDraggingFromPanel || !dragPreview) return;
                    
                    const touch = e.touches[0];
                    
                    // 更新预览位置
                    dragPreview.style.top = `${touch.clientY - 30}px`;
                    dragPreview.style.left = `${touch.clientX - 30}px`;
                    
                    // 检查是否在操作区域上方
                    const dropZone = document.getElementById('dropZone');
                    const dropRect = dropZone.getBoundingClientRect();
                    
                    if (isPointInRect(touch.clientX, touch.clientY, dropRect)) {
                        dropZone.classList.add('drag-over');
                    } else {
                        dropZone.classList.remove('drag-over');
                    }
                }
                
                /**
                 * 触摸结束
                 */
                function handleTouchEnd(e) {
                    const touch = e.changedTouches[0];
                    
                    // 检查是否在操作区域内释放
                    const dropZone = document.getElementById('dropZone');
                    const dropRect = dropZone.getBoundingClientRect();
                    
                    if (isDraggingFromPanel && draggedItemData && isPointInRect(touch.clientX, touch.clientY, dropRect)) {
                        // 在操作区域内释放，创建器材
                        const x = touch.clientX - dropRect.left - 40;
                        const y = touch.clientY - dropRect.top - 40;
                        
                        createEquipment(draggedItemData.type, draggedItemData.reagent, Math.max(0, x), Math.max(0, y));
                        showExperimentInfo(`✅ ${draggedItemData.name} 已添加到实验台`);
                    }
                    
                    // 清理
                    cleanupDrag();
                }
                
                /**
                 * 清理拖拽状态
                 */
                function cleanupDrag() {
                    isDraggingFromPanel = false;
                    draggedItemData = null;
                    
                    if (dragPreview) {
                        dragPreview.remove();
                        dragPreview = null;
                    }
                    
                    document.getElementById('dropZone').classList.remove('drag-over');
                    
                    // 移除事件监听
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                }
                
                /**
                 * 检查点是否在矩形内
                 */
                function isPointInRect(x, y, rect) {
                    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
                }
            }
        };

        // 初始化安全提示功能：试剂危险性标识 + 首次进入的安全须知
        initSafetyBadges();
        setupSafetyModal();

        // 初始化实验室配置体系：规格徽标 + 规范面板 + 配置清单面板
        injectSpecBadges();
        initRulesPanel();
        setupLabModals();

        // 全量校验所有器材是否都具备实物绘制
        verifyEquipmentRendering();