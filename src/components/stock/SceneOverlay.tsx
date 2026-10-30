import React, { useEffect, useState } from "react";
import { agents, subscribeTask, TaskState, Agent, stopAnalyzingAndRelax } from "@/game/sim/roam";
import { subscribeMarketEngine, getMarketSnapshot } from "@/lib/market-engine";
import { getSystemSkyAndWeather, SystemEnvironmentProfile } from "@/game/scene/textures";
import { AgentLiveAlert } from "@/types/stock";
import { MindspaceUser } from "@/lib/auth";

interface SceneOverlayProps {
  onOpenDrawer?: () => void;
  isDrawerOpen?: boolean;
  onOpenLanding?: () => void;
  currentUser?: MindspaceUser | null;
  onLogout?: () => void;
}

export function SceneOverlay({
  onOpenDrawer,
  isDrawerOpen,
  onOpenLanding,
  currentUser,
  onLogout,
}: SceneOverlayProps) {
  const [taskState, setTaskState] = useState<TaskState>({
    isActive: false,
    symbol: "",
    horizon: "1D",
    progress: 0,
    isComplete: false,
  });
  const [agentList, setAgentList] = useState<Agent[]>(agents);
  const [marketSnap, setMarketSnap] = useState(() => getMarketSnapshot());
  const [envProfile, setEnvProfile] = useState<SystemEnvironmentProfile>(() =>
    getSystemSkyAndWeather(),
  );

  useEffect(() => {
    const unsubTask = subscribeTask((t, a) => {
      setTaskState({ ...t });
      setAgentList([...a]);
    });
    const unsubMarket = subscribeMarketEngine((snap) => {
      setMarketSnap(snap);
    });
    const clockTimer = setInterval(() => {
      setEnvProfile(getSystemSkyAndWeather());
    }, 30000);

    return () => {
      unsubTask();
      unsubMarket();
      clearInterval(clockTimer);
    };
  }, []);

  const getAgentEmoji = (id: string) => {
    switch (id) {
      case "bull":
        return "🐂";
      case "bear":
        return "🐻";
      case "stag":
        return "🦌";
      case "rabbit":
        return "🐇";
      default:
        return "🤖";
    }
  };

  const getAgentTopicBadge = (id: string) => {
    switch (id) {
      case "bull":
        return "Breakout & Growth";
      case "bear":
        return "ATR Risk & Stop-Loss";
      case "stag":
        return "VWAP Valuation";
      case "rabbit":
        return "Bid/Ask Execution";
      default:
        return "Market Analysis";
    }
  };

  const latestAlertByAgent = React.useMemo(() => {
    const map: Record<string, AgentLiveAlert> = {};
    for (const al of marketSnap.liveAlerts) {
      if (!map[al.agentId]) {
        map[al.agentId] = al;
      }
    }
    return map;
  }, [marketSnap.liveAlerts]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-5 z-10">
      {/* Top Row: Left MINDSPACE OFFICE brand pill & Right Drawer toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto rounded-xl border border-[#1c6346] bg-[#020806e0] p-3.5 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.65)] max-w-sm">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Mindspace Logo"
              className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(0,229,154,0.45)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-widest text-[#f0f7f3]">
                  MINDSPACE OFFICE
                </h1>
                <span className="flex h-2 w-2 rounded-full bg-[#00e59a] shadow-[0_0_8px_#00e59a] animate-pulse" />
              </div>
              <p className="text-[10px] tracking-wider text-[#92a79c] uppercase font-medium">
                FOUR AGENTS · LIVE 3D EXCHANGE FLOOR
              </p>
            </div>
          </div>

          {/* Window Sky & Local Time Badge */}
          <div className="mt-2.5 pt-2 border-t border-[#155238] flex items-center justify-between gap-3 text-[10px] text-gray-300 font-mono">
            <span className="truncate">
              🌤 {envProfile.locationLabel} · {envProfile.timeFormatted}
            </span>
            <span className="text-[#00e59a] font-semibold whitespace-nowrap">
              {envProfile.weatherSummary}
            </span>
          </div>

          {/* Live fluctuating index preview */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-[#155238] text-[11px] font-mono">
            {marketSnap.indices.slice(0, 4).map((idx) => (
              <div key={idx.name} className="flex items-center justify-between gap-1">
                <span className="text-gray-400 font-sans text-[10px]">{idx.name}</span>
                <span className={idx.isUp ? "text-[#00e59a]" : "text-[#ff3549]"}>
                  {idx.isUp ? "▲" : "▼"} {idx.change}
                </span>
              </div>
            ))}
          </div>

          {/* Quick link to Landing Page & Active User Account Controls */}
          <div className="mt-2.5 pt-2 border-t border-[#155238] space-y-1.5">
            {currentUser && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[#05120c] border border-[#174631] px-2.5 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[#00e59a]">👤</span>
                  <span className="font-mono font-bold text-white truncate">
                    @{currentUser.username}
                  </span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded border border-[#ff354966] bg-[#ff354918] px-2 py-0.5 text-[10px] font-bold text-[#ff7b88] hover:bg-[#ff3549] hover:text-white transition-colors shrink-0"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}

            {onOpenLanding && (
              <button
                onClick={onOpenLanding}
                className="w-full py-1.5 px-2.5 rounded-lg bg-[#071710] hover:bg-[#0c2419] border border-[#1d4c36] hover:border-[#00e59a] text-[11px] text-[#00e59a] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
              >
                <span>🌐</span>
                <span className="group-hover:text-white transition">
                  Landing Page & 3D Dossiers
                </span>
                <span className="text-[10px] text-gray-400">↗</span>
              </button>
            )}
          </div>

          {taskState.isActive && (
            <div className="mt-2.5 pt-2 border-t border-[#155238]">
              <div className="flex items-center justify-between text-[11px] text-[#00e59a]">
                <span>
                  ML Ensemble: {taskState.symbol} ({taskState.horizon})
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{Math.round(taskState.progress)}%</span>
                  <button
                    onClick={() => stopAnalyzingAndRelax()}
                    title="Stop analysis and release agents from desks"
                    className="text-[10px] text-gray-200 hover:text-white px-2 py-0.5 rounded border border-[#1b4a36] bg-[#05110c] hover:border-[#00e59a] transition-all"
                  >
                    ☕ Relax
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full bg-[#0a1f16] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#00e59a] transition-all duration-300"
                  style={{ width: `${taskState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top Right: Drawer toggle button when drawer is closed */}
        {!isDrawerOpen && onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#00e59a] bg-[#07100de0] backdrop-blur-md px-4 py-2.5 text-xs font-black text-[#00e59a] shadow-[0_0_25px_rgba(0,229,154,0.35)] hover:bg-[#00e59a] hover:text-[#00180e] transition-all"
          >
            <span>📊 Open Stock Intelligence Drawer</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Bottom Horizontal Line of 4 AI Agent Status Cards in 3D Space */}
      <div className="w-full max-w-5xl mx-auto pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
          {agentList.map((agent) => {
            const isWorking = agent.state === "work_at_desk";
            const isDrinking = agent.state === "drink_coffee";
            const alert = latestAlertByAgent[agent.id];

            return (
              <div
                key={agent.id}
                className={`pointer-events-auto flex flex-col justify-between rounded-xl border transition-all duration-300 backdrop-blur-md px-3 py-2.5 text-xs shadow-[0_12px_28px_rgba(0,0,0,0.75)] ${
                  isWorking
                    ? "border-[#00e59a] bg-[#020806f2] shadow-[0_0_22px_rgba(0,229,154,0.3)] -translate-y-0.5"
                    : "border-[#1f4d39] bg-[#030907e6] hover:border-[#00e59a]"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{getAgentEmoji(agent.id)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold uppercase tracking-wider text-white text-xs">
                          {agent.name}
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#00e59a] font-medium truncate">
                        {getAgentTopicBadge(agent.id)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isWorking
                        ? "bg-[#00e59a] animate-ping"
                        : isDrinking
                          ? "bg-[#ff9d4d]"
                          : "bg-[#00e59a]"
                    }`}
                  />
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#123325]">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className={`truncate font-mono ${
                        isWorking
                          ? "text-[#00e59a] font-semibold"
                          : isDrinking
                            ? "text-[#ff9d4d]"
                            : "text-gray-300"
                      }`}
                    >
                      {agent.actionStatus}
                    </span>
                  </div>
                  {alert && (
                    <p className="text-[9.5px] text-gray-400 truncate mt-0.5 font-mono">
                      ⚡ {alert.symbol}: {alert.signal} @ {alert.priceAtAlert.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
