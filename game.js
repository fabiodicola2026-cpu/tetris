(() => {
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');
    const holdCanvas = document.getElementById('holdCanvas');
    const holdCtx = holdCanvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const linesEl = document.getElementById('lines');
    const levelEl = document.getElementById('level');
    const finalScoreEl = document.getElementById('finalScore');
    const gameOverEl = document.getElementById('gameOver');
    const pauseEl = document.getElementById('pauseOverlay');
    const sixOverlay = document.getElementById('sixSixSixOverlay');
    const comboFlash = document.getElementById('comboFlash');

    const PIECES = {
        I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#ff0033', glow: '#ff4466' },
        O: { shape: [[1,1],[1,1]],                                color: '#ffcc33', glow: '#ffe066' },
        T: { shape: [[0,1,0],[1,1,1],[0,0,0]],                    color: '#cc00ff', glow: '#e266ff' },
        S: { shape: [[0,1,1],[1,1,0],[0,0,0]],                    color: '#33ff66', glow: '#66ff99' },
        Z: { shape: [[1,1,0],[0,1,1],[0,0,0]],                    color: '#ff6633', glow: '#ff9966' },
        J: { shape: [[1,0,0],[1,1,1],[0,0,0]],                    color: '#3399ff', glow: '#66bbff' },
        L: { shape: [[0,0,1],[1,1,1],[0,0,0]],                    color: '#ff7a18', glow: '#ffa84d' }
    };
    const KEYS = Object.keys(PIECES);

    let board = createBoard();
    let current = null;
    let next = randomPiece();
    let hold = null;
    let canHold = true;
    let pos = { x: 0, y: 0 };
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropCounter = 0;
    let lastTime = 0;
    let running = true;
    let paused = false;
    let gameOver = false;
    let sixTriggered = false;
    let particles = [];

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function randomPiece() {
        const k = KEYS[Math.floor(Math.random() * KEYS.length)];
        const def = PIECES[k];
        return {
            key: k,
            shape: def.shape.map(r => r.slice()),
            color: def.color,
            glow: def.glow
        };
    }

    function spawn(piece) {
        current = piece || next;
        next = randomPiece();
        pos.x = Math.floor(COLS / 2) - Math.ceil(current.shape[0].length / 2);
        pos.y = 0;
        canHold = true;
        if (collides(current.shape, pos.x, pos.y)) {
            endGame();
        }
        drawNext();
    }

    function collides(shape, x, y) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = x + c;
                const ny = y + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && board[ny][nx]) return true;
            }
        }
        return false;
    }

    function rotate(shape) {
        const N = shape.length;
        const out = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) out[c][N - 1 - r] = shape[r][c];
        return out;
    }

    function tryRotate() {
        const rotated = rotate(current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const k of kicks) {
            if (!collides(rotated, pos.x + k, pos.y)) {
                current.shape = rotated;
                pos.x += k;
                return;
            }
        }
    }

    function move(dx) {
        if (!collides(current.shape, pos.x + dx, pos.y)) pos.x += dx;
    }

    function softDrop() {
        if (!collides(current.shape, pos.x, pos.y + 1)) {
            pos.y += 1;
            score += 1;
        } else {
            lock();
        }
        dropCounter = 0;
        updateUI();
    }

    function hardDrop() {
        let dist = 0;
        while (!collides(current.shape, pos.x, pos.y + 1)) {
            pos.y += 1;
            dist += 1;
        }
        score += dist * 2;
        lock();
    }

    function lock() {
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (current.shape[r][c]) {
                    const ny = pos.y + r;
                    const nx = pos.x + c;
                    if (ny >= 0) board[ny][nx] = { color: current.color, glow: current.glow };
                }
            }
        }
        clearLines();
        spawn();
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell)) {
                spawnLineParticles(r);
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(0));
                cleared += 1;
                r += 1;
            }
        }
        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800][cleared] * level;
            score += points;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            if (cleared >= 2) {
                const labels = { 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS!' };
                showCombo(labels[cleared]);
            }
        }
        updateUI();
        checkSixSixSix();
    }

    function spawnLineParticles(row) {
        for (let c = 0; c < COLS; c++) {
            const cell = board[row][c];
            const color = cell && cell.color ? cell.color : '#ff0033';
            for (let i = 0; i < 4; i++) {
                particles.push({
                    x: c * BLOCK + BLOCK / 2,
                    y: row * BLOCK + BLOCK / 2,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.8) * 6,
                    life: 30 + Math.random() * 20,
                    color
                });
            }
        }
    }

    function showCombo(text) {
        comboFlash.textContent = text;
        comboFlash.classList.remove('hidden');
        comboFlash.style.animation = 'none';
        void comboFlash.offsetWidth;
        comboFlash.style.animation = '';
        setTimeout(() => comboFlash.classList.add('hidden'), 900);
    }

    function checkSixSixSix() {
        if (!sixTriggered && score >= 666) {
            sixTriggered = true;
            paused = true;
            sixOverlay.classList.remove('hidden');
        }
    }

    function holdPiece() {
        if (!canHold) return;
        if (hold === null) {
            hold = current;
            spawn();
        } else {
            const swap = hold;
            hold = current;
            spawn(swap);
        }
        canHold = false;
        drawHold();
    }

    function endGame() {
        gameOver = true;
        running = false;
        finalScoreEl.textContent = `Final Score: ${score} • Lines: ${lines}`;
        gameOverEl.classList.remove('hidden');
    }

    function updateUI() {
        scoreEl.textContent = score;
        linesEl.textContent = lines;
        levelEl.textContent = level;
        if (score >= 600 && !sixTriggered) scoreEl.classList.add('danger');
        else scoreEl.classList.remove('danger');
    }

    function drawCell(c, x, y, size = BLOCK, target = ctx) {
        const color = c && c.color ? c.color : c;
        const glow = c && c.glow ? c.glow : color;
        target.fillStyle = color;
        target.fillRect(x, y, size, size);
        const grad = target.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, glow);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, '#000');
        target.fillStyle = grad;
        target.fillRect(x, y, size, size);
        target.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        target.lineWidth = 2;
        target.strokeRect(x + 1, y + 1, size - 2, size - 2);
        target.fillStyle = 'rgba(255, 255, 255, 0.25)';
        target.fillRect(x + 3, y + 3, size - 6, 3);
    }

    function drawGhost() {
        let gy = pos.y;
        while (!collides(current.shape, pos.x, gy + 1)) gy += 1;
        ctx.save();
        ctx.globalAlpha = 0.22;
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (current.shape[r][c]) {
                    drawCell(current, (pos.x + c) * BLOCK, (gy + r) * BLOCK);
                }
            }
        }
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) drawCell(board[r][c], c * BLOCK, r * BLOCK);
            }
        }

        if (current) {
            drawGhost();
            for (let r = 0; r < current.shape.length; r++) {
                for (let c = 0; c < current.shape[r].length; c++) {
                    if (current.shape[r][c]) {
                        drawCell(current, (pos.x + c) * BLOCK, (pos.y + r) * BLOCK);
                    }
                }
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.life -= 1;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life / 50);
            ctx.fillRect(p.x, p.y, 4, 4);
            ctx.globalAlpha = 1;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawMini(piece, target, w, h) {
        target.clearRect(0, 0, w, h);
        if (!piece) return;
        const size = 22;
        const sw = piece.shape[0].length * size;
        const sh = piece.shape.length * size;
        const ox = (w - sw) / 2;
        const oy = (h - sh) / 2;
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    drawCell(piece, ox + c * size, oy + r * size, size, target);
                }
            }
        }
    }

    function drawNext() { drawMini(next, nextCtx, nextCanvas.width, nextCanvas.height); }
    function drawHold() { drawMini(hold, holdCtx, holdCanvas.width, holdCanvas.height); }

    function loop(time = 0) {
        if (!running) return;
        const dt = time - lastTime;
        lastTime = time;
        if (!paused) {
            dropCounter += dt;
            const interval = Math.max(80, 800 - (level - 1) * 60);
            if (dropCounter > interval) {
                if (!collides(current.shape, pos.x, pos.y + 1)) pos.y += 1;
                else lock();
                dropCounter = 0;
            }
            draw();
        }
        requestAnimationFrame(loop);
    }

    function togglePause() {
        if (gameOver) return;
        if (!sixOverlay.classList.contains('hidden')) return;
        paused = !paused;
        pauseEl.classList.toggle('hidden', !paused);
    }

    function handleAction(action) {
        if (gameOver) return;
        if (action === 'pause') { togglePause(); return; }
        if (paused) return;
        switch (action) {
            case 'left':   move(-1); break;
            case 'right':  move(1); break;
            case 'down':   softDrop(); break;
            case 'rotate': tryRotate(); break;
            case 'drop':   hardDrop(); break;
            case 'hold':   holdPiece(); break;
        }
    }

    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
        if (paused) return;
        switch (e.key) {
            case 'ArrowLeft':  handleAction('left'); break;
            case 'ArrowRight': handleAction('right'); break;
            case 'ArrowDown':  handleAction('down'); break;
            case 'ArrowUp':
            case 'x': case 'X': handleAction('rotate'); break;
            case ' ':          e.preventDefault(); handleAction('drop'); break;
            case 'c': case 'C': handleAction('hold'); break;
        }
    });

    const touchControls = document.getElementById('touchControls');
    if (touchControls) {
        const repeatable = new Set(['left', 'right', 'down']);
        const timers = new Map();
        const startRepeat = (action, btn) => {
            handleAction(action);
            if (!repeatable.has(action)) return;
            const initial = setTimeout(() => {
                const interval = setInterval(() => handleAction(action), action === 'down' ? 50 : 90);
                timers.set(btn, { type: 'interval', id: interval });
            }, 220);
            timers.set(btn, { type: 'timeout', id: initial });
        };
        const stopRepeat = (btn) => {
            const t = timers.get(btn);
            if (!t) return;
            if (t.type === 'interval') clearInterval(t.id);
            else clearTimeout(t.id);
            timers.delete(btn);
        };
        touchControls.querySelectorAll('.touch-btn').forEach((btn) => {
            const action = btn.dataset.action;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                startRepeat(action, btn);
            }, { passive: false });
            const release = (e) => {
                if (e) e.preventDefault();
                btn.classList.remove('pressed');
                stopRepeat(btn);
            };
            btn.addEventListener('touchend', release);
            btn.addEventListener('touchcancel', release);
            btn.addEventListener('click', (e) => {
                if (e.detail === 0) handleAction(action);
            });
        });
    }

    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());

    window.closeSixSixSixOverlay = function () {
        sixOverlay.classList.add('hidden');
        paused = false;
    };

    spawn();
    drawNext();
    drawHold();
    updateUI();
    loop();
})();
