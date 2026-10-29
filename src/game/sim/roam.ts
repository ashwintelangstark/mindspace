// Pure simulation of the four roaming traders. No React, no three.js.
// The scene components read `agents` and draw it; the one stepper calls `stepRoam`.

export interface Vec {
  x: number;
  z: number;
}

export type AgentState = "walk" | "idle";

export interface Agent {
  id: string;
  name: string;
  x: number;
  z: number;
  angle: number; // heading in radians
  speed: number;
  state: AgentState;
  target: Vec;
  idleFor: number;
  walkPhase: number;
}

// Free walking zone of the office (clear of desks, sofa and plants).
const WAYPOINTS: Vec[] = [
  { x: -3.4, z: -3.6 },
  { x: 0, z: -4.2 },
  { x: 3.4, z: -3.4 },
  { x: 4.4, z: -0.8 },
  { x: 4.2, z: 2.4 },
  { x: 1.6, z: 3.6 },
  { x: -1.6, z: 3.6 },
  { x: -4.2, z: 2.4 },
  { x: -4.4, z: -0.8 },
  { x: 0, z: -1.4 },
];

const IDLE_MIN = 1.2;
const IDLE_MAX = 4.0;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mkAgent(id: string, name: string, start: Vec, speed: number): Agent {
  return {
    id,
    name,
    x: start.x,
    z: start.z,
    angle: Math.random() * Math.PI * 2,
    speed,
    state: "idle",
    target: start,
    idleFor: rand(0.2, 1.5),
    walkPhase: Math.random() * Math.PI * 2,
  };
}

export const agents: Agent[] = [
  mkAgent("bull", "Bull", { x: -3.0, z: 1.0 }, 0.9),
  mkAgent("bear", "Bear", { x: 2.6, z: 0.4 }, 0.7),
  mkAgent("stag", "Stag", { x: 0.6, z: -3.0 }, 1.0),
  mkAgent("rabbit", "Rabbit", { x: -1.4, z: 2.6 }, 1.2),
];

function pickNextTarget(agent: Agent): Vec {
  // Prefer a waypoint away from the current one so they cover the floor.
  let best: Vec = WAYPOINTS[0];
  let bestScore = -Infinity;
  for (const wp of WAYPOINTS) {
    const dist = Math.hypot(wp.x - agent.x, wp.z - agent.z);
    if (dist < 0.6) continue;
    // mix of distance and randomness keeps routes varied
    const score = dist * (0.6 + Math.random() * 0.8);
    if (score > bestScore) {
      bestScore = score;
      best = wp;
    }
  }
  return { x: best.x + rand(-0.5, 0.5), z: best.z + rand(-0.5, 0.5) };
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

const TURN_RATE = 3.2; // rad/s
const ARRIVE_DIST = 0.25;

export function stepRoam(dt: number): void {
  for (const agent of agents) {
    if (agent.state === "idle") {
      agent.idleFor -= dt;
      if (agent.idleFor <= 0) {
        agent.target = pickNextTarget(agent);
        agent.state = "walk";
      }
      continue;
    }

    const dist = Math.hypot(agent.target.x - agent.x, agent.target.z - agent.z);
    if (dist <= ARRIVE_DIST) {
      agent.state = "idle";
      agent.idleFor = rand(IDLE_MIN, IDLE_MAX);
      continue;
    }

    // Turn smoothly toward the heading, then walk forward.
    const wanted = angleTo(agent, agent.target);
    const delta = shortestAngleDelta(agent.angle, wanted);
    const turn = Math.sign(delta) * Math.min(Math.abs(delta), TURN_RATE * dt);
    agent.angle += turn;

    const step = Math.min(agent.speed * dt, dist);
    agent.x += Math.sin(agent.angle) * step;
    agent.z += Math.cos(agent.angle) * step;
    agent.walkPhase += dt * agent.speed * 6.5;
  }
}
