// 卡牌类型定义
const CardTypes = {
    ATOM: 'atom',
    ION: 'ion',
    CONDITION: 'condition',
    FUNCTION: 'function'
};

// 物质类型定义
const SubstanceTypes = {
    ACID: 'acid',
    BASE: 'base',
    PRECIPITATE: 'precipitate',
    METAL: 'metal',
    OXIDE: 'oxide',
    GAS: 'gas',
    SALT: 'salt',
    ORGANIC: 'organic'
};

// 难度等级定义
const DifficultyLevels = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    HELL: 'hell'
};

// 原子牌定义 - 按难度分级
const atomCards = [
    // 简单难度可用
    { id: 'H', name: '氢', symbol: 'H', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'O', name: '氧', symbol: 'O', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Na', name: '钠', symbol: 'Na', type: CardTypes.ATOM, category: 'metal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Cl', name: '氯', symbol: 'Cl', type: CardTypes.ATOM, category: 'halogen', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'C', name: '碳', symbol: 'C', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Ca', name: '钙', symbol: 'Ca', type: CardTypes.ATOM, category: 'metal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Fe', name: '铁', symbol: 'Fe', type: CardTypes.ATOM, category: 'metal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Zn', name: '锌', symbol: 'Zn', type: CardTypes.ATOM, category: 'metal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'Mg', name: '镁', symbol: 'Mg', type: CardTypes.ATOM, category: 'metal', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    
    // 中等难度新增
    { id: 'Cu', name: '铜', symbol: 'Cu', type: CardTypes.ATOM, category: 'metal', difficulties: ['medium', 'hard', 'hell'] },
    { id: 'S', name: '硫', symbol: 'S', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['medium', 'hard', 'hell'] },
    { id: 'N', name: '氮', symbol: 'N', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['medium', 'hard', 'hell'] },
    { id: 'P', name: '磷', symbol: 'P', type: CardTypes.ATOM, category: 'nonmetal', difficulties: ['medium', 'hard', 'hell'] },
    { id: 'K', name: '钾', symbol: 'K', type: CardTypes.ATOM, category: 'metal', difficulties: ['medium', 'hard', 'hell'] },
    
    // 困难难度新增
    { id: 'Al', name: '铝', symbol: 'Al', type: CardTypes.ATOM, category: 'metal', difficulties: ['hard', 'hell'] },
    { id: 'Ag', name: '银', symbol: 'Ag', type: CardTypes.ATOM, category: 'metal', difficulties: ['hard', 'hell'] },
    { id: 'Ba', name: '钡', symbol: 'Ba', type: CardTypes.ATOM, category: 'metal', difficulties: ['hard', 'hell'] },
    { id: 'Si', name: '硅', symbol: 'Si', type: CardTypes.ATOM, category: 'metalloid', difficulties: ['hard', 'hell'] }
];

// 离子/原子团牌定义 - 按难度分级
const ionCards = [
    // 简单难度可用
    { id: 'NO3-', name: '硝酸根', symbol: 'NO₃⁻', type: CardTypes.ION, charge: -1, difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'OH-', name: '氢氧根', symbol: 'OH⁻', type: CardTypes.ION, charge: -1, difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'CO3-2', name: '碳酸根', symbol: 'CO₃²⁻', type: CardTypes.ION, charge: -2, difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'SO4-2', name: '硫酸根', symbol: 'SO₄²⁻', type: CardTypes.ION, charge: -2, difficulties: ['easy', 'medium', 'hard', 'hell'] },
    
    // 中等难度新增
    { id: 'NH4+', name: '铵根', symbol: 'NH₄⁺', type: CardTypes.ION, charge: +1, difficulties: ['medium', 'hard', 'hell'] },
    { id: 'HCO3-', name: '碳酸氢根', symbol: 'HCO₃⁻', type: CardTypes.ION, charge: -1, difficulties: ['medium', 'hard', 'hell'] },
    
    // 困难难度新增
    { id: 'PO4-3', name: '磷酸根', symbol: 'PO₄³⁻', type: CardTypes.ION, charge: -3, difficulties: ['hard', 'hell'] },
    { id: 'ClO3-', name: '氯酸根', symbol: 'ClO₃⁻', type: CardTypes.ION, charge: -1, difficulties: ['hard', 'hell'] },
    { id: 'MnO4-', name: '高锰酸根', symbol: 'MnO₄⁻', type: CardTypes.ION, charge: -1, difficulties: ['hard', 'hell'] },
    { id: 'SO3-2', name: '亚硫酸根', symbol: 'SO₃²⁻', type: CardTypes.ION, charge: -2, difficulties: ['hard', 'hell'] },
    { id: 'NO2-', name: '亚硝酸根', symbol: 'NO₂⁻', type: CardTypes.ION, charge: -1, difficulties: ['hard', 'hell'] },
    { id: 'CN-', name: '氰根', symbol: 'CN⁻', type: CardTypes.ION, charge: -1, difficulties: ['hard', 'hell'] }
];

// 条件牌定义
const conditionCards = [
    { id: 'heat', name: '升温', symbol: '🔥', type: CardTypes.CONDITION, effect: '加热', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'ignite', name: '点燃', symbol: '💥', type: CardTypes.CONDITION, effect: '燃烧', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'water', name: '水', symbol: '💧', type: CardTypes.CONDITION, effect: '水化', canCounter: true, difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'catalyst', name: '催化', symbol: '⚗️', type: CardTypes.CONDITION, effect: '催化反应', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'electric', name: '电解', symbol: '⚡', type: CardTypes.CONDITION, effect: '电解反应', difficulties: ['easy', 'medium', 'hard', 'hell'] }
];

// 功能牌定义
const functionCards = [
    { id: 'purchase', name: '采购', symbol: '🛒', type: CardTypes.FUNCTION, effect: '抽2张牌', difficulties: ['easy', 'medium', 'hard', 'hell'] },
    { id: 'filter', name: '过滤', symbol: '⚗️', type: CardTypes.FUNCTION, effect: '移除气体/固体', difficulties: ['medium', 'hard', 'hell'] },
    { id: 'counter', name: '反制', symbol: '🛡️', type: CardTypes.FUNCTION, effect: '抵消条件', difficulties: ['medium', 'hard', 'hell'] }
];

// 预定义物质库
const substances = {
    // 酸类 - 强酸（3点伤害）
    'HNO3': { 
        id: 'HNO3', name: '硝酸', formula: 'HNO₃', type: SubstanceTypes.ACID, 
        damage: 3, components: ['H', 'NO3-'], 
        description: '强酸，造成3点伤害' 
    },
    'H2SO4': { 
        id: 'H2SO4', name: '硫酸', formula: 'H₂SO₄', type: SubstanceTypes.ACID, 
        damage: 3, components: ['H', 'H', 'SO4-2'], 
        description: '强酸，造成3点伤害' 
    },
    'HClO3': { 
        id: 'HClO3', name: '氯酸', formula: 'HClO₃', type: SubstanceTypes.ACID, 
        damage: 3, components: ['H', 'ClO3-'], 
        description: '强酸，造成3点伤害' 
    },
    
    // 酸类 - 普通酸（2点伤害）
    'HCl': { 
        id: 'HCl', name: '盐酸', formula: 'HCl', type: SubstanceTypes.ACID, 
        damage: 2, components: ['H', 'Cl'], 
        description: '普通酸，造成2点伤害' 
    },
    'H3PO4': { 
        id: 'H3PO4', name: '磷酸', formula: 'H₃PO₄', type: SubstanceTypes.ACID, 
        damage: 2, components: ['H', 'H', 'H', 'PO4-3'], 
        description: '普通酸，造成2点伤害' 
    },
    'H2CO3': { 
        id: 'H2CO3', name: '碳酸', formula: 'H₂CO₃', type: SubstanceTypes.ACID, 
        damage: 2, components: ['H', 'H', 'CO3-2'], 
        description: '普通酸，造成2点伤害' 
    },
    'HNO2': { 
        id: 'HNO2', name: '亚硝酸', formula: 'HNO₂', type: SubstanceTypes.ACID, 
        damage: 2, components: ['H', 'NO2-'], 
        description: '普通酸，造成2点伤害' 
    },
    'H2SO3': { 
        id: 'H2SO3', name: '亚硫酸', formula: 'H₂SO₃', type: SubstanceTypes.ACID, 
        damage: 2, components: ['H', 'H', 'SO3-2'], 
        description: '普通酸，造成2点伤害' 
    },
    
    // 碱类 - 强碱（3点伤害）
    'NaOH': { 
        id: 'NaOH', name: '氢氧化钠', formula: 'NaOH', type: SubstanceTypes.BASE, 
        damage: 3, components: ['Na', 'OH-'], 
        description: '强碱，造成3点伤害' 
    },
    'KOH': { 
        id: 'KOH', name: '氢氧化钾', formula: 'KOH', type: SubstanceTypes.BASE, 
        damage: 3, components: ['K', 'OH-'], 
        description: '强碱，造成3点伤害' 
    },
    
    // 碱类 - 普通碱（2点伤害）
    'Ca(OH)2': { 
        id: 'Ca(OH)2', name: '氢氧化钙', formula: 'Ca(OH)₂', type: SubstanceTypes.BASE, 
        damage: 2, components: ['Ca', 'OH-', 'OH-'], 
        description: '普通碱，造成2点伤害' 
    },
    'NH3·H2O': { 
        id: 'NH3·H2O', name: '氨水', formula: 'NH₃·H₂O', type: SubstanceTypes.BASE, 
        damage: 2, components: ['NH4+', 'OH-'], 
        description: '普通碱，造成2点伤害' 
    },
    'Mg(OH)2': { 
        id: 'Mg(OH)2', name: '氢氧化镁', formula: 'Mg(OH)₂', type: SubstanceTypes.BASE, 
        damage: 2, components: ['Mg', 'OH-', 'OH-'], 
        description: '普通碱，造成2点伤害' 
    },
    'Al(OH)3': { 
        id: 'Al(OH)3', name: '氢氧化铝', formula: 'Al(OH)₃', type: SubstanceTypes.BASE, 
        damage: 2, components: ['Al', 'OH-', 'OH-', 'OH-'], 
        description: '普通碱，造成2点伤害' 
    },
    
    // 化合物沉淀（2点伤害）
    'CaCO3': { 
        id: 'CaCO3', name: '碳酸钙', formula: 'CaCO₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Ca', 'CO3-2'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'BaSO4': { 
        id: 'BaSO4', name: '硫酸钡', formula: 'BaSO₄', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Ba', 'SO4-2'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'AgCl': { 
        id: 'AgCl', name: '氯化银', formula: 'AgCl', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Ag', 'Cl'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'CuCO3': { 
        id: 'CuCO3', name: '碳酸铜', formula: 'CuCO₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Cu', 'CO3-2'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'FeCO3': { 
        id: 'FeCO3', name: '碳酸亚铁', formula: 'FeCO₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Fe', 'CO3-2'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'ZnCO3': { 
        id: 'ZnCO3', name: '碳酸锌', formula: 'ZnCO₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Zn', 'CO3-2'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    'Cu(OH)2': { 
        id: 'Cu(OH)2', name: '氢氧化铜', formula: 'Cu(OH)₂', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Cu', 'OH-', 'OH-'], 
        description: '化合物沉淀，造成2点伤害' 
    },
    
    // 毒气（2点伤害）
    'HCl_gas': { 
        id: 'HCl_gas', name: '氯化氢', formula: 'HCl', type: SubstanceTypes.GAS, 
        damage: 2, components: ['H', 'Cl'], 
        description: '毒气，造成2点伤害' 
    },
    'Cl2': { 
        id: 'Cl2', name: '氯气', formula: 'Cl₂', type: SubstanceTypes.GAS, 
        damage: 2, components: ['Cl', 'Cl'], 
        description: '毒气，造成2点伤害' 
    },
    'CO': { 
        id: 'CO', name: '一氧化碳', formula: 'CO', type: SubstanceTypes.GAS, 
        damage: 2, components: ['C', 'O'], 
        description: '毒气，造成2点伤害' 
    },
    'HCN': { 
        id: 'HCN', name: '氢氰酸', formula: 'HCN', type: SubstanceTypes.GAS, 
        damage: 2, components: ['H', 'CN-'], 
        description: '毒气，造成2点伤害' 
    },
    
    // 双水解物（2点伤害）
    'CuCO3': { 
        id: 'CuCO3', name: '碳酸铜', formula: 'CuCO₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Cu', 'CO3-2'], 
        description: '双水解物，造成2点伤害' 
    },
    'AlN': { 
        id: 'AlN', name: '氮化铝', formula: 'AlN', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Al', 'N'], 
        description: '双水解物，造成2点伤害' 
    },
    'Al2S3': { 
        id: 'Al2S3', name: '硫化铝', formula: 'Al₂S₃', type: SubstanceTypes.PRECIPITATE, 
        damage: 2, components: ['Al', 'Al', 'S', 'S', 'S'], 
        description: '双水解物，造成2点伤害' 
    },
    
    // 金属单质（无伤害）
    'Cu': { 
        id: 'Cu', name: '铜', formula: 'Cu', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Cu'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Fe': { 
        id: 'Fe', name: '铁', formula: 'Fe', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Fe'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Zn': { 
        id: 'Zn', name: '锌', formula: 'Zn', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Zn'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Ag': { 
        id: 'Ag', name: '银', formula: 'Ag', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Ag'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Al': { 
        id: 'Al', name: '铝', formula: 'Al', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Al'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Mg': { 
        id: 'Mg', name: '镁', formula: 'Mg', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Mg'], 
        description: '金属单质，可与阴离子结合' 
    },
    'Na': { 
        id: 'Na', name: '钠', formula: 'Na', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Na'], 
        description: '金属单质' 
    },
    'Ca': { 
        id: 'Ca', name: '钙', formula: 'Ca', type: SubstanceTypes.METAL, 
        damage: 0, components: ['Ca'], 
        description: '金属单质' 
    },
    'K': { 
        id: 'K', name: '钾', formula: 'K', type: SubstanceTypes.METAL, 
        damage: 0, components: ['K'], 
        description: '金属单质' 
    },
    
    // 氧化物（无伤害）
    'H2O': { 
        id: 'H2O', name: '水', formula: 'H₂O', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['H', 'H', 'O'], 
        description: '水，回复1点生命后移除' 
    },
    'SiO2': { 
        id: 'SiO2', name: '二氧化硅', formula: 'SiO₂', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Si', 'O', 'O'], 
        description: '沙子的主要成分，可以扑灭燃烧反应' 
    },
    'CaO': { 
        id: 'CaO', name: '氧化钙', formula: 'CaO', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Ca', 'O'], 
        description: '氧化物' 
    },
    'CuO': { 
        id: 'CuO', name: '氧化铜', formula: 'CuO', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Cu', 'O'], 
        description: '氧化物' 
    },
    'Fe2O3': { 
        id: 'Fe2O3', name: '氧化铁', formula: 'Fe₂O₃', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Fe', 'Fe', 'O', 'O', 'O'], 
        description: '氧化物' 
    },
    'ZnO': { 
        id: 'ZnO', name: '氧化锌', formula: 'ZnO', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Zn', 'O'], 
        description: '氧化物' 
    },
    'Al2O3': { 
        id: 'Al2O3', name: '氧化铝', formula: 'Al₂O₃', type: SubstanceTypes.OXIDE, 
        damage: 0, components: ['Al', 'Al', 'O', 'O', 'O'], 
        description: '氧化物' 
    },
    
    // 气体（无伤害）
    'CO2': { 
        id: 'CO2', name: '二氧化碳', formula: 'CO₂', type: SubstanceTypes.GAS, 
        damage: 0, components: ['C', 'O', 'O'], 
        description: '气体' 
    },
    'O2': { 
        id: 'O2', name: '氧气', formula: 'O₂', type: SubstanceTypes.GAS, 
        damage: 0, components: ['O', 'O'], 
        description: '氧气，回复1点生命后移除' 
    },
    'H2': { 
        id: 'H2', name: '氢气', formula: 'H₂', type: SubstanceTypes.GAS, 
        damage: 0, components: ['H', 'H'], 
        description: '氢气，可燃气体' 
    },
    'N2': { 
        id: 'N2', name: '氮气', formula: 'N₂', type: SubstanceTypes.GAS, 
        damage: 0, components: ['N', 'N'], 
        description: '气体' 
    },
    'SO2': { 
        id: 'SO2', name: '二氧化硫', formula: 'SO₂', type: SubstanceTypes.GAS, 
        damage: 0, components: ['S', 'O', 'O'], 
        description: '气体' 
    },
    'NH3': { 
        id: 'NH3', name: '氨气', formula: 'NH₃', type: SubstanceTypes.GAS, 
        damage: 0, components: ['N', 'H', 'H', 'H'], 
        description: '气体' 
    },
    
    // 盐类（无伤害）
    'NaCl': { 
        id: 'NaCl', name: '氯化钠', formula: 'NaCl', type: SubstanceTypes.SALT, 
        damage: 0, components: ['Na', 'Cl'], 
        description: '盐' 
    },
    'Na2CO3': { 
        id: 'Na2CO3', name: '碳酸钠', formula: 'Na₂CO₃', type: SubstanceTypes.SALT, 
        damage: 0, components: ['Na', 'Na', 'CO3-2'], 
        description: '盐' 
    },
    'NaHCO3': { 
        id: 'NaHCO3', name: '碳酸氢钠', formula: 'NaHCO₃', type: SubstanceTypes.SALT, 
        damage: 0, components: ['Na', 'HCO3-'], 
        description: '盐' 
    },
    'CaCl2': { 
        id: 'CaCl2', name: '氯化钙', formula: 'CaCl₂', type: SubstanceTypes.SALT, 
        damage: 0, components: ['Ca', 'Cl', 'Cl'], 
        description: '盐' 
    },
    'K2CO3': { 
        id: 'K2CO3', name: '碳酸钾', formula: 'K₂CO₃', type: SubstanceTypes.SALT, 
        damage: 0, components: ['K', 'K', 'CO3-2'], 
        description: '盐' 
    },
    'NH4Cl': { 
        id: 'NH4Cl', name: '氯化铵', formula: 'NH₄Cl', type: SubstanceTypes.SALT, 
        damage: 0, components: ['NH4+', 'Cl'], 
        description: '盐' 
    },
    'FeSO4': { 
        id: 'FeSO4', name: '硫酸亚铁', formula: 'FeSO₄', type: SubstanceTypes.SALT, 
        damage: 0, components: ['Fe', 'SO4-2'], 
        description: '盐' 
    }
};

// 全局变量存储当前难度
let currentDifficulty = 'easy';

// 设置当前难度
function setCurrentDifficulty(difficulty) {
    currentDifficulty = difficulty;
}

// 检查卡牌是否适用于当前难度（所有难度使用相同卡牌库）
function isCardAvailableForDifficulty(card) {
    return true; // 取消难度限制，所有卡牌对所有难度可用
}

// 生成初始牌堆
function generateDeck() {
    const deck = [];
    
    // 添加原子牌（根据难度过滤）
    atomCards.forEach(card => {
        if (isCardAvailableForDifficulty(card)) {
            const count = card.category === 'metal' ? 4 : 3;
            for (let i = 0; i < count; i++) {
                deck.push({ ...card, uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
            }
        }
    });
    
    // 添加离子牌（根据难度过滤）
    ionCards.forEach(card => {
        if (isCardAvailableForDifficulty(card)) {
            for (let i = 0; i < 3; i++) {
                deck.push({ ...card, uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
            }
        }
    });
    
    // 添加条件牌（根据难度过滤）
    conditionCards.forEach(card => {
        if (isCardAvailableForDifficulty(card)) {
            const count = card.id === 'water' ? 4 : 2;
            for (let i = 0; i < count; i++) {
                deck.push({ ...card, uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
            }
        }
    });
    
    // 添加功能牌（根据难度过滤）
    functionCards.forEach(card => {
        if (isCardAvailableForDifficulty(card)) {
            for (let i = 0; i < 2; i++) {
                deck.push({ ...card, uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
            }
        }
    });
    
    console.log(`[牌堆生成] 难度: ${currentDifficulty}, 牌堆大小: ${deck.length}`);
    
    return shuffleArray(deck);
}

// 洗牌函数
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 检查手牌组合能否构成物质
function findSubstanceByComponents(selectedCards) {
    const selectedIds = selectedCards.map(c => c.id).sort();
    
    for (const [key, substance] of Object.entries(substances)) {
        const componentIds = [...substance.components].sort();
        
        if (arraysEqual(selectedIds, componentIds)) {
            return substance;
        }
    }
    
    return null;
}

// 数组比较
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
}

// 获取伤害物类型
function isDamageSubstance(substance) {
    return [SubstanceTypes.ACID, SubstanceTypes.BASE, SubstanceTypes.PRECIPITATE, SubstanceTypes.GAS].includes(substance.type) && substance.damage > 0;
}

// 物质伤害性评估机制
const SubstanceAssessment = {
    // 评估标准
    criteria: {
        acidity: {
            strong: 2,  // 强酸
            weak: 1     // 弱酸
        },
        basicity: {
            strong: 2,  // 强碱
            weak: 1     // 弱碱
        },
        toxicity: 1,     // 有毒气体
        precipitation: 1, // 化合物沉淀
        doubleHydrolysis: 1 // 双水解物
    },
    
    // 评估物质伤害性
    assessSubstance: function(substance) {
        // 检查是否已分类
        if (substances[substance.id]) {
            return {
                id: substance.id,
                name: substance.name,
                formula: substance.formula,
                alreadyClassified: true,
                damage: substances[substance.id].damage,
                type: substances[substance.id].type
            };
        }
        
        // 评估新物质
        let damage = 0;
        let type = 'unknown';
        
        // 检查酸类
        if (substance.formula.startsWith('H') && !substance.formula.includes('OH')) {
            type = SubstanceTypes.ACID;
            // 强酸判断
            const strongAcids = ['HNO3', 'H2SO4', 'HClO3', 'HCl', 'HBr', 'HI'];
            if (strongAcids.includes(substance.id)) {
                damage = this.criteria.acidity.strong;
            } else {
                damage = this.criteria.acidity.weak;
            }
        }
        
        // 检查碱类
        else if (substance.formula.includes('OH')) {
            type = SubstanceTypes.BASE;
            // 强碱判断
            const strongBases = ['NaOH', 'KOH', 'Ca(OH)2', 'Ba(OH)2'];
            if (strongBases.includes(substance.id)) {
                damage = this.criteria.basicity.strong;
            } else {
                damage = this.criteria.basicity.weak;
            }
        }
        
        // 检查气体
        else if (substance.type === SubstanceTypes.GAS) {
            type = SubstanceTypes.GAS;
            // 有毒气体判断
            const toxicGases = ['Cl2', 'CO', 'HCN', 'HCl_gas', 'SO2'];
            if (toxicGases.includes(substance.id)) {
                damage = this.criteria.toxicity;
            }
        }
        
        // 检查沉淀
        else if (substance.type === SubstanceTypes.PRECIPITATE) {
            type = SubstanceTypes.PRECIPITATE;
            damage = this.criteria.precipitation;
        }
        
        // 检查双水解物
        const doubleHydrolysisSubstances = ['CuCO3', 'AlN', 'Al2S3', 'Mg3N2'];
        if (doubleHydrolysisSubstances.includes(substance.id)) {
            type = SubstanceTypes.PRECIPITATE;
            damage = this.criteria.doubleHydrolysis;
        }
        
        return {
            id: substance.id,
            name: substance.name,
            formula: substance.formula,
            alreadyClassified: false,
            damage: damage,
            type: type,
            assessmentDate: new Date().toISOString()
        };
    },
    
    // 添加新物质到分类体系
    addNewSubstance: function(substanceData) {
        if (!substanceData.id || !substanceData.components) {
            console.error('无效的物质数据');
            return false;
        }
        
        const assessment = this.assessSubstance(substanceData);
        
        if (assessment.damage > 0) {
            substances[substanceData.id] = {
                id: substanceData.id,
                name: substanceData.name,
                formula: substanceData.formula,
                type: assessment.type,
                damage: assessment.damage,
                components: substanceData.components,
                description: `${this.getSubstanceTypeLabel(assessment.type)}，造成${assessment.damage}点伤害`
            };
            
            console.log(`[物质评估] 新增物质: ${substanceData.name} (${substanceData.formula}) - 伤害值: ${assessment.damage}`);
            return true;
        }
        
        return false;
    },
    
    // 获取物质类型标签
    getSubstanceTypeLabel: function(type) {
        const labels = {
            'acid': '酸',
            'base': '碱',
            'precipitate': '化合物沉淀',
            'gas': '毒气',
            'unknown': '未知类型'
        };
        return labels[type] || type;
    },
    
    // 生成安全数据表
    generateSafetyData: function(substanceId) {
        const substance = substances[substanceId];
        if (!substance) {
            return null;
        }
        
        return {
            substance: substance.name,
            formula: substance.formula,
            damage: substance.damage,
            type: substance.type,
            components: substance.components,
            description: substance.description,
            safetyPrecautions: this.getSafetyPrecautions(substance),
            handlingGuide: this.getHandlingGuide(substance),
            warningLabels: this.getWarningLabels(substance),
            generatedAt: new Date().toISOString()
        };
    },
    
    // 获取安全注意事项
    getSafetyPrecautions: function(substance) {
        const precautions = {
            acid: [
                '避免接触皮肤和眼睛',
                '在通风良好的环境中使用',
                '如接触，立即用大量清水冲洗'
            ],
            base: [
                '避免接触皮肤和眼睛',
                '在通风良好的环境中使用',
                '如接触，立即用大量清水冲洗'
            ],
            precipitate: [
                '避免吸入粉尘',
                '使用防护手套',
                '妥善处理废弃物'
            ],
            gas: [
                '在通风良好的环境中使用',
                '避免吸入',
                '如吸入，立即转移到新鲜空气处'
            ]
        };
        
        return precautions[substance.type] || ['遵循一般安全操作规程'];
    },
    
    // 获取处理指南
    getHandlingGuide: function(substance) {
        const guides = {
            acid: '酸类物质应小心处理，避免与碱类物质混合，使用时应佩戴防护装备。',
            base: '碱类物质应小心处理，避免与酸类物质混合，使用时应佩戴防护装备。',
            precipitate: '沉淀类物质应避免吸入，使用后应妥善处理废弃物。',
            gas: '气体类物质应在通风良好的环境中使用，避免泄漏到空气中。'
        };
        
        return guides[substance.type] || '遵循一般处理指南。';
    },
    
    // 获取警示标识
    getWarningLabels: function(substance) {
        const labels = {
            acid: ['腐蚀性', '刺激性'],
            base: ['腐蚀性', '刺激性'],
            precipitate: ['有害'],
            gas: ['有毒', '有害']
        };
        
        return labels[substance.type] || [];
    }
};