# Development Notes - Starship Shooter

## Project Overview

This is a classic space shooter game built with Electron, designed to recreate the feel of early 2000s Flash games. The game features a bottom-mounted spaceship that can move horizontally, enemies with various attack patterns, and a powerup system.

## Architecture

### Technology Stack
- **Electron**: Desktop application framework
- **HTML5 Canvas**: 2D rendering
- **Vanilla JavaScript**: Game logic (no frameworks to keep it simple and performant)

### File Structure
```
StarshipShooter/
├── main.js           # Electron main process
├── index.html        # Game UI and canvas
├── renderer.js       # Game engine and logic
├── styles.css        # Game styling
├── package.json      # Dependencies and scripts
├── README.md         # Project documentation
└── CLAUDE.md         # This file
```

### Game Components

#### Player Ship
- Position: Bottom center of screen
- Movement: Left/Right only
- Shooting: Fires upward
- Health: 3 hits before game over

#### Enemies
- Spawn from top of screen
- Various movement patterns:
  - Straight down
  - Zigzag/sine wave
  - Diving attacks
  - Formation flying
- Different enemy types with varying speeds and health

#### Powerups
1. **Shotgun**: Fires 3-5 bullets in a spread pattern
2. **Missiles**: Homing projectiles that track enemies
3. **Big Laser**: Wide beam that deals continuous damage
- Powerups drop from destroyed enemies (random chance)
- Duration: 10-15 seconds per powerup

#### Collision Detection
- AABB (Axis-Aligned Bounding Box) collision detection
- Player bullets vs enemies
- Enemy bullets vs player
- Player vs powerups
- Player vs enemies (damage on contact)

#### Game Loop
- 60 FPS target
- RequestAnimationFrame for smooth rendering
- Delta time for consistent physics

## Design Decisions

- **No external game frameworks**: Keeps the codebase simple and educational
- **Canvas-based rendering**: Better performance than DOM manipulation
- **Simple geometry**: Triangles and rectangles for that retro feel
- **Bright colors**: Mimics the Flash game aesthetic
- **Gradient backgrounds**: Adds depth without complex graphics

## Future Enhancements (Not Implemented)
- Multiple levels with increasing difficulty
- Boss battles
- Sound effects and music
- Particle effects for explosions
- Local high score storage
- More powerup types
- Multiplayer mode

## Development Timeline
- Phase 1: Project setup and basic Electron app
- Phase 2: Game engine and rendering loop
- Phase 3: Player ship and controls
- Phase 4: Enemy system
- Phase 5: Shooting and collision detection
- Phase 6: Powerup system
- Phase 7: Polish and game mechanics

## Notes for Claude Code
This project was built entirely by Claude Code in an agentic workflow, demonstrating the ability to:
- Set up a complete Electron project from scratch
- Implement game logic with proper architecture
- Create a playable game with multiple systems working together
- Follow retro game design principles
