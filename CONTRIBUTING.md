# Contributing to Motorcycle Runner

Quick guide for quality contributions to the Motorcycle Runner game.

---

## Project Structure

```
game/
├── index.html          # Game page with embedded styles
├── sprites.js          # Sprite definitions and palettes
├── game.js             # Complete game engine
├── README.md           # User-facing documentation
└── CONTRIBUTING.md     # This file
```

---

## Code Review Checklist

Before submitting changes:

- [ ] All magic numbers moved to `CONFIG`
- [ ] No duplicated logic (extracted to functions)
- [ ] No duplicated configuration data (single source of truth)
- [ ] Sprite dimensions computed from sprite data (not hardcoded)
- [ ] Colors use `COLORS` constants (no hardcoded hex values)
- [ ] New sprites use indexed color palette
- [ ] Game state uses constants, not magic strings
- [ ] Utility functions created for repeated patterns
- [ ] Descriptive variable names (especially for coordinates and calculations)
- [ ] No hard-coded scales or dimensions
- [ ] Visual feedback for new game events
- [ ] JSDoc comments added for complex functions

**Location-specific reminders are in code comments marked with "CODE REVIEW:"**

---

## Testing Checklist

- [ ] Tested with `CONFIG.DEBUG_MODE = true` (visualize hitboxes)
- [ ] Tested on mobile/touch devices (actual devices, not just DevTools)
- [ ] Tested landscape/portrait orientation changes
- [ ] Verified all new state cleared in `startGame()`
- [ ] Checked localStorage values parse correctly
- [ ] Verified draw order is correct

---

## Key Patterns
### Centralize Actions
Extract game actions into named functions instead of duplicating logic between keyboard and touch:

```javascript
function performJump() {
    if (!motorcycle.isJumping && !motorcycle.isDucking) {
        motorcycle.velocityY = motorcycle.jumpPower;
        motorcycle.isJumping = true;
    }
}

// Both input methods use the same function
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') performJump();
    if (['Space', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (touchYRelative < canvasHalfHeight) performJump();
});
```

### Use Constants Over Magic Values
```javascript
// ✅ Good
const CONFIG = { INITIAL_SPEED: 6, SPEED_INCREMENT: 0.5 };
gameSpeed = CONFIG.INITIAL_SPEED;

// ❌ Bad
gameSpeed = 6;  // What does 6 mean?
```

### Compute Dimensions from Sprites
```javascript
// ✅ Good
const dims = getSpriteDimensions(SPRITES.CACTUS);
const obstacleTypes = [{ sprite: 'CACTUS', ...dims }];

// ❌ Bad
const obstacleTypes = [{ sprite: 'CACTUS', width: 27, height: 48 }];
```

### Use Utility Functions
```javascript
// ✅ Good
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}
const obstacle = getRandomElement(obstacleTypes);

// ❌ Bad - duplicated everywhere
const obstacle = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
```

---

## Common Mistakes

### Magic Numbers
❌ `gameSpeed += 0.5;` → ✅ `gameSpeed += CONFIG.SPEED_INCREMENT;`

### Duplicated Logic
❌ Collision code repeated for ground and flying obstacles → ✅ Extract to `checkAABBCollision(rect1, rect2)`

### Hardcoded Colors
❌ `ctx.fillStyle = '#2d5016';` → ✅ `ctx.fillStyle = COLORS.CACTUS;`

### localStorage Type Issues
❌ `let score = localStorage.getItem('highScore') || 0;` (returns string) → ✅ `parseInt(localStorage.getItem('highScore')) || 0`

### Missing preventDefault()
❌ Game keys scroll the page → ✅ Always `e.preventDefault()` on game input keys

### Inconsistent Game State
❌ `if (gameState === 'playing')` (typo-prone string) → ✅ `if (gameState === GAME_STATES.PLAYING)` (constant)

---

## Mobile Guidelines

- **Touch Zones**: Top half = jump, bottom half = duck
- **Require Landscape**: Side-scrollers need landscape orientation
- **preventDefault()**: Always prevent default touch behaviors
- **Test on Real Devices**: DevTools doesn't catch all mobile issues

---

## Questions?

When in doubt:
1. Check if a similar pattern exists in the code
2. Look for constants in `CONFIG` before hard-coding
3. Test with debug mode enabled
4. Keep it simple and consistent
