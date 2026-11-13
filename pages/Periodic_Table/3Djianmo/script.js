// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 2);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);

// 添加轨道控制器
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 添加灯光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// 晶胞数据
const crystalData = {
    sc: {
        name: "简单立方晶胞 (Simple Cubic, SC)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0x3498db],
        info: `
            <h3>简单立方晶胞 (Simple Cubic, SC)</h3>
            <ul>
                <li>原子仅在 8 个顶点</li>
                <li>配位数：6</li>
                <li>晶胞参数：a = b = c，α=β=γ=90°</li>
                <li>原子坐标：(0,0,0)、(1,0,0)、(0,1,0)、(0,0,1)、(1,1,0)、(1,0,1)、(0,1,1)、(1,1,1)</li>
                <li>结构特点：立方体顶点各一个球，体内无原子</li>
            </ul>
        `
    },
    bcc: {
        name: "体心立方晶胞 (Body-Centered Cubic, BCC)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0.5]  // 体心原子
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0x3498db],
        info: `
            <h3>体心立方晶胞 (Body-Centered Cubic, BCC)</h3>
            <ul>
                <li>顶点 8 个原子 + 体心 1 个原子</li>
                <li>典型：α-Fe、Na、K、Cr、W</li>
                <li>配位数：8</li>
                <li>晶胞参数：a = b = c，α=β=γ=90°</li>
                <li>原子坐标：(0,0,0)、(1,0,0)、(0,1,0)、(0,0,1)、(1,1,0)、(1,0,1)、(0,1,1)、(1,1,1)、(0.5, 0.5, 0.5)</li>
                <li>结构特点：立方体中心多一个球，与 8 个顶点相切</li>
            </ul>
        `
    },
    fcc: {
        name: "面心立方晶胞 (Face-Centered Cubic, FCC)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0],  // 前面心
            [0.5, 0, 0.5],  // 右面心
            [0, 0.5, 0.5],  // 上面心
            [0.5, 0.5, 1],  // 后面心
            [0.5, 1, 0.5],  // 左面心
            [1, 0.5, 0.5]   // 下面心
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0x3498db],
        info: `
            <h3>面心立方晶胞 (Face-Centered Cubic, FCC)</h3>
            <ul>
                <li>顶点 8 个 + 6 个面心各 1 个</li>
                <li>典型：Cu、Ag、Au、Al、Ca</li>
                <li>配位数：12</li>
                <li>晶胞参数：a = b = c，α=β=γ=90°</li>
                <li>原子坐标：顶点 + (0.5,0.5,0)、(0.5,0,0.5)、(0,0.5,0.5)、(0.5,0.5,1)、(0.5,1,0.5)、(1,0.5,0.5)</li>
                <li>结构特点：最密堆积结构，空间利用率最高</li>
            </ul>
        `
    },
    hcp: {
        name: "六方最密堆积 (Hexagonal Close-Packed, HCP)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0.5, Math.sqrt(3)/2, 0],
            [0, 0, 1],
            [1, 0, 1],
            [0.5, Math.sqrt(3)/2, 1],
            [0.5, Math.sqrt(3)/6, 0.5],
            [1, Math.sqrt(3)/3, 0.5],
            [0, Math.sqrt(3)/3, 0.5]
        ],
        edges: [
            [0, 1], [1, 2], [2, 0],  // 底面
            [3, 4], [4, 5], [5, 3],  // 顶面
            [0, 3], [1, 4], [2, 5],  // 侧面
            [0, 8], [1, 7], [2, 6],  // 底面到中间
            [3, 6], [4, 7], [5, 8]   // 中间到顶面
        ],
        atomColors: [0x3498db],
        info: `
            <h3>六方最密堆积 (Hexagonal Close-Packed, HCP)</h3>
            <ul>
                <li>六方晶胞，ABAB… 堆积</li>
                <li>典型：Mg、Zn、Ti、Co</li>
                <li>配位数：12</li>
                <li>晶胞：底面正六边形，上下底面各 1 个，中间 3 个原子</li>
                <li>结构特点：层状密排，与 FCC 同为最密堆积</li>
            </ul>
        `
    },
    diamond: {
        name: "金刚石结构 (Diamond)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0.5],
            [0.5, 0.5, 1.5],
            [0.5, 1.5, 0.5],
            [1.5, 0.5, 0.5]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6],  // 侧面
            [0, 8], [1, 8], [2, 8], [3, 8],  // 体心连接
            [4, 9], [5, 9], [6, 9], [7, 9],  // 上体心连接
            [8, 10], [8, 11], [9, 10], [9, 11]  // 其他连接
        ],
        atomColors: [0x3498db],
        info: `
            <h3>金刚石结构 (Diamond)</h3>
            <ul>
                <li>面心立方骨架 + 内部 4 个四面体间隙原子</li>
                <li>典型：C（金刚石）、Si、Ge</li>
                <li>配位数：4</li>
                <li>空间结构：每个原子周围 4 个共价键，正四面体配位</li>
            </ul>
        `
    },
    nacl: {
        name: "NaCl 型离子晶胞 (岩盐结构)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0],
            [0.5, 0, 0.5],
            [0, 0.5, 0.5],
            [0.5, 0.5, 1],
            [0.5, 1, 0.5],
            [1, 0.5, 0.5],
            [0.5, 0.5, 0.5]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0xe74c3c, 0x3498db],  // Na+ (red), Cl- (blue)
        info: `
            <h3>NaCl 型离子晶胞 (岩盐结构)</h3>
            <ul>
                <li>面心立方，Na⁺与 Cl⁻交替排列</li>
                <li>阴阳离子各自形成 FCC，互相穿插</li>
                <li>配位数：6:6</li>
            </ul>
        `
    },
    cscl: {
        name: "CsCl 型晶胞",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0.5]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0xe74c3c, 0x3498db],  // Cs+ (red), Cl- (blue)
        info: `
            <h3>CsCl 型晶胞</h3>
            <ul>
                <li>简单立方框架</li>
                <li>一种离子在顶点，另一种在体心</li>
                <li>配位数：8:8</li>
            </ul>
        `
    },
    zns: {
        name: "闪锌矿结构 (Zinc Blende, ZnS)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.25, 0.25, 0.25],
            [0.75, 0.75, 0.25],
            [0.75, 0.25, 0.75],
            [0.25, 0.75, 0.75]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0xe74c3c, 0x3498db],  // Zn (red), S (blue)
        info: `
            <h3>闪锌矿结构 (Zinc Blende, ZnS)</h3>
            <ul>
                <li>类似金刚石，但 Zn 和 S 交替占据位点</li>
                <li>典型：ZnS、GaAs、InP（半导体常用）</li>
                <li>配位数：4:4</li>
            </ul>
        `
    },
    perovskite: {
        name: "钙钛矿结构 (Perovskite, ABO₃)",
        vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
            [0.5, 0.5, 0],
            [0.5, 0, 0.5],
            [0, 0.5, 0.5],
            [0.5, 0.5, 1],
            [0.5, 1, 0.5],
            [1, 0.5, 0.5],
            [0.5, 0.5, 0.5]
        ],
        edges: [
            [0, 1], [1, 4], [4, 2], [2, 0],  // 底面
            [3, 5], [5, 7], [7, 6], [6, 3],  // 顶面
            [0, 3], [1, 5], [4, 7], [2, 6]   // 侧面
        ],
        atomColors: [0xe74c3c, 0x3498db, 0x2ecc71],  // A (red), B (blue), O (green)
        info: `
            <h3>钙钛矿结构 (Perovskite, ABO₃)</h3>
            <ul>
                <li>立方结构</li>
                <li>A 在顶点，O 在面心，B 在体心</li>
                <li>典型：CaTiO₃、BaTiO₃（铁电、光伏常用）</li>
            </ul>
        `
    }
};

// 全局变量
let atoms = [];
let edgeLines = null;

// 创建晶胞
function createCrystal(type) {
    // 清除现有原子
    atoms.forEach(atom => scene.remove(atom));
    atoms = [];
    
    // 清除现有框架
    if (edgeLines) {
        scene.remove(edgeLines);
    }
    
    const data = crystalData[type];
    
    // 创建原子
    data.vertices.forEach((vertex, index) => {
        const atomGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        let atomMaterial;
        
        // 根据晶胞类型分配颜色
        if (type === 'nacl') {
            // NaCl: 顶点和面心是Cl-, 体心是Na+
            if (index < 14) {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[1], shininess: 100 });  // Cl-
            } else {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[0], shininess: 100 });  // Na+
            }
        } else if (type === 'cscl') {
            // CsCl: 顶点是Cl-, 体心是Cs+
            if (index < 8) {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[1], shininess: 100 });  // Cl-
            } else {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[0], shininess: 100 });  // Cs+
            }
        } else if (type === 'zns') {
            // ZnS: 顶点是Zn, 内部是S
            if (index < 8) {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[0], shininess: 100 });  // Zn
            } else {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[1], shininess: 100 });  // S
            }
        } else if (type === 'perovskite') {
            // Perovskite: 顶点是A, 面心是O, 体心是B
            if (index < 8) {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[0], shininess: 100 });  // A
            } else if (index < 14) {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[2], shininess: 100 });  // O
            } else {
                atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[1], shininess: 100 });  // B
            }
        } else {
            // 其他结构使用单一颜色
            atomMaterial = new THREE.MeshPhongMaterial({ color: data.atomColors[0], shininess: 100 });
        }
        
        const atom = new THREE.Mesh(atomGeometry, atomMaterial);
        atom.position.set(...vertex);
        scene.add(atom);
        atoms.push(atom);
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
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
    edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edgeLines);
    
    // 更新信息面板
    document.getElementById('crystal-info').innerHTML = data.info;
}

// 初始化
createCrystal('sc');

// 事件监听器
document.getElementById('crystal-select').addEventListener('change', function(e) {
    createCrystal(e.target.value);
});

// 响应窗口大小变化
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();