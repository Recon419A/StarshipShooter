// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const POWERUP_DURATION = 10000; // 10 seconds

// Persistent data
let persistentData = {
  scrap: parseInt(localStorage.getItem('scrap') || '0'),
  weaponTier: parseInt(localStorage.getItem('weaponTier') || '1'),
  maxShields: parseInt(localStorage.getItem('maxShields') || '0'),
  hasCIWS: localStorage.getItem('hasCIWS') === 'true'
};

function saveProgress() {
  localStorage.setItem('scrap', persistentData.scrap.toString());
  localStorage.setItem('weaponTier', persistentData.weaponTier.toString());
  localStorage.setItem('maxShields', persistentData.maxShields.toString());
  localStorage.setItem('hasCIWS', persistentData.hasCIWS.toString());
}

// Game state
let gameState = {
  running: false,
  paused: false,
  score: 0,
  health: 5,
  shields: persistentData.maxShields,
  powerup: null,
  powerupTimer: 0,
  shopOpen: false,
  nextShopScore: 500
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
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Draw main body (central fuselage)
    ctx.fillStyle = '#00aa00';
    ctx.beginPath();
    ctx.moveTo(centerX, this.y); // Nose
    ctx.lineTo(centerX + 5, centerY);
    ctx.lineTo(centerX + 5, this.y + this.height - 3);
    ctx.lineTo(centerX - 5, this.y + this.height - 3);
    ctx.lineTo(centerX - 5, centerY);
    ctx.closePath();
    ctx.fill();

    // Draw wings
    ctx.fillStyle = '#00ff00';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(centerX - 5, centerY);
    ctx.lineTo(this.x, centerY + 5);
    ctx.lineTo(this.x + 2, this.y + this.height - 5);
    ctx.lineTo(centerX - 5, this.y + this.height - 5);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(centerX + 5, centerY);
    ctx.lineTo(this.x + this.width, centerY + 5);
    ctx.lineTo(this.x + this.width - 2, this.y + this.height - 5);
    ctx.lineTo(centerX + 5, this.y + this.height - 5);
    ctx.closePath();
    ctx.fill();

    // Draw cockpit
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(centerX, this.y + 2);
    ctx.lineTo(centerX + 3, this.y + 6);
    ctx.lineTo(centerX - 3, this.y + 6);
    ctx.closePath();
    ctx.fill();

    // Draw engine exhausts
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(centerX - 4, this.y + this.height - 2, 2, 3);
    ctx.fillRect(centerX + 2, this.y + this.height - 2, 2, 3);

    // Draw engine glow
    ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX - 3, this.y + this.height + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 3, this.y + this.height + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw shield indicator if shields are active
    if (gameState.shields > 0) {
      const shieldOpacity = Math.min(gameState.shields / persistentData.maxShields, 1);
      ctx.strokeStyle = `rgba(0, 200, 255, ${shieldOpacity * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, this.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

// Bullets
let bullets = [];

function shoot() {
  const now = Date.now();
  if (!player.lastShot || now - player.lastShot > 150) {
    player.lastShot = now;

    if (gameState.powerup === 'shotgun') {
      // Shotgun powerup: wide spread based on tier
      const spreadCount = 3 + persistentData.weaponTier;
      const halfSpread = Math.floor(spreadCount / 2);
      for (let i = -halfSpread; i <= halfSpread; i++) {
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
      // Big laser beam (scales with tier)
      bullets.push({
        x: player.x + player.width / 2 - (10 + persistentData.weaponTier * 2),
        y: player.y,
        vx: 0,
        vy: -BULLET_SPEED * 2,
        width: 20 + persistentData.weaponTier * 4,
        height: 40,
        color: '#ff00ff',
        damage: 3 + persistentData.weaponTier
      });
      sounds.shootLaser();
    } else {
      // Normal bullets based on tier
      // Tier 1: 1 bullet
      // Tier 2: 2 bullets
      // Tier 3+: 3 bullets
      const bulletCount = Math.min(persistentData.weaponTier, 3);

      if (bulletCount === 1) {
        bullets.push({
          x: player.x + player.width / 2,
          y: player.y,
          vx: 0,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
      } else if (bulletCount === 2) {
        // Two bullets side by side
        bullets.push({
          x: player.x + player.width / 2 - 5,
          y: player.y,
          vx: 0,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
        bullets.push({
          x: player.x + player.width / 2 + 5,
          y: player.y,
          vx: 0,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
      } else {
        // Three bullets (middle + angled)
        bullets.push({
          x: player.x + player.width / 2,
          y: player.y,
          vx: 0,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
        bullets.push({
          x: player.x + player.width / 2 - 5,
          y: player.y,
          vx: -0.5,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
        bullets.push({
          x: player.x + player.width / 2 + 5,
          y: player.y,
          vx: 0.5,
          vy: -BULLET_SPEED,
          width: 3,
          height: 8,
          color: '#00ffff'
        });
      }

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
    // Enhanced bullet rendering with glow
    if (bullet.color === '#ff00ff') {
      // Laser beam
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff00ff';
      ctx.fillStyle = bullet.color;
      ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
      ctx.shadowBlur = 0;
    } else if (bullet.color === '#ffff00') {
      // Shotgun pellets
      ctx.fillStyle = bullet.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#ffff00';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.width, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Normal bullets - vary color slightly by tier
      const tierColors = ['#00ffff', '#00ffaa', '#00ffdd'];
      const tierIndex = Math.min(persistentData.weaponTier - 1, tierColors.length - 1);
      ctx.fillStyle = tierColors[tierIndex];

      // Draw bullet with slight glow
      ctx.shadowBlur = 3;
      ctx.shadowColor = tierColors[tierIndex];
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

// CIWS (Close-In Weapon System) auto-defense
let ciwsBullets = [];
let ciwsCooldown = 0;
const CIWS_RANGE = 150;
const CIWS_FIRE_RATE = 100; // milliseconds

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

function updateCIWS(deltaTime) {
  if (!persistentData.hasCIWS) return;

  ciwsCooldown -= deltaTime;

  // Find closest enemy bullet within range
  let closestBullet = null;
  let closestDist = CIWS_RANGE;

  enemyBullets.forEach(bullet => {
    const dist = Math.hypot(bullet.x - (player.x + player.width / 2), bullet.y - player.y);
    if (dist < closestDist) {
      closestDist = dist;
      closestBullet = bullet;
    }
  });

  // Fire at closest bullet if cooldown ready
  if (closestBullet && ciwsCooldown <= 0) {
    ciwsCooldown = CIWS_FIRE_RATE;

    const dx = closestBullet.x - (player.x + player.width / 2);
    const dy = closestBullet.y - player.y;
    const angle = Math.atan2(dy, dx);

    ciwsBullets.push({
      x: player.x + player.width / 2,
      y: player.y,
      vx: Math.cos(angle) * 10,
      vy: Math.sin(angle) * 10,
      target: closestBullet
    });
  }

  // Update CIWS bullets
  ciwsBullets = ciwsBullets.filter(bullet => {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    return bullet.y > -10 && bullet.y < CANVAS_HEIGHT + 10 && bullet.x > -10 && bullet.x < CANVAS_WIDTH + 10;
  });
}

function drawCIWS() {
  if (!persistentData.hasCIWS) return;

  // Draw CIWS range indicator (faint circle)
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y, CIWS_RANGE, 0, Math.PI * 2);
  ctx.stroke();

  // Draw CIWS bullets
  ciwsBullets.forEach(bullet => {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw tracer line
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 2, bullet.y - bullet.vy * 2);
    ctx.stroke();
  });
}

// Enemies
let enemies = [];
let enemySpawnTimer = 0;
let minibossSpawnTimer = 0;
let bossSpawnTimer = 0;
let bossSpawned = false;
const ENEMY_SPAWN_INTERVAL = 1000; // 1 second
const MINIBOSS_SPAWN_INTERVAL = 45000; // 45 seconds
const BOSS_SPAWN_TIME = 120000; // 2 minutes

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
    name: 'tank',
    color: '#cc0000',
    health: 5,
    points: 60,
    move: (enemy) => {
      enemy.y += ENEMY_SPEED * 0.6;
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
  },
  {
    name: 'heavy',
    color: '#ff6600',
    health: 4,
    points: 70,
    move: (enemy) => {
      // Slow descent with side-to-side drift
      enemy.y += ENEMY_SPEED * 0.5;
      if (!enemy.driftDir) enemy.driftDir = Math.random() < 0.5 ? 1 : -1;
      enemy.x += enemy.driftDir * 0.5;

      // Shoot downward periodically
      const now = Date.now();
      if (!enemy.lastShot || now - enemy.lastShot > 1500) {
        enemy.lastShot = now;
        enemyBullets.push({
          x: enemy.x,
          y: enemy.y,
          vx: 0,
          vy: 5
        });
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

// Boss type - multi-phase ultimate enemy
const bossType = {
  name: 'devastator',
  color: '#ff0000',
  health: 100,
  points: 1000,
  move: (enemy) => {
    // Move to top quarter of screen
    if (enemy.y < CANVAS_HEIGHT / 4) {
      enemy.y += 0.5;
    }

    // Movement pattern based on phase
    const phase = Math.floor((1 - enemy.health / enemy.maxHealth) * 3); // 0, 1, or 2

    if (!enemy.moveDir) enemy.moveDir = 1;
    if (!enemy.phase) enemy.phase = 0;

    // Update phase
    if (phase !== enemy.phase) {
      enemy.phase = phase;
      enemy.phaseChangeTime = Date.now();
    }

    // Phase-based movement
    if (enemy.phase === 0) {
      // Phase 1: Slow horizontal sweep
      enemy.x += enemy.moveDir * 1;
      if (enemy.x < 70 || enemy.x > CANVAS_WIDTH - 70) {
        enemy.moveDir *= -1;
      }
    } else if (enemy.phase === 1) {
      // Phase 2: Faster erratic movement
      enemy.x += enemy.moveDir * 2;
      if (Math.random() < 0.02) enemy.moveDir *= -1;
      if (enemy.x < 70 || enemy.x > CANVAS_WIDTH - 70) {
        enemy.moveDir *= -1;
      }
    } else {
      // Phase 3: Desperate circular pattern
      if (!enemy.circleAngle) enemy.circleAngle = 0;
      enemy.circleAngle += 0.03;
      enemy.x = CANVAS_WIDTH / 2 + Math.cos(enemy.circleAngle) * 150;
    }

    const now = Date.now();

    // Attack pattern based on phase
    if (enemy.phase === 0) {
      // Phase 1: Spread shots
      if (!enemy.lastSpread || now - enemy.lastSpread > 2000) {
        enemy.lastSpread = now;
        for (let i = -3; i <= 3; i++) {
          const angle = Math.PI / 2 + (i * 0.25);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3
          });
        }
        sounds.enemyShoot();
      }
    } else if (enemy.phase === 1) {
      // Phase 2: Laser beams + bullet spiral
      if (!enemy.lastLaser || now - enemy.lastLaser > 5000) {
        enemy.lastLaser = now;
        enemy.laserActive = true;
        enemy.laserStartTime = now;
      }

      if (enemy.laserActive && now - enemy.laserStartTime > 2500) {
        enemy.laserActive = false;
      }

      if (!enemy.lastSpiral || now - enemy.lastSpiral > 300) {
        enemy.lastSpiral = now;
        if (!enemy.spiralAngle) enemy.spiralAngle = 0;
        enemy.spiralAngle += 0.5;

        for (let i = 0; i < 4; i++) {
          const angle = enemy.spiralAngle + (Math.PI / 2 * i);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4
          });
        }
      }
    } else {
      // Phase 3: Desperation - everything at once
      if (!enemy.lastSpread || now - enemy.lastSpread > 1000) {
        enemy.lastSpread = now;

        // Radial burst
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4
          });
        }
        sounds.enemyShoot();
      }

      // Aimed shots at player
      if (!enemy.lastAimed || now - enemy.lastAimed > 800) {
        enemy.lastAimed = now;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);

        for (let i = -1; i <= 1; i++) {
          const spreadAngle = angle + (i * 0.2);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(spreadAngle) * 5,
            vy: Math.sin(spreadAngle) * 5
          });
        }
      }
    }
  }
};

function spawnBoss() {
  // Clear regular enemies for dramatic effect
  enemies = enemies.filter(e => e.isMiniboss);

  enemies.push({
    x: CANVAS_WIDTH / 2,
    y: -80,
    width: 80,
    height: 80,
    type: bossType,
    health: bossType.health,
    maxHealth: bossType.health,
    isBoss: true,
    moveDir: 1,
    phase: 0
  });

  bossSpawned = true;
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
  bossSpawnTimer += deltaTime;

  // Don't spawn regular enemies if boss is active
  const bossActive = enemies.some(e => e.isBoss);

  if (enemySpawnTimer > ENEMY_SPAWN_INTERVAL && !bossActive) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (minibossSpawnTimer > MINIBOSS_SPAWN_INTERVAL && !bossActive) {
    spawnGuardian();
    minibossSpawnTimer = 0;
  }

  if (bossSpawnTimer > BOSS_SPAWN_TIME && !bossSpawned) {
    spawnBoss();
  }

  enemies = enemies.filter(enemy => {
    if (enemy.dead) return false;

    enemy.type.move(enemy);

    // Don't remove minibosses or bosses off-screen
    if (enemy.isMiniboss || enemy.isBoss) return true;

    // Remove if off screen
    if (enemy.y > CANVAS_HEIGHT + 20 || enemy.x < -20 || enemy.x > CANVAS_WIDTH + 20) {
      return false;
    }

    return true;
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    // Draw boss lasers (wider and more intense)
    if (enemy.type.name === 'devastator' && enemy.laserActive) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
      ctx.fillRect(0, enemy.y - 10, 80, 20); // Left laser
      ctx.fillRect(CANVAS_WIDTH - 80, enemy.y - 10, 80, 20); // Right laser

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, enemy.y - 5, 80, 10); // Left laser core
      ctx.fillRect(CANVAS_WIDTH - 80, enemy.y - 5, 80, 10); // Right laser core
    }

    // Draw Guardian lasers
    if (enemy.type.name === 'guardian' && enemy.laserActive) {
      ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.fillRect(0, enemy.y - 5, 50, 10); // Left laser
      ctx.fillRect(CANVAS_WIDTH - 50, enemy.y - 5, 50, 10); // Right laser

      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, enemy.y - 2, 50, 4); // Left laser core
      ctx.fillRect(CANVAS_WIDTH - 50, enemy.y - 2, 50, 4); // Right laser core
    }

    // Draw enemy body based on type
    const w = enemy.width;
    const h = enemy.height;

    if (enemy.type.name === 'straight') {
      // Basic invader - classic space invader shape
      ctx.fillStyle = enemy.type.color;
      ctx.fillRect(enemy.x - w/2 + 2, enemy.y - h/2, w - 4, h);
      ctx.fillRect(enemy.x - w/2, enemy.y - h/2 + 3, w, h - 6);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(enemy.x - 2, enemy.y - h/2 + 2, 4, 4); // Eye
    } else if (enemy.type.name === 'tank') {
      // Armored tank - thick square with armor plates
      ctx.fillStyle = enemy.type.color;
      ctx.fillRect(enemy.x - w/2, enemy.y - h/2, w, h);
      ctx.fillStyle = '#aa0000';
      ctx.fillRect(enemy.x - w/2 + 2, enemy.y - h/2 + 2, w - 4, h - 4);
      ctx.fillStyle = '#660000';
      ctx.fillRect(enemy.x - w/2 + 4, enemy.y - h/2 + 4, w - 8, h - 8);
    } else if (enemy.type.name === 'heavy') {
      // Heavy cruiser - large cross shape
      ctx.fillStyle = enemy.type.color;
      ctx.fillRect(enemy.x - w/4, enemy.y - h/2, w/2, h);
      ctx.fillRect(enemy.x - w/2, enemy.y - h/4, w, h/2);
      ctx.fillStyle = '#cc4400';
      ctx.fillRect(enemy.x - w/6, enemy.y - h/6, w/3, h/3);
    } else if (enemy.type.name === 'zigzag') {
      // Diamond shape
      ctx.fillStyle = enemy.type.color;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - h/2);
      ctx.lineTo(enemy.x + w/2, enemy.y);
      ctx.lineTo(enemy.x, enemy.y + h/2);
      ctx.lineTo(enemy.x - w/2, enemy.y);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type.name === 'diver') {
      // Arrow shape pointing down
      ctx.fillStyle = enemy.type.color;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + h/2);
      ctx.lineTo(enemy.x + w/2, enemy.y - h/2);
      ctx.lineTo(enemy.x + w/4, enemy.y - h/2);
      ctx.lineTo(enemy.x + w/4, enemy.y);
      ctx.lineTo(enemy.x - w/4, enemy.y);
      ctx.lineTo(enemy.x - w/4, enemy.y - h/2);
      ctx.lineTo(enemy.x - w/2, enemy.y - h/2);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type.name === 'shooter') {
      // Hexagon with gun turret
      ctx.fillStyle = enemy.type.color;
      const sides = 6;
      const radius = w / 2;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides;
        const x = enemy.x + Math.cos(angle) * radius;
        const y = enemy.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // Gun turret
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(enemy.x - 2, enemy.y, 4, h/2);
    } else if (enemy.type.name === 'sidewinder') {
      // Elongated horizontal ship
      ctx.fillStyle = enemy.type.color;
      ctx.beginPath();
      ctx.moveTo(enemy.x - w/2, enemy.y);
      ctx.lineTo(enemy.x - w/4, enemy.y - h/2);
      ctx.lineTo(enemy.x + w/4, enemy.y - h/2);
      ctx.lineTo(enemy.x + w/2, enemy.y);
      ctx.lineTo(enemy.x + w/4, enemy.y + h/2);
      ctx.lineTo(enemy.x - w/4, enemy.y + h/2);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type.name === 'orbiter') {
      // Star shape
      ctx.fillStyle = enemy.type.color;
      const spikes = 5;
      const outerRadius = w / 2;
      const innerRadius = w / 4;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * i) / spikes;
        const x = enemy.x + Math.cos(angle) * radius;
        const y = enemy.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type.name === 'guardian') {
      // Large miniboss - fortress shape
      ctx.fillStyle = enemy.type.color;
      // Main body
      ctx.fillRect(enemy.x - w/2, enemy.y - h/2, w, h);
      // Turrets
      ctx.fillStyle = '#aa00ff';
      ctx.fillRect(enemy.x - w/2 - 5, enemy.y - h/4, 5, h/2);
      ctx.fillRect(enemy.x + w/2, enemy.y - h/4, 5, h/2);
      // Core
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(enemy.x - w/4, enemy.y - h/4, w/2, h/2);
    } else if (enemy.type.name === 'devastator') {
      // Ultimate boss - massive dreadnought
      const phase = enemy.phase || 0;
      const phaseColors = ['#ff0000', '#ff4400', '#ff8800'];

      // Main hull
      ctx.fillStyle = phaseColors[phase];
      ctx.fillRect(enemy.x - w/2, enemy.y - h/2, w, h);

      // Command bridge
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(enemy.x - w/4, enemy.y - h/2 - 10, w/2, 15);

      // Side cannons
      ctx.fillStyle = '#aa0000';
      ctx.fillRect(enemy.x - w/2 - 10, enemy.y - h/4, 10, h/2);
      ctx.fillRect(enemy.x + w/2, enemy.y - h/4, 10, h/2);

      // Engine cores (glow based on phase)
      const glowIntensity = (phase + 1) * 0.3;
      ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity})`;
      ctx.fillRect(enemy.x - w/3, enemy.y + h/2 - 5, w/6, 8);
      ctx.fillRect(enemy.x + w/6, enemy.y + h/2 - 5, w/6, 8);

      // Core reactor (pulses based on health)
      const healthPercent = enemy.health / enemy.maxHealth;
      const pulseAlpha = 0.3 + (1 - healthPercent) * 0.5;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
      ctx.fillRect(enemy.x - w/6, enemy.y - h/6, w/3, h/3);

      // Armor plates
      ctx.fillStyle = '#660000';
      ctx.fillRect(enemy.x - w/2 + 5, enemy.y - h/2 + 5, w - 10, h - 10);

      // Phase indicator lights
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i <= phase ? '#00ff00' : '#330000';
        ctx.fillRect(enemy.x - w/2 + 10 + i * 15, enemy.y - h/2 + 3, 8, 4);
      }
    }

    // Draw health bar for enemies with more than 1 health
    if (enemy.maxHealth > 1) {
      const healthBarWidth = enemy.isBoss ? 70 : (enemy.isMiniboss ? 40 : 20);
      const healthBarHeight = enemy.isBoss ? 5 : 3;
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

// Scrap currency
let scrapPickups = [];

function spawnScrap(x, y, amount) {
  scrapPickups.push({
    x: x,
    y: y,
    width: 15,
    height: 15,
    amount: amount,
    vy: 1.5
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

function updateScrapPickups() {
  scrapPickups = scrapPickups.filter(scrap => {
    scrap.y += scrap.vy;
    return scrap.y < CANVAS_HEIGHT + 20;
  });
}

function drawScrapPickups() {
  scrapPickups.forEach(scrap => {
    // Draw scrap as a metallic polygon
    ctx.fillStyle = '#888888';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(scrap.x, scrap.y - scrap.height / 2);
    ctx.lineTo(scrap.x + scrap.width / 2, scrap.y);
    ctx.lineTo(scrap.x, scrap.y + scrap.height / 2);
    ctx.lineTo(scrap.x - scrap.width / 2, scrap.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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

          // Drop scrap based on enemy value
          const scrapAmount = Math.ceil(enemy.type.points / 10);
          spawnScrap(enemy.x, enemy.y, scrapAmount);

          // Random chance to drop powerup (reduced since we now drop scrap)
          if (Math.random() < 0.1) {
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

          // Drop scrap based on enemy value
          const scrapAmount = Math.ceil(enemy.type.points / 10);
          spawnScrap(enemy.x, enemy.y, scrapAmount);

          if (Math.random() < 0.1) {
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
      takeDamage(1);
      sounds.hit();
      sounds.explosion();
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

  // Player vs scrap
  scrapPickups = scrapPickups.filter((scrap) => {
    if (player.x < scrap.x + scrap.width &&
        player.x + player.width > scrap.x &&
        player.y < scrap.y + scrap.height &&
        player.y + player.height > scrap.y) {

      persistentData.scrap += scrap.amount;
      saveProgress();
      updateScrapDisplay();
      sounds.enemyHit(); // Small pickup sound
      return false;
    }
    return true;
  });

  // CIWS bullets vs enemy bullets
  ciwsBullets.forEach((ciwsBullet, ciwsIndex) => {
    enemyBullets.forEach((enemyBullet, enemyIndex) => {
      const dist = Math.hypot(ciwsBullet.x - enemyBullet.x, ciwsBullet.y - enemyBullet.y);
      if (dist < 5) {
        ciwsBullets.splice(ciwsIndex, 1);
        enemyBullets.splice(enemyIndex, 1);
        sounds.enemyHit(); // Small impact sound
      }
    });
  });

  // Enemy bullets vs player
  enemyBullets.forEach((bullet, bulletIndex) => {
    if (player.x < bullet.x + 3 &&
        player.x + player.width > bullet.x - 3 &&
        player.y < bullet.y + 3 &&
        player.y + player.height > bullet.y - 3) {

      enemyBullets.splice(bulletIndex, 1);
      takeDamage(1);
      sounds.hit();
    }
  });

  // Boss and Guardian lasers vs player
  enemies.forEach(enemy => {
    if (enemy.type.name === 'devastator' && enemy.laserActive) {
      // Boss lasers are wider (80px)
      const inLeftLaser = player.x < 80 && player.x + player.width > 0;
      const inRightLaser = player.x < CANVAS_WIDTH && player.x + player.width > CANVAS_WIDTH - 80;
      const inLaserHeight = player.y < enemy.y + 10 && player.y + player.height > enemy.y - 10;

      if ((inLeftLaser || inRightLaser) && inLaserHeight) {
        if (!player.bossLaserHitCooldown || Date.now() - player.bossLaserHitCooldown > 400) {
          player.bossLaserHitCooldown = Date.now();
          takeDamage(2); // Boss lasers do more damage
          sounds.hit();
        }
      }
    }

    if (enemy.type.name === 'guardian' && enemy.laserActive) {
      // Check if player is in laser zones (left or right 50px)
      const inLeftLaser = player.x < 50 && player.x + player.width > 0;
      const inRightLaser = player.x < CANVAS_WIDTH && player.x + player.width > CANVAS_WIDTH - 50;
      const inLaserHeight = player.y < enemy.y + 5 && player.y + player.height > enemy.y - 5;

      if ((inLeftLaser || inRightLaser) && inLaserHeight) {
        if (!player.laserHitCooldown || Date.now() - player.laserHitCooldown > 500) {
          player.laserHitCooldown = Date.now();
          takeDamage(1);
          sounds.hit();
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

function takeDamage(amount) {
  if (gameState.shields > 0) {
    gameState.shields -= amount;
    if (gameState.shields < 0) {
      const overflow = -gameState.shields;
      gameState.shields = 0;
      gameState.health -= overflow;
    }
  } else {
    gameState.health -= amount;
  }

  updateHealth();
  updateShieldDisplay();

  if (gameState.health <= 0) {
    endGame();
  }
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

function updateScrapDisplay() {
  const scrapElement = document.getElementById('scrap');
  if (scrapElement) {
    scrapElement.textContent = persistentData.scrap;
  }
}

function updateShieldDisplay() {
  const shieldElement = document.getElementById('shields');
  if (shieldElement) {
    shieldElement.textContent = gameState.shields;
  }
}

function updateWeaponTierDisplay() {
  const tierElement = document.getElementById('weapon-tier');
  if (tierElement) {
    tierElement.textContent = persistentData.weaponTier;
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
    updateCIWS(deltaTime);
    updateEnemies(deltaTime);
    updatePowerups();
    updateScrapPickups();
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

    // Check if shop should open
    if (gameState.score >= gameState.nextShopScore && !gameState.shopOpen) {
      openShop();
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

    // Draw background layers
    drawBackground();
    drawStars();

    // Draw
    drawEnemies();
    drawBullets();
    drawMissiles();
    drawEnemyBullets();
    drawCIWS();
    drawPowerups();
    drawScrapPickups();
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

// Background stars and nebula
const stars = [];
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5,
    brightness: Math.random()
  });
}

// Nebula clouds
const nebulae = [];
for (let i = 0; i < 3; i++) {
  nebulae.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    size: 150 + Math.random() * 100,
    color: ['#1a0033', '#330066', '#003366'][i],
    speed: 0.3 + Math.random() * 0.5
  });
}

// Distant planet
const planet = {
  x: CANVAS_WIDTH - 150,
  y: 100,
  radius: 60,
  color: '#664400'
};

function drawBackground() {
  // Draw distant planet
  const gradient = ctx.createRadialGradient(planet.x, planet.y, 0, planet.x, planet.y, planet.radius);
  gradient.addColorStop(0, '#aa6600');
  gradient.addColorStop(0.7, planet.color);
  gradient.addColorStop(1, '#220000');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw nebula clouds
  nebulae.forEach(nebula => {
    const nebulaGradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.size);
    nebulaGradient.addColorStop(0, nebula.color + '44');
    nebulaGradient.addColorStop(0.5, nebula.color + '22');
    nebulaGradient.addColorStop(1, nebula.color + '00');
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(nebula.x - nebula.size, nebula.y - nebula.size, nebula.size * 2, nebula.size * 2);

    nebula.y += nebula.speed;
    if (nebula.y > CANVAS_HEIGHT + nebula.size) {
      nebula.y = -nebula.size;
      nebula.x = Math.random() * CANVAS_WIDTH;
    }
  });
}

function drawStars() {
  stars.forEach(star => {
    const alpha = 0.5 + star.brightness * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);

    star.y += star.speed;
    if (star.y > CANVAS_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * CANVAS_WIDTH;
      star.brightness = Math.random();
    }
  });
}

// Game start/end
function startGame() {
  gameState.running = true;
  gameState.paused = false;
  gameState.score = 0;
  gameState.health = 5;
  gameState.shields = persistentData.maxShields;
  gameState.powerup = null;
  gameState.powerupTimer = 0;
  gameState.shopOpen = false;
  gameState.nextShopScore = 500;

  bullets = [];
  missiles = [];
  enemies = [];
  enemyBullets = [];
  ciwsBullets = [];
  powerups = [];
  scrapPickups = [];
  enemySpawnTimer = 0;
  minibossSpawnTimer = 0;
  bossSpawnTimer = 0;
  bossSpawned = false;
  ciwsCooldown = 0;

  player.x = CANVAS_WIDTH / 2;
  player.y = CANVAS_HEIGHT - 50;

  updateScore();
  updateHealth();
  updatePowerupDisplay();
  updateScrapDisplay();
  updateShieldDisplay();
  updateWeaponTierDisplay();

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

// Shop system
function openShop() {
  gameState.shopOpen = true;
  gameState.paused = true;
  bgm.pause();

  document.getElementById('shop-screen').classList.remove('hidden');
  updateShopUI();
}

function closeShop() {
  gameState.shopOpen = false;
  gameState.paused = false;
  bgm.play();

  document.getElementById('shop-screen').classList.add('hidden');
  gameState.nextShopScore += 500; // Next shop at +500 score
}

function updateShopUI() {
  document.getElementById('shop-scrap').textContent = persistentData.scrap;
  document.getElementById('current-tier').textContent = persistentData.weaponTier;
  document.getElementById('current-shields').textContent = persistentData.maxShields;

  // Update costs (progressive pricing)
  const tierCost = 50 * persistentData.weaponTier;
  const shieldCost = 75 + (persistentData.maxShields / 2) * 25;
  const ciwsCost = 100;

  document.getElementById('tier-cost').textContent = tierCost;
  document.getElementById('shield-cost').textContent = shieldCost;
  document.getElementById('ciws-cost').textContent = ciwsCost;

  // Enable/disable buttons based on affordability
  const buyTierBtn = document.getElementById('buy-tier');
  const buyShieldBtn = document.getElementById('buy-shield');
  const buyCIWSBtn = document.getElementById('buy-ciws');

  buyTierBtn.disabled = persistentData.scrap < tierCost;
  buyShieldBtn.disabled = persistentData.scrap < shieldCost;
  buyCIWSBtn.disabled = persistentData.scrap < ciwsCost || persistentData.hasCIWS;

  if (persistentData.hasCIWS) {
    document.getElementById('ciws-desc').textContent = 'Already purchased!';
    buyCIWSBtn.textContent = 'Owned';
  }
}

function buyWeaponTier() {
  const cost = 50 * persistentData.weaponTier;
  if (persistentData.scrap >= cost) {
    persistentData.scrap -= cost;
    persistentData.weaponTier++;
    saveProgress();
    updateShopUI();
    updateScrapDisplay();
    updateWeaponTierDisplay();
    sounds.powerup();
  }
}

function buyShields() {
  const cost = 75 + (persistentData.maxShields / 2) * 25;
  if (persistentData.scrap >= cost) {
    persistentData.scrap -= cost;
    persistentData.maxShields += 2;
    gameState.shields += 2; // Also restore shields immediately
    saveProgress();
    updateShopUI();
    updateScrapDisplay();
    updateShieldDisplay();
    sounds.powerup();
  }
}

function buyCIWS() {
  const cost = 100;
  if (persistentData.scrap >= cost && !persistentData.hasCIWS) {
    persistentData.scrap -= cost;
    persistentData.hasCIWS = true;
    saveProgress();
    updateShopUI();
    updateScrapDisplay();
    sounds.powerup();
  }
}

// Event listeners
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', startGame);
document.getElementById('close-shop').addEventListener('click', closeShop);
document.getElementById('buy-tier').addEventListener('click', buyWeaponTier);
document.getElementById('buy-shield').addEventListener('click', buyShields);
document.getElementById('buy-ciws').addEventListener('click', buyCIWS);

// Initial canvas clear
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
