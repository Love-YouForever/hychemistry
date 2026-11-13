// 反应规则库 - 按难度分级
const reactionRules = [
    // ========== 简单难度（方程式云图 - 基础反应）==========
    {
        id: 'h2_o2',
        name: '氢气燃烧',
        reactants: ['H2', 'O2'],
        condition: 'ignite',
        products: ['H2O', 'H2O'],
        equation: '2H₂ + O₂ →(点燃) 2H₂O',
        difficulty: 'simple',
        damage: 2,
        isExothermic: true,
        chainReaction: true,
        countdown: 8
    },
    {
        id: 'c_o2_co2',
        name: '碳完全燃烧',
        reactants: ['C', 'O2'],
        condition: 'ignite',
        products: ['CO2'],
        equation: 'C + O₂ →(点燃) CO₂',
        difficulty: 'simple',
        damage: 2,
        isExothermic: true,
        chainReaction: true,
        countdown: 8
    },
    {
        id: 'mg_o2',
        name: '镁燃烧',
        reactants: ['Mg', 'O2'],
        condition: 'ignite',
        products: ['MgO', 'MgO'],
        equation: '2Mg + O₂ →(点燃) 2MgO',
        difficulty: 'simple',
        damage: 3,
        isExothermic: true,
        chainReaction: true,
        countdown: 10
    },
    {
        id: 'hcl_naoh',
        name: '盐酸与氢氧化钠中和',
        reactants: ['HCl', 'NaOH'],
        condition: null,
        products: ['NaCl', 'H2O'],
        equation: 'HCl + NaOH → NaCl + H₂O',
        difficulty: 'simple'
    },
    {
        id: 'caco3_heat',
        name: '碳酸钙分解',
        reactants: ['CaCO3'],
        condition: 'heat',
        products: ['CaO', 'CO2'],
        equation: 'CaCO₃ →(高温) CaO + CO₂',
        difficulty: 'simple'
    },
    {
        id: 'h2o_electric',
        name: '水的电解',
        reactants: ['H2O', 'H2O'],
        condition: 'electric',
        products: ['H2', 'H2', 'O2'],
        equation: '2H₂O →(通电) 2H₂↑ + O₂↑',
        difficulty: 'simple'
    },
    {
        id: 'fe_hcl',
        name: '铁与盐酸',
        reactants: ['Fe', 'HCl', 'HCl'],
        condition: null,
        products: ['FeCl2', 'H2'],
        equation: 'Fe + 2HCl → FeCl₂ + H₂↑',
        difficulty: 'simple'
    },
    {
        id: 'zn_h2so4',
        name: '锌与硫酸',
        reactants: ['Zn', 'H2SO4'],
        condition: null,
        products: ['ZnSO4', 'H2'],
        equation: 'Zn + H₂SO₄ → ZnSO₄ + H₂↑',
        difficulty: 'simple'
    },
    {
        id: 'na2co3_hcl',
        name: '碳酸钠与盐酸',
        reactants: ['Na2CO3', 'HCl', 'HCl'],
        condition: null,
        products: ['NaCl', 'NaCl', 'H2O', 'CO2'],
        equation: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
        difficulty: 'simple'
    },
    {
        id: 'co2_ca(oh)2',
        name: '二氧化碳与石灰水',
        reactants: ['CO2', 'Ca(OH)2'],
        condition: null,
        products: ['CaCO3', 'H2O'],
        equation: 'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O',
        difficulty: 'simple'
    },

    // ========== 中等难度（初中化学核心反应）==========

    // 氧气性质
    {
        id: 's_o2',
        name: '硫燃烧',
        reactants: ['S', 'O2'],
        condition: 'ignite',
        products: ['SO2'],
        equation: 'S + O₂ →(点燃) SO₂',
        difficulty: 'middle'
    },
    {
        id: 'p_o2',
        name: '磷燃烧',
        reactants: ['P', 'P', 'P', 'P', 'O2', 'O2', 'O2', 'O2', 'O2'],
        condition: 'ignite',
        products: ['P2O5', 'P2O5'],
        equation: '4P + 5O₂ →(点燃) 2P₂O₅',
        difficulty: 'middle'
    },
    {
        id: 'fe_o2',
        name: '铁燃烧',
        reactants: ['Fe', 'Fe', 'Fe', 'O2', 'O2'],
        condition: 'ignite',
        products: ['Fe3O4'],
        equation: '3Fe + 2O₂ →(点燃) Fe₃O₄',
        difficulty: 'middle'
    },
    {
        id: 'cu_o2_heat',
        name: '铜加热',
        reactants: ['Cu', 'Cu', 'O2'],
        condition: 'heat',
        products: ['CuO', 'CuO'],
        equation: '2Cu + O₂ →(加热) 2CuO',
        difficulty: 'middle'
    },
    {
        id: 'c_o2_co',
        name: '碳不完全燃烧',
        reactants: ['C', 'C', 'O2'],
        condition: 'ignite',
        products: ['CO', 'CO'],
        equation: '2C + O₂ →(点燃) 2CO',
        difficulty: 'middle'
    },

    // 制取氧气
    {
        id: 'kmno4_heat',
        name: '高锰酸钾分解',
        reactants: ['KMnO4', 'KMnO4'],
        condition: 'heat',
        products: ['K2MnO4', 'MnO2', 'O2'],
        equation: '2KMnO₄ →(加热) K₂MnO₄ + MnO₂ + O₂↑',
        difficulty: 'middle'
    },
    {
        id: 'h2o2_mno2',
        name: '过氧化氢分解',
        reactants: ['H2O2', 'H2O2'],
        condition: 'catalyst',
        products: ['H2O', 'H2O', 'O2'],
        equation: '2H₂O₂ →(MnO₂) 2H₂O + O₂↑',
        difficulty: 'middle'
    },

    // 制取二氧化碳
    {
        id: 'caco3_hcl',
        name: '碳酸钙与盐酸',
        reactants: ['CaCO3', 'HCl', 'HCl'],
        condition: null,
        products: ['CaCl2', 'H2O', 'CO2'],
        equation: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',
        difficulty: 'middle'
    },

    // 置换反应
    {
        id: 'fe_cuso4',
        name: '铁与硫酸铜',
        reactants: ['Fe', 'CuSO4'],
        condition: null,
        products: ['FeSO4', 'Cu'],
        equation: 'Fe + CuSO₄ → FeSO₄ + Cu',
        difficulty: 'middle'
    },
    {
        id: 'cu_agno3',
        name: '铜与硝酸银',
        reactants: ['Cu', 'AgNO3', 'AgNO3'],
        condition: null,
        products: ['Cu(NO3)2', 'Ag', 'Ag'],
        equation: 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag',
        difficulty: 'middle'
    },

    // 酸碱盐反应
    {
        id: 'h2so4_naoh',
        name: '硫酸与氢氧化钠',
        reactants: ['H2SO4', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Na2SO4', 'H2O', 'H2O'],
        equation: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',
        difficulty: 'middle'
    },
    {
        id: 'hno3_koh',
        name: '硝酸与氢氧化钾',
        reactants: ['HNO3', 'KOH'],
        condition: null,
        products: ['KNO3', 'H2O'],
        equation: 'HNO₃ + KOH → KNO₃ + H₂O',
        difficulty: 'middle'
    },
    {
        id: 'agno3_nacl',
        name: '硝酸银与氯化钠',
        reactants: ['AgNO3', 'NaCl'],
        condition: null,
        products: ['AgCl', 'NaNO3'],
        equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
        difficulty: 'middle'
    },
    {
        id: 'na2so4_bacl2',
        name: '硫酸钠与氯化钡',
        reactants: ['Na2SO4', 'BaCl2'],
        condition: null,
        products: ['BaSO4', 'NaCl', 'NaCl'],
        equation: 'Na₂SO₄ + BaCl₂ → BaSO₄↓ + 2NaCl',
        difficulty: 'middle'
    },

    // 氧化物反应
    {
        id: 'cao_h2o',
        name: '氧化钙与水',
        reactants: ['CaO', 'H2O'],
        condition: null,
        products: ['Ca(OH)2'],
        equation: 'CaO + H₂O → Ca(OH)₂',
        difficulty: 'middle'
    },
    {
        id: 'co2_h2o',
        name: '二氧化碳与水',
        reactants: ['CO2', 'H2O'],
        condition: null,
        products: ['H2CO3'],
        equation: 'CO₂ + H₂O → H₂CO₃',
        difficulty: 'middle'
    },
    {
        id: 'cuo_h2so4',
        name: '氧化铜与硫酸',
        reactants: ['CuO', 'H2SO4'],
        condition: null,
        products: ['CuSO4', 'H2O'],
        equation: 'CuO + H₂SO₄ → CuSO₄ + H₂O',
        difficulty: 'middle'
    },

    // ========== 困难难度（高中化学核心反应）==========

    // 碱金属
    {
        id: 'na_h2o',
        name: '钠与水',
        reactants: ['Na', 'H2O'],
        condition: null,
        products: ['NaOH', 'H2'],
        equation: '2Na + 2H₂O → 2NaOH + H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'k_h2o',
        name: '钾与水',
        reactants: ['K', 'H2O'],
        condition: null,
        products: ['KOH', 'H2'],
        equation: '2K + 2H₂O → 2KOH + H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'na_o2_ignite',
        name: '钠燃烧',
        reactants: ['Na', 'Na', 'O2'],
        condition: 'ignite',
        products: ['Na2O2'],
        equation: '2Na + O₂ →(点燃) Na₂O₂',
        difficulty: 'hard'
    },
    {
        id: 'na_cl2',
        name: '钠与氯气',
        reactants: ['Na', 'Na', 'Cl2'],
        condition: 'ignite',
        products: ['NaCl', 'NaCl'],
        equation: '2Na + Cl₂ →(点燃) 2NaCl',
        difficulty: 'hard'
    },

    // 碱土金属
    {
        id: 'ca_h2o',
        name: '钙与水',
        reactants: ['Ca', 'H2O', 'H2O'],
        condition: null,
        products: ['Ca(OH)2', 'H2'],
        equation: 'Ca + 2H₂O → Ca(OH)₂ + H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'mg_h2o_steam',
        name: '镁与水蒸气',
        reactants: ['Mg', 'H2O'],
        condition: 'heat',
        products: ['MgO', 'H2'],
        equation: 'Mg + H₂O(g) →(加热) MgO + H₂↑',
        difficulty: 'hard'
    },

    // 铝及其化合物
    {
        id: 'al_o2',
        name: '铝燃烧',
        reactants: ['Al', 'Al', 'Al', 'Al', 'O2', 'O2', 'O2'],
        condition: 'ignite',
        products: ['Al2O3', 'Al2O3'],
        equation: '4Al + 3O₂ →(点燃) 2Al₂O₃',
        difficulty: 'hard'
    },
    {
        id: 'al_hcl',
        name: '铝与盐酸',
        reactants: ['Al', 'HCl', 'HCl', 'HCl'],
        condition: null,
        products: ['AlCl3', 'H2', 'H2', 'H2'],
        equation: '2Al + 6HCl → 2AlCl₃ + 3H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'al_naoh',
        name: '铝与氢氧化钠',
        reactants: ['Al', 'NaOH', 'H2O'],
        condition: null,
        products: ['NaAlO2', 'H2', 'H2'],
        equation: '2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'al2o3_naoh',
        name: '氧化铝与氢氧化钠',
        reactants: ['Al2O3', 'NaOH', 'NaOH'],
        condition: null,
        products: ['NaAlO2', 'NaAlO2', 'H2O'],
        equation: 'Al₂O₃ + 2NaOH → 2NaAlO₂ + H₂O',
        difficulty: 'hard'
    },

    // 铁及其化合物
    {
        id: 'fe_h2o_steam',
        name: '铁与水蒸气',
        reactants: ['Fe', 'Fe', 'Fe', 'H2O', 'H2O', 'H2O'],
        condition: 'heat',
        products: ['Fe3O4', 'H2', 'H2', 'H2'],
        equation: '3Fe + 4H₂O(g) →(加热) Fe₃O₄ + 4H₂↑',
        difficulty: 'hard'
    },
    {
        id: 'fe2o3_co',
        name: '氧化铁还原',
        reactants: ['Fe2O3', 'CO', 'CO', 'CO'],
        condition: 'heat',
        products: ['Fe', 'Fe', 'CO2', 'CO2', 'CO2'],
        equation: 'Fe₂O₃ + 3CO →(高温) 2Fe + 3CO₂',
        difficulty: 'hard'
    },
    {
        id: 'fe_cl2',
        name: '铁与氯气',
        reactants: ['Fe', 'Cl2', 'Cl2', 'Cl2'],
        condition: 'ignite',
        products: ['FeCl3', 'FeCl3'],
        equation: '2Fe + 3Cl₂ →(点燃) 2FeCl₃',
        difficulty: 'hard'
    },

    // 氯及其化合物
    {
        id: 'cl2_h2o',
        name: '氯气与水',
        reactants: ['Cl2', 'H2O'],
        condition: null,
        products: ['HCl', 'HClO'],
        equation: 'Cl₂ + H₂O → HCl + HClO',
        difficulty: 'hard'
    },
    {
        id: 'cl2_naoh',
        name: '氯气与氢氧化钠',
        reactants: ['Cl2', 'NaOH', 'NaOH'],
        condition: null,
        products: ['NaCl', 'NaClO', 'H2O'],
        equation: 'Cl₂ + 2NaOH → NaCl + NaClO + H₂O',
        difficulty: 'hard'
    },
    {
        id: 'cl2_ca(oh)2',
        name: '氯气与氢氧化钙',
        reactants: ['Cl2', 'Cl2', 'Ca(OH)2', 'Ca(OH)2'],
        condition: null,
        products: ['CaCl2', 'Ca(ClO)2', 'H2O', 'H2O'],
        equation: '2Cl₂ + 2Ca(OH)₂ → CaCl₂ + Ca(ClO)₂ + 2H₂O',
        difficulty: 'hard'
    },

    // 硫及其化合物
    {
        id: 'so2_o2',
        name: '二氧化硫氧化',
        reactants: ['SO2', 'SO2', 'O2'],
        condition: 'catalyst',
        products: ['SO3', 'SO3'],
        equation: '2SO₂ + O₂ →(催化剂) 2SO₃',
        difficulty: 'hard'
    },
    {
        id: 'so2_naoh',
        name: '二氧化硫与氢氧化钠',
        reactants: ['SO2', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Na2SO3', 'H2O'],
        equation: 'SO₂ + 2NaOH → Na₂SO₃ + H₂O',
        difficulty: 'hard'
    },
    {
        id: 'h2so4_cu',
        name: '浓硫酸与铜',
        reactants: ['Cu', 'H2SO4', 'H2SO4'],
        condition: 'heat',
        products: ['CuSO4', 'SO2', 'H2O', 'H2O'],
        equation: 'Cu + 2H₂SO₄(浓) →(加热) CuSO₄ + SO₂↑ + 2H₂O',
        difficulty: 'hard'
    },

    // 氮及其化合物
    {
        id: 'n2_h2',
        name: '合成氨',
        reactants: ['N2', 'H2', 'H2', 'H2'],
        condition: 'catalyst',
        products: ['NH3', 'NH3'],
        equation: 'N₂ + 3H₂ →(催化剂) 2NH₃',
        difficulty: 'hard'
    },
    {
        id: 'nh3_hcl',
        name: '氨气与氯化氢',
        reactants: ['NH3', 'HCl'],
        condition: null,
        products: ['NH4Cl'],
        equation: 'NH₃ + HCl → NH₄Cl',
        difficulty: 'hard'
    },
    {
        id: 'nh3_o2',
        name: '氨的催化氧化',
        reactants: ['NH3', 'NH3', 'NH3', 'NH3', 'O2', 'O2', 'O2', 'O2', 'O2'],
        condition: 'catalyst',
        products: ['NO', 'NO', 'NO', 'NO', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'],
        equation: '4NH₃ + 5O₂ →(催化剂) 4NO + 6H₂O',
        difficulty: 'hard'
    },

    // 碳及其化合物
    {
        id: 'co_cuo',
        name: '一氧化碳还原氧化铜',
        reactants: ['CO', 'CuO'],
        condition: 'heat',
        products: ['Cu', 'CO2'],
        equation: 'CO + CuO →(加热) Cu + CO₂',
        difficulty: 'hard'
    },
    {
        id: 'c_cuo',
        name: '碳还原氧化铜',
        reactants: ['C', 'CuO', 'CuO'],
        condition: 'heat',
        products: ['Cu', 'Cu', 'CO2'],
        equation: 'C + 2CuO →(高温) 2Cu + CO₂↑',
        difficulty: 'hard'
    },
    {
        id: 'co2_naoh',
        name: '二氧化碳与氢氧化钠',
        reactants: ['CO2', 'NaOH'],
        condition: null,
        products: ['NaHCO3'],
        equation: 'CO₂ + NaOH → NaHCO₃',
        difficulty: 'hard'
    },

    // 其他高中反应
    {
        id: 'h2s_o2',
        name: '硫化氢燃烧',
        reactants: ['H2S', 'O2', 'O2'],
        condition: 'ignite',
        products: ['SO2', 'H2O', 'H2O'],
        equation: '2H₂S + 3O₂ →(点燃) 2SO₂ + 2H₂O',
        difficulty: 'hard'
    },
    {
        id: 'ch4_o2',
        name: '甲烷燃烧',
        reactants: ['CH4', 'O2', 'O2'],
        condition: 'ignite',
        products: ['CO2', 'H2O', 'H2O'],
        equation: 'CH₄ + 2O₂ →(点燃) CO₂ + 2H₂O',
        difficulty: 'hard'
    },
    {
        id: 'c2h5oh_o2',
        name: '乙醇燃烧',
        reactants: ['C2H5OH', 'O2', 'O2', 'O2'],
        condition: 'ignite',
        products: ['CO2', 'CO2', 'H2O', 'H2O', 'H2O'],
        equation: 'C₂H₅OH + 3O₂ →(点燃) 2CO₂ + 3H₂O',
        difficulty: 'hard'
    },

    // ========== 扩展反应：生成气体的反应 ==========

    // 一氧化碳燃烧
    {
        id: 'co_o2',
        name: '一氧化碳燃烧',
        reactants: ['CO', 'O2'],
        condition: 'ignite',
        products: ['CO2', 'CO2'],
        equation: '2CO + O₂ →(点燃) 2CO₂',
        difficulty: 'simple'
    },

    // 碳酸钙高温分解
    {
        id: 'caco3_heat_gas',
        name: '碳酸钙高温分解',
        reactants: ['CaCO3'],
        condition: 'heat',
        products: ['CaO', 'CO2'],
        equation: 'CaCO₃ →(高温) CaO + CO₂↑',
        difficulty: 'simple'
    },

    // 氯酸钾分解
    {
        id: 'kclo3_heat',
        name: '氯酸钾分解',
        reactants: ['KClO3', 'KClO3', 'KClO3'],
        condition: 'heat',
        products: ['KCl', 'KClO3', 'O2'],
        equation: '2KClO₃ →(加热) 2KCl + 3O₂↑',
        difficulty: 'middle'
    },

    // 过氧化氢催化分解
    {
        id: 'h2o2_mno2_gas',
        name: '过氧化氢催化分解',
        reactants: ['H2O2', 'H2O2'],
        condition: 'catalyst',
        products: ['H2O', 'H2O', 'O2'],
        equation: '2H₂O₂ →(MnO₂) 2H₂O + O₂↑',
        difficulty: 'middle'
    },

    // 氧化汞分解
    {
        id: 'hgo_heat',
        name: '氧化汞分解',
        reactants: ['HgO', 'HgO'],
        condition: 'heat',
        products: ['Hg', 'Hg', 'O2'],
        equation: '2HgO →(加热) 2Hg + O₂↑',
        difficulty: 'middle'
    },

    // 碳酸氢钠与盐酸
    {
        id: 'nahco3_hcl',
        name: '碳酸氢钠与盐酸',
        reactants: ['NaHCO3', 'HCl'],
        condition: null,
        products: ['NaCl', 'H2O', 'CO2'],
        equation: 'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑',
        difficulty: 'middle'
    },

    // 碳酸分解
    {
        id: 'h2co3_decompose',
        name: '碳酸分解',
        reactants: ['H2CO3'],
        condition: null,
        products: ['H2O', 'CO2'],
        equation: 'H₂CO₃ → H₂O + CO₂↑',
        difficulty: 'simple'
    },

    // 镁与盐酸
    {
        id: 'mg_hcl',
        name: '镁与盐酸',
        reactants: ['Mg', 'HCl', 'HCl'],
        condition: null,
        products: ['MgCl2', 'H2'],
        equation: 'Mg + 2HCl → MgCl₂ + H₂↑',
        difficulty: 'middle'
    },

    // 铝与稀硫酸
    {
        id: 'al_h2so4',
        name: '铝与稀硫酸',
        reactants: ['Al', 'H2SO4', 'H2SO4', 'H2SO4'],
        condition: null,
        products: ['Al2(SO4)3', 'H2', 'H2', 'H2'],
        equation: '2Al + 3H₂SO₄ → Al₂(SO₄)₃ + 3H₂↑',
        difficulty: 'middle'
    },

    // ========== 扩展反应：生成沉淀的反应 ==========

    // 硫酸与氯化钡
    {
        id: 'h2so4_bacl2',
        name: '硫酸与氯化钡',
        reactants: ['H2SO4', 'BaCl2'],
        condition: null,
        products: ['BaSO4', 'HCl', 'HCl'],
        equation: 'H₂SO₄ + BaCl₂ → BaSO₄↓ + 2HCl',
        difficulty: 'middle'
    },

    // 二氧化硫与石灰水
    {
        id: 'so2_caoh2',
        name: '二氧化硫与石灰水',
        reactants: ['SO2', 'Ca(OH)2'],
        condition: null,
        products: ['CaSO3', 'H2O'],
        equation: 'SO₂ + Ca(OH)₂ → CaSO₃↓ + H₂O',
        difficulty: 'middle'
    },

    // 碳酸钠与石灰水
    {
        id: 'na2co3_caoh2',
        name: '碳酸钠与氢氧化钙',
        reactants: ['Na2CO3', 'Ca(OH)2'],
        condition: null,
        products: ['CaCO3', 'NaOH', 'NaOH'],
        equation: 'Na₂CO₃ + Ca(OH)₂ → CaCO₃↓ + 2NaOH',
        difficulty: 'middle'
    },

    // 硫酸铜与氢氧化钠（蓝色沉淀）
    {
        id: 'cuso4_naoh',
        name: '硫酸铜与氢氧化钠',
        reactants: ['CuSO4', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Cu(OH)2', 'Na2SO4'],
        equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
        difficulty: 'middle'
    },

    // 氯化铁与氢氧化钠（红褐色沉淀）
    {
        id: 'fecl3_naoh',
        name: '氯化铁与氢氧化钠',
        reactants: ['FeCl3', 'NaOH', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Fe(OH)3', 'NaCl', 'NaCl', 'NaCl'],
        equation: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
        difficulty: 'middle'
    },

    // 氯化镁与氢氧化钠（白色沉淀）
    {
        id: 'mgcl2_naoh',
        name: '氯化镁与氢氧化钠',
        reactants: ['MgCl2', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Mg(OH)2', 'NaCl', 'NaCl'],
        equation: 'MgCl₂ + 2NaOH → Mg(OH)₂↓ + 2NaCl',
        difficulty: 'middle'
    },

    // 硫酸锌与氢氧化钠（白色沉淀）
    {
        id: 'znso4_naoh',
        name: '硫酸锌与氢氧化钠',
        reactants: ['ZnSO4', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Zn(OH)2', 'Na2SO4'],
        equation: 'ZnSO₄ + 2NaOH → Zn(OH)₂↓ + Na₂SO₄',
        difficulty: 'middle'
    },

    // 氯化钙与碳酸钠（白色沉淀）
    {
        id: 'cacl2_na2co3',
        name: '氯化钙与碳酸钠',
        reactants: ['CaCl2', 'Na2CO3', 'Na2CO3'],
        condition: null,
        products: ['CaCO3', 'NaCl', 'NaCl', 'NaCl'],
        equation: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',
        difficulty: 'middle'
    },

    // 硝酸铅与碘化钾（黄色沉淀）
    {
        id: 'pbno3_ki',
        name: '硝酸铅与碘化钾',
        reactants: ['Pb(NO3)2', 'KI', 'KI'],
        condition: null,
        products: ['PbI2', 'KNO3', 'KNO3'],
        equation: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃',
        difficulty: 'hard'
    },

    // ========== 扩展反应：生成酸性物质的反应 ==========

    // 二氧化硫溶于水生成亚硫酸
    {
        id: 'so2_h2o',
        name: '二氧化硫与水生成亚硫酸',
        reactants: ['SO2', 'H2O'],
        condition: null,
        products: ['H2SO3'],
        equation: 'SO₂ + H₂O → H₂SO₃',
        difficulty: 'middle'
    },

    // 五氧化二磷溶于水
    {
        id: 'p2o5_h2o',
        name: '五氧化二磷与水',
        reactants: ['P2O5', 'P2O5', 'H2O', 'H2O', 'H2O'],
        condition: null,
        products: ['H3PO4', 'H3PO4'],
        equation: 'P₂O₅ + 3H₂O → 2H₃PO₄',
        difficulty: 'middle'
    },

    // 氮气与氧气（雷雨固氮）
    {
        id: 'n2_o2_electric',
        name: '氮气与氧气化合',
        reactants: ['N2', 'N2', 'O2', 'O2'],
        condition: 'electric',
        products: ['NO', 'NO', 'NO', 'NO'],
        equation: 'N₂ + O₂ →(放电) 2NO',
        difficulty: 'hard'
    },

    // 一氧化氮与氧气
    {
        id: 'no_o2',
        name: '一氧化氮与氧气',
        reactants: ['NO', 'O2'],
        condition: null,
        products: ['NO2', 'NO2'],
        equation: '2NO + O₂ → 2NO₂',
        difficulty: 'hard'
    },

    // 二氧化氮溶于水
    {
        id: 'no2_h2o',
        name: '二氧化氮与水',
        reactants: ['NO2', 'NO2', 'NO2', 'H2O'],
        condition: null,
        products: ['HNO3', 'HNO3', 'NO'],
        equation: '3NO₂ + H₂O → 2HNO₃ + NO',
        difficulty: 'hard'
    },

    // 氯化氢溶于水
    {
        id: 'hcl_h2o',
        name: '氯化氢溶于水',
        reactants: ['HCl', 'H2O'],
        condition: null,
        products: ['HCl_solution'],
        equation: 'HCl + H₂O → HCl(aq)',
        difficulty: 'middle'
    },

    // ========== 扩展反应：生成碱性物质的反应 ==========

    // 氧化钠与水
    {
        id: 'na2o_h2o',
        name: '氧化钠与水',
        reactants: ['Na2O', 'H2O'],
        condition: null,
        products: ['NaOH', 'NaOH'],
        equation: 'Na₂O + H₂O → 2NaOH',
        difficulty: 'hard'
    },

    // 氧化钾与水
    {
        id: 'k2o_h2o',
        name: '氧化钾与水',
        reactants: ['K2O', 'H2O'],
        condition: null,
        products: ['KOH', 'KOH'],
        equation: 'K₂O + H₂O → 2KOH',
        difficulty: 'hard'
    },

    // 氧化钡与水
    {
        id: 'bao_h2o',
        name: '氧化钡与水',
        reactants: ['BaO', 'H2O'],
        condition: null,
        products: ['Ba(OH)2'],
        equation: 'BaO + H₂O → Ba(OH)₂',
        difficulty: 'hard'
    },

    // 过氧化钠与水
    {
        id: 'na2o2_h2o',
        name: '过氧化钠与水',
        reactants: ['Na2O2', 'H2O'],
        condition: null,
        products: ['NaOH', 'NaOH', 'H2O2'],
        equation: 'Na₂O₂ + 2H₂O → 2NaOH + H₂O₂',
        difficulty: 'hard'
    },

    // 氧化镁与水
    {
        id: 'mgo_h2o',
        name: '氧化镁与水',
        reactants: ['MgO', 'H2O'],
        condition: null,
        products: ['Mg(OH)2'],
        equation: 'MgO + H₂O → Mg(OH)₂',
        difficulty: 'middle'
    },

    // 氧化锌与氢氧化钠
    {
        id: 'zno_naoh',
        name: '氧化锌与氢氧化钠',
        reactants: ['ZnO', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Na2ZnO2', 'H2O'],
        equation: 'ZnO + 2NaOH → Na₂ZnO₂ + H₂O',
        difficulty: 'hard'
    },

    // 碳酸钠水解
    {
        id: 'na2co3_h2o',
        name: '碳酸钠水解',
        reactants: ['Na2CO3', 'H2O', 'H2O'],
        condition: null,
        products: ['NaHCO3', 'NaOH'],
        equation: 'Na₂CO₃ + H₂O → NaHCO₃ + NaOH',
        difficulty: 'middle'
    },

    // 碳酸氢钠水解
    {
        id: 'nahco3_h2o',
        name: '碳酸氢钠水解',
        reactants: ['NaHCO3', 'H2O'],
        condition: null,
        products: ['H2CO3', 'NaOH'],
        equation: 'NaHCO₃ + H₂O → H₂CO₃ + NaOH',
        difficulty: 'middle'
    },

    // 磷酸钠水解
    {
        id: 'na3po4_h2o',
        name: '磷酸钠水解',
        reactants: ['Na3PO4', 'H2O', 'H2O'],
        condition: null,
        products: ['Na2HPO4', 'NaOH'],
        equation: 'Na₃PO₄ + H₂O → Na₂HPO₄ + NaOH',
        difficulty: 'hard'
    },

    // 硅酸钠水解
    {
        id: 'na2sio3_h2o',
        name: '硅酸钠水解',
        reactants: ['Na2SiO3', 'H2O'],
        condition: null,
        products: ['H2SiO3', 'NaOH', 'NaOH'],
        equation: 'Na₂SiO₃ + H₂O → H₂SiO₃ + 2NaOH',
        difficulty: 'hard'
    },

    // ========== 其他常见反应 ==========

    // 氨气溶于水
    {
        id: 'nh3_h2o',
        name: '氨气溶于水',
        reactants: ['NH3', 'H2O'],
        condition: null,
        products: ['NH3_solution'],
        equation: 'NH₃ + H₂O → NH₃·H₂O',
        difficulty: 'middle'
    },

    // 氨水与盐酸
    {
        id: 'nh3_hcl_solution',
        name: '氨水与盐酸',
        reactants: ['NH3_solution', 'HCl'],
        condition: null,
        products: ['NH4Cl', 'H2O'],
        equation: 'NH₃·H₂O + HCl → NH₄Cl + H₂O',
        difficulty: 'middle'
    },

    // 氢氧化钙与碳酸钠（工业制氢氧化钠）
    {
        id: 'caoh2_na2co3_nah',
        name: '氢氧化钙与碳酸钠制氢氧化钠',
        reactants: ['Ca(OH)2', 'Na2CO3'],
        condition: null,
        products: ['CaCO3', 'NaOH', 'NaOH'],
        equation: 'Ca(OH)₂ + Na₂CO₃ → CaCO₃↓ + 2NaOH',
        difficulty: 'middle'
    },

    // 氢氧化钡与硫酸铵
    {
        id: 'baoh2_nh42so4',
        name: '氢氧化钡与硫酸铵',
        reactants: ['Ba(OH)2', '(NH4)2SO4'],
        condition: null,
        products: ['BaSO4', 'NH3', 'NH3', 'H2O', 'H2O'],
        equation: 'Ba(OH)₂ + (NH₄)₂SO₄ → BaSO₄↓ + 2NH₃↑ + 2H₂O',
        difficulty: 'hard'
    },

    // 硫酸铵与氢氧化钠
    {
        id: 'nh42so4_naoh',
        name: '硫酸铵与氢氧化钠',
        reactants: ['(NH4)2SO4', 'NaOH', 'NaOH'],
        condition: null,
        products: ['Na2SO4', 'NH3', 'NH3', 'H2O', 'H2O'],
        equation: '(NH₄)₂SO₄ + 2NaOH → Na₂SO₄ + 2NH₃↑ + 2H₂O',
        difficulty: 'hard'
    },

    // 氯化铵与氢氧化钠
    {
        id: 'nh4cl_naoh',
        name: '氯化铵与氢氧化钠',
        reactants: ['NH4Cl', 'NaOH'],
        condition: null,
        products: ['NaCl', 'NH3', 'H2O'],
        equation: 'NH₄Cl + NaOH → NaCl + NH₃↑ + H₂O',
        difficulty: 'hard'
    },

    // 硝酸铵与氢氧化钠
    {
        id: 'nh4no3_naoh',
        name: '硝酸铵与氢氧化钠',
        reactants: ['NH4NO3', 'NaOH'],
        condition: null,
        products: ['NaNO3', 'NH3', 'H2O'],
        equation: 'NH₄NO₃ + NaOH → NaNO₃ + NH₃↑ + H₂O',
        difficulty: 'hard'
    }
];

// 当前激活的反应规则（根据难度动态加载）
let activeReactionRules = [];

// 根据难度加载规则
function loadRulesByDifficulty(difficulty) {
    // 所有难度使用相同的反应规则库
    activeReactionRules = reactionRules;

    console.log(`[难度加载] ${difficulty}模式 - 已加载 ${activeReactionRules.length} 个反应`);

    return activeReactionRules.length;
}

// 获取当前激活的规则数量
function getActiveRulesCount() {
    return activeReactionRules.length;
}

// 获取当前激活的规则列表
function getActiveRules() {
    return [...activeReactionRules];
}

// 反应引擎 - 解析反应区（支持递归连锁反应）
function resolveReactions(zone, condition = null) {
    const reactions = [];
    let currentZone = [...zone];
    let reactionOccurred = true;
    let iteration = 0;
    const maxIterations = 10;

    // 检查反应区中是否有条件牌作为物质存在
    let zoneCondition = condition;
    if (!zoneCondition) {
        // 检查反应区中是否有条件物质
        const conditionSubstances = currentZone.filter(s => 
            s.id === 'heat' || s.id === 'ignite' || s.id === 'catalyst' || s.id === 'electric'
        );
        if (conditionSubstances.length > 0) {
            zoneCondition = conditionSubstances[0].id;
        }
    }

    while (reactionOccurred && iteration < maxIterations) {
        reactionOccurred = false;

        for (const rule of activeReactionRules) {
            // 检查条件是否匹配
            if (rule.condition && rule.condition !== zoneCondition) {
                continue;
            }

            // 检查反应物是否都在反应区
            const reactantIds = rule.reactants;
            const zoneIds = currentZone.map(s => s.id);

            // 检查是否包含所有反应物（考虑数量）
            const hasAllReactants = reactantIds.every(reactant => {
                let count = reactantIds.filter(r => r === reactant).length;
                let zoneCount = zoneIds.filter(z => z === reactant).length;
                return zoneCount >= count;
            });

            if (hasAllReactants) {
                const reaction = {
                    rule: rule,
                    consumed: [...rule.reactants],
                    produced: [...rule.products]
                };

                reactions.push(reaction);
                reactionOccurred = true;

                // 从反应区移除反应物
                let tempZone = [...currentZone];
                for (const reactant of rule.reactants) {
                    const index = tempZone.findIndex(s => s.id === reactant);
                    if (index !== -1) {
                        tempZone.splice(index, 1);
                    }
                }
                
                // 如果使用了反应区中的条件物质，也需要移除
                if (zoneCondition && !condition) {
                    const conditionIndex = tempZone.findIndex(s => s.id === zoneCondition);
                    if (conditionIndex !== -1) {
                        tempZone.splice(conditionIndex, 1);
                    }
                }

                // 添加生成物
                for (const productId of rule.products) {
                    const product = substances[productId];
                    if (product) {
                        tempZone.push({
                            ...product,
                            uniqueId: `${productId}_${Date.now()}_${iteration}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    }
                }

                currentZone = tempZone;
                break;
            }
        }

        iteration++;
    }

    return { zone: currentZone, reactions };
}
