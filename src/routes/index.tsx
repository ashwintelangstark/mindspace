import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Game from "@/game/scene/Game";
import { SceneOverlay } from "@/components/stock/SceneOverlay";
import { StockDrawer } from "@/components/stock/StockDrawer";
import { LiveTickerBar } from "@/components/stock/LiveTickerBar";
import { StockExplorerModal } from "@/components/stock/StockExplorerModal";
import { TradingSimulationModal } from "@/components/stock/TradingSimulationModal";
import { StockQuote } from "@/types/stock";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MINDSPACE — AI-Powered Stock Market Intelligence" },
      {
        name: "description",
        content:
          "A 3D stock exchange office with Bull, Bear, Stag and Rabbit AI agents predicting market trends with 91% accuracy, target withdrawal timing, and Groww-style trading simulation.",
      },
      { property: "og:title", content: "MINDSPACE — AI-Powered Stock Market Intelligence" },
      {
        property: "og:description",
        content:
          "Four AI agents (Bull, Bear, Stag, Rabbit) roam the 3D exchange office, drink coffee, sit at terminals, and compute 91% accuracy stock predictions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MindspaceExchangeFloor,
});

function MindspaceExchangeFloor() {
  // No default stock is pre-selected — user searches and chooses their stock
  const [currentStock, setCurrentStock] = useState<StockQuote | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Check URL or previous entry state: by default, landing page is presented until user clicks "Try out Mindspace"
  const [isLandingOpen, setIsLandingOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "app" || params.get("app") === "true") return false;
      if (params.get("view") === "landing") return true;
      // If user previously clicked "Try out Mindspace", bypass landing straight to trading floor
      const entered = localStorage.getItem("mindspace_entered_app");
      return !entered;
    }
    return false;
  });

  // Listen for message from landing page iframe when "Try out Mindspace ↗" is clicked
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "CLOSE_LANDING_AND_ENTER_APP") {
        setIsLandingOpen(false);
        try {
          localStorage.setItem("mindspace_entered_app", "1");
        } catch {
          // ignore storage error in restricted contexts
        }
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const handleEnterApp = () => {
    setIsLandingOpen(false);
    try {
      localStorage.setItem("mindspace_entered_app", "1");
    } catch {
      // ignore storage error in restricted contexts
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#030706] text-[#f0f7f3] flex flex-col">
      {/* Main Top Area: Left 3D Office + Right Intelligence Drawer */}
      <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
        {/* Left: 3D Stock Exchange Office */}
        <div className="relative flex-1 h-full min-h-[360px] overflow-hidden">
          <Game />
          <SceneOverlay
            isDrawerOpen={isDrawerOpen}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onOpenLanding={() => setIsLandingOpen(true)}
          />
        </div>

        {/* Right: Stock Prediction Drawer */}
        <StockDrawer
          currentStock={currentStock}
          onSelectStock={setCurrentStock}
          onOpenExplorer={() => setIsExplorerOpen(true)}
          onOpenSimulation={() => setIsSimulationOpen(true)}
          isOpen={isDrawerOpen}
          onToggleOpen={() => setIsDrawerOpen(!isDrawerOpen)}
        />
      </div>

      {/* Bottom: Live Stock Market Overview Marquee Bar */}
      <LiveTickerBar />

      {/* Full-Screen Landing Page View */}
      {isLandingOpen && (
        <div className="fixed inset-0 z-50 bg-[#050806]">
          <iframe
            src="/landing.html?v=5"
            title="Mindspace Landing Page"
            className="w-full h-full border-0 block"
          />
        </div>
      )}

      {/* Modals */}
      <StockExplorerModal
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        onSelectStock={(s) => {
          setCurrentStock(s);
          setIsDrawerOpen(true);
        }}
      />

      <TradingSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        currentStock={currentStock}
        onSelectStock={(s) => setCurrentStock(s)}
      />
    </div>
  );
}
