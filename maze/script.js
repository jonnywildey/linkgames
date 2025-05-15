document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const canvas = document.getElementById('maze-canvas');
  const ctx = canvas.getContext('2d');
  const upButton = document.getElementById('up');
  const leftButton = document.getElementById('left');
  const rightButton = document.getElementById('right');
  const downButton = document.getElementById('down');
  const linkContainer = document.getElementById('link-container');
  const hiddenLink = document.getElementById('hidden-link');
  const gameContainer = document.getElementById('game-container');
  const controlsContainer = document.getElementById('controls');
  const instructions = document.getElementById('instructions');
  const container = document.querySelector('.container');

  // Set canvas size
  const cellSize = 20; // Reduced cell size for more detailed maze
  let mazeWidth = 25; // Increased maze width
  let mazeHeight = 25; // Increased maze height
  canvas.width = mazeWidth * cellSize;
  canvas.height = mazeHeight * cellSize;

  // Game state
  let maze = [];
  let playerPosition = { x: 1, y: 1 };
  let exitPosition = { x: mazeWidth - 2, y: mazeHeight - 2 };
  let originalLink = '';
  let difficulty = 0.75; // Default difficulty (higher = more complex)
  let gameCompleted = false; // Flag to track if the maze has been solved

  // Movement state
  let movementKeys = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  // Movement speed - how many milliseconds between moves when holding a key
  const moveInterval = 130;
  let lastMoveTime = 0;
  let moveIntervalId = null;

  // Parse and decode the base64 link from URL
  function getBase64LinkFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedLink = urlParams.get('link');

    if (!encodedLink) {
      // If no link parameter, show instructions for creating a link
      document.getElementById('instructions').innerHTML =
        'No link provided! Add a base64-encoded link as a URL parameter: <br>' +
        '<code>?link=BASE64_ENCODED_LINK</code>';
      return null;
    }

    try {
      const decodedLink = atob(encodedLink);
      return {
        encoded: encodedLink,
        decoded: decodedLink
      };
    } catch (e) {
      document.getElementById('instructions').innerHTML =
        'Invalid base64 encoded link provided!';
      return null;
    }
  }

  // Set background color based on the encoded link
  function setBackgroundColor(encodedLink) {
    if (!encodedLink) return;

    // Generate a deterministic color based on the encoded link
    // Use the first 3 characters to seed the hue, saturation, and lightness
    let hueSum = 0;
    for (let i = 0; i < encodedLink.length; i++) {
      hueSum += encodedLink.charCodeAt(i);
    }

    // Calculate hue (0-360), saturation (85-95%), and lightness (92-98%)
    const hue = hueSum % 360;
    const saturation = 15 + (hueSum % 10); // 15-25% saturation (subtle)
    const lightness = 92 + (hueSum % 6);   // 92-98% lightness (very light)

    // Apply the background color to the body
    document.body.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    // Add subtle gradient to make it more interesting
    const complementaryHue = (hue + 30) % 360;
    document.body.style.backgroundImage = `
      linear-gradient(135deg, 
        hsl(${hue}, ${saturation}%, ${lightness}%) 0%, 
        hsl(${complementaryHue}, ${saturation}%, ${lightness}%) 100%)
    `;

    // Add a subtle color to the container as well
    container.style.backgroundColor = `hsl(${hue}, ${saturation}%, 100%)`;
    container.style.boxShadow = `0 0 20px rgba(0,0,0,0.05)`;

    // Return the generated color for potential use elsewhere
    return {
      hue,
      saturation,
      lightness,
      cssColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
    };
  }

  // Seeded random number generator based on the encoded link
  function seededRandom(seed) {
    let state = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return function () {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  // Generate maze using a combination of recursive backtracking and cellular automata
  function generateMaze(seed) {
    const random = seededRandom(seed);

    // Set difficulty based on seed length (longer URLs create more complex mazes)
    difficulty = 0.65 + (Math.min(seed.length, 100) / 100) * 0.3;

    // Initialize maze with walls
    maze = Array(mazeHeight).fill().map(() => Array(mazeWidth).fill(1));

    // Recursive function to carve paths (modified for more complex passages)
    function carve(x, y) {
      maze[y][x] = 0; // Mark current cell as path

      // Define directions: up, right, down, left only (no diagonals)
      const directions = [
        { dx: 0, dy: -2 }, // up
        { dx: 2, dy: 0 },  // right
        { dx: 0, dy: 2 },  // down
        { dx: -2, dy: 0 }  // left
      ];

      // Shuffle directions based on random seed
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      // Try each direction
      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        // Check if next cell is valid and unvisited
        if (nx > 0 && nx < mazeWidth - 1 && ny > 0 && ny < mazeHeight - 1 && maze[ny][nx] === 1) {
          // Carve wall between current and next cell
          maze[y + dir.dy / 2][x + dir.dx / 2] = 0;
          carve(nx, ny); // Recursively carve from the next cell
        }
      }
    }

    // Start carving from the top-left corner
    carve(1, 1);

    // Add some random passages (dead ends and loops) to increase complexity
    for (let i = 0; i < mazeWidth * mazeHeight * 0.1; i++) {
      const x = Math.floor(random() * (mazeWidth - 4)) + 2;
      const y = Math.floor(random() * (mazeHeight - 4)) + 2;

      if (countWallNeighbors(x, y) >= 5 && random() < difficulty) {
        maze[y][x] = 0;
      }
    }

    // Add some random walls to create more challenging paths
    for (let i = 0; i < mazeWidth * mazeHeight * 0.05; i++) {
      const x = Math.floor(random() * (mazeWidth - 4)) + 2;
      const y = Math.floor(random() * (mazeHeight - 4)) + 2;

      // Don't block the path completely by ensuring it's not a critical junction
      if (maze[y][x] === 0 && countWallNeighbors(x, y) <= 5 && random() < difficulty * 0.5) {
        if (!isPathCritical(x, y)) {
          maze[y][x] = 1;
        }
      }
    }

    // Ensure start and exit are open
    maze[1][1] = 0; // Start
    maze[mazeHeight - 2][mazeWidth - 2] = 0; // Exit

    // Clear a small area around start and exit for easier beginning/end
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (isInBounds(1 + dx, 1 + dy)) maze[1 + dy][1 + dx] = 0;
        if (isInBounds(mazeWidth - 2 + dx, mazeHeight - 2 + dy)) {
          maze[mazeHeight - 2 + dy][mazeWidth - 2 + dx] = 0;
        }
      }
    }

    // Ensure there's a valid path from start to exit
    ensureValidPath();
  }

  // Helper function to check if a position is within the maze bounds
  function isInBounds(x, y) {
    return x > 0 && x < mazeWidth - 1 && y > 0 && y < mazeHeight - 1;
  }

  // Count how many walls surround a cell (including diagonals)
  function countWallNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < mazeWidth && ny >= 0 && ny < mazeHeight && maze[ny][nx] === 1) {
          count++;
        }
      }
    }
    return count;
  }

  // Check if removing this path would cut off critical routes
  function isPathCritical(x, y) {
    // Simple check: don't block the only passage in a corridor
    const horizontalPath = maze[y][x - 1] === 0 && maze[y][x + 1] === 0 &&
      maze[y - 1][x] === 1 && maze[y + 1][x] === 1;
    const verticalPath = maze[y - 1][x] === 0 && maze[y + 1][x] === 0 &&
      maze[y][x - 1] === 1 && maze[y][x + 1] === 1;

    return horizontalPath || verticalPath;
  }

  // Ensure there's a valid path from start to exit using breadth-first search
  function ensureValidPath() {
    const visited = Array(mazeHeight).fill().map(() => Array(mazeWidth).fill(false));
    const queue = [{ x: 1, y: 1 }];
    visited[1][1] = true;

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (x === exitPosition.x && y === exitPosition.y) {
        return true; // Path found
      }

      // Check all four directions
      const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }  // left
      ];

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        if (nx >= 0 && nx < mazeWidth && ny >= 0 && ny < mazeHeight &&
          maze[ny][nx] === 0 && !visited[ny][nx]) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // If no path found, force create a path
    createForcedPath();
    return false;
  }

  // Create a direct path from start to exit if no valid path exists
  function createForcedPath() {
    let x = 1, y = 1;
    const targetX = exitPosition.x;
    const targetY = exitPosition.y;

    while (x !== targetX || y !== targetY) {
      // Move closer to the target
      if (x < targetX) x++;
      else if (x > targetX) x--;

      if (y < targetY) y++;
      else if (y > targetY) y--;

      // Carve path
      maze[y][x] = 0;
    }
  }

  // Animation variables for celebration effect
  let celebrateAnimationId = null;
  let celebrateParticles = [];
  const PARTICLE_COUNT = 50;

  // Create particle for celebration animation
  function createParticle(x, y) {
    return {
      x: x,
      y: y,
      size: Math.random() * 5 + 2,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      speedX: (Math.random() - 0.5) * 8,
      speedY: (Math.random() - 0.5) * 8 - 2, // Bias upward to make particles go up toward the link
      life: 1.0, // Life from 1.0 to 0.0
      decay: 0.01 + Math.random() * 0.05
    };
  }

  // Initialize celebration particles
  function initCelebrationEffect() {
    const centerX = exitPosition.x * cellSize + cellSize / 2;
    const centerY = exitPosition.y * cellSize + cellSize / 2;

    celebrateParticles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      celebrateParticles.push(createParticle(centerX, centerY));
    }

    // Hide the instructions to make room for the link container
    instructions.style.opacity = '0';
    setTimeout(() => {
      instructions.style.display = 'none';
    }, 300);
  }

  // Update and draw celebration animation
  function updateCelebrationAnimation() {
    if (!celebrateAnimationId || celebrateParticles.length === 0) return;

    // Clear canvas and redraw maze first
    drawMaze();

    // Update and draw particles
    for (let i = celebrateParticles.length - 1; i >= 0; i--) {
      const p = celebrateParticles[i];

      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Apply lighter gravity so particles float up more
      p.speedY += 0.05;

      // Update life
      p.life -= p.decay;

      // Remove dead particles
      if (p.life <= 0) {
        celebrateParticles.splice(i, 1);
        continue;
      }

      // Draw particle
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;

    // Stop animation when all particles are gone or after a reasonable time
    if (celebrateParticles.length === 0) {
      cancelAnimationFrame(celebrateAnimationId);
      celebrateAnimationId = null;

      // Show the link after celebration
      animateLinkReveal();
    } else {
      celebrateAnimationId = requestAnimationFrame(updateCelebrationAnimation);
    }
  }

  // Start celebration animation
  function startCelebrationEffect() {
    if (celebrateAnimationId) {
      cancelAnimationFrame(celebrateAnimationId);
    }

    initCelebrationEffect();
    celebrateAnimationId = requestAnimationFrame(updateCelebrationAnimation);

    // Play a success sound
    playSuccessSound();
  }

  // Play a success sound
  function playSuccessSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create success sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set up a cheerful sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

      // Play rising notes
      oscillator.start();
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime + 0.1); // D5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(698.46, audioContext.currentTime + 0.3); // F5
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      // Ignore if audio isn't supported
      console.log("Audio not supported in this browser");
    }
  }

  // Animate link reveal with a typewriter effect
  function animateLinkReveal() {
    // Create a smooth transition to reveal the link container
    linkContainer.style.display = 'block';
    setTimeout(() => {
      linkContainer.classList.remove('hidden');
    }, 10);

    // Set up for animation
    const finalLink = originalLink;
    hiddenLink.href = finalLink;
  }

  // Draw maze and player on canvas
  function drawMaze() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw maze walls
    for (let y = 0; y < mazeHeight; y++) {
      for (let x = 0; x < mazeWidth; x++) {
        if (maze[y][x] === 1) {
          ctx.fillStyle = '#333';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw exit
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(exitPosition.x * cellSize, exitPosition.y * cellSize, cellSize, cellSize);

    // Draw player
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(
      playerPosition.x * cellSize + cellSize / 2,
      playerPosition.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Move player
  function movePlayer(dx, dy) {
    // Don't allow movement if the game is completed
    if (gameCompleted) return false;

    const newX = playerPosition.x + dx;
    const newY = playerPosition.y + dy;

    // Check if the move is valid (not going through walls)
    if (newX >= 0 && newX < mazeWidth && newY >= 0 && newY < mazeHeight && maze[newY][newX] === 0) {
      playerPosition.x = newX;
      playerPosition.y = newY;
      drawMaze();

      // Check if player reached the exit
      if (playerPosition.x === exitPosition.x && playerPosition.y === exitPosition.y) {
        // Lock movement
        gameCompleted = true;

        // Stop continuous movement
        stopContinuousMovement();

        // Start celebration effects
        startCelebrationEffect();

        return true;
      }

      // Update last move time
      lastMoveTime = Date.now();
      return true;
    }
    return false;
  }

  // Handle continuous movement based on which keys are pressed
  function updatePlayerMovement() {
    const now = Date.now();
    // Only move if enough time has passed since the last move
    if (now - lastMoveTime >= moveInterval) {
      let moved = false;

      if (movementKeys.up) {
        moved = movePlayer(0, -1) || moved;
      }
      if (movementKeys.down) {
        moved = movePlayer(0, 1) || moved;
      }
      if (movementKeys.left) {
        moved = movePlayer(-1, 0) || moved;
      }
      if (movementKeys.right) {
        moved = movePlayer(1, 0) || moved;
      }
    }
  }

  // Start continuous movement
  function startContinuousMovement() {
    if (!moveIntervalId && !gameCompleted) {
      moveIntervalId = setInterval(updatePlayerMovement, 10); // Check frequently for smooth movement
    }
  }

  // Stop continuous movement
  function stopContinuousMovement() {
    if (moveIntervalId) {
      clearInterval(moveIntervalId);
      moveIntervalId = null;
    }
    // Reset all movement keys
    movementKeys.up = false;
    movementKeys.down = false;
    movementKeys.left = false;
    movementKeys.right = false;
  }

  // Helper function to prevent default for all types of events
  function preventAllDefault(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  // Initialize game
  function initGame() {
    const linkData = getBase64LinkFromURL();
    if (!linkData) return;

    originalLink = linkData.decoded;

    // Set the background color based on the encoded link
    setBackgroundColor(linkData.encoded);

    generateMaze(linkData.encoded);
    drawMaze();

    // Add CSS for the link reveal animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .link-revealed {
        animation: bounce 0.5s ease-in-out;
        color: #27ae60;
        font-weight: bold;
      }
      #instructions {
        transition: opacity 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);

    // Prevent scrolling on the controls container entirely
    controlsContainer.addEventListener('touchstart', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('touchmove', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('touchend', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('mousedown', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('mousemove', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('mouseup', preventAllDefault, { passive: false });
    controlsContainer.addEventListener('wheel', preventAllDefault, { passive: false });

    // Direction buttons - prevent default on all event types
    const preventAndSetDirection = (button, direction) => {
      const setDirection = (e) => {
        preventAllDefault(e);
        if (!gameCompleted) { // Only set direction if game not completed
          movementKeys[direction] = true;
          startContinuousMovement();
        }
      };

      button.addEventListener('mousedown', setDirection, { passive: false });
      button.addEventListener('touchstart', setDirection, { passive: false });
      button.addEventListener('click', preventAllDefault, { passive: false });

      // Also add these to directly handle scroll triggering
      button.addEventListener('touchmove', preventAllDefault, { passive: false });
      button.addEventListener('wheel', preventAllDefault, { passive: false });
    };

    // Set up direction controls with full event prevention
    preventAndSetDirection(upButton, 'up');
    preventAndSetDirection(leftButton, 'left');
    preventAndSetDirection(rightButton, 'right');
    preventAndSetDirection(downButton, 'down');

    // Stop movement when button is released - handle at document level
    document.addEventListener('mouseup', (e) => {
      if (moveIntervalId) {
        stopContinuousMovement();
      }
    });

    document.addEventListener('touchend', (e) => {
      if (moveIntervalId) {
        stopContinuousMovement();
      }
    });

    // Also handle the case when cursor leaves the button while still pressed
    document.addEventListener('mouseleave', stopContinuousMovement);
    document.addEventListener('touchcancel', stopContinuousMovement);

    // Keyboard controls - prevent default for arrow keys to stop page scrolling
    document.addEventListener('keydown', (e) => {
      if (e.repeat || gameCompleted) return; // Ignore if game completed or key held

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          movementKeys.up = true;
          startContinuousMovement();
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          movementKeys.down = true;
          startContinuousMovement();
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          movementKeys.left = true;
          startContinuousMovement();
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          movementKeys.right = true;
          startContinuousMovement();
          break;
        case ' ': // Space bar
          e.preventDefault(); // Prevent space from scrolling page
          break;
      }
    });

    // Stop movement when key is released
    document.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          movementKeys.up = false;
          if (!movementKeys.down && !movementKeys.left && !movementKeys.right) {
            stopContinuousMovement();
          }
          break;
        case 'ArrowDown':
        case 's':
          movementKeys.down = false;
          if (!movementKeys.up && !movementKeys.left && !movementKeys.right) {
            stopContinuousMovement();
          }
          break;
        case 'ArrowLeft':
        case 'a':
          movementKeys.left = false;
          if (!movementKeys.up && !movementKeys.down && !movementKeys.right) {
            stopContinuousMovement();
          }
          break;
        case 'ArrowRight':
        case 'd':
          movementKeys.right = false;
          if (!movementKeys.up && !movementKeys.down && !movementKeys.left) {
            stopContinuousMovement();
          }
          break;
      }
    });

    // Add swipe gesture support for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    gameContainer.addEventListener('touchstart', (e) => {
      if (gameCompleted) return; // Ignore if game completed
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    gameContainer.addEventListener('touchend', (e) => {
      if (gameCompleted) return; // Ignore if game completed
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const xDiff = touchStartX - touchEndX;
      const yDiff = touchStartY - touchEndY;

      // Check which direction had a larger movement to determine the primary swipe direction
      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 10) { // Left swipe
          movePlayer(-1, 0);
        } else if (xDiff < -10) { // Right swipe
          movePlayer(1, 0);
        }
      } else {
        if (yDiff > 10) { // Up swipe
          movePlayer(0, -1);
        } else if (yDiff < -10) { // Down swipe
          movePlayer(0, 1);
        }
      }
    }

    // Prevent scrolling when using the arrow keys or space bar globally
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    }, { passive: false });
  }

  // Start the game
  initGame();
}); 