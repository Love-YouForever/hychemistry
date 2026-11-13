        // 元素数据
        const ELEMENTS = [
            { number: 1, symbol: 'H', name: '氢' },
            { number: 2, symbol: 'He', name: '氦' },
            { number: 3, symbol: 'Li', name: '锂' },
            { number: 4, symbol: 'Be', name: '铍' },
            { number: 5, symbol: 'B', name: '硼' },
            { number: 6, symbol: 'C', name: '碳' },
            { number: 7, symbol: 'N', name: '氮' },
            { number: 8, symbol: 'O', name: '氧' },
            { number: 9, symbol: 'F', name: '氟' },
            { number: 10, symbol: 'Ne', name: '氖' },
            { number: 11, symbol: 'Na', name: '钠' },
            { number: 12, symbol: 'Mg', name: '镁' }
        ];

        // 游戏状态
        let grid = [];
        let gameOver = false;
        let hasWon = false;
        let previousGrid = []; // 用于跟踪变化

        // DOM元素
        const gameGrid = document.getElementById('gameGrid');
        const winModal = document.getElementById('winModal');
        const loseModal = document.getElementById('loseModal');

        // 初始化游戏
        function initGame() {
            grid = Array(4).fill(null).map(() => Array(4).fill(0));
            previousGrid = Array(4).fill(null).map(() => Array(4).fill(0));
            gameOver = false;
            hasWon = false;
            addRandomTile();
            addRandomTile();
            renderGrid();
        }

        // 添加随机方块
        function addRandomTile() {
            const emptyCells = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (grid[i][j] === 0) {
                        emptyCells.push({ row: i, col: j });
                    }
                }
            }
            if (emptyCells.length === 0) return;
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 90%概率生成氢(1), 10%概率生成氦(2)
            grid[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 1 : 2;
        }

        // 渲染网格（平滑过渡版本）
        function renderGrid() {
            // 获取所有现有单元格
            const cells = gameGrid.querySelectorAll('.cell');
            
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const index = i * 4 + j;
                    const cell = cells[index];
                    
                    if (grid[i][j] !== 0) {
                        let tile = cell.querySelector('.tile');
                        const element = ELEMENTS[grid[i][j] - 1];
                        
                        // 检测新方块（之前没有，现在有）
                        const isNew = previousGrid[i][j] === 0 && grid[i][j] !== 0;
                        // 检测合并（数值增加了）
                        const isMerged = previousGrid[i][j] > 0 && grid[i][j] > previousGrid[i][j];
                        
                        if (!tile) {
                            // 创建新方块
                            tile = document.createElement('div');
                            cell.appendChild(tile);
                        }
                        
                        // 更新方块样式和内容
                        tile.className = `tile tile-${grid[i][j]}`;
                        if (isNew) tile.classList.add('new');
                        if (isMerged) tile.classList.add('merged');
                        
                        tile.innerHTML = `<span class="element-symbol">${element.symbol}</span><span class="element-number">${element.number}</span>`;
                        
                        // 移除动画类以便下次动画
                        setTimeout(() => {
                            tile.classList.remove('new', 'merged');
                        }, 300);
                    } else if (cell.querySelector('.tile')) {
                        // 移除消失的方块（带淡出动画）
                        const tile = cell.querySelector('.tile');
                        tile.style.opacity = '0';
                        tile.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            if (tile) tile.remove();
                        }, 250);
                    }
                }
            }
            
            // 更新前一状态
            previousGrid = grid.map(row => [...row]);
        }

        // 移动逻辑
        function move(direction) {
            if (gameOver) return false;
            
            let moved = false;
            
            // 保存移动前状态
            previousGrid = grid.map(row => [...row]);
            
            switch (direction) {
                case 'left':
                    moved = moveLeft();
                    break;
                case 'right':
                    moved = moveRight();
                    break;
                case 'up':
                    moved = moveUp();
                    break;
                case 'down':
                    moved = moveDown();
                    break;
            }
            
            if (moved) {
                // 先渲染移动后的状态
                renderGrid();
                
                setTimeout(() => {
                    addRandomTile();
                    renderGrid();
                    checkGameOver();
                    checkWin();
                }, 250);
            }
            
            return moved;
        }

        // 向左移动
        function moveLeft() {
            let moved = false;
            for (let i = 0; i < 4; i++) {
                let row = grid[i].filter(val => val !== 0);
                for (let j = 0; j < row.length - 1; j++) {
                    if (row[j] === row[j + 1] && row[j] < 12) {
                        row[j]++;
                        row.splice(j + 1, 1);
                        moved = true;
                    }
                }
                while (row.length < 4) {
                    row.push(0);
                }
                if (JSON.stringify(grid[i]) !== JSON.stringify(row)) {
                    moved = true;
                    grid[i] = row;
                }
            }
            return moved;
        }

        // 向右移动
        function moveRight() {
            let moved = false;
            for (let i = 0; i < 4; i++) {
                let row = grid[i].filter(val => val !== 0);
                for (let j = row.length - 1; j > 0; j--) {
                    if (row[j] === row[j - 1] && row[j] < 12) {
                        row[j]++;
                        row.splice(j - 1, 1);
                        moved = true;
                    }
                }
                while (row.length < 4) {
                    row.unshift(0);
                }
                if (JSON.stringify(grid[i]) !== JSON.stringify(row)) {
                    moved = true;
                    grid[i] = row;
                }
            }
            return moved;
        }

        // 向上移动
        function moveUp() {
            let moved = false;
            for (let j = 0; j < 4; j++) {
                let col = [];
                for (let i = 0; i < 4; i++) {
                    if (grid[i][j] !== 0) col.push(grid[i][j]);
                }
                for (let i = 0; i < col.length - 1; i++) {
                    if (col[i] === col[i + 1] && col[i] < 12) {
                        col[i]++;
                        col.splice(i + 1, 1);
                        moved = true;
                    }
                }
                while (col.length < 4) {
                    col.push(0);
                }
                for (let i = 0; i < 4; i++) {
                    if (grid[i][j] !== col[i]) {
                        moved = true;
                        grid[i][j] = col[i];
                    }
                }
            }
            return moved;
        }

        // 向下移动
        function moveDown() {
            let moved = false;
            for (let j = 0; j < 4; j++) {
                let col = [];
                for (let i = 0; i < 4; i++) {
                    if (grid[i][j] !== 0) col.push(grid[i][j]);
                }
                for (let i = col.length - 1; i > 0; i--) {
                    if (col[i] === col[i - 1] && col[i] < 12) {
                        col[i]++;
                        col.splice(i - 1, 1);
                        moved = true;
                    }
                }
                while (col.length < 4) {
                    col.unshift(0);
                }
                for (let i = 0; i < 4; i++) {
                    if (grid[i][j] !== col[i]) {
                        moved = true;
                        grid[i][j] = col[i];
                    }
                }
            }
            return moved;
        }

        // 检查游戏结束
        function checkGameOver() {
            // 检查是否有空格
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (grid[i][j] === 0) return;
                }
            }
            // 检查是否有可合并的相邻方块
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (j < 3 && grid[i][j] === grid[i][j + 1]) return;
                    if (i < 3 && grid[i][j] === grid[i + 1][j]) return;
                }
            }
            gameOver = true;
            loseModal.classList.add('show');
        }

        // 检查胜利
        function checkWin() {
            if (hasWon) return;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (grid[i][j] === 12) {
                        hasWon = true;
                        winModal.classList.add('show');
                        return;
                    }
                }
            }
        }

        // 关闭弹窗
        function closeWinModal() {
            winModal.classList.remove('show');
        }

        function closeLoseModal() {
            loseModal.classList.remove('show');
        }

        // 返回游戏主页
        function goBack() {
            window.location.href = './games.html';
        }

        // 重新开始游戏
        function restartGame() {
            winModal.classList.remove('show');
            loseModal.classList.remove('show');
            initGame();
        }

        // 页面加载完成后初始化游戏
        document.addEventListener('DOMContentLoaded', () => {
            initGame();
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    move('right');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    move('down');
                    break;
            }
        });

        // 触摸控制
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 30;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        move('right');
                    } else {
                        move('left');
                    }
                }
            } else {
                if (Math.abs(deltaY) > minSwipeDistance) {
                    if (deltaY > 0) {
                        move('down');
                    } else {
                        move('up');
                    }
                }
            }
        });

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            initGame();
        });