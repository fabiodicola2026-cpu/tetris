const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

let gameRunning = true;
let score = 0;
let sixSixSixTriggered = false;

// Dino object
const dino = {
    x: 50,
    y: 300,
    width: 40,
    height: 50,
    velocityY: 0,
    jumping: false,
    color: '#ff4444'
};

// Gravity
const gravity = 0.6;
const jumpPower = -15;

// Obstacles
let obstacles = [];
let obstacleSpeed = 7;
let spawnRate = 120;
let frameCount = 0;

// Devil watcher
const devilWatcher = {
    x: 700,
    y: 60,
    eyeDistance: 12
};

// Keyboard input
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !dino.jumping && gameRunning) {
        dino.velocityY = jumpPower;
        dino.jumping = true;
    }
});

// Touch input for mobile
document.addEventListener('touchstart', () => {
    if (!dino.jumping && gameRunning) {
        dino.velocityY = jumpPower;
        dino.jumping = true;
    }
});

function drawDino() {
    // Body
    ctx.fillStyle = dino.color;
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
    
    // Head
    ctx.beginPath();
    ctx.arc(dino.x + 25, dino.y - 10, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(dino.x + 18, dino.y - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dino.x + 32, dino.y - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Horns
    ctx.strokeStyle = dino.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dino.x + 15, dino.y - 20);
    ctx.lineTo(dino.x + 10, dino.y - 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dino.x + 35, dino.y - 20);
    ctx.lineTo(dino.x + 40, dino.y - 35);
    ctx.stroke();
}

function drawObstacles() {
    ctx.fillStyle = '#ff6666';
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Red glow
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

function drawDevilWatcher() {
    ctx.save();
    ctx.translate(devilWatcher.x, devilWatcher.y);
    
    // Head
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-8, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils (watching the dino)
    ctx.fillStyle = '#ffff00';
    const angleX = Math.atan2(dino.y - devilWatcher.y, dino.x - devilWatcher.x);
    ctx.beginPath();
    ctx.arc(-8 + Math.cos(angleX) * 3, -8 + Math.sin(angleX) * 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8 + Math.cos(angleX) * 3, -8 + Math.sin(angleX) * 3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Horns
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -20);
    ctx.lineTo(-20, -40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, -20);
    ctx.lineTo(20, -40);
    ctx.stroke();
    
    // Mouth
    ctx.beginPath();
    ctx.arc(0, 10, 10, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
}

function spawnObstacle() {
    const height = Math.random() > 0.5 ? 40 : 60;
    obstacles.push({
        x: canvas.width,
        y: 340 - height,
        width: 30,
        height: height
    });
}

function updateGame() {
    // Apply gravity
    dino.velocityY += gravity;
    dino.y += dino.velocityY;
    
    // Ground collision
    if (dino.y + dino.height >= 350) {
        dino.y = 350 - dino.height;
        dino.velocityY = 0;
        dino.jumping = false;
    }
    
    // Spawn obstacles
    frameCount++;
    if (frameCount > spawnRate) {
        spawnObstacle();
        frameCount = 0;
        if (spawnRate > 50) spawnRate -= 1;
    }
    
    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacleSpeed;
        
        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            document.getElementById('score').textContent = `Score: ${score}`;
            
            // Increase difficulty
            if (obstacleSpeed < 12) obstacleSpeed += 0.05;
            
            // Check for 666
            if (score === 666 && !sixSixSixTriggered) {
                sixSixSixTriggered = true;
                gameRunning = false;
                showSixSixSixOverlay();
            }
        }
        
        // Collision detection
        if (checkCollision(dino, obstacles[i])) {
            endGame();
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function draw() {
    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(15, 15, 30, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground
    ctx.fillStyle = '#2d2d4d';
    ctx.fillRect(0, 350, canvas.width, 50);
    
    // Ground line
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.lineTo(canvas.width, 350);
    ctx.stroke();
    
    drawDino();
    drawObstacles();
    drawDevilWatcher();
}

function gameLoop() {
    if (gameRunning) {
        updateGame();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = `Final Score: ${score}`;
}

function showSixSixSixOverlay() {
    document.getElementById('sixSixSixOverlay').classList.remove('hidden');
}

function closeSixSixSixOverlay() {
    document.getElementById('sixSixSixOverlay').classList.add('hidden');
    gameRunning = true;
}

gameLoop();