export interface PlayerState {
  x: number;
  y: number;
  z: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  yaw: number;
  pitch: number;
  onGround: boolean;
}

export interface BallState {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface PoolroomGameState {
  scene: string;
  player: PlayerState;
  ballCount: number;
  balls: BallState[];
  pointerLocked: boolean;
  lastAdvanceMs: number;
}

const gameState: PoolroomGameState = {
  scene: "poolroom-fps",
  player: {
    x: -11.6,
    y: 2,
    z: 14,
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
  },
  ballCount: 0,
  balls: [],
  pointerLocked: false,
  lastAdvanceMs: 0,
};

function rounded(value: number) {
  return Number(value.toFixed(3));
}

export function getGameState() {
  return gameState;
}

export function updateGameState(update: Partial<PoolroomGameState>) {
  Object.assign(gameState, update);
  if (typeof window !== "undefined") {
    window.__poolroomGameState = gameState;
  }
}

export function updatePlayerState(player: PlayerState) {
  gameState.player = {
    ...player,
    x: rounded(player.x),
    y: rounded(player.y),
    z: rounded(player.z),
    velocity: {
      x: rounded(player.velocity.x),
      y: rounded(player.velocity.y),
      z: rounded(player.velocity.z),
    },
    yaw: rounded(player.yaw),
    pitch: rounded(player.pitch),
  };
}

export function updateBallState(balls: BallState[]) {
  gameState.balls = balls.map((ball) => ({
    id: ball.id,
    x: rounded(ball.x),
    y: rounded(ball.y),
    z: rounded(ball.z),
  }));
  gameState.ballCount = balls.length;
}

export function installGameStateHooks() {
  if (typeof window === "undefined") return;

  const previousAdvanceTime = window.advanceTime;

  window.__poolroomGameState = gameState;
  window.render_game_to_text = () => {
    gameState.pointerLocked = document.pointerLockElement !== null;

    return JSON.stringify({
      coordinateSystem: "x right, y up, z forward/back in Three.js world units",
      scene: gameState.scene,
      player: gameState.player,
      ballCount: gameState.ballCount,
      balls: gameState.balls.slice(-10),
      pointerLocked: gameState.pointerLocked,
    });
  };
  window.advanceTime = (ms: number) => {
    gameState.lastAdvanceMs = ms;
    if (previousAdvanceTime) {
      return previousAdvanceTime(ms);
    }

    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  };
}

declare global {
  interface Window {
    __poolroomGameState?: PoolroomGameState;
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void | Promise<void>;
  }
}
