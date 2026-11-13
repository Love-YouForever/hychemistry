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
            const response = await fetch('/api/elements');
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            elementsData = await response.json();
            buildTable();
            setupEventListeners();
            updateTemperatures(tempSlider.value);
        } catch (error) {
            table.innerHTML = `<div class="loading">加载元素数据失败: ${error.message}</div>`;
        }
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
            const nameToDisplay = currentTableLang === 'zh' && el.wikipedia_content?.zh?.infobox?.zwmc
                ? el.wikipedia_content.zh.infobox.zwmc
                : el.name;

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

    /**
     * 【已修改】设置事件监听器
     * 新增了对周期表语言切换按钮的监听
     */
    function setupEventListeners() {
        // --- 温度控制 ---
        tempSlider.addEventListener('input', () => updateTemperatures(tempSlider.value));
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

        // --- 3D交互事件 ---
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
            table.style.transition = 'transform 0.1s linear';
        });

        // --- 弹窗相关事件 ---
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
        modalCloseBtn.addEventListener('click', hideElementModal);
        modalBackdrop.addEventListener('click', hideElementModal);

        // --- 【新增】语言切换控制 ---
        if(toggleTableLangBtn) {
            toggleTableLangBtn.addEventListener('click', toggleTableLanguage);
        }
    }

    function updateTemperatures(kelvin) {
        kelvin = parseFloat(kelvin);
        if (isNaN(kelvin)) return;
        tempSlider.value = kelvin;
        tempInput.value = kelvin.toFixed(2);
        tempCelsius.textContent = `(${(kelvin - 273.15).toFixed(2)} °C)`;
        updatePhaseStyles(kelvin);
    }

    async function updatePhaseStyles(temp) {
        try {
            const response = await fetch(`/api/phases/${temp}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const phases = await response.json();
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
        table.style.transform = `translateX(${currentTranslateX}px) translateY(${currentTranslateY}px) rotateX(${currentRotateX}deg) rotateZ(${currentRotateZ}deg) scale(${currentScale})`;
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

        const modelViewerHTML = element.model_url ?
            `<model-viewer src="${element.model_url}" alt="A 3D model of ${element.name}" auto-rotate camera-controls disable-zoom></model-viewer>` :
            '<div class="placeholder">无3D模型</div>';

        const mainImageHTML = element.images?.main ?
            `<div class="image-wrapper"><p class="image-label">元素图片</p><img src="${element.images.main}" alt="Image of ${element.name}"></div>` : '';

        const spectralImageHTML = element.images?.spectrum ?
            `<div class="image-wrapper"><p class="image-label">光谱图</p><img src="${element.images.spectrum}" alt="Spectral image for ${element.name}"></div>` : '';

        const detailsHTML = `
            <div class="details-text">
                <p><strong>原子序数:</strong> ${element.number}</p>
                <p><strong>原子质量:</strong> ${element.atomic_mass ? element.atomic_mass.toFixed(4) : 'N/A'}</p>
                <p><strong>分类:</strong> ${element.category}</p>
                <p><strong>发现者:</strong> ${element.discovered_by || 'N/A'}</p>
                <p><strong>密度:</strong> ${element.density ? `${element.density} g/cm³` : 'N/A'}</p>
                <p><strong>熔点:</strong> ${formatTemperatureWithCelsius(element.melt)}</p>
                <p><strong>沸点:</strong> ${formatTemperatureWithCelsius(element.boil)}</p>
                <p><strong>价电子排布:</strong> <span id="valence-electron-config" class="electron-config">${element.electron_configuration || 'N/A'}</span></p>
                <div id="electron-orbital-container" class="electron-orbital-container"></div>
                <p>${element.summary || ''}</p>
            </div>
            <div class="wiki-container">
                <div class="wiki-header">
                    <h3>维基百科详情</h3>
                    <button id="lang-toggle-btn" class="lang-btn">切换为英文</button>
                </div>
                <div id="wiki-content-target"></div>
            </div>`;

        modalBody.innerHTML = `
            <h2 class="modal-title">${element.name} (${element.symbol})</h2>
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
        document.getElementById('lang-toggle-btn').addEventListener('click', toggleWikiLanguage);

        // 添加价电子排布悬停事件
        const valenceElectronConfigElement = document.getElementById('valence-electron-config');
        const electronOrbitalContainer = document.getElementById('electron-orbital-container');
        
        if (valenceElectronConfigElement && electronOrbitalContainer) {
            valenceElectronConfigElement.addEventListener('mouseenter', () => {
                createElectronOrbitalDiagram(element.number, electronOrbitalContainer);
            });
            
            valenceElectronConfigElement.addEventListener('mouseleave', () => {
                electronOrbitalContainer.innerHTML = '';
            });
        }

        modal.classList.remove('modal-hidden');
    }

    function renderWikipediaContent() {
        if (!currentModalElement) return;
        const target = document.getElementById('wiki-content-target');
        const langBtn = document.getElementById('lang-toggle-btn');
        const wikiData = currentModalElement.wikipedia_content?.[currentWikiLang];
        if (!wikiData || !wikiData.sections || wikiData.sections.length === 0) {
            target.innerHTML = '<p>暂无此语言的维基百科内容。</p>';
            langBtn.style.display = 'none';
            return;
        }
        langBtn.style.display = 'inline-block';
        langBtn.textContent = currentWikiLang === 'zh' ? 'Switch to English' : '切换为中文';
        let contentHTML = '';
        wikiData.sections.forEach(section => {
            if (section.content.trim()) {
                contentHTML += `
                    <details class="wiki-section" ${section.id === 'intro' ? 'open' : ''}>
                        <summary>${section.title}</summary>
                        <div class="wiki-section-content">${section.content}</div>
                    </details>
                `;
            }
        });
        target.innerHTML = contentHTML;
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
                    const nameToDisplay = currentTableLang === 'zh' && el.wikipedia_content?.zh?.infobox?.zwmc
                        ? el.wikipedia_content.zh.infobox.zwmc
                        : el.name;
                    nameEl.textContent = nameToDisplay;
                }
            }
        });
    }

    /**
     * 创建核外电子排布图
     * @param {number} atomicNumber - 原子序数
     * @param {HTMLElement} container - 容器元素
     */
    function createElectronOrbitalDiagram(atomicNumber, container) {
        if (!atomicNumber || !container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建画布
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.classList.add('electron-orbital-canvas');
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // 电子轨道配置
        const orbitals = [
            { n: 1, l: 0, name: '1s', radius: 60, maxElectrons: 2, speed: 0.03 },
            { n: 2, l: 0, name: '2s', radius: 100, maxElectrons: 2, speed: 0.02 },
            { n: 2, l: 1, name: '2p', radius: 120, maxElectrons: 6, speed: 0.025 },
            { n: 3, l: 0, name: '3s', radius: 160, maxElectrons: 2, speed: 0.015 },
            { n: 3, l: 1, name: '3p', radius: 180, maxElectrons: 6, speed: 0.018 },
            { n: 3, l: 2, name: '3d', radius: 200, maxElectrons: 10, speed: 0.012 },
            { n: 4, l: 0, name: '4s', radius: 240, maxElectrons: 2, speed: 0.01 },
            { n: 4, l: 1, name: '4p', radius: 260, maxElectrons: 6, speed: 0.012 },
            { n: 4, l: 2, name: '4d', radius: 280, maxElectrons: 10, speed: 0.008 },
            { n: 4, l: 3, name: '4f', radius: 300, maxElectrons: 14, speed: 0.006 }
        ];
        
        // 计算各轨道的电子数
        let remainingElectrons = atomicNumber;
        const orbitalElectrons = {};
        
        for (const orbital of orbitals) {
            if (remainingElectrons <= 0) break;
            const electrons = Math.min(remainingElectrons, orbital.maxElectrons);
            orbitalElectrons[orbital.name] = electrons;
            remainingElectrons -= electrons;
        }
        
        // 电子位置数据
        const electronsData = [];
        orbitals.forEach(orbital => {
            const electrons = orbitalElectrons[orbital.name] || 0;
            if (electrons === 0) return;
            
            for (let i = 0; i < electrons; i++) {
                electronsData.push({
                    orbital: orbital,
                    angle: (i / orbital.maxElectrons) * Math.PI * 2,
                    speed: orbital.speed
                });
            }
        });
        
        // 动画函数
        function animate() {
            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 绘制原子核
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcc00';
            ctx.fill();
            ctx.strokeStyle = '#ff9900';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制原子核文字
            ctx.fillStyle = '#000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(` nucleus`, centerX, centerY);
            
            // 绘制轨道
            orbitals.forEach(orbital => {
                const electrons = orbitalElectrons[orbital.name] || 0;
                if (electrons === 0) return;
                
                // 绘制轨道
                ctx.beginPath();
                ctx.arc(centerX, centerY, orbital.radius, 0, Math.PI * 2);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // 绘制轨道名称
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.fillText(orbital.name, centerX + orbital.radius + 5, centerY);
            });
            
            // 绘制并更新电子位置
            electronsData.forEach(electron => {
                // 更新角度
                electron.angle += electron.speed;
                if (electron.angle >= Math.PI * 2) {
                    electron.angle -= Math.PI * 2;
                }
                
                // 计算电子位置
                const electronX = centerX + Math.cos(electron.angle) * electron.orbital.radius;
                const electronY = centerY + Math.sin(electron.angle) * electron.orbital.radius;
                
                // 绘制电子
                ctx.beginPath();
                ctx.arc(electronX, electronY, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#0066ff';
                ctx.fill();
                ctx.strokeStyle = '#0033cc';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            
            // 请求下一帧动画
            requestAnimationFrame(animate);
        }
        
        // 开始动画
        animate();
    }

    function hideElementModal() {
        modal.classList.add('modal-hidden');
        modalBody.innerHTML = '';
        currentModalElement = null;
    }

    // --- 初始化应用 ---
    init();
});