/*
  HTML5 Snake Game
  - Keyboard: Arrow keys / WASD, Space to pause, Enter to restart
  - Touch: On-screen D-Pad buttons
*/

(function () {
  const canvas = document.getElementById("game");
  const context = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlayText");
  const dirButtons = Array.from(document.querySelectorAll(".dir-btn"));

  const gridTileCount = 24; // number of tiles per side
  let pixelsPerTile = Math.floor(canvas.width / gridTileCount);

  const colors = {
    background: "#0a0d1f",
    grid: "#121633",
    snakeHead: "#6ee7b7",
    snakeBody: "#34d399",
    food: "#7c3aed",
    danger: "#ef4444",
  };

  const Direction = {
    Up: { x: 0, y: -1 },
    Down: { x: 0, y: 1 },
    Left: { x: -1, y: 0 },
    Right: { x: 1, y: 0 },
  };

  let isPaused = false;
  let isGameOver = false;
  let score = 0;
  let snakeBody = [];
  let currentDirection = Direction.Right;
  let pendingDirection = Direction.Right;
  let foodPosition = { x: 10, y: 10 };

  // Timing using rAF with a fixed-timestep accumulator
  let lastTimestampMs = 0;
  let accumulatorMs = 0;
  let ticksPerSecond = 10; // base game speed
  let msPerTick = 1000 / ticksPerSecond;

  function resizeCanvas() {
    // Keep the canvas square and responsive
    const container = canvas.parentElement;
    const maxPixels = Math.min(container.clientWidth, 560);
    const size = Math.max(320, Math.floor(maxPixels));
    // Support HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    pixelsPerTile = Math.floor((canvas.width / dpr) / gridTileCount);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function showOverlay(text) {
    overlayText.textContent = text;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function resetGame() {
    score = 0;
    updateScore(0);
    isPaused = false;
    isGameOver = false;
    currentDirection = Direction.Right;
    pendingDirection = Direction.Right;
    const startX = Math.floor(gridTileCount / 3);
    const startY = Math.floor(gridTileCount / 2);
    snakeBody = [
      { x: startX + 2, y: startY },
      { x: startX + 1, y: startY },
      { x: startX, y: startY },
    ];
    placeFood();
    ticksPerSecond = 10;
    msPerTick = 1000 / ticksPerSecond;
    hideOverlay();
  }

  function updateScore(delta) {
    score += delta;
    scoreEl.textContent = String(score);
  }

  function placeFood() {
    while (true) {
      const x = Math.floor(Math.random() * gridTileCount);
      const y = Math.floor(Math.random() * gridTileCount);
      const onSnake = snakeBody.some((segment) => segment.x === x && segment.y === y);
      if (!onSnake) {
        foodPosition = { x, y };
        return;
      }
    }
  }

  function setDirectionFromInput(dir) {
    // Prevent instant reversal
    if (dir.x === -currentDirection.x && dir.y === -currentDirection.y) return;
    pendingDirection = dir;
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") setDirectionFromInput(Direction.Up);
    else if (key === "arrowdown" || key === "s") setDirectionFromInput(Direction.Down);
    else if (key === "arrowleft" || key === "a") setDirectionFromInput(Direction.Left);
    else if (key === "arrowright" || key === "d") setDirectionFromInput(Direction.Right);
    else if (key === " ") togglePause();
    else if (key === "enter") restart();
  }

  function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
      showOverlay("Paused");
    } else {
      hideOverlay();
    }
  }

  function restart() {
    resetGame();
  }

  function update(deltaMs) {
    if (isPaused || isGameOver) return;
    accumulatorMs += deltaMs;
    while (accumulatorMs >= msPerTick) {
      tick();
      accumulatorMs -= msPerTick;
    }
  }

  function tick() {
    // Apply buffered direction at most once per tick
    currentDirection = pendingDirection;

    const newHead = {
      x: snakeBody[0].x + currentDirection.x,
      y: snakeBody[0].y + currentDirection.y,
    };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.y < 0 ||
      newHead.x >= gridTileCount ||
      newHead.y >= gridTileCount
    ) {
      gameOver();
      return;
    }

    // Self collision
    const hitsSelf = snakeBody.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
    if (hitsSelf) {
      gameOver();
      return;
    }

    // Move snake
    snakeBody.unshift(newHead);

    // Eat food or remove tail
    if (newHead.x === foodPosition.x && newHead.y === foodPosition.y) {
      updateScore(1);
      placeFood();
      // Slightly speed up over time, capped
      ticksPerSecond = Math.min(18, 10 + Math.floor(score / 5));
      msPerTick = 1000 / ticksPerSecond;
    } else {
      snakeBody.pop();
    }

    draw();
  }

  function gameOver() {
    isGameOver = true;
    showOverlay("Game Over — press Enter to restart");
    draw(true);
  }

  function draw(isDead = false) {
    // Clear background
    context.fillStyle = colors.background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Optional grid
    context.strokeStyle = colors.grid;
    context.lineWidth = 1;
    for (let i = 1; i < gridTileCount; i++) {
      const p = i * pixelsPerTile;
      context.beginPath();
      context.moveTo(p, 0);
      context.lineTo(p, gridTileCount * pixelsPerTile);
      context.stroke();
      context.beginPath();
      context.moveTo(0, p);
      context.lineTo(gridTileCount * pixelsPerTile, p);
      context.stroke();
    }

    // Draw food
    context.fillStyle = colors.food;
    drawRoundedRect(
      foodPosition.x * pixelsPerTile,
      foodPosition.y * pixelsPerTile,
      pixelsPerTile,
      pixelsPerTile,
      Math.max(3, Math.floor(pixelsPerTile * 0.18))
    );

    // Draw snake
    for (let i = 0; i < snakeBody.length; i++) {
      const segment = snakeBody[i];
      const isHead = i === 0;
      context.fillStyle = isDead && isHead ? colors.danger : isHead ? colors.snakeHead : colors.snakeBody;
      drawRoundedRect(
        segment.x * pixelsPerTile,
        segment.y * pixelsPerTile,
        pixelsPerTile,
        pixelsPerTile,
        Math.max(3, Math.floor(pixelsPerTile * 0.22))
      );
    }
  }

  function drawRoundedRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
    context.fill();
  }

  function frame(timestampMs) {
    if (!lastTimestampMs) lastTimestampMs = timestampMs;
    const deltaMs = timestampMs - lastTimestampMs;
    lastTimestampMs = timestampMs;
    update(deltaMs);
    if (!isGameOver) requestAnimationFrame(frame);
  }

  // Event listeners
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  dirButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      if (dir === "up") setDirectionFromInput(Direction.Up);
      else if (dir === "down") setDirectionFromInput(Direction.Down);
      else if (dir === "left") setDirectionFromInput(Direction.Left);
      else if (dir === "right") setDirectionFromInput(Direction.Right);
    });
  });

  // Init
  resizeCanvas();
  resetGame();
  draw();
  requestAnimationFrame(frame);
})();

