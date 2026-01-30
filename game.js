// Motorcycle Runner Game - Chrome T-Rex Style
// CODE REVIEW: Always increment version number before making changes

const VERSION = 'v0.23';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreEl = document.getElementById('finalScore');
const dailyHighScoreEl = document.getElementById('dailyHighScore');
const allTimeHighScoreEl = document.getElementById('allTimeHighScore');
const restartBtn = document.getElementById('restartBtn');
const orientationOverlay = document.getElementById('orientationOverlay');
const instructionsEl = document.getElementById('instructions');

// Game configuration constants
const CONFIG = {
    // === GAME SPEED & DIFFICULTY ===
    INITIAL_SPEED: 6,
    SPEED_INCREMENT: 0.5,
    SPEED_INCREASE_INTERVAL: 300,
    
    // === SCORING ===
    SURVIVAL_POINTS_INTERVAL: 5, // Award 1 point every N frames
    VEHICLE_POINTS: 50,
    RIDEABLE_VEHICLE_POINTS: 100,
    FLYING_OBSTACLE_POINTS: 75,
    RIDEABLE_VEHICLE_MIN_SCORE: 300,
    FLYING_OBSTACLE_MIN_SCORE: 100,
    DAY_NIGHT_BONUS: 500,
    
    // === OBSTACLE SPAWNING - GROUND VEHICLES ===
    OBSTACLE_MIN_INTERVAL: 60,
    OBSTACLE_MAX_INTERVAL: 120,
    OBSTACLE_INTERVAL_DECREASE_RATE: 0.5,
    OBSTACLE_MIN_INTERVAL_CAP: 40,
    GROUND_INTERVAL_MIN_SPACING: 30,
    OBSTACLE_RETRY_DELAY: 20,
    
    // === OBSTACLE SPAWNING - FLYING (BIRDS) ===
    FLYING_OBSTACLE_MIN_INTERVAL: 100,
    FLYING_OBSTACLE_MAX_INTERVAL: 200,
    FLYING_OBSTACLE_SPEED_MULTIPLIER: 1.2,
    FLYING_INTERVAL_MIN_CAP: 60,
    FLYING_INTERVAL_MIN_SPACING: 50,
    BIRD_WING_FLAP_FRAME_INTERVAL: 10,
    SAFE_DISTANCE_BIRD_VEHICLE: 300,
    
    // === PLAYER PHYSICS ===
    FAST_FALL_GRAVITY: 2.5, // Extra gravity when ducking mid-air
    HITBOX_SIZE_RATIO: 0.7,
    
    // === VISUAL EFFECTS ===
    SPRITE_SCALE: 3,
    PARTICLE_SPAWN_INTERVAL: 5,
    COLLISION_FLASH_DURATION: 10,
    BONUS_MESSAGE_DURATION: 300, // 5 seconds at 60fps
    
    // === GROUND RENDERING ===
    GROUND_ROAD_WIDTH: 40,
    GROUND_DASH_SPACING: 40,
    GROUND_DASH_LENGTH: 20,
    CENTER_LINE_WIDTH: 3,
    
    // === SKY & DAY/NIGHT CYCLE ===
    SKY_DAY_COLOR: '#87CEEB',
    SKY_NIGHT_COLOR: '#1a1a2e',
    SKY_TRANSITION_SPEED: 0.01,
    SUN_Y_POSITION: 60,
    SUN_RADIUS: 30,
    SUN_MOON_SPEED: 0.5,
    SUN_START_X: 100,
    MOON_CRESCENT_OFFSET: 12,
    STAR_COUNT: 50,
    STAR_MIN_SIZE: 0.5,
    STAR_MAX_SIZE: 2.0,
    STAR_MIN_SPEED: 0.05,
    STAR_MAX_SPEED: 0.15,
    STAR_MIN_OPACITY: 0.5,
    STAR_MAX_OPACITY: 1.0,
    
    // === DEBUG ===
    DEBUG_MODE: false // Set to true to see hitboxes
};

// Note: COLORS and SPRITE_PALETTE are defined in sprites.js

// Sprite cache for performance
const spriteCache = new Map();

function getCachedSprite(sprite, scale = CONFIG.SPRITE_SCALE, flipH = false, palette = null) {
    // Use custom palette if provided, otherwise use default
    const usePalette = palette || SPRITE_PALETTE;
    
    // Create unique cache key including flip state and palette hash
    const paletteKey = palette ? palette[3] + palette[8] : 'default';
    const key = sprite + '_' + scale + '_' + (flipH ? 'f' : 'n') + '_' + paletteKey;
    
    if (!spriteCache.has(key)) {
        // Create offscreen canvas for this sprite
        const width = sprite[0].length * scale;
        const height = sprite.length * scale;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        
        // Apply horizontal flip if needed
        if (flipH) {
            offscreenCtx.translate(width, 0);
            offscreenCtx.scale(-1, 1);
        }
        
        // Draw sprite once to offscreen canvas
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                const colorIndex = sprite[row][col];
                if (colorIndex !== 0) {
                    offscreenCtx.fillStyle = usePalette[colorIndex];
                    offscreenCtx.fillRect(
                        col * scale,
                        row * scale,
                        scale,
                        scale
                    );
                }
            }
        }
        
        spriteCache.set(key, offscreenCanvas);
    }
    
    return spriteCache.get(key);
}

// Sprite rendering function - now uses cached sprites
function drawSprite(sprite, x, y, scale = CONFIG.SPRITE_SCALE, flipH = false, palette = null) {
    const cachedSprite = getCachedSprite(sprite, scale, flipH, palette);
    ctx.drawImage(cachedSprite, Math.floor(x), Math.floor(y));
}

// Get sprite dimensions after scaling
function getSpriteDimensions(sprite, scale = CONFIG.SPRITE_SCALE) {
    return {
        width: sprite[0].length * scale,
        height: sprite.length * scale
    };
}

// Game state constants
const GAME_STATES = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Game state
let gameState = GAME_STATES.WAITING;
let score = 0;
// CODE REVIEW: Always parseInt() localStorage values (they're strings)
let highScore = parseInt(localStorage.getItem('motorcycleHighScore')) || 0;
let dailyHighScore = 0;
let allTimeHighScore = parseInt(localStorage.getItem('motorcycleAllTimeHighScore')) || 0;

// Load daily high score (reset if it's a new day)
function loadDailyHighScore() {
    const today = new Date().toDateString();
    const lastPlayDate = localStorage.getItem('motorcycleLastPlayDate');
    
    if (lastPlayDate === today) {
        dailyHighScore = parseInt(localStorage.getItem('motorcycleDailyHighScore')) || 0;
    } else {
        // New day, reset daily high score
        dailyHighScore = 0;
        localStorage.setItem('motorcycleLastPlayDate', today);
        localStorage.setItem('motorcycleDailyHighScore', '0');
    }
}

loadDailyHighScore();
let frameCount = 0;
let gameSpeed = CONFIG.INITIAL_SPEED;
let collisionFlash = 0;
let landingAnimation = 0;
let nextGroundObstacleFrame = 0;
let nextFlyingObstacleFrame = 0;
let groundObstacleInterval = CONFIG.OBSTACLE_MAX_INTERVAL;
let flyingObstacleInterval = CONFIG.FLYING_OBSTACLE_MAX_INTERVAL;
let lastConvoyEndX = -1000; // Track the end position of the last convoy
let nextBillboardFrame = 600; // First billboard at 10 seconds (600 frames at 60 FPS)

// Billboard messages
const BILLBOARD_MESSAGES = [
    ['Eastside', 'Harley'],
    ['Emerald City', 'Harley'],
    ['Harley', 'Davidson', 'Motorcycles'],
    ['Life is', 'short, roads', 'are long.'],
    ['Two wheels,', 'One love', '#BikerLife'],
    ['YOU GOT', 'THIS!'],
    ['Eat. Sleep.', 'Ride.', 'Repeat.'],
    ['NICE', 'MOVES!'],
    ['LEGENDARY!'],
    ['STAY', 'FOCUSED!'],
    ['KEEP', 'GOING!'],
    ['RIDE ON!'],
    ['SKILLED', 'RIDER!'],
    ['TOO FAST!'],
    ['BEAST', 'MODE!'],
    ['DANGER', 'ZONE!']
];

// Motorcycle object
const motorcycle = {
    x: 50,
    y: canvas.height - 140,
    velocityY: 0,
    gravity: 0.8,
    jumpPower: -15,
    isJumping: false,
    isDucking: false,
    groundY: canvas.height - 140,
    duckHeight: 40,
    normalHeight: 60,
    isRidingVehicle: false,
    ridingVehicle: null
};

// Obstacles array
let obstacles = [];
// Define obstacle types - dimensions are calculated from sprites automatically
function getObstacleTypes() {
    return [
        { sprite: 'CAR', ...getSpriteDimensions(SPRITES.CAR), type: 'vehicle', rideable: false },
        { sprite: 'TRUCK', ...getSpriteDimensions(SPRITES.TRUCK), type: 'vehicle', rideable: false },
        { sprite: 'VAN', ...getSpriteDimensions(SPRITES.VAN), type: 'vehicle', rideable: false },
        { sprite: 'BUS', ...getSpriteDimensions(SPRITES.BUS), type: 'vehicle', rideable: true },
        { sprite: 'SEMI_TRUCK', ...getSpriteDimensions(SPRITES.SEMI_TRUCK), type: 'vehicle', rideable: true }
    ];
}
const obstacleTypes = getObstacleTypes();

// Flying obstacles
let flyingObstacles = [];
const flyingObstacleConfig = {
    ...getSpriteDimensions(SPRITES.BIRD_UP),
    heightVariations: [-140, -120, -100, -60, -40] // Mix of high (jump over) and low (duck under) birds
};

// Billboards
let billboards = [];

// Ground line
const groundY = canvas.height - 80;

// Sun/moon position (crosses sky as game progresses)
let sunX = canvas.width - 100; // Start on right side
let isNightMode = false;
let previousNightMode = false; // Track for detecting transitions
let pendingDayNightBonus = false; // Track bonus pending after transition completes
let skyTransition = 0; // 0 = day, 1 = night, crossfades between

// Sky color constants for easy reference
const SKY_COLORS = {
    DAY: CONFIG.SKY_DAY_COLOR,
    NIGHT: CONFIG.SKY_NIGHT_COLOR,
    TEXT_DAY: '#2d2d2d',
    TEXT_NIGHT: '#ffffff',
    SUN_CORE: '#FFD700',
    SUN_GLOW: [
        'rgba(255, 255, 150, 0.8)',
        'rgba(255, 220, 100, 0.4)',
        'rgba(255, 200, 80, 0.2)',
        'rgba(255, 180, 60, 0)'
    ],
    MOON: '#F0E68C',
    STAR: 'rgba(255, 255, 255, {opacity})'
};

// Stars for night mode
let stars = [];

// Particle system for visual effects
let particles = [];

// Floating bonus messages
let bonusMessages = [];

// ============================================================================
// === UTILITY FUNCTIONS ===
// ============================================================================

/**
 * Interpolates between two hex color values
 * @param {string} color1 - First hex color (e.g., '#FF0000')
 * @param {string} color2 - Second hex color (e.g., '#00FF00')
 * @param {number} factor - Interpolation factor between 0 and 1
 * @returns {string} Interpolated hex color
 */
function interpolateColor(color1, color2, factor) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ============================================================================
// === CLASSES ===
// ============================================================================

class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = 2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life--;
        return this.life > 0;
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class BonusMessage {
    constructor(text, x, y, duration = CONFIG.BONUS_MESSAGE_DURATION) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.initialY = y;
        this.duration = duration;
        this.maxDuration = duration;
        this.vy = -0.3; // Float upward slowly
        this.maxUpwardMovement = 40; // Maximum pixels to move up
    }
    
    update() {
        // Only move up if we haven't reached the maximum upward movement
        if (this.initialY - this.y < this.maxUpwardMovement) {
            this.y += this.vy;
        }
        this.duration--;
        return this.duration > 0;
    }
    
    draw() {
        // Fade in during first 5% and fade out during last 47.5% (twice as fast)
        let alpha = 1.0;
        const fadeInTime = this.maxDuration * 0.05;
        const fadeOutTime = this.maxDuration * 0.475;
        
        if (this.maxDuration - this.duration < fadeInTime) {
            alpha = (this.maxDuration - this.duration) / fadeInTime;
        } else if (this.duration < fadeOutTime) {
            alpha = this.duration / fadeOutTime;
        }
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use same color pattern as scoreboard for visibility
        ctx.fillStyle = interpolateColor(SKY_COLORS.TEXT_DAY, SKY_COLORS.TEXT_NIGHT, skyTransition);
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.restore();
    }
}

// ============================================================================
// === INITIALIZATION & GAME STATE ===
// ============================================================================

function spawnDustParticle() {
    if (frameCount % CONFIG.PARTICLE_SPAWN_INTERVAL === 0 && !motorcycle.isJumping) {
        particles.push(new Particle(
            motorcycle.x + 10,
            groundY + 5,
            -2 - Math.random() * 2,
            -1 - Math.random() * 2,
            'rgb(194, 178, 128)',
            20
        ));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => p.draw());
}

// Key state
const keys = {};

// ============================================================================
// === HELPER FUNCTIONS ===
// ============================================================================

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function calculateHitbox(spriteDims, sizeRatio = CONFIG.HITBOX_SIZE_RATIO, customOffsetX = null, customOffsetY = null) {
    const hitboxWidth = spriteDims.width * sizeRatio;
    const hitboxHeight = spriteDims.height * sizeRatio;
    return {
        width: hitboxWidth,
        height: hitboxHeight,
        offsetX: customOffsetX !== null ? customOffsetX : (spriteDims.width - hitboxWidth) / 2,
        offsetY: customOffsetY !== null ? customOffsetY : (spriteDims.height - hitboxHeight) / 2
    };
}

function checkAABBCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Cache hitbox dimensions
const normalDims = getSpriteDimensions(SPRITES.MOTORCYCLE_NORMAL);
const duckDims = getSpriteDimensions(SPRITES.MOTORCYCLE_DUCK);
const normalHitbox = calculateHitbox(normalDims, CONFIG.HITBOX_SIZE_RATIO, 1, 4);
const duckHitbox = calculateHitbox(duckDims, CONFIG.HITBOX_SIZE_RATIO, 1, 3);

function getMotorcycleHitbox() {
    const hitbox = motorcycle.isDucking ? duckHitbox : normalHitbox;
    
    return {
        x: motorcycle.x + hitbox.offsetX,
        y: motorcycle.y + hitbox.offsetY,
        width: hitbox.width,
        height: hitbox.height
    };
}

function calculateSpawnInterval(minInterval, maxInterval, minCap, minSpacing) {
    const speedFactor = Math.floor(frameCount / CONFIG.SPEED_INCREASE_INTERVAL);
    const adjustedMinInterval = Math.max(
        minCap,
        minInterval - speedFactor * CONFIG.OBSTACLE_INTERVAL_DECREASE_RATE
    );
    const adjustedMaxInterval = Math.max(
        adjustedMinInterval + minSpacing,
        maxInterval - speedFactor * CONFIG.OBSTACLE_INTERVAL_DECREASE_RATE
    );
    
    return Math.random() * (adjustedMaxInterval - adjustedMinInterval) + adjustedMinInterval;
}

function isObstacleTooClose(obstacleArray) {
    if (obstacleArray.length === 0) return false;
    const lastObstacle = obstacleArray[obstacleArray.length - 1];
    const lastObstacleEnd = lastObstacle.x + lastObstacle.width;
    
    // Check distance from last obstacle
    const obstacleDistance = canvas.width - lastObstacleEnd;
    if (obstacleDistance < CONFIG.SAFE_DISTANCE_BIRD_VEHICLE) return true;
    
    // Also check distance from last convoy if it extends further (add extra spacing)
    const convoyDistance = canvas.width - lastConvoyEndX;
    if (convoyDistance < CONFIG.SAFE_DISTANCE_BIRD_VEHICLE + 200) return true;
    
    return false;
}

// CODE REVIEW: Game actions should be centralized functions (not duplicated in keyboard/touch)
function performJump() {
    if (!motorcycle.isJumping && !motorcycle.isDucking) {
        motorcycle.velocityY = motorcycle.jumpPower;
        motorcycle.isJumping = true;
        // Exit riding state when jumping
        if (motorcycle.isRidingVehicle) {
            motorcycle.isRidingVehicle = false;
            motorcycle.ridingVehicle = null;
        }
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (gameState === GAME_STATES.WAITING && e.code === 'Space') {
        startGame();
    }
    
    if (gameState === GAME_STATES.PLAYING) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            performJump();
        }
    }
    
    // CODE REVIEW: Always preventDefault() for game input keys to avoid page scroll
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Touch/Mobile support
let isTouchDucking = false;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    if (gameState === GAME_STATES.WAITING) {
        startGame();
        return;
    }
    
    if (gameState === GAME_STATES.PLAYING) {
        const touch = e.touches[0];
        const canvasRect = canvas.getBoundingClientRect();
        const touchYRelative = touch.clientY - canvasRect.top;
        const canvasHalfHeight = canvasRect.height / 2;
        
        // Touch bottom half to duck, top half to jump
        if (touchYRelative > canvasHalfHeight) {
            // Duck - hold finger down (works on ground or mid-air for fast-fall)
            isTouchDucking = true;
            keys['ArrowDown'] = true;
        } else {
            // Jump - tap top half (reuses keyboard jump logic)
            performJump();
        }
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    // Release duck when finger is lifted
    if (isTouchDucking) {
        keys['ArrowDown'] = false;
        isTouchDucking = false;
    }
});

restartBtn.addEventListener('click', () => {
    gameOverlay.style.display = 'none';
    instructionsEl.style.display = 'block';
    startGame();
});

// ============================================================================
// === GAME LIFECYCLE FUNCTIONS ===
// ============================================================================

/**
 * Initializes and starts a new game
 * Resets all game state variables and begins gameplay
 */
function startGame() {
    // CODE REVIEW: Ensure ALL game state variables are reset here
    // Check orientation on mobile before starting
    if (!checkOrientation()) {
        return; // Require landscape orientation on mobile devices
    }
    
    gameState = GAME_STATES.PLAYING;
    instructionsEl.style.display = 'none';
    
    // Dispatch custom event for embed wrapper to handle UI
    window.dispatchEvent(new CustomEvent('motorcyclegamestart'));
    
    score = 0;
    frameCount = 0;
    sunX = canvas.width - CONFIG.SUN_START_X;
    isNightMode = false;
    previousNightMode = false;
    pendingDayNightBonus = false;
    skyTransition = 0;
    stars = [];
    gameSpeed = CONFIG.INITIAL_SPEED;
    obstacles = [];
    flyingObstacles = [];
    billboards = [];
    particles = [];
    bonusMessages = [];
    collisionFlash = 0;
    landingAnimation = 0;
    motorcycle.y = motorcycle.groundY;
    motorcycle.velocityY = 0;
    motorcycle.isJumping = false;
    motorcycle.isDucking = false;
    motorcycle.isRidingVehicle = false;
    motorcycle.ridingVehicle = null;
    
    // Reset spawn timers
    nextGroundObstacleFrame = CONFIG.OBSTACLE_MAX_INTERVAL;
    nextFlyingObstacleFrame = CONFIG.FLYING_OBSTACLE_MAX_INTERVAL + CONFIG.FLYING_OBSTACLE_MIN_SCORE;
    groundObstacleInterval = CONFIG.OBSTACLE_MAX_INTERVAL;
    flyingObstacleInterval = CONFIG.FLYING_OBSTACLE_MAX_INTERVAL;
    lastConvoyEndX = -1000;
    nextBillboardFrame = 900; // First billboard at 15 seconds
    
    gameOverlay.style.display = 'none';
    gameLoop();
}

// ============================================================================
// === SPAWNING FUNCTIONS ===
// ============================================================================

/**
 * Spawns a convoy of multiple vehicles in sequence
 * @param {Object} leadVehicle - The first vehicle in the convoy
 * @param {number} minCount - Minimum number of vehicles
 * @param {number} maxCount - Maximum number of vehicles
 */
function spawnConvoy(leadVehicle, minCount, maxCount) {
    const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    const smallVehicleTypes = obstacleTypes.filter(type => 
        type.sprite === 'CAR' || type.sprite === 'TRUCK' || type.sprite === 'VAN'
    );
    
    let lastVehicleEndX = leadVehicle.x + leadVehicle.width;
    
    for (let i = 0; i < count; i++) {
        const vehicleType = getRandomElement(smallVehicleTypes);
        const vehicleColors = getRandomVehicleColors();
        const vehiclePalette = createSpritePalette(vehicleColors);
        
        // Position vehicles behind the previous vehicle with spacing
        const spacing = 30; // Fixed spacing between each vehicle
        const vehicleX = lastVehicleEndX + spacing;
        
        obstacles.push({
            x: vehicleX,
            y: groundY - vehicleType.height,
            width: vehicleType.width,
            height: vehicleType.height,
            sprite: vehicleType.sprite,
            type: vehicleType.type,
            rideable: vehicleType.rideable,
            flipH: false,
            palette: vehiclePalette
        });
        
        // Update for next vehicle
        lastVehicleEndX = vehicleX + vehicleType.width;
    }
    
    // Track the end position of this convoy
    lastConvoyEndX = lastVehicleEndX;
}

/**
 * Main obstacle spawning logic
 * Handles timing, variety, and placement of ground and flying obstacles
 */
function spawnObstacle() {
    // Spawn ground obstacle (vehicle) when it's time
    if (frameCount >= nextGroundObstacleFrame) {
        // Check if there's a recent flying obstacle that would create an impossible situation
        if (!isObstacleTooClose(flyingObstacles)) {
            // Separate rideable vs non-rideable vehicles based on score
            let availableTypes = obstacleTypes;
            if (score >= CONFIG.RIDEABLE_VEHICLE_MIN_SCORE) {
                // All vehicle types available
                availableTypes = obstacleTypes;
            } else {
                // Only non-rideable vehicles
                availableTypes = obstacleTypes.filter(type => !type.rideable);
            }
            
            const obstacleType = getRandomElement(availableTypes);
            const vehicleColors = getRandomVehicleColors();
            const vehiclePalette = createSpritePalette(vehicleColors);
            
            const newObstacle = {
                x: canvas.width,
                y: groundY - obstacleType.height,
                width: obstacleType.width,
                height: obstacleType.height,
                sprite: obstacleType.sprite,
                type: obstacleType.type,
                rideable: obstacleType.rideable,
                flipH: false, // Vehicles always face left (coming towards motorcycle)
                palette: vehiclePalette // Random vehicle color
            };
            
            obstacles.push(newObstacle);
            
            // Spawn convoy vehicles behind large vehicles based on playtime
            const playTimeSeconds = frameCount / 60; // Assuming 60 FPS
            
            // After 15 seconds: spawn 1-2 vehicles behind semi trucks
            // After 60 seconds: spawn up to 3 vehicles
            if (playTimeSeconds >= 15 && obstacleType.sprite === 'SEMI_TRUCK') {
                const maxConvoySize = playTimeSeconds >= 60 ? 3 : 2;
                spawnConvoy(newObstacle, 1, maxConvoySize);
            }
            
            // After 30 seconds: spawn 1-2 vehicles behind buses
            // After 60 seconds: spawn up to 3 vehicles
            if (playTimeSeconds >= 30 && obstacleType.sprite === 'BUS') {
                const maxConvoySize = playTimeSeconds >= 60 ? 3 : 2;
                spawnConvoy(newObstacle, 1, maxConvoySize);
            }
            
            // Calculate next spawn time with progressive difficulty
            groundObstacleInterval = calculateSpawnInterval(
                CONFIG.OBSTACLE_MIN_INTERVAL,
                CONFIG.OBSTACLE_MAX_INTERVAL,
                CONFIG.OBSTACLE_MIN_INTERVAL_CAP,
                CONFIG.GROUND_INTERVAL_MIN_SPACING
            );
            nextGroundObstacleFrame = frameCount + groundObstacleInterval;
        } else {
            // Retry soon if collision prevention blocked spawn
            nextGroundObstacleFrame = frameCount + CONFIG.OBSTACLE_RETRY_DELAY;
        }
    }
    
    // Spawn flying obstacles after minimum score threshold
    if (score > CONFIG.FLYING_OBSTACLE_MIN_SCORE && frameCount >= nextFlyingObstacleFrame) {
        // Check if there's a recent ground obstacle that would create an impossible situation
        if (!isObstacleTooClose(obstacles)) {
            const yOffset = getRandomElement(flyingObstacleConfig.heightVariations);
            flyingObstacles.push({
                x: canvas.width,
                y: groundY + yOffset,
                width: flyingObstacleConfig.width,
                height: flyingObstacleConfig.height,
                wingFrame: 0
            });
            
            // Calculate next spawn time with progressive difficulty
            flyingObstacleInterval = calculateSpawnInterval(
                CONFIG.FLYING_OBSTACLE_MIN_INTERVAL,
                CONFIG.FLYING_OBSTACLE_MAX_INTERVAL,
                CONFIG.FLYING_INTERVAL_MIN_CAP,
                CONFIG.FLYING_INTERVAL_MIN_SPACING
            );
            nextFlyingObstacleFrame = frameCount + flyingObstacleInterval;
        } else {
            // Retry soon if collision prevention blocked spawn
            nextFlyingObstacleFrame = frameCount + CONFIG.OBSTACLE_RETRY_DELAY;
        }
    }
    
    // Spawn billboards every 15 seconds (900 frames)
    if (frameCount >= nextBillboardFrame) {
        const billboardDims = getSpriteDimensions(SPRITES.BILLBOARD);
        const message = BILLBOARD_MESSAGES[Math.floor(Math.random() * BILLBOARD_MESSAGES.length)];
        
        billboards.push({
            x: canvas.width,
            y: groundY - billboardDims.height - 20, // 20px above ground
            width: billboardDims.width,
            height: billboardDims.height,
            message: message
        });
        
        nextBillboardFrame = frameCount + 900; // Next billboard in 15 seconds
    }
}

// ============================================================================
// === UPDATE FUNCTIONS ===
// ============================================================================

function updateObstacles() {
    // Update ground obstacles (vehicles)
    // Vehicles move slightly faster than road to appear traveling in opposite direction
    const vehicleSpeed = gameSpeed * 1.3;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= vehicleSpeed;
        
        // Remove off-screen obstacles and award points
        if (obstacles[i].x + obstacles[i].width < 0) {
            const points = obstacles[i].rideable ? CONFIG.RIDEABLE_VEHICLE_POINTS : CONFIG.VEHICLE_POINTS;
            obstacles.splice(i, 1);
            score += points;
        }
    }
    
    // Update flying obstacles
    for (let i = flyingObstacles.length - 1; i >= 0; i--) {
        flyingObstacles[i].x -= gameSpeed * CONFIG.FLYING_OBSTACLE_SPEED_MULTIPLIER;
        // Animate wing flapping
        flyingObstacles[i].wingFrame = Math.floor(frameCount / CONFIG.BIRD_WING_FLAP_FRAME_INTERVAL) % 2;
        
        // Remove off-screen obstacles
        if (flyingObstacles[i].x + flyingObstacles[i].width < 0) {
            flyingObstacles.splice(i, 1);
            score += CONFIG.FLYING_OBSTACLE_POINTS;
        }
    }
    
    // Update billboards (slower than road and vehicles)
    for (let i = billboards.length - 1; i >= 0; i--) {
        billboards[i].x -= gameSpeed * 0.7; // Slower than road and vehicles
        
        // Remove off-screen billboards
        if (billboards[i].x + billboards[i].width < 0) {
            billboards.splice(i, 1);
        }
    }
}

function updateMotorcycle() {
    // Handle riding state
    if (motorcycle.isRidingVehicle && motorcycle.ridingVehicle) {
        const vehicle = motorcycle.ridingVehicle;
        
        // Check if vehicle scrolled past motorcycle
        if (vehicle.x + vehicle.width < motorcycle.x) {
            // Fall off vehicle
            motorcycle.isRidingVehicle = false;
            motorcycle.ridingVehicle = null;
            motorcycle.isJumping = true;
            motorcycle.velocityY = 0; // Start falling from current position
        } else {
            // Lock motorcycle Y position to top of vehicle
            const rideHeight = 1; // Minimal offset above vehicle
            const currentHeight = motorcycle.isDucking ? motorcycle.duckHeight : motorcycle.normalHeight;
            motorcycle.y = vehicle.y - currentHeight - rideHeight;
            
            // Player can jump while riding
            // (handled by handleJump function)
        }
    }
    
    // Handle ducking (only when not riding)
    if (!motorcycle.isRidingVehicle && keys['ArrowDown'] && !motorcycle.isJumping) {
        motorcycle.isDucking = true;
        motorcycle.y = motorcycle.groundY + (motorcycle.normalHeight - motorcycle.duckHeight);
    } else if (!motorcycle.isJumping && !motorcycle.isRidingVehicle) {
        motorcycle.isDucking = false;
        motorcycle.y = motorcycle.groundY;
    }
    
    // Apply gravity
    if (motorcycle.isJumping) {
        // Apply extra gravity for fast-fall when ducking mid-air
        const gravityMultiplier = keys['ArrowDown'] ? CONFIG.FAST_FALL_GRAVITY : motorcycle.gravity;
        motorcycle.velocityY += gravityMultiplier;
        motorcycle.y += motorcycle.velocityY;
        
        // Land on ground
        if (motorcycle.y >= motorcycle.groundY) {
            motorcycle.y = motorcycle.groundY;
            motorcycle.velocityY = 0;
            motorcycle.isJumping = false;
            motorcycle.isRidingVehicle = false;
            motorcycle.ridingVehicle = null;
            landingAnimation = 8; // Show landing animation for 8 frames
        }
    }
    
    // Decrement landing animation counter
    if (landingAnimation > 0) {
        landingAnimation--;
    }
}

/**
 * Checks for collisions between motorcycle and obstacles
 * Handles both ground vehicles and flying obstacles (birds)
 */
function checkCollisions() {
    const motorHitbox = getMotorcycleHitbox();
    
    // Check ground obstacles (vehicles)
    for (let obstacle of obstacles) {
        // Two-phase collision detection for rideable vehicles
        if (obstacle.rideable) {
            // Phase 1: Check if landing on top of rideable vehicle
            const landingOnTop = 
                motorcycle.isJumping && 
                motorcycle.velocityY > 0 && // falling down
                motorHitbox.x + motorHitbox.width > obstacle.x && 
                motorHitbox.x < obstacle.x + obstacle.width &&
                motorHitbox.y + motorHitbox.height <= obstacle.y + 10 && // within 10px of top
                motorHitbox.y + motorHitbox.height >= obstacle.y - 5; // above or slightly overlapping
            
            if (landingOnTop) {
                // Land on vehicle
                motorcycle.isRidingVehicle = true;
                motorcycle.ridingVehicle = obstacle;
                motorcycle.isJumping = false;
                motorcycle.velocityY = 0;
                continue; // Skip collision check
            }
        }
        
        // Phase 2: Standard AABB collision for side/front impacts
        if (!motorcycle.isRidingVehicle && checkAABBCollision(motorHitbox, obstacle)) {
            gameOver();
            return;
        }
    }
    
    // Check flying obstacles
    for (let obstacle of flyingObstacles) {
        if (checkAABBCollision(motorHitbox, obstacle)) {
            gameOver();
            return;
        }
    }
}

function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    collisionFlash = CONFIG.COLLISION_FLASH_DURATION;
    
    // Update high scores
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('motorcycleHighScore', highScore);
    }
    
    if (score > dailyHighScore) {
        dailyHighScore = score;
        localStorage.setItem('motorcycleDailyHighScore', dailyHighScore);
    }
    
    if (score > allTimeHighScore) {
        allTimeHighScore = score;
        localStorage.setItem('motorcycleAllTimeHighScore', allTimeHighScore);
    }
    
    finalScoreEl.textContent = `Score: ${score}`;
    dailyHighScoreEl.textContent = `Best Today: ${dailyHighScore}`;
    allTimeHighScoreEl.textContent = `Best Ever: ${allTimeHighScore}`;
    gameOverlay.style.display = 'block';
    
    // Dispatch custom event for embed wrapper to handle UI
    window.dispatchEvent(new CustomEvent('motorcyclegameover'));
}

// ============================================================================
// === DRAW FUNCTIONS ===
// ============================================================================

function drawMotorcycle() {
    // Show landing animation (duck sprite for 5 frames), otherwise show normal state
    const sprite = (motorcycle.isDucking || landingAnimation > 0) 
        ? SPRITES.MOTORCYCLE_DUCK 
        : SPRITES.MOTORCYCLE_NORMAL;
    
    // Adjust y position to align bottom of sprites
    let drawY = motorcycle.y;
    if (landingAnimation > 0 && !motorcycle.isDucking) {
        // MOTORCYCLE_DUCK is shorter, so offset it down to align the bottom
        const normalHeight = getSpriteDimensions(SPRITES.MOTORCYCLE_NORMAL).height;
        const duckHeight = getSpriteDimensions(SPRITES.MOTORCYCLE_DUCK).height;
        drawY += (normalHeight - duckHeight);
    }
    
    // Flash effect on collision
    if (collisionFlash > 0) {
        if (collisionFlash % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
        collisionFlash--;
    }
    
    drawSprite(sprite, motorcycle.x, drawY);
    ctx.globalAlpha = 1.0;
}

function drawObstacles() {
    // Draw ground obstacles (vehicle sprites)
    obstacles.forEach(obstacle => {
        const sprite = SPRITES[obstacle.sprite];
        if (sprite) {
            drawSprite(sprite, obstacle.x, obstacle.y, CONFIG.SPRITE_SCALE, obstacle.flipH, obstacle.palette);
        }
    });
    
    // Draw flying obstacles (birds with wing animation)
    flyingObstacles.forEach(obstacle => {
        const sprite = obstacle.wingFrame === 0 ? SPRITES.BIRD_UP : SPRITES.BIRD_DOWN;
        drawSprite(sprite, obstacle.x, obstacle.y);
    });
}

function drawBillboards() {
    billboards.forEach(billboard => {
        // Draw billboard sprite
        drawSprite(SPRITES.BILLBOARD, billboard.x, billboard.y);
        
        // Draw white background for text area to make it readable at night
        ctx.fillStyle = '#f5f5f5';
        const padding = 6; // Border width in pixels (scaled)
        ctx.fillRect(
            billboard.x + padding, 
            billboard.y + padding, 
            billboard.width - (padding * 2), 
            billboard.height - (padding * 2) - 30 // Exclude post area (10 pixels * 3 scale)
        );
        
        // Draw text on billboard
        ctx.fillStyle = '#2d2d2d';
        ctx.font = 'bold 23px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = billboard.x + (billboard.width / 2);
        // Center in the text area (excluding the post at bottom)
        const textAreaHeight = billboard.height - 30; // Exclude post
        const centerY = billboard.y + (textAreaHeight / 2);
        
        if (billboard.message.length === 1) {
            // Single line - center vertically
            ctx.fillText(billboard.message[0], centerX, centerY);
        } else if (billboard.message.length === 2) {
            // Two lines - centered vertically
            ctx.fillText(billboard.message[0], centerX, centerY - 12);
            ctx.fillText(billboard.message[1], centerX, centerY + 12);
        } else if (billboard.message.length === 3) {
            // Three lines - evenly spaced
            ctx.fillText(billboard.message[0], centerX, centerY - 18);
            ctx.fillText(billboard.message[1], centerX, centerY);
            ctx.fillText(billboard.message[2], centerX, centerY + 18);
        }
        
        ctx.textBaseline = 'alphabetic';
    });
}

function drawSkyObject() {
    const skyY = CONFIG.SUN_Y_POSITION;
    const radius = CONFIG.SUN_RADIUS;
    
    if (isNightMode) {
        // Draw crescent moon
        ctx.fillStyle = SKY_COLORS.MOON;
        ctx.beginPath();
        ctx.arc(sunX, skyY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shadow to create crescent
        ctx.fillStyle = interpolateColor(SKY_COLORS.DAY, SKY_COLORS.NIGHT, skyTransition);
        ctx.beginPath();
        ctx.arc(sunX + CONFIG.MOON_CRESCENT_OFFSET, skyY, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Draw sun with glow
        const gradient = ctx.createRadialGradient(sunX, skyY, radius * 0.3, sunX, skyY, radius * 2);
        gradient.addColorStop(0, SKY_COLORS.SUN_GLOW[0]);
        gradient.addColorStop(0.3, SKY_COLORS.SUN_GLOW[1]);
        gradient.addColorStop(0.6, SKY_COLORS.SUN_GLOW[2]);
        gradient.addColorStop(1, SKY_COLORS.SUN_GLOW[3]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sunX, skyY, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw sun core
        ctx.fillStyle = SKY_COLORS.SUN_CORE;
        ctx.beginPath();
        ctx.arc(sunX, skyY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStars() {
    if (!isNightMode) return;
    
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateStars() {
    if (!isNightMode) return;
    
    // Move stars left at their individual speeds
    stars.forEach(star => {
        star.x -= star.speed;
        
        // Wrap around when they go off screen
        if (star.x < -10) {
            star.x = canvas.width + 10;
        }
    });
}

/**
 * Updates day/night cycle and awards bonus after transition completes
 * Manages sun/moon movement, sky color transitions, and star visibility
 */
function updateDayNightCycle() {
    // Move sun/moon across sky
    sunX -= CONFIG.SUN_MOON_SPEED;
    
    // Switch between day and night when sun/moon reaches left side
    if (sunX <= CONFIG.SUN_START_X) {
        isNightMode = !isNightMode;
        if (isNightMode) {
            initializeStars();
        }
        sunX = canvas.width - CONFIG.SUN_START_X;
        
        // Set flag to award bonus after transition completes (but not on first transition)
        if (previousNightMode !== isNightMode && score > 0) {
            pendingDayNightBonus = true;
        }
        
        previousNightMode = isNightMode;
    }
    
    // Gradually transition sky color (crossfade)
    const targetTransition = isNightMode ? 1 : 0;
    if (skyTransition < targetTransition) {
        skyTransition = Math.min(skyTransition + CONFIG.SKY_TRANSITION_SPEED, targetTransition);
    } else if (skyTransition > targetTransition) {
        skyTransition = Math.max(skyTransition - CONFIG.SKY_TRANSITION_SPEED, targetTransition);
    }
    
    // Award bonus and show message after transition is complete
    if (pendingDayNightBonus && skyTransition === targetTransition) {
        score += CONFIG.DAY_NIGHT_BONUS;
        
        // Create bonus message in center of sky
        const centerX = canvas.width / 2;
        const centerY = groundY / 3; // Position in upper third of sky
        bonusMessages.push(new BonusMessage('Bonus +500', centerX, centerY));
        
        pendingDayNightBonus = false;
    }
    
    // Update stars during night
    updateStars();
}

function initializeStars() {
    stars = [];
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (groundY - 100),
            size: Math.random() * (CONFIG.STAR_MAX_SIZE - CONFIG.STAR_MIN_SIZE) + CONFIG.STAR_MIN_SIZE,
            speed: Math.random() * (CONFIG.STAR_MAX_SPEED - CONFIG.STAR_MIN_SPEED) + CONFIG.STAR_MIN_SPEED,
            opacity: Math.random() * (CONFIG.STAR_MAX_OPACITY - CONFIG.STAR_MIN_OPACITY) + CONFIG.STAR_MIN_OPACITY
        });
    }
}

function drawGround() {
    // Draw road (wider black line)
    ctx.strokeStyle = COLORS.GROUND_LINE;
    ctx.lineWidth = CONFIG.GROUND_ROAD_WIDTH;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    
    // Draw center lane divider (white dashed line) - batched
    ctx.strokeStyle = COLORS.CENTER_LINE;
    ctx.lineWidth = CONFIG.CENTER_LINE_WIDTH;
    ctx.beginPath();
    const offset = (frameCount * gameSpeed) % CONFIG.GROUND_DASH_SPACING;
    for (let i = -offset; i < canvas.width; i += CONFIG.GROUND_DASH_SPACING) {
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + CONFIG.GROUND_DASH_LENGTH, groundY);
    }
    ctx.stroke();
}

function drawScore() {
    // Interpolate text color between dark and white based on sky transition
    ctx.fillStyle = interpolateColor(SKY_COLORS.TEXT_DAY, SKY_COLORS.TEXT_NIGHT, skyTransition);
    
    // Main score - larger font, bold
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, 30);
    
    // Daily/all-time scores - 2/3 the size (12px), not bold
    ctx.font = '12px Courier New';
    ctx.fillText(`Best Today: ${dailyHighScore}`, canvas.width / 2, 46);
    ctx.fillText(`Best Ever: ${allTimeHighScore}`, canvas.width / 2, 62);
    
    // Debug mode - show FPS and speed
    if (CONFIG.DEBUG_MODE) {
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`Speed: ${gameSpeed.toFixed(1)}`, 20, 30);
    }
}

function drawVersion() {
    ctx.fillStyle = interpolateColor(SKY_COLORS.TEXT_DAY, SKY_COLORS.TEXT_NIGHT, skyTransition);
    ctx.font = '14px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(VERSION, canvas.width - 10, canvas.height - 10);
}

function drawDebugHitboxes() {
    if (!CONFIG.DEBUG_MODE) return;
    
    // Draw motorcycle hitbox
    const motorHitbox = getMotorcycleHitbox();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(motorHitbox.x, motorHitbox.y, motorHitbox.width, motorHitbox.height);
    
    // Draw obstacle hitboxes
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    obstacles.forEach(obstacle => {
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
    
    flyingObstacles.forEach(obstacle => {
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

function drawWaitingScreen() {
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2 - 50);
    
    // Draw version number in small font
    ctx.font = '12px Courier New';
    ctx.fillText(VERSION, canvas.width / 2, canvas.height / 2 - 10);
    
    // Draw in correct order: ground first, then motorcycle on top
    drawGround();
    drawMotorcycle();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky background with crossfade
    ctx.fillStyle = interpolateColor(SKY_COLORS.DAY, SKY_COLORS.NIGHT, skyTransition);
    ctx.fillRect(0, 0, canvas.width, groundY);
    
    if (gameState === GAME_STATES.WAITING) {
        drawWaitingScreen();
        return;
    }
    
    // CODE REVIEW: Draw order must be back-to-front (stars → sky → billboards → ground → particles → player → obstacles → UI)
    drawStars();
    drawSkyObject();
    drawBillboards(); // Draw billboards before ground so they appear in background
    drawGround();
    drawParticles();
    drawMotorcycle();
    drawObstacles();
    
    // Draw bonus messages (after obstacles but before UI)
    bonusMessages.forEach(m => m.draw());
    
    drawScore();
    drawVersion();
    drawDebugHitboxes();
}

/**
 * Main update loop - processes game logic each frame
 * Handles scoring, difficulty scaling, day/night cycle, and entity updates
 */
function update() {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    frameCount++;
    
    // Update day/night cycle
    updateDayNightCycle();
    
    // Award 1 point for survival
    if (frameCount % CONFIG.SURVIVAL_POINTS_INTERVAL === 0) {
        score++;
    }
    
    // Increase difficulty over time
    // After 30 seconds (1800 frames), slow speed increases by half
    if (frameCount % CONFIG.SPEED_INCREASE_INTERVAL === 0) {
        const playTimeSeconds = frameCount / 60;
        const speedIncrement = playTimeSeconds >= 30 ? CONFIG.SPEED_INCREMENT * 0.5 : CONFIG.SPEED_INCREMENT;
        gameSpeed += speedIncrement;
    }
    
    updateMotorcycle();
    updateObstacles();
    spawnObstacle();
    spawnDustParticle();
    updateParticles();
    
    // Update bonus messages
    bonusMessages = bonusMessages.filter(m => m.update());
    
    checkCollisions();
}

// Orientation detection for mobile devices
function isLandscape() {
    // Check if it's a mobile device first
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
        return true; // Allow desktop play in any orientation
    }
    
    // For mobile, check orientation
    if (screen.orientation && screen.orientation.type) {
        return screen.orientation.type.includes('landscape');
    } else if (window.orientation !== undefined) {
        // Fallback for older browsers: 90 or -90 is landscape
        return Math.abs(window.orientation) === 90;
    } else {
        // Final fallback: check aspect ratio
        return window.innerWidth > window.innerHeight;
    }
}

function checkOrientation() {
    if (isLandscape()) {
        orientationOverlay.style.display = 'none';
        return true;
    } else {
        orientationOverlay.style.display = 'block';
        // Pause the game if it was playing (orientation changed mid-game)
        if (gameState === GAME_STATES.PLAYING) {
            gameState = GAME_STATES.WAITING;
        }
        return false;
    }
}

// ============================================================================
// === GAME LOOP ===
// ============================================================================

/**
 * Main game loop - runs continuously while game is active
 * Calls update and draw functions, then schedules next frame
 */
function gameLoop() {
    update();
    draw();
    
    if (gameState === GAME_STATES.PLAYING) {
        requestAnimationFrame(gameLoop);
    }
}

// Initial draw
draw();

// Check orientation on load and listen for changes
checkOrientation();
window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('resize', checkOrientation);
