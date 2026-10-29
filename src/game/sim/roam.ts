// Pure simulation of the four roaming traders. No React, no three.js.
// The scene components read `agents` and draw it; the one stepper calls `stepRoam`.

export interface Vec {
  x: number;
  z: number;
}

export type AgentState = "walk" | "idle" | "drink_coffee" | "work_at_desk";

export interface Agent {
  id: string;
  name: string;
  roleTitle: string;
  x: number;
  z: number;
  angle: number; // heading in radians
  speed: number;
  state: AgentState;
  target: Vec;
  idleFor: number;
  walkPhase: number;
  workPhase: number;
  coffeePhase: number;
  actionStatus: string;
  deskPos: Vec;
  deskAngle: number;
}

export interface TaskState {
  isActive: boolean;
  symbol: string;
  horizon: string;
  progress: number;
  isComplete: boolean;
}

// Free walking zone of the office (clear of desks, sofa and plants).
const WAYPOINTS: Vec[] = [
  { x: -3.4, z: -3.6 },
  { x: 0, z: -4.2 },
  { x: 3.4, z: -3.4 },
  { x: 4.2, z: -0.8 },
  { x: 3.8, z: 2.2 },
  { x: 1.6, z: 3.2 },
  { x: -1.6, z: 3.2 },
  { x: -3.8, z: 2.2 },
  { x: -4.2, z: -0.8 },
  { x: 0, z: -1.4 },
];

// Coffee bar / lounge coordinates
const COFFEE_WAYPOINTS: Vec[] = [
  { x: -0.8, z: 3.3 },
  { x: 0.8, z: 3.3 },
  { x: 0.0, z: 2.6 },
];

const IDLE_MIN = 1.5;
const IDLE_MAX = 4.5;
const COFFEE_MIN = 3.5;
const COFFEE_MAX = 7.0;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mkAgent(
  id: string,
  name: string,
  roleTitle: string,
  start: Vec,
  speed: number,
  deskPos: Vec,
  deskAngle: number,
): Agent {
  return {
    id,
    name,
    roleTitle,
    x: start.x,
    z: start.z,
    angle: Math.random() * Math.PI * 2,
    speed,
    state: "idle",
    target: start,
    idleFor: rand(0.5, 2.0),
    walkPhase: Math.random() * Math.PI * 2,
    workPhase: 0,
    coffeePhase: 0,
    actionStatus: "Idle · Awaiting stock selection",
    deskPos,
    deskAngle,
  };
}

// Four agents with designated desk terminals facing monitors
export const agents: Agent[] = [
  mkAgent(
    "bull",
    "Bull",
    "Growth & Opportunity",
    { x: -3.0, z: 1.0 },
    0.95,
    { x: -5.75, z: -3.4 },
    -Math.PI * 0.5,
  ),
  mkAgent(
    "bear",
    "Bear",
    "Risk & Downside",
    { x: 2.6, z: 0.4 },
    0.8,
    { x: -5.75, z: -0.2 },
    -Math.PI * 0.5,
  ),
  mkAgent(
    "stag",
    "Stag",
    "Long-Term Strategy",
    { x: 0.6, z: -3.0 },
    1.05,
    { x: 5.75, z: -3.4 },
    Math.PI * 0.5,
  ),
  mkAgent(
    "rabbit",
    "Rabbit",
    "Momentum & Timing",
    { x: -1.4, z: 2.6 },
    1.25,
    { x: 5.75, z: -0.2 },
    Math.PI * 0.5,
  ),
];

export let currentTask: TaskState = {
  isActive: false,
  symbol: "",
  horizon: "1D",
  progress: 0,
  isComplete: false,
};

// Listeners for UI state reactivity
type TaskListener = (task: TaskState, agentList: Agent[]) => void;
const taskListeners: Set<TaskListener> = new Set();

export function subscribeTask(listener: TaskListener): () => void {
  taskListeners.add(listener);
  listener(currentTask, agents);
  return () => taskListeners.delete(listener);
}

function notifyListeners(): void {
  taskListeners.forEach((fn) => fn({ ...currentTask }, agents));
}

/**
 * Assign a prediction / analysis task to all 4 AI agents.
 * The characters will immediately walk to their designated desks, sit down, and calculate predictions.
 */
export function assignTaskToAgents(symbol: string, horizon: string): void {
  currentTask = {
    isActive: true,
    symbol: symbol.toUpperCase(),
    horizon,
    progress: 5,
    isComplete: false,
  };

  const initialLabels: Record<string, string> = {
    bull: `Scanning ${symbol} upside momentum`,
    bear: `Evaluating ${symbol} downside risk`,
    stag: `Calculating ${symbol} valuation models`,
    rabbit: `Tracking ${symbol} entry timing`,
  };

  for (const agent of agents) {
    agent.target = { ...agent.deskPos };
    agent.state = "walk";
    agent.actionStatus = initialLabels[agent.id] || "Assigned task";
  }

  notifyListeners();
}

/**
 * Marks the analysis as ready.
 */
export function finishTaskForAgents(): void {
  currentTask.isComplete = true;
  currentTask.progress = 100;

  const readyLabels: Record<string, string> = {
    bull: "Upside scenario ready",
    bear: "Capital protection ready",
    stag: "Consensus valuation ready",
    rabbit: "Execution triggers ready",
  };

  for (const agent of agents) {
    agent.actionStatus = readyLabels[agent.id] || "Analysis ready";
  }

  notifyListeners();
}

/**
 * Releases agents back to autonomous roaming & coffee breaks.
 */
export function releaseAgentsToRoam(): void {
  currentTask.isActive = false;
  currentTask.isComplete = false;
  currentTask.progress = 0;

  for (const agent of agents) {
    agent.target = pickNextTarget(agent);
    agent.state = "walk";
    agent.actionStatus = "Roaming trading floor";
  }

  notifyListeners();
}

function pickNextTarget(agent: Agent): Vec {
  // 25% chance to visit the coffee station for a drink
  if (Math.random() < 0.25) {
    const wp = COFFEE_WAYPOINTS[Math.floor(Math.random() * COFFEE_WAYPOINTS.length)];
    return { x: wp.x + rand(-0.2, 0.2), z: wp.z + rand(-0.2, 0.2) };
  }

  // Otherwise roam among the floor waypoints
  let best: Vec = WAYPOINTS[0] ?? { x: 0, z: 0 };
  let bestScore = -Infinity;
  for (const wp of WAYPOINTS) {
    const dist = Math.hypot(wp.x - agent.x, wp.z - agent.z);
    if (dist < 0.8) continue;
    const score = dist * (0.6 + Math.random() * 0.8);
    if (score > bestScore) {
      bestScore = score;
      best = wp;
    }
  }
  return { x: best.x + rand(-0.4, 0.4), z: best.z + rand(-0.4, 0.4) };
}

function angleTo(agent: Agent, target: Vec): number {
  return Math.atan2(target.x - agent.x, target.z - agent.z);
}

function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const TURN_RATE = 3.6; // rad/s
const ARRIVE_DIST = 0.28;

export function stepRoam(dt: number): void {
  let hasProgressUpdate = false;

  // Advance task progress if active
  if (currentTask.isActive && !currentTask.isComplete) {
    currentTask.progress = Math.min(98, currentTask.progress + dt * 25);
    hasProgressUpdate = true;
  }

  for (const agent of agents) {
    // 1. Sitting and working at desk
    if (agent.state === "work_at_desk") {
      agent.workPhase += dt * 5.0;
      // Smoothly orient towards monitors
      const delta = shortestAngleDelta(agent.angle, agent.deskAngle);
      agent.angle += Math.sign(delta) * Math.min(Math.abs(delta), TURN_RATE * dt);
      continue;
    }

    // 2. Drinking coffee at lounge table
    if (agent.state === "drink_coffee") {
      agent.coffeePhase += dt * 2.5;
      agent.idleFor -= dt;
      if (agent.idleFor <= 0) {
        agent.target = pickNextTarget(agent);
        agent.state = "walk";
        agent.actionStatus = "Roaming trading floor";
      }
      continue;
    }

    // 3. Idle standing
    if (agent.state === "idle") {
      agent.idleFor -= dt;
      if (agent.idleFor <= 0) {
        // If task became active, go to desk
        if (currentTask.isActive) {
          agent.target = { ...agent.deskPos };
          agent.state = "walk";
        } else {
          agent.target = pickNextTarget(agent);
          agent.state = "walk";
          agent.actionStatus = "Walking to check screens";
        }
      }
      continue;
    }

    // 4. Walking to target
    const dist = Math.hypot(agent.target.x - agent.x, agent.target.z - agent.z);

    // Check if arrived at desk during active task
    if (
      currentTask.isActive &&
      Math.hypot(agent.deskPos.x - agent.x, agent.deskPos.z - agent.z) <= 0.45
    ) {
      agent.state = "work_at_desk";
      agent.x = agent.deskPos.x;
      agent.z = agent.deskPos.z;
      agent.angle = agent.deskAngle;
      agent.actionStatus = `Working on ${currentTask.symbol} (${currentTask.horizon})`;
      continue;
    }

    // Arrived at standard target
    if (dist <= ARRIVE_DIST) {
      // Check if this was a coffee waypoint
      const isNearCoffee = Math.hypot(0 - agent.x, 3.2 - agent.z) < 1.4;
      if (!currentTask.isActive && isNearCoffee && Math.random() < 0.65) {
        agent.state = "drink_coffee";
        agent.idleFor = rand(COFFEE_MIN, COFFEE_MAX);
        agent.coffeePhase = 0;
        agent.actionStatus = "Drinking espresso at lounge";
      } else {
        agent.state = "idle";
        agent.idleFor = rand(IDLE_MIN, IDLE_MAX);
        agent.actionStatus = "Reviewing market tickers";
      }
      continue;
    }

    // Turn smoothly toward heading and advance
    const wanted = angleTo(agent, agent.target);
    const delta = shortestAngleDelta(agent.angle, wanted);
    const turn = Math.sign(delta) * Math.min(Math.abs(delta), TURN_RATE * dt);
    agent.angle += turn;

    const step = Math.min(agent.speed * dt, dist);
    agent.x += Math.sin(agent.angle) * step;
    agent.z += Math.cos(agent.angle) * step;
    agent.walkPhase += dt * agent.speed * 6.5;
  }

  if (hasProgressUpdate) {
    notifyListeners();
  }
}
