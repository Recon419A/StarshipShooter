// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const POWERUP_DURATION = 10000; // 10 seconds

// Game state
let gameState = {
  running: false,
  paused: false,
  score: 0,
  health: 3,
  powerup: null,
  powerupTimer: 0
};

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if (e.key === ' ' && gameState.running && !gameState.paused) {
    e.preventDefault();
    shoot();
  }

  if (e.key === 'Escape' && gameState.running) {
    e.preventDefault();
    gameState.paused = !gameState.paused;
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Player
const player = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 50,
  width: PLAYER_SIZE,
  height: PLAYER_SIZE,
  speed: PLAYER_SPEED,

  update() {
    // Left movement
    if ((keys['ArrowLeft'] || keys['a'] || keys['A']) && this.x > 0) {
      this.x -= this.speed;
    }
    // Right movement
    if ((keys['ArrowRight'] || keys['d'] || keys['D']) && this.x < CANVAS_WIDTH - this.width) {
      this.x += this.speed;
    }
  },

  draw() {
    // Draw ship as a triangle
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    // Draw engine glow
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height, 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Bullets
let bullets = [];

function shoot() {
  const now = Date.now();
  if (!player.lastShot || now - player.lastShot > 150) {
    player.lastShot = now;

    if (gameState.powerup === 'shotgun') {
      // Shotgun: 5 bullets in spread
      for (let i = -2; i <= 2; i++) {
        bullets.push({
          x: player.x + player.width / 2,
          y: player.y,
          vx: i * 1.5,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#ffff00'
        });
      }
    } else if (gameState.powerup === 'laser') {
      // Big laser beam
      bullets.push({
        x: player.x + player.width / 2 - 10,
        y: player.y,
        vx: 0,
        vy: -BULLET_SPEED * 2,
        width: 20,
        height: 40,
        color: '#ff00ff',
        damage: 3
      });
    } else {
      // Normal bullet
      bullets.push({
        x: player.x + player.width / 2,
        y: player.y,
        vx: 0,
        vy: -BULLET_SPEED,
        width: 3,
        height: 8,
        color: '#00ffff'
      });
    }
  }
}

function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    return bullet.y > -bullet.height;
  });
}

function drawBullets() {
  bullets.forEach(bullet => {
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);

    // Add glow effect for laser
    if (bullet.color === '#ff00ff') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff00ff';
      ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
      ctx.shadowBlur = 0;
    }
  });
}

// Missiles (for missile powerup)
let missiles = [];

function shootMissile() {
  const now = Date.now();
  if (!player.lastMissile || now - player.lastMissile > 500) {
    player.lastMissile = now;
    missiles.push({
      x: player.x + player.width / 2,
      y: player.y,
      vx: 0,
      vy: -4,
      width: 5,
      height: 10,
      target: null
    });
  }
}

function updateMissiles() {
  missiles = missiles.filter(missile => {
    // Find closest enemy for homing
    if (!missile.target || missile.target.dead) {
      let closest = null;
      let closestDist = Infinity;
      enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - missile.x, enemy.y - missile.y);
        if (dist < closestDist) {
          closestDist = dist;
          closest = enemy;
        }
      });
      missile.target = closest;
    }

    // Home towards target
    if (missile.target) {
      const dx = missile.target.x - missile.x;
      const dy = missile.target.y - missile.y;
      const angle = Math.atan2(dy, dx);
      missile.vx = Math.cos(angle) * 5;
      missile.vy = Math.sin(angle) * 5;
    }

    missile.x += missile.vx;
    missile.y += missile.vy;
    return missile.y > -10 && missile.y < CANVAS_HEIGHT + 10;
  });
}

function drawMissiles() {
  missiles.forEach(missile => {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw exhaust trail
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(missile.x - missile.vx, missile.y - missile.vy, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Enemies
let enemies = [];
let enemySpawnTimer = 0;
const ENEMY_SPAWN_INTERVAL = 1000; // 1 second

const enemyTypes = [
  {
    name: 'straight',
    color: '#ff0000',
    health: 1,
    points: 10,
    move: (enemy) => {
      enemy.y += ENEMY_SPEED;
    }
  },
  {
    name: 'zigzag',
    color: '#ff00ff',
    health: 2,
    points: 20,
    move: (enemy) => {
      enemy.y += ENEMY_SPEED;
      enemy.x += Math.sin(enemy.y / 30) * 3;
    }
  },
  {
    name: 'diver',
    color: '#ffff00',
    health: 1,
    points: 30,
    move: (enemy) => {
      if (!enemy.diving) {
        enemy.y += ENEMY_SPEED * 0.5;
        if (Math.abs(enemy.x - player.x) < 50 && enemy.y < CANVAS_HEIGHT / 2) {
          enemy.diving = true;
          enemy.diveX = player.x;
        }
      } else {
        const dx = enemy.diveX - enemy.x;
        const dy = CANVAS_HEIGHT - enemy.y;
        const angle = Math.atan2(dy, dx);
        enemy.x += Math.cos(angle) * 4;
        enemy.y += Math.sin(angle) * 4;
      }
    }
  }
];

function spawnEnemy() {
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  enemies.push({
    x: Math.random() * (CANVAS_WIDTH - 30) + 15,
    y: -20,
    width: 15,
    height: 15,
    type: type,
    health: type.health,
    maxHealth: type.health,
    diving: false
  });
}

function updateEnemies(deltaTime) {
  enemySpawnTimer += deltaTime;

  if (enemySpawnTimer > ENEMY_SPAWN_INTERVAL) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  enemies = enemies.filter(enemy => {
    if (enemy.dead) return false;

    enemy.type.move(enemy);

    // Remove if off screen
    if (enemy.y > CANVAS_HEIGHT + 20 || enemy.x < -20 || enemy.x > CANVAS_WIDTH + 20) {
      return false;
    }

    return true;
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.type.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar for enemies with more than 1 health
    if (enemy.maxHealth > 1) {
      const healthBarWidth = 20;
      const healthBarHeight = 3;
      const healthPercent = enemy.health / enemy.maxHealth;

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - 15, healthBarWidth, healthBarHeight);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - 15, healthBarWidth * healthPercent, healthBarHeight);
    }
  });
}

// Powerups
let powerups = [];

function spawnPowerup(x, y) {
  const types = ['shotgun', 'missile', 'laser'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    x: x,
    y: y,
    width: 20,
    height: 20,
    type: type,
    vy: 2
  });
}

function updatePowerups() {
  powerups = powerups.filter(powerup => {
    powerup.y += powerup.vy;
    return powerup.y < CANVAS_HEIGHT + 20;
  });
}

function drawPowerups() {
  powerups.forEach(powerup => {
    // Draw powerup box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(powerup.x - powerup.width / 2, powerup.y - powerup.height / 2, powerup.width, powerup.height);

    // Draw powerup symbol
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let symbol = '?';
    if (powerup.type === 'shotgun') symbol = 'S';
    if (powerup.type === 'missile') symbol = 'M';
    if (powerup.type === 'laser') symbol = 'L';

    ctx.fillText(symbol, powerup.x, powerup.y);
  });
}

// Collision detection
function checkCollisions() {
  // Bullets vs enemies
  bullets.forEach((bullet, bulletIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      if (bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y &&
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x) {

        const damage = bullet.damage || 1;
        enemy.health -= damage;
        bullets.splice(bulletIndex, 1);

        if (enemy.health <= 0) {
          enemy.dead = true;
          gameState.score += enemy.type.points;
          updateScore();

          // Random chance to drop powerup
          if (Math.random() < 0.15) {
            spawnPowerup(enemy.x, enemy.y);
          }
        }
      }
    });
  });

  // Missiles vs enemies
  missiles.forEach((missile, missileIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      const dist = Math.hypot(enemy.x - missile.x, enemy.y - missile.y);
      if (dist < enemy.width) {
        enemy.health -= 2;
        missiles.splice(missileIndex, 1);

        if (enemy.health <= 0) {
          enemy.dead = true;
          gameState.score += enemy.type.points;
          updateScore();

          if (Math.random() < 0.15) {
            spawnPowerup(enemy.x, enemy.y);
          }
        }
      }
    });
  });

  // Player vs enemies
  enemies.forEach((enemy) => {
    if (player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y) {

      enemy.dead = true;
      gameState.health -= 1;
      updateHealth();

      if (gameState.health <= 0) {
        endGame();
      }
    }
  });

  // Player vs powerups
  powerups = powerups.filter((powerup) => {
    if (player.x < powerup.x + powerup.width &&
        player.x + player.width > powerup.x &&
        player.y < powerup.y + powerup.height &&
        player.y + player.height > powerup.y) {

      activatePowerup(powerup.type);
      return false;
    }
    return true;
  });
}

function activatePowerup(type) {
  gameState.powerup = type;
  gameState.powerupTimer = POWERUP_DURATION;
  updatePowerupDisplay();
}

// UI updates
function updateScore() {
  document.getElementById('score').textContent = gameState.score;
}

function updateHealth() {
  document.getElementById('health').textContent = gameState.health;
}

function updatePowerupDisplay() {
  const display = document.getElementById('powerup-display');
  if (gameState.powerup) {
    const timeLeft = Math.ceil(gameState.powerupTimer / 1000);
    let name = '';
    if (gameState.powerup === 'shotgun') name = 'SHOTGUN';
    if (gameState.powerup === 'missile') name = 'MISSILES';
    if (gameState.powerup === 'laser') name = 'LASER';
    display.textContent = `${name} (${timeLeft}s)`;
  } else {
    display.textContent = '';
  }
}

// Game loop
let lastTime = 0;

function gameLoop(currentTime) {
  if (!gameState.running) return;

  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (!gameState.paused) {
    // Update
    player.update();
    updateBullets();
    updateMissiles();
    updateEnemies(deltaTime);
    updatePowerups();
    checkCollisions();

    // Update powerup timer
    if (gameState.powerup) {
      gameState.powerupTimer -= deltaTime;
      if (gameState.powerupTimer <= 0) {
        gameState.powerup = null;
        gameState.powerupTimer = 0;
      }
      updatePowerupDisplay();
    }

    // Shoot missiles if missile powerup is active
    if (gameState.powerup === 'missile' && (keys[' '] || keys['Space'])) {
      shootMissile();
    }

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 26, 0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars background
    drawStars();

    // Draw
    drawEnemies();
    drawBullets();
    drawMissiles();
    drawPowerups();
    player.draw();
  } else {
    // Draw pause text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  requestAnimationFrame(gameLoop);
}

// Background stars
const stars = [];
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5
  });
}

function drawStars() {
  stars.forEach(star => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(star.x, star.y, star.size, star.size);

    star.y += star.speed;
    if (star.y > CANVAS_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * CANVAS_WIDTH;
    }
  });
}

// Game start/end
function startGame() {
  gameState.running = true;
  gameState.paused = false;
  gameState.score = 0;
  gameState.health = 3;
  gameState.powerup = null;
  gameState.powerupTimer = 0;

  bullets = [];
  missiles = [];
  enemies = [];
  powerups = [];
  enemySpawnTimer = 0;

  player.x = CANVAS_WIDTH / 2;
  player.y = CANVAS_HEIGHT - 50;

  updateScore();
  updateHealth();
  updatePowerupDisplay();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over').classList.add('hidden');

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState.running = false;
  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('game-over').classList.remove('hidden');
}

// Event listeners
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', startGame);

// Initial canvas clear
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
