# Starship Shooter

A retro-style space shooter with persistent progression, built with Electron and inspired by early 2000s Flash arcade games.

## Description

Starship Shooter is a nostalgic arcade-style vertical shooter where you pilot a heavily-armed spacecraft, defending against endless waves of alien invaders. Collect scrap from destroyed enemies, dock at space stations to purchase permanent upgrades, and face off against challenging boss encounters. Features procedurally-generated 8-bit sound effects and polygonal graphics reminiscent of classic arcade games.

## Features

### Progression System
- **Persistent Upgrades**: Progress carries between sessions via localStorage
- **Scrap Currency**: Enemies drop scrap based on their difficulty
- **Weapon Tiers**: Upgrade from single shots to dual and triple-bullet spreads
- **Shield System**: Purchase shield capacity for additional protection
- **CIWS Defense**: Unlock auto-targeting defensive systems

### Combat
- **9 Enemy Types**: Each with unique movement patterns and attack behaviors
  - Standard invaders, armored tanks, diving attackers, and more
  - Guardian minibosses with laser beam attacks
  - The Devastator: A 100 HP boss with three distinct combat phases
- **Temporary Powerups**: Shotgun spread, homing missiles, and devastating laser beams
- **Dynamic Difficulty**: Enemy variety and challenge increase as you progress

### Shop System
- **Space Stations**: Physical shop locations appear in the playfield every 2,500 points
- **Strategic Docking**: Fly to stations to access upgrades mid-game
- **Progressive Pricing**: Costs increase with each tier purchased

### Visuals & Audio
- **Polygonal 8-bit Graphics**: Each ship and enemy has unique geometric designs
- **Procedural Sound Effects**: Authentic 8-bit sounds generated via Web Audio API
- **Dynamic Background**: Scrolling stars, nebula clouds, and distant planets
- **Visual Feedback**: Shield indicators, phase transitions, engine effects

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/Recon419A/StarshipShooter.git
cd StarshipShooter

# Install dependencies
npm install
```

## Running the Game

```bash
npm start
```

## Controls

| Key | Action |
|-----|--------|
| **Arrow Keys** or **A/D** | Move ship left and right |
| **Space** | Fire weapons (hold for continuous fire) |
| **ESC** | Pause/unpause game |

### Gameplay Tips
- Dock with cyan space stations to access the upgrade shop
- Shields absorb damage before health is depleted
- CIWS automatically shoots down nearby enemy bullets
- Boss appears at the 2-minute mark - prepare accordingly!
- Different weapon tiers affect all powerups (shotgun spread increases with tier)

## Game Mechanics

### Weapon Progression
- **Tier 1**: Single bullet
- **Tier 2**: Dual bullets (side-by-side)
- **Tier 3+**: Triple bullets (spread pattern)

### Enemy Types
- **Straight**: Basic invader (10 pts, 1 HP)
- **Tank**: Heavily armored (60 pts, 5 HP)
- **Zigzag**: Diamond-shaped weaver (20 pts, 2 HP)
- **Diver**: Aggressive attacker (30 pts, 1 HP)
- **Shooter**: Hexagonal gunship (40 pts, 2 HP)
- **Sidewinder**: Horizontal cruiser (35 pts, 1 HP)
- **Orbiter**: Star-shaped orbiter (50 pts, 2 HP)
- **Heavy**: Cross-shaped bruiser (70 pts, 4 HP)
- **Guardian**: Purple fortress miniboss (200 pts, 20 HP)
- **Devastator**: Ultimate boss (1000 pts, 100 HP, 3 phases)

## Built With

- **Electron** - Desktop application framework
- **HTML5 Canvas** - Rendering engine
- **Web Audio API** - Procedural sound generation
- **Vanilla JavaScript** - No frameworks, pure ES6+

## Credits

### Music
Background music: **"Mesmerizing Galaxy Loop"** by [Kevin MacLeod](https://incompetech.com)
Licensed under [Creative Commons: By Attribution 4.0 License](http://creativecommons.org/licenses/by/4.0/)

### Sound Effects
All sound effects are procedurally generated using the Web Audio API - no external samples used!

## Development

This game was developed as a nostalgic tribute to classic Flash arcade games from the early 2000s, with modern enhancements like persistent progression and challenging boss battles.

### Project Structure
```
StarshipShooter/
├── main.js          # Electron main process
├── preload.js       # Security sandboxing
├── index.html       # Game container
├── styles.css       # UI styling
├── renderer.js      # Game engine and logic
├── sounds.js        # Procedural audio generation
└── music.mp3        # Background music
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ and nostalgia for the golden age of Flash games
