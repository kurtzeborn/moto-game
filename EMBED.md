# Motorcycle Runner - Embeddable Game

## Quick Start

Add this single line to your HTML:

```html
<script src="https://kurtzeborn.net/game/game-embed.js"></script>
```

That's it! Users can press **SPACEBAR** to launch the game overlay.

## Controls

**For Users:**
- **SPACEBAR** - Show/hide game overlay
- **ESC** - Close game
- **SPACE/↑** - Jump (in-game)
- **↓** - Duck (in-game)
- **Mobile**: Tap top half to jump, hold bottom half to duck

## API

The embed exposes a global `MotorcycleRunner` object:

```javascript
// Show the game overlay
MotorcycleRunner.show();

// Hide the game overlay  
MotorcycleRunner.hide();

// Check version
console.log(MotorcycleRunner.version); // "0.12"
```

## Example

See `embed-demo.html` for a full working example.

## Building

To rebuild the embed file after making changes to `game.js` or `sprites.js`:

```powershell
cd game
.\build-embed.ps1
```

This bundles `sprites.js` and `game.js` into a single `game-embed.js` file (~65KB).

## Features

✅ Single file embed (no dependencies)  
✅ Works on any website  
✅ Mobile and desktop support  
✅ Full-screen overlay mode  
✅ Isolated from page styles  
✅ ~65KB total size  
✅ Prevents multiple instances  

## File Structure

- `game-embed-template.js` - Template with placeholders
- `build-embed.ps1` - Build script (PowerShell)
- `game-embed.js` - Generated embeddable file (committed to repo)
- `embed-demo.html` - Demo page showing usage

## Notes

- The embed creates a full-screen overlay with z-index: 999999
- All game elements use `motorcycle-` prefixed IDs to avoid conflicts
- The game state persists in localStorage per domain
- Only one instance can be loaded per page
