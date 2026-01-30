# Motorcycle Runner

Chrome T-Rex inspired endless runner game with motorcycle theme.

## Features

- Jump and duck to avoid obstacles
- Progressive difficulty (speed increases over time)
- Ground obstacles (cacti) and flying obstacles (birds)
- High score tracking
- Mobile and desktop support
- Embeddable on any website

## Controls

**Desktop:** SPACE/↑ to jump, ↓ to duck  
**Mobile:** Tap top half to jump, hold bottom half to duck

## Embedding

Add to any website with one line:

```html
<script src="https://kurtzeborn.net/game/game-embed.js"></script>
```

Press SPACEBAR to launch game overlay. See [EMBED.md](EMBED.md) for details.

## Development

**Building the embed:**

```bash
cd game
.\build-embed.ps1  # Bundles sprites.js + game.js into game-embed.js
```

Run after editing:
- `game.js` - Game logic
- `sprites.js` - Sprite data
- `game-embed-template.js` - Wrapper/overlay

**Debug mode:** Set `CONFIG.DEBUG_MODE = true` in game.js to show hitboxes and FPS.

## Files

- `game.js` - Main game engine
- `sprites.js` - Pixel art sprite definitions
- `game-embed.js` - Bundled embeddable version (auto-generated)
- `game-embed-template.js` - IIFE wrapper template
- `build-embed.ps1` - Build script
- `index.html` - Demo page
- `CONTRIBUTING.md` - Code guidelines
- `EMBED.md` - Embedding documentation
