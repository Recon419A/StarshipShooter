// Sound Effects Module - 8-bit style sounds using Web Audio API
// Inspired by early arcade games and 8-bit sound chips

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Helper function to create oscillator with envelope
function playTone(frequency, duration, waveType = 'square', volume = 0.3) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = waveType;

  // Envelope: quick attack, decay to sustain, then release
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay/Release

  oscillator.start(now);
  oscillator.stop(now + duration);
}

// Helper for noise (for explosions)
function playNoise(duration, volume = 0.3) {
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  filter.type = 'lowpass';
  filter.frequency.value = 1000;

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noise.start(now);
}

// Sound Effects
const sounds = {
  // Basic shoot sound - classic "pew" with descending pitch
  shoot: function() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';

    const now = audioContext.currentTime;
    // Quick descending sweep for "pew" effect
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  },

  // Shotgun spread shot - chunky burst with multiple frequencies
  shootShotgun: function() {
    const now = audioContext.currentTime;

    // Create 5 simultaneous descending tones at different pitches (spread effect)
    const frequencies = [700, 800, 900, 750, 850];
    frequencies.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';

      const startTime = now + (i * 0.01); // Slight stagger
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 0.3, startTime + 0.06);

      gainNode.gain.setValueAtTime(0.08, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.06);
    });
  },

  // Laser beam
  shootLaser: function() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sawtooth';

    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  },

  // Missile launch
  shootMissile: function() {
    playTone(150, 0.2, 'sawtooth', 0.15);
    setTimeout(() => playTone(180, 0.15, 'sawtooth', 0.1), 50);
  },

  // Enemy explosion
  explosion: function() {
    // Explosion is a combination of noise and descending tone
    playNoise(0.3, 0.25);

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sawtooth';

    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  },

  // Player takes damage
  hit: function() {
    playTone(100, 0.2, 'sawtooth', 0.25);
    setTimeout(() => playTone(80, 0.15, 'sawtooth', 0.2), 50);
  },

  // Powerup pickup
  powerup: function() {
    // Ascending arpeggio
    playTone(400, 0.08, 'square', 0.2);
    setTimeout(() => playTone(500, 0.08, 'square', 0.2), 60);
    setTimeout(() => playTone(600, 0.08, 'square', 0.2), 120);
    setTimeout(() => playTone(800, 0.15, 'square', 0.2), 180);
  },

  // Enemy hit (not destroyed)
  enemyHit: function() {
    playTone(300, 0.05, 'square', 0.1);
  },

  // Enemy shoot sound - lower pitch to distinguish from player
  enemyShoot: function() {
    playTone(250, 0.06, 'triangle', 0.08);
  }
};

// Export for use in game
window.sounds = sounds;
