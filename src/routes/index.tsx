import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import { StockQuote } from "@/types/stock";
import { SceneOverlay } from "@/components/stock/SceneOverlay";
import { StockDrawer } from "@/components/stock/StockDrawer";
import { LiveTickerBar } from "@/components/stock/LiveTickerBar";
import { StockExplorerModal } from "@/components/stock/StockExplorerModal";
import { TradingSimulationModal } from "@/components/stock/TradingSimulationModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { MindspaceUser, getCurrentUser, subscribeAuth, logoutMindspaceUser } from "@/lib/auth";

const Scene = lazy(() => import("../game/scene/Game"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MINDSPACE — AI-Powered Stock Market Intelligence" },
      {
        name: "description",
        content:
          "A 3D stock exchange office with Bull, Bear, Stag and Rabbit AI agents predicting market trends across 6 horizons, target withdrawal timing, and live trading simulation.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function LoadingScreen() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#040806",
        color: "#00e59a",
        fontFamily: "monospace",
        fontSize: "15px",
        letterSpacing: "0.08em",
      }}
    >
      INITIALIZING MINDSPACE 3D AI STOCK INTELLIGENCE...
    </div>
  );
}

function Index() {
  // Always open the Landing Page first whenever the project is run unless ?view=app is present
  const [isLandingOpen, setIsLandingOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.location.search.includes("view=app")) {
      return false;
    }
    return true;
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.location.search.includes("view=app")) {
      return !getCurrentUser();
    }
    return false;
  });
  const [currentUser, setCurrentUser] = useState<MindspaceUser | null>(() => getCurrentUser());

  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  useEffect(() => {
    return subscribeAuth((u) => {
      setCurrentUser(u);
    });
  }, []);

  // Load user-isolated selected stock when user logs in
  useEffect(() => {
    if (!currentUser) {
      setSelectedStock(null);
      return;
    }
    try {
      const saved = localStorage.getItem(
        `mindspace_selected_stock_${currentUser.username.toLowerCase()}`,
      );
      if (saved) {
        setSelectedStock(JSON.parse(saved));
      } else {
        setSelectedStock(null);
      }
    } catch {
      setSelectedStock(null);
    }
  }, [currentUser]);

  const handleSelectUserStock = (stock: StockQuote | null) => {
    setSelectedStock(stock);
    if (currentUser && typeof window !== "undefined") {
      const key = `mindspace_selected_stock_${currentUser.username.toLowerCase()}`;
      if (stock) {
        localStorage.setItem(key, JSON.stringify(stock));
      } else {
        localStorage.removeItem(key);
      }
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      const type = event.data.type;
      if (
        type === "ENTER_MINDSPACE_APP" ||
        type === "CLOSE_LANDING_AND_ENTER_APP" ||
        type === "TRY_OUT_MINDSPACE" ||
        type === "OPEN_AUTH_MODAL"
      ) {
        setIsLandingOpen(false);
        if (event.data.user) {
          setCurrentUser(event.data.user);
          setIsAuthOpen(false);
        } else {
          setIsAuthOpen(true);
        }
      } else if (type === "AUTH_LOGIN_SUCCESS" && event.data.user) {
        setCurrentUser(event.data.user);
        setIsLandingOpen(false);
        setIsAuthOpen(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleLogout = () => {
    logoutMindspaceUser();
    setSelectedStock(null);
    setIsSimulationOpen(false);
    setIsExplorerOpen(false);
    setIsAuthOpen(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#040907] select-none relative">
      {/* Full-Screen Interactive 3D Landing Page Overlay (Always shown first on project start) */}
      {isLandingOpen && (
        <div className="fixed inset-0 z-[100] bg-[#060807] flex flex-col">
          <iframe
            src="/landing.html"
            title="Mindspace Landing Page"
            className="w-full flex-1 border-0"
          />
        </div>
      )}

      {/* Login & Registration Gate shown when user clicks "Try out Mindspace" */}
      <AuthModal
        isOpen={isAuthOpen || (!isLandingOpen && !currentUser)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
          setIsLandingOpen(false);
        }}
        onBackToLanding={() => {
          setIsAuthOpen(false);
          setIsLandingOpen(true);
        }}
      />

      {/* Top Section: 3D Exchange Floor + Right Intelligence Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left / Main 3D Viewport */}
        <div className="relative flex-1 h-full overflow-hidden">
          <Suspense fallback={<LoadingScreen />}>
            <Scene />
          </Suspense>
          <SceneOverlay
            onOpenDrawer={() => setIsDrawerOpen(true)}
            isDrawerOpen={isDrawerOpen}
            onOpenLanding={() => setIsLandingOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </div>

        {/* Right Side: Stock Intelligence & Multi-Agent Prediction Drawer */}
        <StockDrawer
          currentStock={selectedStock}
          onSelectStock={(stock) => {
            handleSelectUserStock(stock);
            setIsDrawerOpen(true);
          }}
          onOpenExplorer={() => setIsExplorerOpen(true)}
          onOpenSimulation={() => setIsSimulationOpen(true)}
          isOpen={isDrawerOpen}
          onToggleOpen={() => setIsDrawerOpen((prev) => !prev)}
        />
      </div>

      {/* Bottom Live Ticker Bar */}
      <LiveTickerBar />

      {/* Explore All Stocks Modal */}
      <StockExplorerModal
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        onSelectStock={handleSelectUserStock}
      />

      {/* Live Trading Simulation Modal */}
      <TradingSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        currentStock={selectedStock}
        onSelectStock={handleSelectUserStock}
      />
    </div>
  );
}
