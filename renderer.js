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

// Audio setup
const bgm = document.getElementById('bgm');
bgm.volume = 0.4; // Set volume to 40%

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if (e.key === ' ') {
    e.preventDefault();
  }

  if (e.key === 'Escape' && gameState.running) {
    e.preventDefault();
    gameState.paused = !gameState.paused;

    // Pause/resume music
    if (gameState.paused) {
      bgm.pause();
    } else {
      bgm.play();
    }
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
      sounds.shootShotgun();
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
      sounds.shootLaser();
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
      sounds.shoot();
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
    sounds.shootMissile();
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

// Enemy bullets
let enemyBullets = [];

function updateEnemyBullets() {
  enemyBullets = enemyBullets.filter(bullet => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    return bullet.y < CANVAS_HEIGHT + 10 && bullet.x > -10 && bullet.x < CANVAS_WIDTH + 10;
  });
}

function drawEnemyBullets() {
  enemyBullets.forEach(bullet => {
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Enemies
let enemies = [];
let enemySpawnTimer = 0;
let minibossSpawnTimer = 0;
const ENEMY_SPAWN_INTERVAL = 1000; // 1 second
const MINIBOSS_SPAWN_INTERVAL = 45000; // 45 seconds

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
  },
  {
    name: 'shooter',
    color: '#ff8800',
    health: 2,
    points: 40,
    move: (enemy) => {
      // Descend to mid-screen and stop
      if (enemy.y < CANVAS_HEIGHT / 2 - 50) {
        enemy.y += ENEMY_SPEED * 0.7;
      }

      // Shoot 3-bullet spread at player
      const now = Date.now();
      if (!enemy.lastShot || now - enemy.lastShot > 2000) {
        enemy.lastShot = now;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);

        for (let i = -1; i <= 1; i++) {
          const spreadAngle = angle + (i * 0.3);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(spreadAngle) * 3,
            vy: Math.sin(spreadAngle) * 3
          });
        }
        sounds.enemyShoot();
      }
    }
  },
  {
    name: 'sidewinder',
    color: '#00ffff',
    health: 1,
    points: 35,
    move: (enemy) => {
      // Move horizontally based on spawn direction
      enemy.x += enemy.direction * 3;

      // Shoot downward periodically
      const now = Date.now();
      if (!enemy.lastShot || now - enemy.lastShot > 500) {
        enemy.lastShot = now;
        enemyBullets.push({
          x: enemy.x,
          y: enemy.y,
          vx: 0,
          vy: 4
        });
        sounds.enemyShoot();
      }
    }
  },
  {
    name: 'orbiter',
    color: '#ff00aa',
    health: 2,
    points: 50,
    move: (enemy) => {
      // Initialize orbit center if not set
      if (!enemy.orbitCenter) {
        enemy.orbitCenter = { x: enemy.x, y: enemy.y };
        enemy.orbitAngle = 0;
        enemy.orbitRadius = 40;
      }

      // Orbit around center point
      enemy.orbitAngle += 0.05;
      enemy.x = enemy.orbitCenter.x + Math.cos(enemy.orbitAngle) * enemy.orbitRadius;
      enemy.y = enemy.orbitCenter.y + Math.sin(enemy.orbitAngle) * enemy.orbitRadius;

      // Shoot radially outward in 4 directions
      const now = Date.now();
      if (!enemy.lastShot || now - enemy.lastShot > 1500) {
        enemy.lastShot = now;

        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i;
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3
          });
        }
        sounds.enemyShoot();
      }
    }
  }
];

function spawnEnemy() {
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

  let x, y, direction;

  // Sidewinders spawn from left or right edge
  if (type.name === 'sidewinder') {
    direction = Math.random() < 0.5 ? 1 : -1;
    x = direction > 0 ? -20 : CANVAS_WIDTH + 20;
    y = Math.random() * (CANVAS_HEIGHT / 2) + 50;
  } else {
    x = Math.random() * (CANVAS_WIDTH - 30) + 15;
    y = -20;
    direction = 0;
  }

  enemies.push({
    x: x,
    y: y,
    width: 15,
    height: 15,
    type: type,
    health: type.health,
    maxHealth: type.health,
    diving: false,
    direction: direction
  });
}

// Guardian miniboss type
const guardianType = {
  name: 'guardian',
  color: '#8800ff',
  health: 20,
  points: 200,
  move: (enemy) => {
    // Move to top third of screen
    if (enemy.y < CANVAS_HEIGHT / 3) {
      enemy.y += 1;
    }

    // Slow left-right movement
    if (!enemy.moveDir) enemy.moveDir = 1;
    enemy.x += enemy.moveDir * 1.5;

    if (enemy.x < 50 || enemy.x > CANVAS_WIDTH - 50) {
      enemy.moveDir *= -1;
    }

    const now = Date.now();

    // Laser beams from sides (every 4 seconds)
    if (!enemy.lastLaser || now - enemy.lastLaser > 4000) {
      enemy.lastLaser = now;
      enemy.laserActive = true;
      enemy.laserStartTime = now;
    }

    // Deactivate laser after 2 seconds
    if (enemy.laserActive && now - enemy.laserStartTime > 2000) {
      enemy.laserActive = false;
    }

    // Bullet spread (every 3 seconds)
    if (!enemy.lastSpread || now - enemy.lastSpread > 3000) {
      enemy.lastSpread = now;

      for (let i = -2; i <= 2; i++) {
        const angle = Math.PI / 2 + (i * 0.4);
        enemyBullets.push({
          x: enemy.x,
          y: enemy.y + enemy.height / 2,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5
        });
      }
      sounds.enemyShoot();
    }
  }
};

function spawnGuardian() {
  enemies.push({
    x: CANVAS_WIDTH / 2,
    y: -50,
    width: 40,
    height: 40,
    type: guardianType,
    health: guardianType.health,
    maxHealth: guardianType.health,
    isMiniboss: true,
    moveDir: 1
  });
}

function updateEnemies(deltaTime) {
  enemySpawnTimer += deltaTime;
  minibossSpawnTimer += deltaTime;

  if (enemySpawnTimer > ENEMY_SPAWN_INTERVAL) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (minibossSpawnTimer > MINIBOSS_SPAWN_INTERVAL) {
    spawnGuardian();
    minibossSpawnTimer = 0;
  }

  enemies = enemies.filter(enemy => {
    if (enemy.dead) return false;

    enemy.type.move(enemy);

    // Don't remove minibosses off-screen
    if (enemy.isMiniboss) return true;

    // Remove if off screen
    if (enemy.y > CANVAS_HEIGHT + 20 || enemy.x < -20 || enemy.x > CANVAS_WIDTH + 20) {
      return false;
    }

    return true;
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    // Draw Guardian lasers
    if (enemy.type.name === 'guardian' && enemy.laserActive) {
      ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.fillRect(0, enemy.y - 5, 50, 10); // Left laser
      ctx.fillRect(CANVAS_WIDTH - 50, enemy.y - 5, 50, 10); // Right laser

      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, enemy.y - 2, 50, 4); // Left laser core
      ctx.fillRect(CANVAS_WIDTH - 50, enemy.y - 2, 50, 4); // Right laser core
    }

    // Draw enemy body
    if (enemy.isMiniboss) {
      // Draw Guardian as rectangle
      ctx.fillStyle = enemy.type.color;
      ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
    } else {
      // Draw regular enemies as circles
      ctx.fillStyle = enemy.type.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw health bar for enemies with more than 1 health
    if (enemy.maxHealth > 1) {
      const healthBarWidth = enemy.isMiniboss ? 40 : 20;
      const healthBarHeight = 3;
      const healthPercent = enemy.health / enemy.maxHealth;

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - (enemy.height / 2) - 10, healthBarWidth, healthBarHeight);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - (enemy.height / 2) - 10, healthBarWidth * healthPercent, healthBarHeight);
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
          sounds.explosion();

          // Random chance to drop powerup
          if (Math.random() < 0.15) {
            spawnPowerup(enemy.x, enemy.y);
          }
        } else {
          sounds.enemyHit();
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
          sounds.explosion();

          if (Math.random() < 0.15) {
            spawnPowerup(enemy.x, enemy.y);
          }
        } else {
          sounds.enemyHit();
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
      sounds.hit();
      sounds.explosion();

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
      sounds.powerup();
      return false;
    }
    return true;
  });

  // Enemy bullets vs player
  enemyBullets.forEach((bullet, bulletIndex) => {
    if (player.x < bullet.x + 3 &&
        player.x + player.width > bullet.x - 3 &&
        player.y < bullet.y + 3 &&
        player.y + player.height > bullet.y - 3) {

      enemyBullets.splice(bulletIndex, 1);
      gameState.health -= 1;
      updateHealth();
      sounds.hit();

      if (gameState.health <= 0) {
        endGame();
      }
    }
  });

  // Guardian lasers vs player
  enemies.forEach(enemy => {
    if (enemy.type.name === 'guardian' && enemy.laserActive) {
      // Check if player is in laser zones (left or right 50px)
      const inLeftLaser = player.x < 50 && player.x + player.width > 0;
      const inRightLaser = player.x < CANVAS_WIDTH && player.x + player.width > CANVAS_WIDTH - 50;
      const inLaserHeight = player.y < enemy.y + 5 && player.y + player.height > enemy.y - 5;

      if ((inLeftLaser || inRightLaser) && inLaserHeight) {
        if (!player.laserHitCooldown || Date.now() - player.laserHitCooldown > 500) {
          player.laserHitCooldown = Date.now();
          gameState.health -= 1;
          updateHealth();
          sounds.hit();

          if (gameState.health <= 0) {
            endGame();
          }
        }
      }
    }
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
    updateEnemyBullets();
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

    // Continuous shooting when spacebar is held
    if (keys[' '] && gameState.running && !gameState.paused) {
      if (gameState.powerup === 'missile') {
        shootMissile();
      } else {
        shoot();
      }
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
    drawEnemyBullets();
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
  enemyBullets = [];
  powerups = [];
  enemySpawnTimer = 0;
  minibossSpawnTimer = 0;

  player.x = CANVAS_WIDTH / 2;
  player.y = CANVAS_HEIGHT - 50;

  updateScore();
  updateHealth();
  updatePowerupDisplay();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over').classList.add('hidden');

  // Start music
  bgm.currentTime = 0;
  bgm.play();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState.running = false;
  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('game-over').classList.remove('hidden');

  // Stop music
  bgm.pause();
  bgm.currentTime = 0;
}

// Event listeners
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', startGame);

// Initial canvas clear
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
