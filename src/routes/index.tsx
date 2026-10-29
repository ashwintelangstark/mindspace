import { createFileRoute } from "@tanstack/react-router";
import Game from "@/game/scene/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SIL Science — Roblox Stock Exchange Floor" },
      {
        name: "description",
        content:
          "A 3D trading-floor scene with Bull, Bear, Stag and Rabbit roaming a stock exchange office at sunset, built with React and three.js.",
      },
      { property: "og:title", content: "SIL Science — Roblox Stock Exchange Floor" },
      {
        property: "og:description",
        content: "Bull, Bear, Stag and Rabbit roam a glowing stock exchange office with a sunset skyline view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExchangeFloor,
});

function ExchangeFloor() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Game />

      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className="rounded-lg border border-border bg-card/70 px-4 py-2 backdrop-blur">
            <p className="text-sm font-bold tracking-widest text-foreground">SIL SCIENCE</p>
            <p className="text-xs text-muted-foreground">Stock Exchange Floor</p>
          </div>
          <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-right backdrop-blur">
            <p className="text-xs font-semibold text-foreground">Bull · Bear · Stag · Rabbit</p>
            <p className="text-[11px] text-muted-foreground">on the floor today</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            Drag to look around · Scroll to zoom · The traders roam on their own
          </div>
        </div>
      </div>
    </div>
  );
}
