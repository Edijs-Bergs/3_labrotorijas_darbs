/*
  Snake - HTML5 Canvas implementation
  - Grid-based movement with fixed timestep
  - Keyboard and on-screen controls
  - Score, high score (localStorage)
  - Pause/Resume and Restart
*/

(function () {
  'use strict';

  /** Canvas and context */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  /** UI elements */
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlayTitle');
  const overlaySubtitleEl = document.getElementById('overlaySubtitle');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn2 = document.getElementById('restartBtn2');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  /** Game constants */
  const CELL_SIZE = 20; // logical pixels
  const BOARD_COLS = Math.floor(canvas.width / CELL_SIZE);
  const BOARD_ROWS = Math.floor(canvas.height / CELL_SIZE);
  const TICK_MS_START = 140; // initial speed
  const TICK_MS_MIN = 60; // max speed
  const SPEEDUP_PER_FOOD_MS = 2; // speed up after each food

  /** Color theme */
  const COLORS = {
    background: '#0b0f1e',
    grid: 'rgba(255,255,255,0.04)',
    snakeHead: '#6ee7b7',
    snakeBody: '#34d399',
    snakeBodyAlt: '#10b981',
    food: '#f87171',
  };

  /** Game state */
  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = { x: 10, y: 10 };
  let score = 0;
  let highScore = Number(localStorage.getItem('snake.highscore') || 0);
  let tickMs = TICK_MS_START;
  let lastUpdate = 0;
  let accumulator = 0;
  let isPaused = false;
  let isGameOver = false;

  function resetGame() {
    snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    tickMs = TICK_MS_START;
    isPaused = false;
    isGameOver = false;
    spawnFood();
    updateScore();
    hideOverlay();
  }

  function updateScore() {
    scoreEl.textContent = `Score: ${score}`;
    highScoreEl.textContent = `Best: ${highScore}`;
  }

  function showOverlay(title, subtitle, showResume) {
    overlayTitleEl.textContent = title;
    overlaySubtitleEl.textContent = subtitle;
    resumeBtn.style.display = showResume ? 'inline-block' : 'none';
    overlayEl.classList.remove('hidden');
    overlayEl.setAttribute('aria-hidden', 'false');
  }
  function hideOverlay() {
    overlayEl.classList.add('hidden');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  function pauseGame() {
    if (isGameOver || isPaused) return;
    isPaused = true;
    showOverlay('Paused', 'Press Space or Tap Resume', true);
  }
  function resumeGame() {
    if (isGameOver || !isPaused) return;
    isPaused = false;
    hideOverlay();
  }

  function gameOver() {
    isGameOver = true;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake.highscore', String(highScore));
    }
    updateScore();
    showOverlay('Game Over', 'Press Enter or Restart', false);
  }

  function spawnFood() {
    let x, y;
    do {
      x = Math.floor(Math.random() * BOARD_COLS);
      y = Math.floor(Math.random() * BOARD_ROWS);
    } while (snake.some((s) => s.x === x && s.y === y));
    food = { x, y };
  }

  function setDirection(dx, dy) {
    const isOpposite = nextDirection.x + dx === 0 && nextDirection.y + dy === 0;
    if (isOpposite) return; // disallow 180 turn within same tick
    nextDirection = { x: dx, y: dy };
  }

  function update(dtMs) {
    if (isPaused || isGameOver) return;
    accumulator += dtMs;
    while (accumulator >= tickMs) {
      step();
      accumulator -= tickMs;
    }
  }

  function step() {
    // apply next direction at start of tick (prevents multi-turns per tick)
    direction = nextDirection;

    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // wrap around edges for a friendly mode; change to crash if desired
    if (newHead.x < 0 || newHead.x >= BOARD_COLS || newHead.y < 0 || newHead.y >= BOARD_ROWS) {
      // Set to wrap or collide. We'll collide for classic.
      gameOver();
      return;
    }

    // self collision
    if (snake.some((s, idx) => idx !== 0 && s.x === newHead.x && s.y === newHead.y)) {
      gameOver();
      return;
    }

    // move
    snake.unshift(newHead);

    // eat
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      tickMs = Math.max(TICK_MS_MIN, tickMs - SPEEDUP_PER_FOOD_MS);
      spawnFood();
      updateScore();
    } else {
      snake.pop();
    }
  }

  function draw() {
    // clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    // food
    drawCell(food.x, food.y, COLORS.food);

    // snake
    for (let i = 0; i < snake.length; i++) {
      const part = snake[i];
      const isHead = i === 0;
      const color = isHead ? COLORS.snakeHead : i % 2 === 0 ? COLORS.snakeBody : COLORS.snakeBodyAlt;
      drawCell(part.x, part.y, color);
      if (isHead) drawEyes(part.x, part.y);
    }
  }

  function drawCell(gridX, gridY, fill) {
    const px = gridX * CELL_SIZE;
    const py = gridY * CELL_SIZE;
    const padding = 2;
    ctx.fillStyle = fill;
    ctx.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
  }

  function drawEyes(gridX, gridY) {
    const px = gridX * CELL_SIZE;
    const py = gridY * CELL_SIZE;
    const r = 2.5;
    const offset = 5;
    ctx.fillStyle = '#0b0f1e';
    ctx.beginPath();
    ctx.arc(px + offset, py + offset, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE - offset, py + offset, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Input handlers
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      if (isGameOver) return; // ignore after over
      isPaused ? resumeGame() : pauseGame();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      if (isGameOver) {
        resetGame();
      }
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        setDirection(0, -1); break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setDirection(0, 1); break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setDirection(-1, 0); break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setDirection(1, 0); break;
    }
  }, { passive: false });

  function bindButton(btn, dx, dy) {
    if (!btn) return;
    const handle = (ev) => {
      setDirection(dx, dy);
      ev.preventDefault();
      ev.stopPropagation();
    };
    btn.addEventListener('click', handle);
    btn.addEventListener('touchstart', handle, { passive: false });
  }
  bindButton(btnUp, 0, -1);
  bindButton(btnDown, 0, 1);
  bindButton(btnLeft, -1, 0);
  bindButton(btnRight, 1, 0);

  pauseBtn?.addEventListener('click', () => {
    if (isGameOver) return;
    isPaused ? resumeGame() : pauseGame();
  });
  restartBtn?.addEventListener('click', () => resetGame());
  restartBtn2?.addEventListener('click', () => resetGame());
  resumeBtn?.addEventListener('click', () => resumeGame());

  // Main loop using rAF with fixed-step accumulator
  function frame(ts) {
    if (!lastUpdate) lastUpdate = ts;
    const dt = ts - lastUpdate;
    lastUpdate = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Initialize
  updateScore();
  resetGame();
  requestAnimationFrame(frame);
})();

