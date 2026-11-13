        // 3D 元素周期表代码
        document.addEventListener('DOMContentLoaded', () => {
            // --- DOM 元素获取 ---
            const table = document.getElementById('periodic-table');
            const tempSlider = document.getElementById('temp-slider');
            const tempInput = document.getElementById('temp-input');
            const tempCelsius = document.getElementById('temp-celsius');
            const modal = document.getElementById('element-modal');
            const modalBody = document.getElementById('modal-body');
            const modalCloseBtn = document.querySelector('.modal-close-btn');
            const modalBackdrop = document.querySelector('.modal-backdrop');
            // 新增: 获取语言切换按钮
            const toggleTableLangBtn = document.getElementById('toggle-table-lang-btn');

            let elementsData = [];
            let currentModalElement = null; // 用于存储当前弹窗的元素数据
            let currentWikiLang = 'zh'; // 弹窗维基百科内容的语言
            let currentTableLang = 'en'; // 【新增】周期表方块显示的语言 ('en' 或 'zh')

            // --- 状态变量 (3D交互) ---
            let isDragging = false;
            let isPanning = false;
            let clickStartX, clickStartY;
            let previousMouseX, previousMouseY;
            let currentRotateX = 50;
            let currentRotateZ = -15;
            let currentScale = 1.0;
            let currentTranslateX = 0;
            let currentTranslateY = 0;

            async function init() {
                try {
                    // 直接加载本地 JSON 文件
                    const response = await fetch('https://cdn.jsdelivr.net/gh/Bowserinator/Periodic-Table-JSON@master/PeriodicTableJSON.json');
                    if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
                    const jsonData = await response.json();
                    elementsData = jsonData.elements;
                    // 为每个元素添加 xpos 和 ypos 属性
                    elementsData.forEach(el => {
                        el.xpos = el.group;
                        el.ypos = el.period;
                        el.category_slug = getCategorySlug(el.category);
                    });
                    window.__periodicTableRemoteImageBySymbol = Object.fromEntries(
                        elementsData
                            .map(el => [el.symbol, getImageUrl(el.image)])
                            .filter(([, imageUrl]) => !!imageUrl)
                    );
                    buildTable();
                    setupEventListeners();
                    updateTemperatures(tempSlider.value);
                    fitTableToViewport();
                } catch (error) {
                    table.innerHTML = `<div class="loading">加载元素数据失败: ${error.message}</div>`;
                }
            }

            // 获取元素类别对应的 slug
            function getCategorySlug(category) {
                const categoryMap = {
                    'alkali metal': 'alkali-metal',
                    'alkaline earth metal': 'alkaline-earth-metal',
                    'lanthanoid': 'lanthanide',
                    'actinoid': 'actinide',
                    'transition metal': 'transition-metal',
                    'post-transition metal': 'other-metal',
                    'metalloid': 'metalloid',
                    'polyatomic nonmetal': 'other-nonmetal',
                    'diatomic nonmetal': 'other-nonmetal',
                    'noble gas': 'noble-gas',
                    'halogen': 'halogen'
                };
                return categoryMap[category.toLowerCase()] || 'unknown-category';
            }

            /**
             * 【已修改】构建元素周期表
             * 1. 增加相对原子质量显示
             * 2. 根据 currentTableLang 变量显示中文或英文名称
             */
            function buildTable() {
                table.innerHTML = '';
                const fragment = document.createDocumentFragment();
                elementsData.forEach(el => {
                    const cell = document.createElement('div');
                    const categoryClass = el.category_slug || 'unknown-category';
                    cell.className = `element-cell ${categoryClass}`;
                    cell.style.gridColumn = el.xpos;
                    cell.style.gridRow = el.ypos;
                    cell.dataset.number = el.number;

                    // 决定显示哪个名称
                    const nameToDisplay = currentTableLang === 'zh' ? getChineseName(el.symbol) : el.name;

                    // 格式化相对原子质量，保留3位小数
                    const atomicMassDisplay = el.atomic_mass ? el.atomic_mass.toFixed(3) : '';

                    cell.innerHTML = `
                        <div class="number">${el.number}</div>
                        <div class="symbol">${el.symbol}</div>
                        <div class="name">${nameToDisplay}</div>
                        <div class="atomic-mass">${atomicMassDisplay}</div>`; // 新增原子质量

                    fragment.appendChild(cell);
                });
                table.appendChild(fragment);
            }

            // 获取元素的中文名称
            function getChineseName(symbol) {
                const chineseNames = {
                    'H': '氢', 'He': '氦', 'Li': '锂', 'Be': '铍', 'B': '硼', 'C': '碳', 'N': '氮', 'O': '氧', 'F': '氟', 'Ne': '氖',
                    'Na': '钠', 'Mg': '镁', 'Al': '铝', 'Si': '硅', 'P': '磷', 'S': '硫', 'Cl': '氯', 'Ar': '氩',
                    'K': '钾', 'Ca': '钙', 'Sc': '钪', 'Ti': '钛', 'V': '钒', 'Cr': '铬', 'Mn': '锰', 'Fe': '铁', 'Co': '钴', 'Ni': '镍', 'Cu': '铜', 'Zn': '锌',
                    'Ga': '镓', 'Ge': '锗', 'As': '砷', 'Se': '硒', 'Br': '溴', 'Kr': '氪',
                    'Rb': '铷', 'Sr': '锶', 'Y': '钇', 'Zr': '锆', 'Nb': '铌', 'Mo': '钼', 'Tc': '锝', 'Ru': '钌', 'Rh': '铑', 'Pd': '钯', 'Ag': '银', 'Cd': '镉',
                    'In': '铟', 'Sn': '锡', 'Sb': '锑', 'Te': '碲', 'I': '碘', 'Xe': '氙',
                    'Cs': '铯', 'Ba': '钡', 'La': '镧', 'Ce': '铈', 'Pr': '镨', 'Nd': '钕', 'Pm': '钷', 'Sm': '钐', 'Eu': '铕', 'Gd': '钆', 'Tb': '铽', 'Dy': '镝', 'Ho': '钬', 'Er': '铒', 'Tm': '铥', 'Yb': '镱', 'Lu': '镥',
                    'Hf': '铪', 'Ta': '钽', 'W': '钨', 'Re': '铼', 'Os': '锇', 'Ir': '铱', 'Pt': '铂', 'Au': '金', 'Hg': '汞',
                    'Tl': '铊', 'Pb': '铅', 'Bi': '铋', 'Po': '钋', 'At': '砹', 'Rn': '氡',
                    'Fr': '钫', 'Ra': '镭', 'Ac': '锕', 'Th': '钍', 'Pa': '镤', 'U': '铀', 'Np': '镎', 'Pu': '钚', 'Am': '镅', 'Cm': '锔', 'Bk': '锫', 'Cf': '锎', 'Es': '锿', 'Fm': '镄', 'Md': '钔', 'No': '锘', 'Lr': '铹',
                    'Rf': '𬬻', 'Db': '𬭊', 'Sg': '𬭳', 'Bh': '𬭛', 'Hs': '𬭶', 'Mt': '鿏', 'Ds': '𫟼', 'Rg': '𬬭', 'Cn': '鿔',
                    'Nh': '鿭', 'Fl': '𫓧', 'Mc': '镆', 'Lv': '𫟷', 'Ts': '鿬', 'Og': '鿫'
                };
                return chineseNames[symbol] || symbol;
            }

            function getElementLocalName(element) {
                return getChineseName(element.symbol) || element.name || element.symbol;
            }

            const AVAILABLE_LOCAL_IMAGES = new Set([
                'B2', 'B3', 'Si2', 'Si3', 'Ti2', 'Ti3', 'Ti4', 'Ti5', 'Ti6', 'Ti7', 'V2', 'ag', 'ag2', 'ag3',
                '氖', '氙', '氟', '氡', '氢', '氦', '氧', '氩', '氪', '氮', '氯', '砷', '砹', '硅', '硒', '硫',
                '硼', '碘', '碲', '碳', '磷', '金', '钆', '钇', '钋', '钌', '钍', '钐', '钒', '钔', '钕', '钙',
                '钛', '钠', '钡', '钨', '钪', '钫', '钯', '钴', '钼', '钾', '铁', '铂', '铅', '铈', '铋', '铌',
                '铍', '铕', '铜', '铝', '铟', '铥', '铬', '铯', '铱', '银', '铷', '铹', '铽', '锂', '锆', '锇',
                '锌', '锎', '锑', '锔', '锗', '锘', '锝', '锡', '锰', '锶', '锿', '镁', '镅', '镆', '镉', '镍',
                '镎', '镓', '镝', '镥', '镧', '镨', '镭', '镱', '鿏', '鿔', '鿫', '鿬', '鿭', '𫓧', '𫟷', '𫟼',
                '𬬭', '𬬻', '𬭊', '𬭛', '𬭳', '𬭶'
            ]);
            window.__periodicTableKnownLocalImageNames = Array.from(AVAILABLE_LOCAL_IMAGES);

            function hasLocalImage(element) {
                return AVAILABLE_LOCAL_IMAGES.has(getElementLocalName(element));
            }

            function getLocalImagePath(element) {
                return `image/${encodeURIComponent(getElementLocalName(element))}.jpg`;
            }

            function normalizeRemoteImageUrl(url) {
                if (typeof url !== 'string' || !url) return '';
                const wikiFilePrefix = 'https://en.wikipedia.org/wiki/File:';
                if (url.startsWith(wikiFilePrefix)) {
                    const fileName = url.slice(wikiFilePrefix.length);
                    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`;
                }
                return url;
            }

            function getImageUrl(imageField) {
                if (!imageField) return '';
                if (typeof imageField === 'string') return normalizeRemoteImageUrl(imageField);
                if (typeof imageField === 'object' && typeof imageField.url === 'string') {
                    return normalizeRemoteImageUrl(imageField.url);
                }
                return '';
            }

            /**
             * 【已修改】设置事件监听器
             * 新增了对周期表语言切换按钮的监听
             */
            function setupEventListeners() {
                // --- 温度控制 ---
                if (tempSlider) {
                    tempSlider.addEventListener('input', () => updateTemperatures(tempSlider.value));
                }
                if (tempInput) {
                    tempInput.addEventListener('input', () => {
                        const value = parseFloat(tempInput.value);
                        if (!isNaN(value)) {
                            tempSlider.value = Math.max(0, Math.min(6000, value));
                        }
                    });
                    tempInput.addEventListener('blur', () => {
                        let value = parseFloat(tempInput.value);
                        if (isNaN(value)) { value = parseFloat(tempSlider.value); }
                        value = Math.max(0, Math.min(6000, value));
                        updateTemperatures(value);
                    });
                    tempInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            tempInput.blur();
                        }
                    });
                }

                // --- 3D交互事件 ---
                if (table) {
                    table.addEventListener('contextmenu', e => e.preventDefault());
                    table.addEventListener('mousedown', (e) => {
                        clickStartX = e.clientX;
                        clickStartY = e.clientY;
                        previousMouseX = e.clientX;
                        previousMouseY = e.clientY;
                        table.style.transition = 'none';
                        document.body.classList.add('no-select');
                        if (e.button === 0) isDragging = true;
                        else if (e.button === 2) isPanning = true;
                    });

                    table.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const zoomSpeed = 0.1;
                        currentScale -= e.deltaY * zoomSpeed * 0.01;
                        currentScale = Math.max(0.2, Math.min(5, currentScale));
                        updateTransform();
                    });
                }

                window.addEventListener('mousemove', (e) => {
                    if (!isDragging && !isPanning) return;
                    const deltaX = e.clientX - previousMouseX;
                    const deltaY = e.clientY - previousMouseY;
                    if (isDragging) {
                        currentRotateZ += deltaX * 0.2;
                        currentRotateX -= deltaY * 0.2;
                        currentRotateX = Math.max(-90, Math.min(90, currentRotateX));
                    }
                    if (isPanning) {
                        currentTranslateX += deltaX;
                        currentTranslateY += deltaY;
                    }
                    updateTransform();
                    previousMouseX = e.clientX;
                    previousMouseY = e.clientY;
                });

                window.addEventListener('mouseup', () => {
                    isDragging = false;
                    isPanning = false;
                    document.body.classList.remove('no-select');
                    if (table) {
                        table.style.transition = 'transform 0.1s linear';
                    }
                });

                // --- 弹窗相关事件 ---
                if (table) {
                    table.addEventListener('click', (e) => {
                        const deltaX = Math.abs(e.clientX - clickStartX);
                        const deltaY = Math.abs(e.clientY - clickStartY);
                        if (deltaX < 5 && deltaY < 5) {
                            const cell = e.target.closest('.element-cell');
                            if (cell) {
                                const atomicNumber = parseInt(cell.dataset.number, 10);
                                showElementModal(atomicNumber);
                            }
                        }
                    });
                }
                if (modalCloseBtn) {
                    modalCloseBtn.addEventListener('click', hideElementModal);
                }
                if (modalBackdrop) {
                    modalBackdrop.addEventListener('click', hideElementModal);
                }

                // --- 【新增】语言切换控制 ---
                if(toggleTableLangBtn) {
                    toggleTableLangBtn.addEventListener('click', toggleTableLanguage);
                }
            }

            function updateTemperatures(kelvin) {
                kelvin = parseFloat(kelvin);
                if (isNaN(kelvin)) return;
                if (tempSlider) tempSlider.value = kelvin;
                if (tempInput) tempInput.value = kelvin.toFixed(2);
                if (tempCelsius) tempCelsius.textContent = `(${(kelvin - 273.15).toFixed(2)} °C)`;
                updatePhaseStyles(kelvin);
            }

            async function updatePhaseStyles(temp) {
                // 简化版：根据温度设置物态
                try {
                    const phases = {};
                    elementsData.forEach(el => {
                        let phase = 'solid';
                        if (el.boil && temp > el.boil) {
                            phase = 'gas';
                        } else if (el.melt && temp > el.melt) {
                            phase = 'liquid';
                        }
                        phases[el.number] = phase;
                    });
                    
                    for (const number in phases) {
                        const cell = table.querySelector(`[data-number="${number}"]`);
                        if (cell) {
                            cell.classList.remove('solid', 'liquid', 'gas', 'unknown');
                            cell.classList.add(phases[number]);
                        }
                    }
                } catch (error) { console.error('更新物态样式失败:', error); }
            }

            function updateTransform() {
                if (table) {
                    table.style.transform = `translateX(${currentTranslateX}px) translateY(${currentTranslateY}px) rotateX(${currentRotateX}deg) rotateZ(${currentRotateZ}deg) scale(${currentScale})`;
                }
            }

            // 手机端（含横屏）按视口宽度等比缩放置周期表：整体缩放不会裁切文字，避免符号被遮挡
            function fitTableToViewport() {
                if (!table || !table.offsetParent) return; // 3D 视图隐藏时不处理，切换到 3D 后再计算
                if (window.innerWidth > 768 && window.innerHeight > 500) return;
                const tableWidth = table.offsetWidth || 1255;
                const tableHeight = table.offsetHeight || 695;
                // 旋转后的投影宽度 ≈ 宽 × cos15° + 高 × sin15° × cos50°
                const projectedWidth = tableWidth * 0.966 + tableHeight * 0.259 * 0.643;
                const fitWidth = window.innerWidth - 60;
                // 手机横屏时同时限制高度，保证 3D 周期表完整落在屏幕内
                const container = document.getElementById('table-container');
                const availHeight = (window.innerHeight <= 500 && window.innerWidth > window.innerHeight && container)
                    ? container.clientHeight - 12
                    : 0;
                currentScale = Math.max(0.18, Math.min(1, fitWidth / projectedWidth));
                if (availHeight > 0) {
                    // 横屏可用高度较小时，透视会把表格投影推离中心，先重置平移再重新居中
                    currentTranslateX = 0;
                    currentTranslateY = 0;
                }
                // 测量期间关闭过渡，避免量到动画中间值
                table.style.transition = 'none';
                updateTransform();
                // 透视会放大靠近视点的部分，按实际渲染尺寸再收敛几次
                for (let i = 0; i < 6; i++) {
                    const rect = table.getBoundingClientRect();
                    let factor = fitWidth / rect.width;
                    if (availHeight > 0 && rect.height > availHeight) {
                        factor = Math.min(factor, availHeight / rect.height);
                    }
                    if (factor >= 1) break;
                    currentScale = Math.max(0.12, currentScale * factor);
                    updateTransform();
                }
                if (availHeight > 0) {
                    // 将投影后的表格中心对齐到表格容器中心
                    const cRect = container.getBoundingClientRect();
                    const rect = table.getBoundingClientRect();
                    currentTranslateX += (cRect.left + cRect.width / 2) - (rect.left + rect.width / 2);
                    currentTranslateY += (cRect.top + cRect.height / 2) - (rect.top + rect.height / 2);
                    updateTransform();
                }
                table.style.transition = '';
            }

            /**
             * 【新增】辅助函数：格式化温度，同时显示开尔文和摄氏度
             * @param {number|null|undefined} kelvin - 开尔文温度
             * @returns {string} 格式化后的字符串
             */
            function formatTemperatureWithCelsius(kelvin) {
                if (kelvin === null || typeof kelvin === 'undefined') {
                    return 'N/A';
                }
                const celsius = kelvin - 273.15;
                return `${kelvin} K (${celsius.toFixed(2)} °C)`;
            }

            /**
             * 【已修改】显示元素弹窗
             * 使用 formatTemperatureWithCelsius 函数格式化熔点和沸点
             */
            function showElementModal(atomicNumber) {
                currentModalElement = elementsData.find(el => el.number === atomicNumber);
                if (!currentModalElement) return;

                const element = currentModalElement;
                const elementLocalName = getElementLocalName(element);
                const remoteImageUrl = getImageUrl(element.image);
                const mainImageUrl = hasLocalImage(element) ? getLocalImagePath(element) : remoteImageUrl;
                const spectralImageUrl = getImageUrl(element.spectral_img);

                const modelViewerHTML = element.bohr_model_3d ?
                    `<model-viewer src="${element.bohr_model_3d}" alt="A 3D model of ${element.name}" auto-rotate camera-controls disable-zoom></model-viewer>` :
                    '<div class="placeholder">无3D模型</div>';

                const mainImageHTML = mainImageUrl ?
                    `<div class="image-wrapper"><p class="image-label">元素图片</p><img src="${mainImageUrl}" alt="Image of ${element.name}"></div>` : '';

                const spectralImageHTML = spectralImageUrl ?
                    `<div class="image-wrapper"><p class="image-label">光谱图</p><img src="${spectralImageUrl}" alt="Spectral image for ${element.name}"></div>` : '';

                const detailsHTML = `
                    <div class="details-text">
                        <p><strong>原子序数:</strong> ${element.number}</p>
                        <p><strong>原子质量:</strong> ${element.atomic_mass ? element.atomic_mass.toFixed(4) : 'N/A'}</p>
                        <p><strong>分类:</strong> ${element.category}</p>
                        <p><strong>发现者:</strong> ${element.discovered_by || 'N/A'}</p>
                        <p><strong>密度:</strong> ${element.density ? `${element.density} g/cm³` : 'N/A'}</p>
                        <p><strong>熔点:</strong> ${formatTemperatureWithCelsius(element.melt)}</p>
                        <p><strong>沸点:</strong> ${formatTemperatureWithCelsius(element.boil)}</p>
                        <p>${element.summary || ''}</p>
                    </div>
                    <div class="wiki-container">
                        <div class="wiki-header">
                            <h3>维基百科详情</h3>
                            <button id="lang-toggle-btn" class="lang-btn">切换为英文</button>
                        </div>
                        <div id="wiki-content-target"></div>
                    </div>`;

                if (modalBody) {
                    modalBody.innerHTML = `
                        <h2 class="modal-title">${elementLocalName} (${element.symbol})</h2>
                        <div class="visuals-container">
                            ${modelViewerHTML}
                            ${mainImageHTML}
                            ${spectralImageHTML}
                        </div>
                        <div class="info-container">
                            ${detailsHTML}
                        </div>
                    `;

                    renderWikipediaContent();
                    const langToggleBtn = document.getElementById('lang-toggle-btn');
                    if (langToggleBtn) {
                        langToggleBtn.addEventListener('click', toggleWikiLanguage);
                    }

                    if (modal) {
                        modal.classList.remove('modal-hidden');
                    }
                }
            }

            function renderWikipediaContent() {
                if (!currentModalElement) return;
                const target = document.getElementById('wiki-content-target');
                const langBtn = document.getElementById('lang-toggle-btn');
                if (target) {
                    target.innerHTML = '<p>加载维基百科内容中...</p>';
                }
                if (langBtn) {
                    langBtn.style.display = 'inline-block';
                    langBtn.textContent = currentWikiLang === 'zh' ? '切换为英文' : 'Switch to Chinese';
                }
                
                // 从维基百科API获取内容
                // 对于英文维基百科，使用元素符号作为搜索词，因为它更可能匹配
                const elementName = currentWikiLang === 'zh' ? currentModalElement.name : currentModalElement.symbol;
                const lang = currentWikiLang === 'zh' ? 'zh' : 'en';
                // 走同源代理：由服务器访问维基百科，避免国内网络无法直连
                const apiUrl = `/api/wiki/summary?lang=${lang}&title=${encodeURIComponent(elementName)}`;
                
                fetch(apiUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data.ok) {
                            throw new Error(data.error || '维基百科返回异常');
                        }
                        if (target) {
                            if (data.extract) {
                                const thumbnailUrl = data.thumbnail && data.thumbnail.source
                                    ? `/api/wiki/image?url=${encodeURIComponent(data.thumbnail.source)}`
                                    : '';
                                target.innerHTML = `
                                    <div class="wiki-section">
                                        <details open>
                                            <summary>维基百科摘要</summary>
                                            <div class="wiki-section-content">
                                                <p>${data.extract}</p>
                                                ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${elementName}" style="float: right; margin: 10px; max-width: 200px;">` : ''}
                                            </div>
                                        </details>
                                    </div>
                                    <div class="wiki-section">
                                        <details>
                                            <summary>更多信息</summary>
                                            <div class="wiki-section-content">
                                                <p>查看完整的 <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(elementName)}" target="_blank">维基百科页面</a></p>
                                            </div>
                                        </details>
                                    </div>
                                `;
                            } else {
                                target.innerHTML = '<p>暂无维基百科内容。</p>';
                            }
                        }
                    })
                    .catch(error => {
                        console.error('加载维基百科内容失败:', error);
                        if (target) {
                            target.innerHTML = '<p>加载维基百科内容失败，请稍后重试。</p>';
                        }
                    });
            }

            function toggleWikiLanguage() {
                currentWikiLang = currentWikiLang === 'zh' ? 'en' : 'zh';
                renderWikipediaContent();
            }

            /**
             * 【新增】切换周期表方块的显示语言
             * 此函数通过直接操作 DOM 更新名称，避免了重建整个表格的开销
             */
            function toggleTableLanguage() {
                currentTableLang = currentTableLang === 'en' ? 'zh' : 'en';
                if (toggleTableLangBtn) {
                    toggleTableLangBtn.textContent = currentTableLang === 'en' ? '切换为中文' : 'Switch to English';
                }

                elementsData.forEach(el => {
                    const cell = table.querySelector(`[data-number="${el.number}"]`);
                    if (cell) {
                        const nameEl = cell.querySelector('.name');
                        if (nameEl) {
                            const nameToDisplay = currentTableLang === 'zh' ? getChineseName(el.symbol) : el.name;
                            nameEl.textContent = nameToDisplay;
                        }
                    }
                });
            }

            function hideElementModal() {
                if (modal) {
                    modal.classList.add('modal-hidden');
                }
                if (modalBody) {
                    modalBody.innerHTML = '';
                }
                currentModalElement = null;
            }

            // 视图切换/横竖屏切换后重新适配 3D 周期表
            let fitTimer = null;
            window.addEventListener('resize', function() {
                clearTimeout(fitTimer);
                fitTimer = setTimeout(fitTableToViewport, 150);
            });

            // --- 初始化应用 ---
            init();
        });
        
        // 原交互式元素周期表代码
        // 元素数据
        const elements = [
            { 
                number: 1, 
                symbol: "H", 
                name: "氢", 
                mass: "1.008", 
                block: "s", 
                melting: "-259.16°C", 
                boiling: "-252.87°C", 
                density: "0.0000899 g/cm³", 
                electron: "1s¹", 
                crystal: "六方", 
                electronLayers: [1]
            },
            { 
                number: 2, 
                symbol: "He", 
                name: "氦", 
                mass: "4.0026", 
                block: "o", 
                melting: "-272.2°C", 
                boiling: "-268.93°C", 
                density: "0.0001785 g/cm³", 
                electron: "1s²", 
                crystal: "六方", 
                electronLayers: [2]
            },
            { number: 3, symbol: "Li", name: "锂", mass: "6.94", block: "s", melting: "180.5°C", boiling: "1342°C", density: "0.534 g/cm³", electron: "[He] 2s¹", crystal: "体心立方" },
            { number: 4, symbol: "Be", name: "铍", mass: "9.0122", block: "s", melting: "1287°C", boiling: "2470°C", density: "1.85 g/cm³", electron: "[He] 2s²", crystal: "六方" },
            { number: 5, symbol: "B", name: "硼", mass: "10.81", block: "p", melting: "2076°C", boiling: "3927°C", density: "2.34 g/cm³", electron: "[He] 2s² 2p¹", crystal: "三方" },
            { number: 6, symbol: "C", name: "碳", mass: "12.011", block: "p", melting: "3550°C", boiling: "4027°C", density: "2.267 g/cm³", electron: "[He] 2s² 2p²", crystal: "六方/立方" },
            { number: 7, symbol: "N", name: "氮", mass: "14.007", block: "p", melting: "-210.1°C", boiling: "-195.79°C", density: "0.001251 g/cm³", electron: "[He] 2s² 2p³", crystal: "六方" },
            { number: 8, symbol: "O", name: "氧", mass: "15.999", block: "p", melting: "-218.79°C", boiling: "-182.96°C", density: "0.001429 g/cm³", electron: "[He] 2s² 2p⁴", crystal: "立方" },
            { number: 9, symbol: "F", name: "氟", mass: "18.998", block: "p", melting: "-219.67°C", boiling: "-188.11°C", density: "0.001696 g/cm³", electron: "[He] 2s² 2p⁵", crystal: "立方" },
            { number: 10, symbol: "Ne", name: "氖", mass: "20.180", block: "o", melting: "-248.59°C", boiling: "-246.08°C", density: "0.0008999 g/cm³", electron: "[He] 2s² 2p⁶", crystal: "面心立方" },
            
            { number: 11, symbol: "Na", name: "钠", mass: "22.990", block: "s", melting: "97.72°C", boiling: "883°C", density: "0.968 g/cm³", electron: "[Ne] 3s¹", crystal: "体心立方" },
            { number: 12, symbol: "Mg", name: "镁", mass: "24.305", block: "s", melting: "650°C", boiling: "1090°C", density: "1.738 g/cm³", electron: "[Ne] 3s²", crystal: "六方" },
            { number: 13, symbol: "Al", name: "铝", mass: "26.982", block: "p", melting: "660.32°C", boiling: "2519°C", density: "2.70 g/cm³", electron: "[Ne] 3s² 3p¹", crystal: "面心立方" },
            { number: 14, symbol: "Si", name: "硅", mass: "28.085", block: "p", melting: "1414°C", boiling: "3265°C", density: "2.3296 g/cm³", electron: "[Ne] 3s² 3p²", crystal: "立方金刚石" },
            { number: 15, symbol: "P", name: "磷", mass: "30.974", block: "p", melting: "44.15°C", boiling: "280.5°C", density: "1.82 g/cm³", electron: "[Ne] 3s² 3p³", crystal: "立方/单斜/正交" },
            { number: 16, symbol: "S", name: "硫", mass: "32.06", block: "p", melting: "115.21°C", boiling: "444.72°C", density: "2.067 g/cm³", electron: "[Ne] 3s² 3p⁴", crystal: "正交" },
            { number: 17, symbol: "Cl", name: "氯", mass: "35.45", block: "p", melting: "-101.5°C", boiling: "-34.04°C", density: "0.003214 g/cm³", electron: "[Ne] 3s² 3p⁵", crystal: "正交" },
            { number: 18, symbol: "Ar", name: "氩", mass: "39.948", block: "o", melting: "-189.34°C", boiling: "-185.85°C", density: "0.001784 g/cm³", electron: "[Ne] 3s² 3p⁶", crystal: "面心立方" },
            { number: 19, symbol: "K", name: "钾", mass: "39.098", block: "s", melting: "63.38°C", boiling: "759°C", density: "0.862 g/cm³", electron: "[Ar] 4s¹", crystal: "体心立方" },
            { number: 20, symbol: "Ca", name: "钙", mass: "40.078", block: "s", melting: "842°C", boiling: "1484°C", density: "1.54 g/cm³", electron: "[Ar] 4s²", crystal: "面心立方" },
            
            { number: 21, symbol: "Sc", name: "钪", mass: "44.956", block: "d", melting: "1541°C", boiling: "2836°C", density: "2.985 g/cm³", electron: "[Ar] 3d¹ 4s²", crystal: "六方" },
            { number: 22, symbol: "Ti", name: "钛", mass: "47.867", block: "d", melting: "1668°C", boiling: "3287°C", density: "4.506 g/cm³", electron: "[Ar] 3d² 4s²", crystal: "六方" },
            { number: 23, symbol: "V", name: "钒", mass: "50.942", block: "d", melting: "1910°C", boiling: "3407°C", density: "6.11 g/cm³", electron: "[Ar] 3d³ 4s²", crystal: "体心立方" },
            { number: 24, symbol: "Cr", name: "铬", mass: "51.996", block: "d", melting: "1907°C", boiling: "2671°C", density: "7.19 g/cm³", electron: "[Ar] 3d⁵ 4s¹", crystal: "体心立方" },
            { number: 25, symbol: "Mn", name: "锰", mass: "54.938", block: "d", melting: "1246°C", boiling: "2061°C", density: "7.21 g/cm³", electron: "[Ar] 3d⁵ 4s²", crystal: "立方" },
            { number: 26, symbol: "Fe", name: "铁", mass: "55.845", block: "d", melting: "1538°C", boiling: "2862°C", density: "7.874 g/cm³", electron: "[Ar] 3d⁶ 4s²", crystal: "体心立方" },
            { number: 27, symbol: "Co", name: "钴", mass: "58.933", block: "d", melting: "1495°C", boiling: "2927°C", density: "8.86 g/cm³", electron: "[Ar] 3d⁷ 4s²", crystal: "六方" },
            { number: 28, symbol: "Ni", name: "镍", mass: "58.693", block: "d", melting: "1455°C", boiling: "2913°C", density: "8.908 g/cm³", electron: "[Ar] 3d⁸ 4s²", crystal: "面心立方" },
            { number: 29, symbol: "Cu", name: "铜", mass: "63.546", block: "ds", melting: "1084.62°C", boiling: "2562°C", density: "8.96 g/cm³", electron: "[Ar] 3d¹⁰ 4s¹", crystal: "面心立方" },
            { number: 30, symbol: "Zn", name: "锌", mass: "65.38", block: "ds", melting: "419.53°C", boiling: "767°C", density: "7.134 g/cm³", electron: "[Ar] 3d¹⁰ 4s²", crystal: "六方" },
            { number: 31, symbol: "Ga", name: "镓", mass: "69.723", block: "p", melting: "29.76°C", boiling: "2204°C", density: "5.904 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p¹", crystal: "正交" },
            { number: 32, symbol: "Ge", name: "锗", mass: "72.630", block: "p", melting: "938.25°C", boiling: "2833°C", density: "5.323 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p²", crystal: "立方金刚石" },
            { number: 33, symbol: "As", name: "砷", mass: "74.922", block: "p", melting: "817°C", boiling: "614°C", density: "5.727 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p³", crystal: "三方" },
            { number: 34, symbol: "Se", name: "硒", mass: "78.971", block: "p", melting: "221°C", boiling: "685°C", density: "4.809 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p⁴", crystal: "六方" },
            { number: 35, symbol: "Br", name: "溴", mass: "79.904", block: "p", melting: "-7.2°C", boiling: "58.8°C", density: "3.1028 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p⁵", crystal: "正交" },
            { number: 36, symbol: "Kr", name: "氪", mass: "83.798", block: "o", melting: "-157.36°C", boiling: "-153.22°C", density: "0.003749 g/cm³", electron: "[Ar] 3d¹⁰ 4s² 4p⁶", crystal: "面心立方" },
            { number: 37, symbol: "Rb", name: "铷", mass: "85.468", block: "s", melting: "39.31°C", boiling: "688°C", density: "1.532 g/cm³", electron: "[Kr] 5s¹", crystal: "体心立方" },
            { number: 38, symbol: "Sr", name: "锶", mass: "87.62", block: "s", melting: "777°C", boiling: "1382°C", density: "2.64 g/cm³", electron: "[Kr] 5s²", crystal: "面心立方" },
            { number: 39, symbol: "Y", name: "钇", mass: "88.906", block: "d", melting: "1522°C", boiling: "3345°C", density: "4.472 g/cm³", electron: "[Kr] 4d¹ 5s²", crystal: "六方" },
            { number: 40, symbol: "Zr", name: "锆", mass: "91.224", block: "d", melting: "1855°C", boiling: "4409°C", density: "6.506 g/cm³", electron: "[Kr] 4d² 5s²", crystal: "六方" },
            { number: 41, symbol: "Nb", name: "铌", mass: "92.906", block: "d", melting: "2477°C", boiling: "4744°C", density: "8.57 g/cm³", electron: "[Kr] 4d⁴ 5s¹", crystal: "体心立方" },
            { number: 42, symbol: "Mo", name: "钼", mass: "95.95", block: "d", melting: "2623°C", boiling: "4639°C", density: "10.22 g/cm³", electron: "[Kr] 4d⁵ 5s¹", crystal: "体心立方" },
            { number: 43, symbol: "Tc", name: "锝", mass: "98", block: "d", melting: "2157°C", boiling: "4265°C", density: "11.5 g/cm³", electron: "[Kr] 4d⁵ 5s²", crystal: "六方" },
            { number: 44, symbol: "Ru", name: "钌", mass: "101.07", block: "d", melting: "2334°C", boiling: "4150°C", density: "12.37 g/cm³", electron: "[Kr] 4d⁷ 5s¹", crystal: "六方" },
            { number: 45, symbol: "Rh", name: "铑", mass: "102.91", block: "d", melting: "1964°C", boiling: "3695°C", density: "12.41 g/cm³", electron: "[Kr] 4d⁸ 5s¹", crystal: "面心立方" },
            { number: 46, symbol: "Pd", name: "钯", mass: "106.42", block: "d", melting: "1554.9°C", boiling: "2963°C", density: "12.02 g/cm³", electron: "[Kr] 4d¹⁰", crystal: "面心立方" },
            { number: 47, symbol: "Ag", name: "银", mass: "107.87", block: "ds", melting: "961.78°C", boiling: "2162°C", density: "10.49 g/cm³", electron: "[Kr] 4d¹⁰ 5s¹", crystal: "面心立方" },
            { number: 48, symbol: "Cd", name: "镉", mass: "112.41", block: "ds", melting: "321.07°C", boiling: "767°C", density: "8.69 g/cm³", electron: "[Kr] 4d¹⁰ 5s²", crystal: "六方" },
            { number: 49, symbol: "In", name: "铟", mass: "114.82", block: "p", melting: "156.60°C", boiling: "2072°C", density: "7.31 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p¹", crystal: "四方" },
            { number: 50, symbol: "Sn", name: "锡", mass: "118.71", block: "p", melting: "231.93°C", boiling: "2602°C", density: "7.287 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p²", crystal: "四方" },
            { number: 51, symbol: "Sb", name: "锑", mass: "121.76", block: "p", melting: "630.63°C", boiling: "1587°C", density: "6.685 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p³", crystal: "三方" },
            { number: 52, symbol: "Te", name: "碲", mass: "127.60", block: "p", melting: "449.51°C", boiling: "988°C", density: "6.232 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p⁴", crystal: "六方" },
            { number: 53, symbol: "I", name: "碘", mass: "126.90", block: "p", melting: "113.7°C", boiling: "184.3°C", density: "4.93 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p⁵", crystal: "正交" },
            { number: 54, symbol: "Xe", name: "氙", mass: "131.29", block: "o", melting: "-111.75°C", boiling: "-108.12°C", density: "0.005887 g/cm³", electron: "[Kr] 4d¹⁰ 5s² 5p⁶", crystal: "面心立方" },
            { number: 55, symbol: "Cs", name: "铯", mass: "132.91", block: "s", melting: "28.44°C", boiling: "671°C", density: "1.873 g/cm³", electron: "[Xe] 6s¹", crystal: "体心立方" },
            { number: 56, symbol: "Ba", name: "钡", mass: "137.33", block: "s", melting: "727°C", boiling: "1897°C", density: "3.594 g/cm³", electron: "[Xe] 6s²", crystal: "体心立方" },
            { number: 57, symbol: "La", name: "镧", mass: "138.91", block: "f", melting: "920°C", boiling: "3464°C", density: "6.145 g/cm³", electron: "[Xe] 5d¹ 6s²", crystal: "六方" },
            { number: 58, symbol: "Ce", name: "铈", mass: "140.12", block: "f", melting: "795°C", boiling: "3443°C", density: "6.770 g/cm³", electron: "[Xe] 4f¹ 5d¹ 6s²", crystal: "面心立方" },
            { number: 59, symbol: "Pr", name: "镨", mass: "140.91", block: "f", melting: "935°C", boiling: "3520°C", density: "6.773 g/cm³", electron: "[Xe] 4f³ 6s²", crystal: "六方" },
            { number: 60, symbol: "Nd", name: "钕", mass: "144.24", block: "f", melting: "1024°C", boiling: "3074°C", density: "7.007 g/cm³", electron: "[Xe] 4f⁴ 6s²", crystal: "六方" },
            { number: 61, symbol: "Pm", name: "钷", mass: "145", block: "f", melting: "1042°C", boiling: "3000°C", density: "7.26 g/cm³", electron: "[Xe] 4f⁵ 6s²", crystal: "六方" },
            { number: 62, symbol: "Sm", name: "钐", mass: "150.36", block: "f", melting: "1072°C", boiling: "1900°C", density: "7.52 g/cm³", electron: "[Xe] 4f⁶ 6s²", crystal: "三方" },
            { number: 63, symbol: "Eu", name: "铕", mass: "151.96", block: "f", melting: "822°C", boiling: "1529°C", density: "5.243 g/cm³", electron: "[Xe] 4f⁷ 6s²", crystal: "体心立方" },
            { number: 64, symbol: "Gd", name: "钆", mass: "157.25", block: "f", melting: "1312°C", boiling: "3273°C", density: "7.895 g/cm³", electron: "[Xe] 4f⁷ 5d¹ 6s²", crystal: "六方" },
            { number: 65, symbol: "Tb", name: "铽", mass: "158.93", block: "f", melting: "1356°C", boiling: "3230°C", density: "8.229 g/cm³", electron: "[Xe] 4f⁹ 6s²", crystal: "六方" },
            { number: 66, symbol: "Dy", name: "镝", mass: "162.50", block: "f", melting: "1407°C", boiling: "2567°C", density: "8.55 g/cm³", electron: "[Xe] 4f¹⁰ 6s²", crystal: "六方" },
            { number: 67, symbol: "Ho", name: "钬", mass: "164.93", block: "f", melting: "1461°C", boiling: "2720°C", density: "8.795 g/cm³", electron: "[Xe] 4f¹¹ 6s²", crystal: "六方" },
            { number: 68, symbol: "Er", name: "铒", mass: "167.26", block: "f", melting: "1529°C", boiling: "2868°C", density: "9.066 g/cm³", electron: "[Xe] 4f¹² 6s²", crystal: "六方" },
            { number: 69, symbol: "Tm", name: "铥", mass: "168.93", block: "f", melting: "1545°C", boiling: "1950°C", density: "9.321 g/cm³", electron: "[Xe] 4f¹³ 6s²", crystal: "六方" },
            { number: 70, symbol: "Yb", name: "镱", mass: "173.05", block: "f", melting: "819°C", boiling: "1196°C", density: "6.965 g/cm³", electron: "[Xe] 4f¹⁴ 6s²", crystal: "面心立方" },
            { number: 71, symbol: "Lu", name: "镥", mass: "174.97", block: "f", melting: "1663°C", boiling: "3402°C", density: "9.841 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹ 6s²", crystal: "六方" },
            { number: 72, symbol: "Hf", name: "铪", mass: "178.49", block: "d", melting: "2233°C", boiling: "4603°C", density: "13.31 g/cm³", electron: "[Xe] 4f¹⁴ 5d² 6s²", crystal: "六方" },
            { number: 73, symbol: "Ta", name: "钽", mass: "180.95", block: "d", melting: "3017°C", boiling: "5458°C", density: "16.654 g/cm³", electron: "[Xe] 4f¹⁴ 5d³ 6s²", crystal: "体心立方" },
            { number: 74, symbol: "W", name: "钨", mass: "183.84", block: "d", melting: "3422°C", boiling: "5555°C", density: "19.25 g/cm³", electron: "[Xe] 4f¹⁴ 5d⁴ 6s²", crystal: "体心立方" },
            { number: 75, symbol: "Re", name: "铼", mass: "186.21", block: "d", melting: "3186°C", boiling: "5596°C", density: "21.02 g/cm³", electron: "[Xe] 4f¹⁴ 5d⁵ 6s²", crystal: "六方" },
            { number: 76, symbol: "Os", name: "锇", mass: "190.23", block: "d", melting: "3033°C", boiling: "5012°C", density: "22.59 g/cm³", electron: "[Xe] 4f¹⁴ 5d⁶ 6s²", crystal: "六方" },
            { number: 77, symbol: "Ir", name: "铱", mass: "192.22", block: "d", melting: "2446°C", boiling: "4428°C", density: "22.56 g/cm³", electron: "[Xe] 4f¹⁴ 5d⁷ 6s²", crystal: "面心立方" },
            { number: 78, symbol: "Pt", name: "铂", mass: "195.08", block: "d", melting: "1768.3°C", boiling: "3825°C", density: "21.46 g/cm³", electron: "[Xe] 4f¹⁴ 5d⁹ 6s¹", crystal: "面心立方" },
            { number: 79, symbol: "Au", name: "金", mass: "196.97", block: "ds", melting: "1064.18°C", boiling: "2856°C", density: "19.32 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", crystal: "面心立方" },
            { number: 80, symbol: "Hg", name: "汞", mass: "200.59", block: "ds", melting: "-38.83°C", boiling: "356.73°C", density: "13.534 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s²", crystal: "三方" },
            { number: 81, symbol: "Tl", name: "铊", mass: "204.38", block: "p", melting: "304°C", boiling: "1473°C", density: "11.85 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", crystal: "六方" },
            { number: 82, symbol: "Pb", name: "铅", mass: "207.2", block: "p", melting: "327.46°C", boiling: "1749°C", density: "11.34 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", crystal: "面心立方" },
            { number: 83, symbol: "Bi", name: "铋", mass: "208.98", block: "p", melting: "271.5°C", boiling: "1564°C", density: "9.78 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", crystal: "三方" },
            { number: 84, symbol: "Po", name: "钋", mass: "209", block: "p", melting: "254°C", boiling: "962°C", density: "9.196 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", crystal: "立方" },
            { number: 85, symbol: "At", name: "砹", mass: "210", block: "p", melting: "302°C", boiling: "337°C", density: "7 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", crystal: "面心立方" },
            { number: 86, symbol: "Rn", name: "氡", mass: "222", block: "o", melting: "-71°C", boiling: "-61.7°C", density: "0.00973 g/cm³", electron: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", crystal: "面心立方" },
            { number: 87, symbol: "Fr", name: "钫", mass: "223", block: "s", melting: "27°C", boiling: "677°C", density: "1.87 g/cm³", electron: "[Rn] 7s¹", crystal: "体心立方" },
            { number: 88, symbol: "Ra", name: "镭", mass: "226", block: "s", melting: "700°C", boiling: "1737°C", density: "5.5 g/cm³", electron: "[Rn] 7s²", crystal: "体心立方" },
            { number: 89, symbol: "Ac", name: "锕", mass: "227", block: "f", melting: "1050°C", boiling: "3200°C", density: "10.07 g/cm³", electron: "[Rn] 6d¹ 7s²", crystal: "面心立方" },
            { number: 90, symbol: "Th", name: "钍", mass: "232.04", block: "f", melting: "1750°C", boiling: "4788°C", density: "11.72 g/cm³", electron: "[Rn] 6d² 7s²", crystal: "面心立方" },
            { number: 91, symbol: "Pa", name: "镤", mass: "231.04", block: "f", melting: "1572°C", boiling: "4000°C", density: "15.37 g/cm³", electron: "[Rn] 5f² 6d¹ 7s²", crystal: "四方" },
            { number: 92, symbol: "U", name: "铀", mass: "238.03", block: "f", melting: "1132.2°C", boiling: "4131°C", density: "19.05 g/cm³", electron: "[Rn] 5f³ 6d¹ 7s²", crystal: "正交" },
            { number: 93, symbol: "Np", name: "镎", mass: "237", block: "f", melting: "644°C", boiling: "4000°C", density: "20.45 g/cm³", electron: "[Rn] 5f⁴ 6d¹ 7s²", crystal: "正交" },
            { number: 94, symbol: "Pu", name: "钚", mass: "244", block: "f", melting: "639.4°C", boiling: "3228°C", density: "19.84 g/cm³", electron: "[Rn] 5f⁶ 7s²", crystal: "单斜" },
            { number: 95, symbol: "Am", name: "镅", mass: "243", block: "f", melting: "1176°C", boiling: "2011°C", density: "12 g/cm³", electron: "[Rn] 5f⁷ 7s²", crystal: "六方" },
            { number: 96, symbol: "Cm", name: "锔", mass: "247", block: "f", melting: "1340°C", boiling: "3110°C", density: "13.51 g/cm³", electron: "[Rn] 5f⁷ 6d¹ 7s²", crystal: "六方" },
            { number: 97, symbol: "Bk", name: "锫", mass: "247", block: "f", melting: "986°C", boiling: "2627°C", density: "14.78 g/cm³", electron: "[Rn] 5f⁹ 7s²", crystal: "六方" },
            { number: 98, symbol: "Cf", name: "锎", mass: "251", block: "f", melting: "900°C", boiling: "1470°C", density: "15.1 g/cm³", electron: "[Rn] 5f¹⁰ 7s²", crystal: "六方" },
            { number: 99, symbol: "Es", name: "锿", mass: "252", block: "f", melting: "860°C", boiling: "996°C", density: "8.84 g/cm³", electron: "[Rn] 5f¹¹ 7s²", crystal: "面心立方" },
            { number: 100, symbol: "Fm", name: "镄", mass: "257", block: "f", melting: "1527°C", boiling: "未知", density: "未知", electron: "[Rn] 5f¹² 7s²", crystal: "未知" },
            { number: 101, symbol: "Md", name: "钔", mass: "258", block: "f", melting: "827°C", boiling: "未知", density: "未知", electron: "[Rn] 5f¹³ 7s²", crystal: "未知" },
            { number: 102, symbol: "No", name: "锘", mass: "259", block: "f", melting: "827°C", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 7s²", crystal: "未知" },
            { number: 103, symbol: "Lr", name: "铹", mass: "262", block: "f", melting: "1627°C", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 7s² 7p¹", crystal: "未知" },
            { number: 104, symbol: "Rf", name: "𬬻", mass: "267", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d² 7s²", crystal: "未知" },
            { number: 105, symbol: "Db", name: "𬭊", mass: "268", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d³ 7s²", crystal: "未知" },
            { number: 106, symbol: "Sg", name: "𬭳", mass: "271", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁴ 7s²", crystal: "未知" },
            { number: 107, symbol: "Bh", name: "𬭛", mass: "272", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁵ 7s²", crystal: "未知" },
            { number: 108, symbol: "Hs", name: "𬭶", mass: "270", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁶ 7s²", crystal: "未知" },
            { number: 109, symbol: "Mt", name: "鿏", mass: "276", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁷ 7s²", crystal: "未知" },
            { number: 110, symbol: "Ds", name: "𫟼", mass: "281", block: "d", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁸ 7s²", crystal: "未知" },
            { number: 111, symbol: "Rg", name: "𬬭", mass: "280", block: "ds", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d⁹ 7s²", crystal: "未知" },
            { number: 112, symbol: "Cn", name: "鿔", mass: "285", block: "ds", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s²", crystal: "未知" },
            { number: 113, symbol: "Nh", name: "鿭", mass: "284", block: "p", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", crystal: "未知" },
            { number: 114, symbol: "Fl", name: "𫓧", mass: "289", block: "p", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", crystal: "未知" },
            { number: 115, symbol: "Mc", name: "镆", mass: "288", block: "p", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", crystal: "未知" },
            { number: 116, symbol: "Lv", name: "𫟷", mass: "293", block: "p", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", crystal: "未知" },
            { number: 117, symbol: "Ts", name: "鿬", mass: "294", block: "p", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", crystal: "未知" },
            { number: 118, symbol: "Og", name: "鿫", mass: "294", block: "o", melting: "未知", boiling: "未知", density: "未知", electron: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶", crystal: "未知" }
        ];

        // 元素周期表布局
        const layout = [
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],
            [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],
            [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
            [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
            [55, 56, 57, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
            [87, 88, 89, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 0, 0],
            [0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 0, 0]
        ];

        // 族序数
        const groupNumbers = ["IA", "IIA", "", "", "", "", "", "", "", "", "", "", "IIIB", "IVB", "VB", "VIB", "VIIB", "VIII", "VIII", "VIII", "IB", "IIB", "IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"];

        // 流星雨粒子系统
        class MeteorParticleSystem {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.particles = [];
                this.resizeCanvas();
                
                window.addEventListener('resize', () => this.resizeCanvas());
                
                // 创建初始粒子
                for (let i = 0; i < 50; i++) {
                    this.particles.push(this.createParticle());
                }
                
                this.animate();
            }
            
            resizeCanvas() {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
            
            createParticle() {
                // 流星雨粒子效果颜色
                const colors = [
                    'rgba(255, 255, 255, 0.8)',  // 白色
                    'rgba(200, 230, 255, 0.8)',  // 浅蓝色
                    'rgba(230, 255, 230, 0.8)',  // 浅绿色
                    'rgba(255, 230, 255, 0.8)',  // 浅粉色
                    'rgba(255, 255, 200, 0.8)',  // 浅黄色
                    'rgba(230, 255, 255, 0.8)'   // 浅青色
                ];
                
                return {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * -this.canvas.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 5 + 3,
                    size: Math.random() * 3 + 1,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 1,
                    decay: Math.random() * 0.005 + 0.002
                };
            }
            
            updateParticles() {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= p.decay;
                    
                    // 粒子消失或离开屏幕时重新生成
                    if (p.life <= 0 || p.y > this.canvas.height || p.x < 0 || p.x > this.canvas.width) {
                        this.particles.splice(i, 1);
                        this.particles.push(this.createParticle());
                    }
                }
            }
            
            drawParticles() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                for (const p of this.particles) {
                    this.ctx.save();
                    this.ctx.globalAlpha = p.life;
                    
                    // 绘制流星尾巴
                    const gradient = this.ctx.createLinearGradient(
                        p.x, p.y, 
                        p.x - p.vx * 10, p.y - p.vy * 10
                    );
                    gradient.addColorStop(0, p.color);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = p.size;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p.x - p.vx * 10, p.y - p.vy * 10);
                    this.ctx.stroke();
                    
                    // 绘制流星头部
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                }
            }
            
            animate() {
                this.updateParticles();
                this.drawParticles();
                requestAnimationFrame(() => this.animate());
            }
        }

        // 初始化族序数
        function initGroupNumbers() {
            const groupNumbersContainer = document.getElementById('groupNumbers');
            groupNumbersContainer.innerHTML = '';
            
            for (let i = 0; i < 18; i++) {
                const groupNumberDiv = document.createElement('div');
                groupNumberDiv.className = 'group-number';
                groupNumberDiv.textContent = groupNumbers[i] || (i + 1);
                groupNumbersContainer.appendChild(groupNumberDiv);
            }
        }

        // 初始化周期表
        function initPeriodicTable() {
            const table = document.getElementById('periodicTable');
            table.innerHTML = '';
            
            for (let row = 0; row < layout.length; row++) {
                for (let col = 0; col < layout[row].length; col++) {
                    const elementNumber = layout[row][col];
                    
                    if (elementNumber === 0) {
                        // 空单元格
                        const emptyCell = document.createElement('div');
                        emptyCell.className = 'element empty';
                        table.appendChild(emptyCell);
                    } else {
                        // 查找元素数据
                        const elementData = elements.find(el => el.number === elementNumber);
                        
                        if (elementData) {
                            const elementDiv = document.createElement('div');
                            elementDiv.className = `element ${elementData.block}-block`;
                            elementDiv.dataset.number = elementData.number;
                            
                            elementDiv.innerHTML = `
                                <div class="atomic-number">${elementData.number}</div>
                                <div class="symbol">${elementData.symbol}</div>
                                <div class="name">${elementData.name}</div>
                                <div class="atomic-mass">${elementData.mass}</div>
                            `;
                            
                            // 添加点击事件 —— 已移除自动切换到3D视图的调用
                            elementDiv.addEventListener('click', function(event) {
                                // 所有元素统一显示info-card
                                showElementInfo(elementData, this);
                                
                                // 注意：此处已删除 switchTo3DView(); 以满足需求，不再自动切换视图
                                
                                // 移除其他元素的active类
                                document.querySelectorAll('.element').forEach(el => {
                                    el.classList.remove('active');
                                });
                                
                                // 添加当前元素的active类
                                this.classList.add('active');
                                
                                // 阻止事件冒泡
                                event.stopPropagation();
                            });
                            
                            table.appendChild(elementDiv);
                        } else {
                            // 没有数据的元素
                            const elementDiv = document.createElement('div');
                            elementDiv.className = 'element';
                            elementDiv.textContent = elementNumber;
                            table.appendChild(elementDiv);
                        }
                    }
                }
            }
        }

        // 当前信息卡片对应的元素数据（供移动端展开晶胞 / 电子排布使用）
        let currentInfoElement = null;

        // 显示元素信息
        function showElementInfo(element, elementDom) {
            currentInfoElement = element;
            document.getElementById('elementName').textContent = element.name;
            document.getElementById('elementSymbol').textContent = element.symbol;
            document.getElementById('elementAtomicMass').textContent = element.mass;
            document.getElementById('elementMeltingPoint').textContent = element.melting;
            document.getElementById('elementBoilingPoint').textContent = element.boiling;
            document.getElementById('elementDensity').textContent = element.density;
            document.getElementById('elementElectronConfig').textContent = element.electron;
            document.getElementById('elementCrystalType').textContent = element.crystal;
            document.getElementById('fullElectronConfig').textContent = element.fullElectron || element.electron;
            
            // 显示3D电子模型
            showElectronModel3D(element);
            
            // 创建3D晶体结构
            createCrystalStructure(element);
            
            // 获取元素位置并设置弹框位置
            const card = document.getElementById('infoCard');
            const elementRect = elementDom.getBoundingClientRect();
            
            // 获取卡片尺寸，使用getBoundingClientRect以确保准确性
            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width || 320; // 默认宽度320px
            const cardHeight = cardRect.height || 400; // 默认高度400px
            
            // sub-info-card的宽度（晶体结构3D图卡片）
            const subCardWidth = 320;
            
            // 计算弹框位置（在元素右侧）
            let cardLeft = elementRect.right + 20;
            let cardTop = elementRect.top;
            
            // 确保弹框不会超出视口边界
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 判断是否需要将卡片显示在左侧
            // 需要考虑sub-info-card的宽度，确保晶体结构3D图也能完整显示
            const totalWidth = cardWidth + subCardWidth + 40; // 40是额外边距
            const isRightEdge = cardLeft + totalWidth > viewportWidth;
            
            // 如果右侧空间不足，则显示在元素左侧
            if (isRightEdge) {
                cardLeft = elementRect.left - cardWidth - 20;
            }
            
            // 如果弹框超出视口顶部，则向下调整
            if (cardTop < 20) {
                cardTop = 20;
            }
            
            // 如果弹框超出视口底部，则向上调整
            if (cardTop + cardHeight > viewportHeight - 20) {
                cardTop = viewportHeight - cardHeight - 20;
            }
            
            // 设置弹框位置
            card.style.left = cardLeft + 'px';
            card.style.top = cardTop + 'px';
            
            // 根据卡片位置添加/移除right-edge类，控制sub-info-card的显示方向
            if (isRightEdge) {
                card.classList.add('right-edge');
            } else {
                card.classList.remove('right-edge');
            }
            
            // 显示信息卡片
            card.classList.add('active');

            // 切换元素时收起已展开的子内容
            card.querySelectorAll('.property.interactive').forEach(row => {
                row.classList.remove('mobile-open');
            });

            // 为元素名称添加点击事件
            const elementNameElement = document.getElementById('elementName');
            // [两步揭秘] 钙元素：点击绿色元素名称跳转到揭秘模态框
            if (element.symbol === 'Ca' || element.number === 20) {
                elementNameElement.onclick = function() {
                    // 先关闭info-card
                    document.getElementById('infoCard').classList.remove('active');
                    // 显示钙元素揭秘模态框
                    showCalciumRevealModal(element);
                };
            } else {
                // 其他元素：点击绿色元素名称显示详细弹窗
                elementNameElement.onclick = function() {
                    showElementDetailModal(element);
                };
            }

            setupInteractiveRowToggle();
        }

        // 移动端：触屏没有 hover，点击“价电子排布 / 晶体类型”行时在卡片内展开子内容
        function setupInteractiveRowToggle() {
            const card = document.getElementById('infoCard');
            if (!card || card.dataset.rowToggleBound === '1') return;
            card.dataset.rowToggleBound = '1';

            card.querySelectorAll('.property.interactive').forEach(row => {
                row.addEventListener('click', function(event) {
                    if (event.target.closest('.sub-info-card')) return;
                    if (window.innerWidth > 768 && window.innerHeight > 500) return;

                    const isOpen = row.classList.contains('mobile-open');
                    card.querySelectorAll('.property.interactive').forEach(r => r.classList.remove('mobile-open'));
                    if (isOpen) return;

                    row.classList.add('mobile-open');

                    // 容器从 display:none 变为可见后，需要重新计算 Three.js 渲染尺寸
                    if (row.querySelector('.crystal-structure')) {
                        requestAnimationFrame(() => {
                            if (crystalScene) {
                                onCrystalWindowResize();
                            } else if (currentInfoElement) {
                                createCrystalStructure(currentInfoElement);
                            }
                        });
                    }

                    setTimeout(() => row.scrollIntoView({ block: 'nearest' }), 60);
                });
            });
        }

        // 显示元素详细弹窗
        function showElementDetailModal(element) {
            document.getElementById('detailElementName').textContent = element.name;
            document.getElementById('detailElementSymbol').textContent = element.symbol;
            document.getElementById('detailElementNumber').textContent = element.number;
            document.getElementById('detailElementMass').textContent = element.mass;
            
            // 根据block值显示元素分区
            let blockName = "";
            switch(element.block) {
                case "s": blockName = "s区"; break;
                case "p": blockName = "p区"; break;
                case "d": blockName = "d区"; break;
                case "ds": blockName = "ds区"; break;
                case "f": blockName = "f区"; break;
                case "o": blockName = "o区"; break;
                default: blockName = element.block;
            }
            document.getElementById('detailElementBlock').textContent = blockName;
            
            // 从description文件夹中的txt文件加载元素简介
            loadElementDescription(element);
            
            // 加载元素图片
            loadElementImage(element);
            
            // 显示详细弹窗
            document.getElementById('elementDetailModal').classList.add('active');
        }

        function getLegacyElementLocalName(element) {
            if (!element || typeof element !== 'object') {
                return '未知元素';
            }
            if (typeof element.name === 'string' && element.name.trim()) {
                return element.name.trim();
            }
            if (typeof element.symbol === 'string' && element.symbol.trim()) {
                return element.symbol.trim();
            }
            return '未知元素';
        }

        function getLegacyRemoteImageUrl(element) {
            if (!element || typeof element !== 'object') {
                return '';
            }
            const imageField = element.image;
            const rawUrl = imageField
                ? (typeof imageField === 'string'
                    ? imageField
                    : (typeof imageField.url === 'string' ? imageField.url : ''))
                : '';

            if (!rawUrl) {
                if (typeof element.symbol === 'string' && window.__periodicTableRemoteImageBySymbol) {
                    return window.__periodicTableRemoteImageBySymbol[element.symbol] || '';
                }
                return '';
            }

            const wikiFilePrefix = 'https://en.wikipedia.org/wiki/File:';
            if (rawUrl.startsWith(wikiFilePrefix)) {
                const fileName = rawUrl.slice(wikiFilePrefix.length);
                return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`;
            }

            return rawUrl;
        }

        function legacyHasKnownLocalImage(element) {
            const elementLocalName = getLegacyElementLocalName(element);
            const knownLocalImageNames = Array.isArray(window.__periodicTableKnownLocalImageNames)
                ? window.__periodicTableKnownLocalImageNames
                : [];
            return knownLocalImageNames.includes(elementLocalName);
        }

        // 从description文件夹中的txt文件加载元素简介 - 优化版本
        function loadElementDescription(element) {
            const descriptionElement = document.getElementById('detailElementDescription');
            if (!descriptionElement) {
                return;
            }
            descriptionElement.textContent = "加载简介中...";
            
            // 使用Promise.race实现超时控制
            const elementLocalName = getLegacyElementLocalName(element);
            const fetchPromise = fetch(`description/${encodeURIComponent(elementLocalName)}.txt`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.text();
                })
                .then(text => {
                    if (text.trim().length === 0) {
                        throw new Error('空文件');
                    }
                    return text;
                });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('请求超时')), 5000);
            });
            
            Promise.race([fetchPromise, timeoutPromise])
                .then(text => {
                    descriptionElement.textContent = text;
                })
                .catch(error => {
                    console.error(`加载 ${elementLocalName} 简介失败:`, error);
                    
                    if (error.message.includes('HTTP 404') || error.message.includes('Failed to fetch')) {
                        descriptionElement.textContent = 
                            `暂无 ${elementLocalName} 元素的详细介绍。\n\n` +
                            `💡 提示：请使用本地服务器运行此项目：\n` +
                            `• Python: python -m http.server\n` +
                            `• Node.js: npx http-server\n` +
                            `• 确保description文件夹包含 ${elementLocalName}.txt 文件`;
                        
                        // 显示服务器提示
                        const serverHint = document.getElementById('serverHint');
                        if (serverHint) {
                            serverHint.style.display = 'block';
                        }
                    } else if (error.message.includes('请求超时')) {
                        descriptionElement.textContent = "加载超时，请检查网络连接或文件大小。";
                    } else {
                        descriptionElement.textContent = "加载简介时发生错误，请稍后重试。";
                    }
                });
        }

        // [两步揭秘] 钙元素翻转状态变量
        let calciumIsFlipped = false;

        // [两步揭秘] 显示钙元素揭秘模态框
        function showCalciumRevealModal(element) {
            const overlay = document.getElementById('calciumRevealOverlay');
            const card = document.getElementById('calciumRevealCard');
            const frontImage = document.getElementById('calciumFrontImage');
            const backImage = document.getElementById('calciumBackImage');
            
            // 重置翻转状态
            calciumIsFlipped = false;
            card.classList.remove('flipped');
            
            // 显示加载状态
            frontImage.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #8892b0;">
                    <div style="width: 50px; height: 50px; border: 4px solid #8892b0; border-top: 4px solid #64ffda; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                    <div style="font-size: 1rem;">加载图片中...</div>
                </div>
            `;
            frontImage.style.backgroundImage = 'none';
            
            // 设置背面真实图
            const elementLocalName = getLegacyElementLocalName(element);
            const remoteImageUrl = getLegacyRemoteImageUrl(element);
            const localImageUrl = `image/${encodeURIComponent(elementLocalName)}.jpg?t=${Date.now()}`;
            const realImageSrc = legacyHasKnownLocalImage(element) ? localImageUrl : remoteImageUrl;
            
            // 加载描述文字
            loadCalciumDescription();
            
            // 并行加载两张图片
            let imagesLoaded = 0;
            const totalImages = 2;
            
            // 加载正面日常认知图
            const frontImg = new Image();
            frontImg.onload = function() {
                frontImage.style.backgroundImage = `url('image/钙元素日常认知.jpg')`;
                frontImage.innerHTML = `
                    <div class="calcium-front-overlay">
                        <div class="calcium-front-hint">点击图片，揭秘真实面貌</div>
                    </div>
                `;
                checkAllLoaded();
            };
            frontImg.onerror = function() {
                // 加载失败时显示占位图
                frontImage.style.backgroundImage = 'none';
                frontImage.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64ffda;">
                        <div style="font-size: 4rem; margin-bottom: 15px;">💊</div>
                        <div style="font-size: 1.2rem; text-align: center; padding: 0 20px;">钙片/牛奶等<br/>白色固体印象</div>
                    </div>
                    <div class="calcium-front-overlay">
                        <div class="calcium-front-hint">点击图片，揭秘真实面貌</div>
                    </div>
                `;
                checkAllLoaded();
            };
            frontImg.src = 'image/钙元素日常认知.jpg';
            
            // 加载背面真实图
            backImage.onload = function() {
                checkAllLoaded();
            };
            backImage.onerror = function() {
                this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="%231a1a2e" width="300" height="300"/><text fill="%2364ffda" font-family="Arial" font-size="16" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">银白色金属</text></svg>';
                checkAllLoaded();
            };
            backImage.src = realImageSrc;
            
            function checkAllLoaded() {
                imagesLoaded++;
                if (imagesLoaded >= totalImages) {
                    // 所有图片加载完成后显示模态框
                    overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        }

        // [两步揭秘] 关闭钙元素揭秘模态框
        function closeCalciumRevealModal() {
            const overlay = document.getElementById('calciumRevealOverlay');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // [两步揭秘] 切换钙元素卡片翻转
        function toggleCalciumCard() {
            const card = document.getElementById('calciumRevealCard');
            const frontHint = document.querySelector('.calcium-front-hint');
            const backHint = document.querySelector('.calcium-back-hint');
            
            calciumIsFlipped = !calciumIsFlipped;
            card.classList.toggle('flipped', calciumIsFlipped);
            
            // 更新提示文字
            if (calciumIsFlipped) {
                frontHint.textContent = '点击翻转查看日常认知';
                backHint.textContent = '点击翻转查看日常认知';
            } else {
                frontHint.textContent = '点击图片，揭秘真实面貌';
                backHint.textContent = '点击翻转查看日常认知';
            }
        }

        // [两步揭秘] 加载钙元素描述
        function loadCalciumDescription() {
            const descriptionElement = document.getElementById('calciumDescription');
            descriptionElement.innerHTML = '<div class="loading">加载中...</div>';
            
            fetch('description/钙.txt')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('加载失败');
                    }
                    return response.text();
                })
                .then(text => {
                    if (text.trim().length === 0) {
                        throw new Error('空文件');
                    }
                    descriptionElement.innerHTML = text.trim();
                    descriptionElement.classList.remove('loading');
                })
                .catch(() => {
                    descriptionElement.innerHTML = '暂无详细介绍';
                    descriptionElement.classList.remove('loading');
                });
        }

        // [两步揭秘] 钙元素揭秘模态框初始化
        function initCalciumRevealModal() {
            const overlay = document.getElementById('calciumRevealOverlay');
            const card = document.getElementById('calciumRevealCard');
            const closeBtn = document.getElementById('calciumRevealClose');
            
            // 点击卡片翻转
            card.addEventListener('click', function(event) {
                // 阻止事件冒泡到遮罩层
                event.stopPropagation();
                toggleCalciumCard();
            });
            
            // 点击关闭按钮关闭
            closeBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                closeCalciumRevealModal();
            });
            
            // 点击遮罩层关闭
            overlay.addEventListener('click', function(event) {
                if (event.target === overlay) {
                    closeCalciumRevealModal();
                }
            });
            
            // ESC键关闭
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && overlay.classList.contains('active')) {
                    closeCalciumRevealModal();
                }
            });
            
            // 图片加载失败时显示占位图
            const backImage = document.getElementById('calciumBackImage');
            backImage.onerror = function() {
                this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="%231a1a2e" width="300" height="300"/><text fill="%2364ffda" font-family="Arial" font-size="16" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">银白色金属</text></svg>';
            };
            
            // 正面图加载失败时显示占位图
            const frontImage = document.getElementById('calciumFrontImage');
            frontImage.onerror = function() {
                frontImage.style.backgroundImage = 'none';
                frontImage.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64ffda;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">💊</div>
                        <div style="font-size: 1.2rem;">钙片/牛奶等</div>
                    </div>
                    <div class="calcium-front-overlay">
                        <div class="calcium-front-hint">点击图片，揭秘真实面貌</div>
                    </div>
                `;
            };
        }

        // 加载元素图片 - 从image子文件夹加载以中文名称为文件名的图片
        function loadElementImage(element) {
            const imageContainer = document.getElementById('elementDetailImage');
            if (!imageContainer) {
                return;
            }
            imageContainer.innerHTML = '';
            const elementLocalName = getLegacyElementLocalName(element);
            const remoteImageUrl = getLegacyRemoteImageUrl(element);
            const localImageUrl = `image/${encodeURIComponent(elementLocalName)}.jpg?t=${Date.now()}`;
            let hasTriedRemoteFallback = false;

            if (!legacyHasKnownLocalImage(element) && !remoteImageUrl) {
                imageContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #8892b0;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📷</div>
                        <div>暂无可用图片</div>
                        <div style="font-size: 0.8rem; margin-top: 5px;">当前资源包没有 ${elementLocalName}.jpg，且该元素暂无可用远程图片</div>
                    </div>
                `;
                return;
            }

            // 创建图片元素（所有元素统一处理）
            const img = document.createElement('img');
            img.alt = elementLocalName;
            
            // 创建加载状态指示器
            const loader = document.createElement('div');
            loader.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #8892b0;">
                    <div style="width: 40px; height: 40px; border: 3px solid #8892b0; border-top: 3px solid #64ffda; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
                    加载图片中...
                </div>
            `;
            imageContainer.appendChild(loader);
            
            img.onload = function() {
                console.log(`成功加载图片: image/${elementLocalName}.jpg`);
                loader.remove();
                imageContainer.appendChild(img);
                
                // 添加点击事件，点击图片时放大显示
                img.addEventListener('click', function() {
                    showImageModal(this.src, elementLocalName);
                });
            };
            
            img.onerror = function() {
                if (!hasTriedRemoteFallback && remoteImageUrl) {
                    hasTriedRemoteFallback = true;
                    console.log(`本地图片缺失，回退远程图片: ${remoteImageUrl}`);
                    img.src = remoteImageUrl;
                    return;
                }

                console.log(`无法加载图片: ${localImageUrl}`);
                loader.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #8892b0;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📷</div>
                        <div>图片加载失败</div>
                        <div style="font-size: 0.8rem; margin-top: 5px;">请检查 image/${elementLocalName}.jpg，若本地缺失则补充远程图片地址</div>
                    </div>
                `;
            };
            
            // 设置图片源 - 仅在确认本地存在时走本地，否则直接走远程
            img.src = legacyHasKnownLocalImage(element) ? localImageUrl : remoteImageUrl;
        }

        // 显示图片放大模态框
        function showImageModal(imageSrc, elementName) {
            const modal = document.getElementById('imageModal');
            const modalImage = document.getElementById('modalImage');
            
            // 设置图片源和alt属性
            modalImage.src = imageSrc;
            modalImage.alt = elementName + '放大图片';
            
            // 显示模态框
            modal.classList.add('active');
            
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
        }

        // 关闭图片放大模态框
        function closeImageModal() {
            const modal = document.getElementById('imageModal');
            modal.classList.remove('active');
            
            // 恢复背景滚动
            document.body.style.overflow = '';
        }
        
        // 电子亚层配置
        const subshellConfig = {
            s: { maxElectrons: 2, shape: 'circle', color: '#64ffda', offsetY: 0 },
            p: { maxElectrons: 6, shape: 'dumbbell', color: '#f093fb', offsetY: -15 },
            d: { maxElectrons: 10, shape: 'clover', color: '#f5576c', offsetY: -30 },
            f: { maxElectrons: 14, shape: 'complex', color: '#4facfe', offsetY: -45 }
        };
        
        // 洪特规则特例元素 - 需要特殊处理的元素及其实际电子排布
        const specialElements = {
            'Cr': { electron: '[Ar] 3d⁵ 4s¹', valenceElectrons: 6 },
            'Cu': { electron: '[Ar] 3d¹⁰ 4s¹', valenceElectrons: 1 },
            'Mo': { electron: '[Kr] 4d⁵ 5s¹', valenceElectrons: 6 },
            'Ag': { electron: '[Kr] 4d¹⁰ 5s¹', valenceElectrons: 1 },
            'Au': { electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', valenceElectrons: 1 },
            'Nb': { electron: '[Kr] 4d⁴ 5s¹', valenceElectrons: 5 },
            'Ru': { electron: '[Kr] 4d⁷ 5s¹', valenceElectrons: 8 },
            'Rh': { electron: '[Kr] 4d⁸ 5s¹', valenceElectrons: 9 },
            'Pd': { electron: '[Kr] 4d¹⁰', valenceElectrons: 0 },
            'Pt': { electron: '[Xe] 4f¹⁴ 5d⁹ 6s¹', valenceElectrons: 10 },
            'La': { electron: '[Xe] 5d¹ 6s²', valenceElectrons: 3 },
            'Ce': { electron: '[Xe] 4f¹ 5d¹ 6s²', valenceElectrons: 4 },
            'Gd': { electron: '[Xe] 4f⁷ 5d¹ 6s²', valenceElectrons: 3 },
            'Lu': { electron: '[Xe] 4f¹⁴ 5d¹ 6s²', valenceElectrons: 3 },
            'Ac': { electron: '[Rn] 6d¹ 7s²', valenceElectrons: 3 },
            'Th': { electron: '[Rn] 6d² 7s²', valenceElectrons: 4 },
            'Pa': { electron: '[Rn] 5f² 6d¹ 7s²', valenceElectrons: 5 },
            'U': { electron: '[Rn] 5f³ 6d¹ 7s²', valenceElectrons: 6 },
            'Np': { electron: '[Rn] 5f⁴ 6d¹ 7s²', valenceElectrons: 7 },
            'Cm': { electron: '[Rn] 5f⁷ 6d¹ 7s²', valenceElectrons: 3 }
        };
        
        // 计算元素的价电子数
        function calculateValenceElectrons(element) {
            const symbol = element.symbol || '';
            const atomicNumber = parseInt(element.number) || parseInt(element.atomicNumber) || 1;
            
            // 检查是否为洪特规则特例元素
            if (specialElements[symbol]) {
                return specialElements[symbol].valenceElectrons;
            }
            
            // 稀有气体（第18族）
            if (atomicNumber === 2 || atomicNumber === 10 || atomicNumber === 18 || 
                atomicNumber === 36 || atomicNumber === 54 || atomicNumber === 86 || atomicNumber === 118) {
                return 0;
            }
            
            // 主族元素（s区和p区）
            // 第1、2族：价电子数 = 族序数
            // 第13-17族：价电子数 = 族序数 - 10
            const group = getElementGroup(atomicNumber);
            if (group >= 1 && group <= 2) {
                return group;
            }
            if (group >= 13 && group <= 17) {
                return group - 10;
            }
            
            // 副族元素（d区）- 第3-12族
            if (group >= 3 && group <= 12) {
                // 对于过渡元素，通常价电子数为ns电子数
                // 简化处理：对于过渡金属，价电子数 = 最外层s电子数（通常为1或2）
                // 但为了路易斯结构，我们使用更简单的规则
                if (atomicNumber >= 21 && atomicNumber <= 30) {
                    // 第四周期过渡元素
                    const valenceMap = {21:3, 22:4, 23:5, 24:6, 25:7, 26:8, 27:9, 28:10, 29:1, 30:2};
                    return valenceMap[atomicNumber] || 2;
                }
                if (atomicNumber >= 39 && atomicNumber <= 48) {
                    // 第五周期过渡元素
                    const valenceMap = {39:3, 40:4, 41:5, 42:6, 43:7, 44:8, 45:9, 46:0, 47:1, 48:2};
                    return valenceMap[atomicNumber] || 2;
                }
                if (atomicNumber >= 72 && atomicNumber <= 80) {
                    // 第六周期过渡元素
                    const valenceMap = {72:4, 73:5, 74:6, 75:7, 76:8, 77:9, 78:10, 79:1, 80:2};
                    return valenceMap[atomicNumber] || 2;
                }
                if (atomicNumber >= 104 && atomicNumber <= 112) {
                    // 第七周期过渡元素
                    const valenceMap = {104:4, 105:5, 106:6, 107:7, 108:8, 109:9, 110:10, 111:1, 112:2};
                    return valenceMap[atomicNumber] || 2;
                }
                return Math.min(group, 8);
            }
            
            // 默认返回族序数（镧系、锕系）
            return Math.min(group, 3);
        }
        
        // 获取元素所在族
        function getElementGroup(atomicNumber) {
            // 稀有气体
            if (atomicNumber === 2 || atomicNumber === 10 || atomicNumber === 18 || 
                atomicNumber === 36 || atomicNumber === 54 || atomicNumber === 86 || atomicNumber === 118) {
                return 18;
            }
            
            // s区元素 (第1、2族)
            if (atomicNumber >= 1 && atomicNumber <= 2 || 
                atomicNumber >= 3 && atomicNumber <= 4 ||
                atomicNumber >= 11 && atomicNumber <= 12 ||
                atomicNumber >= 19 && atomicNumber <= 20 ||
                atomicNumber >= 37 && atomicNumber <= 38 ||
                atomicNumber >= 55 && atomicNumber <= 56 ||
                atomicNumber >= 87 && atomicNumber <= 88) {
                return atomicNumber % 2 === 1 ? Math.ceil(atomicNumber / 8) % 2 === 1 ? 1 : 1 + Math.floor(atomicNumber / 8) % 2 : 2;
            }
            
            // p区元素 (第13-18族)
            if (atomicNumber >= 5 && atomicNumber <= 10 ||
                atomicNumber >= 13 && atomicNumber <= 18 ||
                atomicNumber >= 31 && atomicNumber <= 36 ||
                atomicNumber >= 49 && atomicNumber <= 54 ||
                atomicNumber >= 81 && atomicNumber <= 86 ||
                atomicNumber >= 113 && atomicNumber <= 118) {
                const period = getPeriod(atomicNumber);
                const startOfPeriod = getPeriodStart(period);
                return 13 + (atomicNumber - startOfPeriod);
            }
            
            // d区元素 (第3-12族)
            if (atomicNumber >= 21 && atomicNumber <= 30 ||
                atomicNumber >= 39 && atomicNumber <= 48 ||
                atomicNumber >= 72 && atomicNumber <= 80 ||
                atomicNumber >= 104 && atomicNumber <= 112) {
                const period = getPeriod(atomicNumber);
                const startOfTransition = getPeriodStart(period) + 1;
                return 3 + (atomicNumber - startOfTransition);
            }
            
            // f区元素（镧系、锕系）- 通常显示为第3族
            return 3;
        }
        
        // 获取元素所在周期
        function getPeriod(atomicNumber) {
            if (atomicNumber <= 2) return 1;
            if (atomicNumber <= 10) return 2;
            if (atomicNumber <= 18) return 3;
            if (atomicNumber <= 36) return 4;
            if (atomicNumber <= 54) return 5;
            if (atomicNumber <= 86) return 6;
            return 7;
        }
        
        // 获取周期起始原子序数
        function getPeriodStart(period) {
            const starts = [0, 1, 3, 11, 19, 37, 55, 87];
            return starts[period] || 1;
        }
        
        // 从电子排布式解析价电子数
        function parseValenceFromConfig(config) {
            if (!config || typeof config !== 'string') return 0;
            
            // 匹配价电子构型（最外层s和p电子）
            const match = config.match(/\[.*?\]\s*([\dspdf]+)/);
            if (match) {
                const valencePart = match[1];
                let count = 0;
                
                // 解析每个轨道的电子数
                const orbitalMatches = valencePart.match(/(\d+)([spdf])(\d+)?/g) || [];
                for (const orbital of orbitalMatches) {
                    const [, n, l, electrons] = orbital.match(/(\d+)([spdf])(\d+)?/) || [];
                    const eCount = parseInt(electrons) || 1;
                    
                    // 对于过渡元素，考虑ns和(n-1)d电子
                    if (l === 's' || l === 'p') {
                        count += eCount;
                    } else if (l === 'd') {
                        // d轨道电子通常也参与成键
                        count += eCount;
                    }
                }
                
                return Math.min(count, 8);
            }
            
            return 0;
        }
        
        // 获取元素的电子排布数据
        function getElectronConfiguration(element) {
            // 简化的电子排布 - 根据原子序数计算
            const atomicNumber = parseInt(element.atomicNumber) || 12; // 默认镁
            
            // 电子填充顺序: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, 6s, 4f, 5d, 6p, 7s, 5f, 6d, 7p
            const orbitals = [
                { n: 1, l: 's', max: 2 },
                { n: 2, l: 's', max: 2 },
                { n: 2, l: 'p', max: 6 },
                { n: 3, l: 's', max: 2 },
                { n: 3, l: 'p', max: 6 },
                { n: 4, l: 's', max: 2 },
                { n: 3, l: 'd', max: 10 },
                { n: 4, l: 'p', max: 6 },
                { n: 5, l: 's', max: 2 },
                { n: 4, l: 'd', max: 10 },
                { n: 5, l: 'p', max: 6 },
                { n: 6, l: 's', max: 2 },
                { n: 4, l: 'f', max: 14 },
                { n: 5, l: 'd', max: 10 },
                { n: 6, l: 'p', max: 6 },
                { n: 7, l: 's', max: 2 },
                { n: 5, l: 'f', max: 14 },
                { n: 6, l: 'd', max: 10 },
                { n: 7, l: 'p', max: 6 }
            ];
            
            let remainingElectrons = atomicNumber;
            const config = [];
            
            for (const orbital of orbitals) {
                if (remainingElectrons <= 0) break;
                const electrons = Math.min(orbital.max, remainingElectrons);
                config.push({ ...orbital, electrons });
                remainingElectrons -= electrons;
            }
            
            return config;
        }
        
        // 显示核外电子排布图
        function showElectronModel3D(element) {
            const container = document.getElementById('electronModel3D');
            container.innerHTML = '';
            
            // 计算原子序数
            const atomicNumber = parseInt(element.number) || 1;
            
            // 创建电子排布图容器
            const diagramContainer = document.createElement('div');
            diagramContainer.className = 'electron-orbital-container';
            
            // 创建Canvas元素
            const canvas = document.createElement('canvas');
            canvas.className = 'electron-orbital-canvas';
            canvas.width = 280;
            canvas.height = 160;
            diagramContainer.appendChild(canvas);
            
            // 绘制电子排布图
            drawElectronOrbitalDiagram(canvas, atomicNumber);
            
            container.appendChild(diagramContainer);
        }
        
        // 绘制核外电子排布图
        function drawElectronOrbitalDiagram(canvas, atomicNumber) {
            const ctx = canvas.getContext('2d');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 定义轨道配置（半径、电子数、速度）
            const orbitals = [
                { radius: 20, maxElectrons: 2, speed: 0.002 },
                { radius: 45, maxElectrons: 8, speed: 0.0015 },
                { radius: 70, maxElectrons: 18, speed: 0.001 },
                { radius: 95, maxElectrons: 32, speed: 0.0005 }
            ];
            
            // 计算各轨道电子数
            let remainingElectrons = atomicNumber;
            const orbitalElectrons = [];
            
            for (const orbital of orbitals) {
                const electrons = Math.min(remainingElectrons, orbital.maxElectrons);
                orbitalElectrons.push(electrons);
                remainingElectrons -= electrons;
                if (remainingElectrons === 0) break;
            }
            
            // 绘制原子核
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6b6b';
            ctx.fill();
            ctx.shadowColor = '#ff6b6b';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // 绘制轨道
            for (let i = 0; i < orbitalElectrons.length; i++) {
                const orbital = orbitals[i];
                const electrons = orbitalElectrons[i];
                
                // 绘制轨道圆圈
                ctx.beginPath();
                ctx.arc(centerX, centerY, orbital.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(100, 255, 218, 0.5)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // 绘制电子
                for (let j = 0; j < electrons; j++) {
                    const angle = (j / electrons) * Math.PI * 2 + Date.now() * orbital.speed;
                    const x = centerX + Math.cos(angle) * orbital.radius;
                    const y = centerY + Math.sin(angle) * orbital.radius;
                    
                    // 绘制电子
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#64ffda';
                    ctx.fill();
                    ctx.shadowColor = '#64ffda';
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
            
            // 动画效果
            requestAnimationFrame(() => drawElectronOrbitalDiagram(canvas, atomicNumber));
        }
        
        // 绘制单个轨道
        function drawOrbital(svg, x, y, orbital) {
            const config = subshellConfig[orbital.l];
            const spacing = 18;
            
            // 轨道标签
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", x);
            label.setAttribute("y", y - 8);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", config.color);
            label.setAttribute("font-size", "11");
            label.setAttribute("font-weight", "bold");
            label.textContent = `${orbital.n}${orbital.l}`;
            svg.appendChild(label);
            
            // 轨道背景框
            const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            box.setAttribute("x", x - 45);
            box.setAttribute("y", y - 10);
            box.setAttribute("width", 90);
            box.setAttribute("height", 20);
            box.setAttribute("fill", "rgba(100, 255, 218, 0.1)");
            box.setAttribute("stroke", config.color);
            box.setAttribute("stroke-width", "1");
            box.setAttribute("stroke-dasharray", "3,2");
            box.setAttribute("rx", "3");
            svg.appendChild(box);
            
            // 绘制电子（成对显示，自旋相反）
            let electronCount = 0;
            const pairs = Math.floor(orbital.electrons / 2);
            const single = orbital.electrons % 2;
            
            for (let i = 0; i < pairs; i++) {
                // 上电子（自旋向上）
                drawElectron(svg, x - 35 + i * spacing, y - 3, config.color, 'up');
                // 下电子（自旋向下）
                drawElectron(svg, x - 35 + i * spacing, y + 3, config.color, 'down');
                electronCount += 2;
            }
            
            // 剩余的单电子（自旋向上）
            if (single > 0) {
                drawElectron(svg, x - 35 + pairs * spacing, y, config.color, 'up');
            }
            
            // 空轨道位置
            const emptyOrbitals = Math.floor((config.maxElectrons - orbital.electrons) / 2);
            for (let i = 0; i < emptyOrbitals; i++) {
                const emptyX = x - 35 + (pairs + i) * spacing;
                const emptyCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                emptyCircle.setAttribute("cx", emptyX);
                emptyCircle.setAttribute("cy", y);
                emptyCircle.setAttribute("r", 5);
                emptyCircle.setAttribute("fill", "none");
                emptyCircle.setAttribute("stroke", config.color);
                emptyCircle.setAttribute("stroke-width", "1");
                emptyCircle.setAttribute("opacity", "0.3");
                svg.appendChild(emptyCircle);
            }
        }
        
        // 绘制单个电子
        function drawElectron(svg, x, y, color, spin) {
            // 电子主体
            const electron = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            electron.setAttribute("cx", x);
            electron.setAttribute("cy", y);
            electron.setAttribute("r", 4);
            electron.setAttribute("fill", color);
            electron.setAttribute("stroke", "#fff");
            electron.setAttribute("stroke-width", "1");
            electron.setAttribute("class", "electron");
            svg.appendChild(electron);
            
            // 自旋箭头
            const spinArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const arrowSize = 3;
            if (spin === 'up') {
                spinArrow.setAttribute("d", `M ${x - 2} ${y - 2} L ${x} ${y - 5} L ${x + 2} ${y - 2}`);
            } else {
                spinArrow.setAttribute("d", `M ${x - 2} ${y + 2} L ${x} ${y + 5} L ${x + 2} ${y + 2}`);
            }
            spinArrow.setAttribute("stroke", "#fff");
            spinArrow.setAttribute("stroke-width", "1.5");
            spinArrow.setAttribute("fill", "none");
            spinArrow.setAttribute("stroke-linecap", "round");
            svg.appendChild(spinArrow);
        }

        // 全局Three.js变量
        let crystalScene, crystalCamera, crystalRenderer, crystalControls;
        let crystalAtoms = [];
        let crystalEdges = null;
        let crystalAutoRotation = true;
        let currentCrystalType = '';
        
        // 晶胞数据定义
        const crystalData = {
            sc: {
                name: "简单立方晶胞 (SC)",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            bcc: {
                name: "体心立方晶胞 (BCC)",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
                    [0.5, 0.5, 0.5]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            fcc: {
                name: "面心立方晶胞 (FCC)",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
                    [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
                    [0.5, 0.5, 1], [0.5, 1, 0.5], [1, 0.5, 0.5]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            hcp: {
                name: "六方最密堆积 (HCP)",
                vertices: [
                    // 底面顶点 (6个)
                    [0, 0, 0], [1, 0, 0], [1.5, Math.sqrt(3)/2, 0], [1, Math.sqrt(3), 0], [0, Math.sqrt(3), 0], [-0.5, Math.sqrt(3)/2, 0],
                    // 顶面顶点 (6个)
                    [0, 0, 2], [1, 0, 2], [1.5, Math.sqrt(3)/2, 2], [1, Math.sqrt(3), 2], [0, Math.sqrt(3), 2], [-0.5, Math.sqrt(3)/2, 2],
                    // 底面中心
                    [0.5, Math.sqrt(3)/3, 0],
                    // 顶面中心
                    [0.5, Math.sqrt(3)/3, 2],
                    // 内部原子 (3个) 
                    [0, Math.sqrt(3)/1.5, 1], [1, 2*Math.sqrt(3)/1.5, 1], [0.5,Math.sqrt(3)/6,1]
                ],
                edges: [
                    // 底面六边形
                    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
                    // 顶面六边形
                    [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
                    // 垂直边
                    [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
                    // 底面中心连接
                    [0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12],
                    // 顶面中心连接
                    [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13],
                    // 内部原子连接
                    [14, 15], [15, 16], [16, 14]
                ],
                atomColors: [0x64ffda]
            },
            diamond: {
                name: "金刚石结构",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
                    [0.5, 0.5, 0.5], [0.5, 0.5, 1.5],
                    [0.5, 1.5, 0.5], [1.5, 0.5, 0.5]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6],
                    [0, 8], [1, 8], [2, 8], [3, 8],
                    [4, 9], [5, 9], [6, 9], [7, 9],
                    [8, 10], [8, 11], [9, 10], [9, 11]
                ],
                atomColors: [0x64ffda]
            },
            cubic: {
                name: "立方晶系",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            orthorhombic: {
                name: "正交晶系",
                vertices: [
                    [0, 0, 0], [1.2, 0, 0], [0, 0.8, 0], [0, 0, 1],
                    [1.2, 0.8, 0], [1.2, 0, 1], [0, 0.8, 1], [1.2, 0.8, 1]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            hexagonal: {
                name: "六方晶系",
                vertices: [
                    // 底面顶点 (6个)
                    [0, 0, 0], [1, 0, 0], [1.5, Math.sqrt(3)/2, 0], [1, Math.sqrt(3), 0], [0, Math.sqrt(3), 0], [-0.5, Math.sqrt(3)/2, 0],
                    // 顶面顶点 (6个)
                    [0, 0, 2], [1, 0, 2], [1.5, Math.sqrt(3)/2, 2], [1, Math.sqrt(3), 2], [0, Math.sqrt(3), 2], [-0.5, Math.sqrt(3)/2, 2],
                    // 底面中心
                    [0.5, Math.sqrt(3)/3, 0],
                    // 顶面中心
                    [0.5, Math.sqrt(3)/3, 2],
                    // 内部原子 (3个) 
                    [0, Math.sqrt(3)/1.5, 1], [1, Math.sqrt(3)/1.5, 1], [0.5,Math.sqrt(3)/6,1]
                ],
                edges: [
                    // 底面六边形
                    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
                    // 顶面六边形
                    [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
                    // 垂直边
                    [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
                    // 底面中心连接
                    [0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12],
                    // 顶面中心连接
                    [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13],
                    // 内部原子连接
                    [14, 15], [15, 16], [16, 14]
                ],
                atomColors: [0x64ffda]
            },
            trigonal: {
                name: "三方晶系",
                vertices: [
                    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
                    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
                    [0.5, 0.5, 0.5]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            monoclinic: {
                name: "单斜晶系",
                vertices: [
                    [0, 0, 0], [1.2, 0, 0], [0, 0.8, 0], [0, 0, 0.9],
                    [1.2, 0.8, 0], [1.2, 0, 0.9], [0, 0.8, 0.9], [1.2, 0.8, 0.9]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            },
            triclinic: {
                name: "三斜晶系",
                vertices: [
                    [0, 0, 0], [1.2, 0.1, 0], [0.1, 0.9, 0.1], [0, 0, 1],
                    [1.2, 0.9, 0.1], [1.2, 0.1, 1], [0.1, 0.9, 1], [1.2, 0.9, 1]
                ],
                edges: [
                    [0, 1], [1, 4], [4, 2], [2, 0],
                    [3, 5], [5, 7], [7, 6], [6, 3],
                    [0, 3], [1, 5], [4, 7], [2, 6]
                ],
                atomColors: [0x64ffda]
            }
        };
        
        // 晶体类型映射
        const crystalTypeMap = {
            "简单立方": "sc",
            "体心立方": "bcc", 
            "面心立方": "fcc",
            "六方最密堆积": "hcp",
            "六方": "hexagonal",
            "立方": "cubic",
            "正交": "orthorhombic",
            "三方": "trigonal",
            "菱形": "trigonal",
            "单斜": "monoclinic",
            "三斜": "triclinic",
            "金刚石": "diamond"
        };
        
        // 获取晶体类型对应的key
        function getCrystalKey(crystalType) {
            for (const [key, value] of Object.entries(crystalTypeMap)) {
                if (crystalType.includes(key)) {
                    return value;
                }
            }
            return "sc"; // 默认简单立方
        }
        
        // 初始化Three.js晶体场景
        function initCrystalScene() {
            const container = document.getElementById('crystalContainer');
            if (!container) return;
            
            // 创建场景
            crystalScene = new THREE.Scene();
            crystalScene.background = new THREE.Color(0x0a192f);
            
            // 创建相机
            const width = container.clientWidth;
            const height = container.clientHeight;
            crystalCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            crystalCamera.position.set(2.5, 2, 2.5);
            
            // 创建渲染器
            crystalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            crystalRenderer.setSize(width, height);
            crystalRenderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(crystalRenderer.domElement);
            
            // 添加轨道控制器
            crystalControls = new THREE.OrbitControls(crystalCamera, crystalRenderer.domElement);
            crystalControls.enableDamping = true;
            crystalControls.dampingFactor = 0.05;
            crystalControls.enableZoom = true;
            crystalControls.minDistance = 2;
            crystalControls.maxDistance = 6;
            
            // 添加灯光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            crystalScene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(2, 2, 2);
            crystalScene.add(directionalLight);
            
            const directionalLight2 = new THREE.DirectionalLight(0x64ffda, 0.3);
            directionalLight2.position.set(-2, -1, -2);
            crystalScene.add(directionalLight2);
            
            // 窗口大小变化处理
            window.addEventListener('resize', onCrystalWindowResize);
            
            // 动画循环
            animateCrystal();
        }
        
        // 窗口大小变化处理
        function onCrystalWindowResize() {
            const container = document.getElementById('crystalContainer');
            if (!container) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            crystalCamera.aspect = width / height;
            crystalCamera.updateProjectionMatrix();
            crystalRenderer.setSize(width, height);
        }
        
        // 动画循环
        function animateCrystal() {
            requestAnimationFrame(animateCrystal);
            
            // 自动旋转
            if (crystalAutoRotation && crystalScene) {
                // 检查当前是否为六方晶系
                if (currentCrystalType === 'hexagonal' || currentCrystalType === 'hcp') {
                    // 绕顶面顶点与底面顶点连线形成的轴线（垂直轴）旋转
                    // 选择底面顶点0 (0, 0, 0)与顶面顶点6 (0, 0, 1)的连线作为旋转轴
                    const rotationAxis = new THREE.Vector3(0, 1, 0); // Y轴方向，与垂直轴线一致
                    const rotationSpeed = 0.005;
                    
                    // 对每个原子和边应用旋转
                    crystalAtoms.forEach(atom => {
                        // 保存原始位置
                        const originalPosition = atom.position.clone();
                        
                        // 绕旋转轴旋转
                        atom.position.applyAxisAngle(rotationAxis, rotationSpeed);
                    });
                    
                    // 旋转框架
                    if (crystalEdges) {
                        crystalEdges.rotation.y += rotationSpeed;
                    }
                } else {
                    // 其他晶系保持原有的Y轴旋转
                    crystalScene.rotation.y += 0.005;
                }
            }
            
            crystalControls.update();
            crystalRenderer.render(crystalScene, crystalCamera);
        }
        
        // 创建晶胞
        function createCrystal(type) {
            // 更新当前晶胞类型
            currentCrystalType = type;
            
            // 清除现有原子
            crystalAtoms.forEach(atom => crystalScene.remove(atom));
            crystalAtoms = [];
            
            // 清除现有框架
            if (crystalEdges) {
                crystalScene.remove(crystalEdges);
                crystalEdges.geometry.dispose();
                crystalEdges.material.dispose();
                crystalEdges = null;
            }
            
            const data = crystalData[type] || crystalData.sc;
            
            // 创建原子
            data.vertices.forEach((vertex) => {
                const atomGeometry = new THREE.SphereGeometry(0.12, 24, 24);
                const atomMaterial = new THREE.MeshPhongMaterial({ 
                    color: data.atomColors[0], 
                    shininess: 100,
                    emissive: 0x1a365d,
                    emissiveIntensity: 0.3
                });
                
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(...vertex);
                crystalScene.add(atom);
                crystalAtoms.push(atom);
            });
            
            // 创建立方体框架
            const edgeGeometry = new THREE.BufferGeometry();
            const edgePositions = [];
            
            data.edges.forEach(edge => {
                const start = data.vertices[edge[0]];
                const end = data.vertices[edge[1]];
                edgePositions.push(...start, ...end);
            });
            
            edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
            const edgeMaterial = new THREE.LineBasicMaterial({ 
                color: 0x64ffda, 
                linewidth: 2,
                transparent: true,
                opacity: 0.6
            });
            crystalEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            crystalScene.add(crystalEdges);
        }
        
        // 创建3D晶体结构 - 使用Three.js
        function createCrystalStructure(element) {
            // 确保场景已初始化
            if (!crystalScene) {
                initCrystalScene();
            }
            
            // 重置自动旋转
            crystalAutoRotation = true;
            
            // 获取晶体类型
            const crystalType = element.crystal || "立方";
            const crystalKey = getCrystalKey(crystalType);
            
            // 创建晶胞
            createCrystal(crystalKey);
            
            // 重置相机位置和旋转
            if (crystalKey === 'hexagonal' || crystalKey === 'hcp') {
                // 对于六方晶系，设置相机位置以显示站立式形态
                crystalCamera.position.set(2.5, 2, 2.5);
                crystalCamera.lookAt(0.5, 0.5, 0.5);
            } else {
                // 其他晶系保持默认设置
                crystalCamera.position.set(2.5, 2, 2.5);
                crystalScene.rotation.set(0, 0, 0);
            }
            crystalControls.reset();
            
            // 添加鼠标交互 - 点击暂停自动旋转
            const container = document.getElementById('crystalContainer');
            if (container) {
                container.addEventListener('mousedown', () => {
                    crystalAutoRotation = false;
                });
                
                container.addEventListener('mouseup', () => {
                    // 2秒后恢复自动旋转
                    setTimeout(() => {
                        if (!crystalControls.getState().isDragging) {
                            crystalAutoRotation = true;
                        }
                    }, 2000);
                });
            }
        }
        
        // 清理Three.js资源
        function disposeCrystalScene() {
            if (crystalRenderer) {
                crystalRenderer.dispose();
            }
            window.removeEventListener('resize', onCrystalWindowResize);
        }

        // 关闭信息卡片并清除元素高亮
        function closeInfoCard() {
            const card = document.getElementById('infoCard');
            if (card.classList.contains('active')) {
                card.classList.remove('active');
            }
            // 移除 right-edge 类，确保下次打开时重新计算
            card.classList.remove('right-edge');
            // 移除所有元素的高亮 active 类
            document.querySelectorAll('.element').forEach(el => {
                el.classList.remove('active');
            });
        }

        // 切换到2D视图
        function switchTo2DView() {
            const table = document.getElementById('periodicTable');
            const container = document.getElementById('3d-view-container');
            document.body.classList.remove('view-3d');
            table.classList.remove('three-d');
            table.classList.add('flat');
            table.style.display = "grid";
            container.style.display = "none";
            document.getElementById('viewToggle').textContent = '3D视图';
            // 回到 2D 视图时恢复横向滑动提示
            const scrollHint = document.querySelector('.table-scroll-hint');
            if (scrollHint) scrollHint.style.display = '';
            
            // 移除所有元素的active类
            document.querySelectorAll('.element').forEach(el => {
                el.classList.remove('active');
            });
            
            // 隐藏信息卡片
            document.getElementById('infoCard').classList.remove('active');
        }

        // 切换到3D视图
        function switchTo3DView() {
            const table = document.getElementById('periodicTable');
            const container = document.getElementById('3d-view-container');
            document.body.classList.add('view-3d');
            table.classList.remove('flat');
            table.classList.add('three-d');
            table.style.display = "none";
            container.style.display = "block";
            document.getElementById('viewToggle').textContent = '2D视图';
            // 3D 视图不需要 2D 的横向滑动提示
            const scrollHint = document.querySelector('.table-scroll-hint');
            if (scrollHint) scrollHint.style.display = 'none';
            // 切换为3D视图时自动关闭信息卡片并清除元素高亮
            closeInfoCard();
            // 触发窗口resize，让3D布局自适应
            window.dispatchEvent(new Event("resize"));
        }

        // 切换2D/3D视图 (仅通过按钮触发)
        document.getElementById('viewToggle').addEventListener('click', function() {
            const table = document.getElementById('periodicTable');
            if (table.classList.contains('three-d')) {
                switchTo2DView();
            } else {
                switchTo3DView();
            }
        });

        // 全局点击空白区域关闭信息卡片（仅在2D视图生效）
        document.addEventListener('click', function(event) {
            const periodicTable = document.getElementById('periodicTable');
            // 只有2D视图（flat）才处理空白点击关闭
            if (!periodicTable.classList.contains('flat')) return;
            
            const card = document.getElementById('infoCard');
            // 如果卡片未激活则无需处理
            if (!card.classList.contains('active')) return;
            
            // 判断点击目标是否在卡片内或元素单元格内
            const isInsideCard = event.target.closest('.info-card');
            const isInsideElement = event.target.closest('.element');
            
            // 点击空白区域（既不在卡片内也不在元素单元格内）则关闭卡片
            if (!isInsideCard && !isInsideElement) {
                closeInfoCard();
            }
        });

        // 窗口大小改变时重新调整弹框位置
        window.addEventListener('resize', function() {
            const activeElement = document.querySelector('.element.active');
            if (activeElement) {
                const elementNumber = activeElement.dataset.number;
                const elementData = elements.find(el => el.number === parseInt(elementNumber));
                if (elementData) {
                    showElementInfo(elementData, activeElement);
                }
            }
        });

        // 创建螺旋漩涡粒子效果
        // 全部粒子画在单个 canvas 上：一条 rAF、一次清屏、一次批量绘制，
        // 既能把粒子数量做足（桌面 1800 颗），又不产生 DOM 节点与逐帧布局。
        // 早期实现为 6000 个 DOM 节点各开一条 rAF、逐帧写 left/top，实测只有 15 fps。
        function createSpiralParticles() {
            const container = document.getElementById('spiralParticles');
            if (!container || container.dataset.ready === '1') return;

            const count = window.innerWidth < 768 ? 1800 : 5200;
            const arms = 6;              // 螺旋臂数量
            const turns = 2.2;           // 每条臂的圈数

            // 随机颜色 - 使用与主题一致的颜色（rgb 分量，绘制时再拼透明度）
            const colors = [
                '100, 255, 218',  // 主题绿色
                '64, 224, 208',   // 青色
                '230, 255, 255',  // 浅青色
                '255, 255, 255'   // 白色
            ];

            const canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            container.appendChild(canvas);
            container.dataset.ready = '1';

            const ctx = canvas.getContext('2d');
            let width = 0;
            let height = 0;

            function resize() {
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                width = container.clientWidth || window.innerWidth;
                height = container.clientHeight || window.innerHeight;
                canvas.width = Math.floor(width * dpr);
                canvas.height = Math.floor(height * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            // 粒子沿螺旋臂分布：p 为「从涡心到外缘」的进度
            const particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    p: Math.random(),
                    arm: i % arms,
                    size: 0.8 + Math.random() * 2.2,
                    speed: 0.75 + Math.random() * 0.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    twinkle: Math.random() * Math.PI * 2,
                    trailOn: Math.random() < 0.3,
                    drift: 0.008 + Math.random() * 0.014
                });
            }

            resize();
            window.addEventListener('resize', resize);

            const centerX = 0.5;
            const centerY = 0.54;
            let rotation = 0;
            let last = performance.now();

            function frame(now) {
                const dt = Math.min((now - last) / 1000, 0.05);
                last = now;
                rotation += dt * 0.28;

                const cx = width * centerX;
                const cy = height * centerY;
                const maxRadius = Math.max(width, height) * 0.7;

                ctx.clearRect(0, 0, width, height);

                // 涡心柔光
                const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.35);
                glow.addColorStop(0, 'rgba(100, 255, 218, 0.10)');
                glow.addColorStop(1, 'rgba(100, 255, 218, 0)');
                ctx.fillStyle = glow;
                ctx.fillRect(cx - maxRadius * 0.35, cy - maxRadius * 0.35,
                    maxRadius * 0.7, maxRadius * 0.7);

                ctx.globalCompositeOperation = 'lighter';

                for (const item of particles) {
                    // 向外流动；到达外缘后回到涡心，靠两端淡出避免跳变
                    item.p += dt * item.drift;
                    if (item.p >= 1) {
                        item.p -= 1;
                        item.twinkle = Math.random() * Math.PI * 2;
                    }

                    const fade = Math.min(1, item.p * 5) * Math.min(1, (1 - item.p) * 4);
                    if (fade <= 0.01) continue;

                    const angle = item.arm * (Math.PI * 2 / arms)
                        + item.p * turns * Math.PI * 2
                        + rotation * item.speed;
                    // 椭圆压缩制造俯视漩涡的透视感
                    const radius = 10 + item.p * maxRadius;
                    const x = cx + Math.cos(angle) * radius;
                    const y = cy + Math.sin(angle) * radius * 0.62;
                    const flicker = 0.75 + 0.25 * Math.sin(now / 520 + item.twinkle);
                    const alpha = fade * flicker * (0.95 - 0.45 * item.p);

                    ctx.fillStyle = `rgba(${item.color}, ${alpha.toFixed(3)})`;
                    // 尺寸只有 1–3px，用 fillRect 代替 arc+fill，省掉每颗粒子的路径开销
                    const dot = item.size * (1 - 0.4 * item.p);
                    ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);

                    // 拖尾：沿螺旋切线方向画一小段，强化「在转」的流动感
                    // 只给三成粒子开拖尾，保证绘制开销可控
                    if (item.trailOn) {
                        const trail = Math.min(0.3, 12 / Math.max(radius, 24));
                        const prevAngle = angle - trail;
                        ctx.strokeStyle = `rgba(${item.color}, ${(alpha * 0.3).toFixed(3)})`;
                        ctx.lineWidth = item.size * 0.8;
                        ctx.beginPath();
                        ctx.moveTo(cx + Math.cos(prevAngle) * radius,
                            cy + Math.sin(prevAngle) * radius * 0.62);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                }

                ctx.globalCompositeOperation = 'source-over';
                requestAnimationFrame(frame);
            }

            requestAnimationFrame(frame);
        }

        // 初始化
        window.onload = function() {
            // 初始化流星雨粒子系统
            const canvas = document.getElementById('meteorCanvas');
            new MeteorParticleSystem(canvas);
            
            // 初始化周期表
            initGroupNumbers();
            initPeriodicTable(); 
            
            // 添加详细弹窗关闭事件
            document.getElementById('elementDetailClose').addEventListener('click', function() {
                document.getElementById('elementDetailModal').classList.remove('active');
            });
            
            // 点击弹窗外部区域关闭弹窗
            document.getElementById('elementDetailModal').addEventListener('click', function(event) {
                if (event.target === this) {
                    this.classList.remove('active');
                }
            });
            
            // 添加图片放大模态框关闭事件
            document.getElementById('imageModalClose').addEventListener('click', closeImageModal);
            
            // 点击图片放大模态框外部区域关闭模态框
            document.getElementById('imageModal').addEventListener('click', function(event) {
                if (event.target === this) {
                    closeImageModal();
                }
            });
            
            // 添加螺旋粒子效果
            createSpiralParticles();
            
            // [两步揭秘] 初始化钙元素揭秘模态框
            initCalciumRevealModal();
            
            // 新增：返回主页按钮事件
            const homeBtn = document.getElementById('homeButton');
            if (homeBtn) {
                homeBtn.addEventListener('click', function() {
                    window.location.href = "../../../主页.html";
                });
            }

            // 添加触摸设备的触摸事件支持（增强移动端交互）
            if ('ontouchstart' in window) {
                // 为触摸设备优化交互体验
                document.addEventListener('touchstart', function() {}, {passive: true});
            }
        };