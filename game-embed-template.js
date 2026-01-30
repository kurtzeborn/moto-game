/**
 * Motorcycle Runner - Embeddable Game
 * 
 * Usage: <script src="https://kurtzeborn.net/game/game-embed.js"></script>
 * 
 * Controls:
 * - Press SPACEBAR to toggle game overlay
 * - Press ESC to close game
 * - Game controls: SPACE/↑ to jump, ↓ to duck
 * - Mobile: Tap top half to jump, hold bottom half to duck
 */

(function() {
    'use strict';
    
    // Prevent multiple instances
    if (window.MotorcycleRunner) {
        console.warn('Motorcycle Runner already loaded');
        return;
    }
    
    let gameOverlay = null;
    let isGameVisible = false;
    let gameLoopId = null; // Track animation frame for cleanup
    
    // Create and inject game overlay
    function createGameOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'motorcycle-runner-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 999999;
            display: none;
            justify-content: center;
            align-items: center;
        `;
        
        // Load game content dynamically
        overlay.innerHTML = `
            <style>
                #motorcycle-runner-container {
                    position: relative;
                    max-width: 100%;
                    max-height: 100%;
                }
                
                #motorcycle-runner-canvas {
                    border: 4px solid black;
                    background: linear-gradient(to bottom, #87ceeb 0%, #e0f6ff 50%, #c2b280 50%, #c2b280 100%);
                    display: block;
                    max-width: 100vw;
                    max-height: 100vh;
                    touch-action: none;
                }
                
                .motorcycle-game-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    background: rgba(0, 0, 0, 0.85);
                    padding: 30px 50px;
                    border: 4px solid lightgreen;
                    border-radius: 10px;
                    color: lightgreen;
                    display: none;
                    font-family: 'Courier New', monospace;
                }
                
                .motorcycle-game-overlay h2 {
                    margin: 0 0 20px 0;
                    font-size: 48px;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                }
                
                .motorcycle-game-overlay p {
                    margin: 10px 0;
                    font-size: 24px;
                }
                
                .motorcycle-game-overlay button {
                    margin-top: 20px;
                    padding: 15px 30px;
                    font-size: 20px;
                    background: lightgreen;
                    color: black;
                    border: 2px solid black;
                    cursor: pointer;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                }
                
                .motorcycle-game-overlay button:hover {
                    background: rgba(210, 255, 0, 0.9);
                    transform: scale(1.05);
                }
                
                .motorcycle-instructions {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    color: lightgreen;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 15px;
                    border: 2px solid lightgreen;
                    border-radius: 5px;
                    font-size: 14px;
                    font-family: 'Courier New', monospace;
                }
                
                .motorcycle-instructions h3 {
                    margin: 0 0 10px 0;
                    font-size: 18px;
                }
                
                .motorcycle-instructions p {
                    margin: 5px 0;
                }
                
                .motorcycle-close-button {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    background: rgba(255, 0, 0, 0.7);
                    color: white;
                    border: 2px solid white;
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    font-weight: bold;
                    border-radius: 5px;
                    font-family: 'Courier New', monospace;
                }
                
                .motorcycle-close-button:hover {
                    background: rgba(255, 0, 0, 0.9);
                }
            </style>
            
            <div id="motorcycle-runner-container">
                <button class="motorcycle-close-button" id="motorcycle-close-btn">✕ Close (ESC)</button>
                
                <div class="motorcycle-instructions" id="motorcycle-instructions">
                    <h3>Controls</h3>
                    <p><strong>Desktop:</strong></p>
                    <p>SPACE or ↑ - Jump</p>
                    <p>↓ - Duck</p>
                    <p><strong>Mobile:</strong></p>
                    <p>Tap Top Half - Jump</p>
                    <p>Hold Bottom Half - Duck</p>
                </div>
                
                <canvas id="motorcycle-runner-canvas" width="1000" height="400"></canvas>
                
                <div id="motorcycle-game-overlay" class="motorcycle-game-overlay">
                    <h2>GAME OVER</h2>
                    <p id="motorcycle-final-score">Score: 0</p>
                    <p id="motorcycle-daily-high-score">Best Today: 0</p>
                    <p id="motorcycle-all-time-high-score">Best Ever: 0</p>
                    <button id="motorcycle-restart-btn">RESTART</button>
                </div>
                
                <div id="motorcycle-orientation-overlay" class="motorcycle-game-overlay" style="display: none;">
                    <h2>📱 ROTATE DEVICE</h2>
                    <p>Please rotate your device to landscape mode to play</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }
    
    function showGame() {
        if (!gameOverlay) {
            gameOverlay = createGameOverlay();
            // Initialize game after DOM is ready
            setTimeout(initializeGame, 0);
        }
        gameOverlay.style.display = 'flex';
        isGameVisible = true;
    }
    
    function hideGame() {
        if (gameOverlay) {
            gameOverlay.style.display = 'none';
            isGameVisible = false;
            // Stop the game loop to save resources
            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
            }
        }
    }
    
    // Global keyboard handler for toggling game
    document.addEventListener('keydown', function(e) {
        // Spacebar to toggle (only when game is hidden)
        if (e.code === 'Space' && !isGameVisible) {
            e.preventDefault();
            showGame();
            return;
        }
        
        // ESC to close game
        if (e.code === 'Escape' && isGameVisible) {
            e.preventDefault();
            hideGame();
            return;
        }
    });
    
    // Initialize game (called after overlay is created)
    function initializeGame() {
        // Close button handler
        const closeBtn = document.getElementById('motorcycle-close-btn');
        
        closeBtn.addEventListener('click', hideGame);
        
        // Listen for game events to manage close button visibility
        window.addEventListener('motorcyclegamestart', () => {
            closeBtn.style.display = 'none';
        });
        
        window.addEventListener('motorcyclegameover', () => {
            closeBtn.style.display = 'block';
        });
        
        // Embed sprites.js and game.js content inline
        (function() {
            ${generateSpritesContent()}
            
            ${generateGameContent()}
        })();
    }
    
    // Public API
    window.MotorcycleRunner = {
        show: showGame,
        hide: hideGame,
        version: '0.12'
    };
    
    console.log('Motorcycle Runner loaded. Press SPACEBAR to play!');
})();
