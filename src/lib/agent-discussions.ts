import { OPENROUTER_DEFAULT_KEY, OPENROUTER_MODELS } from "./openrouter";

export interface AgentDiscussionMessage {
  id: string;
  sender: "user" | "bull" | "bear" | "stag" | "rabbit";
  name: string;
  avatar: string;
  roleTitle: string;
  message: string;
  timestamp: string;
  isUser?: boolean;
}

export interface DiscussionTurn {
  id: string;
  topic: string;
  userQuestion?: string;
  messages: AgentDiscussionMessage[];
  timestamp: string;
}

// 30+ Pre-curated quantitative trading and investment wisdom themes
export const CURATED_TOPICS = [
  "Stop-Loss Discipline: Why cutting a 2% loss prevents a 20% portfolio drawdown",
  "Institutional VWAP: How large hedge funds accumulate shares without moving the market price",
  "Psychology of Holding Winners: Why retail traders sell 5% gains too fast but hold 40% losses",
  "Finding Multi-Baggers: High-growth fundamentals vs technical momentum breakouts",
  "RSI & Momentum Myths: Why strong stocks stay 'overbought' for months in a secular bull market",
  "Cash as a Strategic Asset: The hidden power of waiting for an asymmetric risk-reward setup",
  "Position Sizing Formula: How to calculate exact shares to buy based on maximum account risk",
  "Navigating Market Volatility: Defense tactics when indices face sharp intraday corrections",
  "Orderbook Microstructure: How to avoid heavy bid/ask spread slippage on market open",
  "Trailing Stops vs Fixed Targets: What gives the best long-term compounding edge?",
  "Earnings Season Strategy: Should you hold through quarterly results or de-risk before the print?",
  "Dollar-Cost Averaging vs Lump Sum: Matching market regimes with execution discipline",
  "Sector Rotation Playbook: Spotting capital flows from tech to industrials and defensives",
  "The 20-EMA Pullback Rule: How swing traders buy high-momentum stocks at fair value",
  "Emotional Discipline: How to overcome revenge trading after a losing session",
];

// Offline knowledge base with domain-tailored dialogs (0 tokens, instantaneous)
const OFFLINE_DIALOGS: Record<
  string,
  { bull: string; bear: string; stag: string; rabbit: string }
> = {
  default: {
    bull: "Look for stocks making 52-week highs on expanding volume — true winners consistently surprise to the upside.",
    bear: "Never risk more than 1.5% of your total capital on a single trade. Survive the bad days to profit on the good ones.",
    stag: "True compounding comes from letting solid businesses compound over 3 to 5 years, ignoring the daily market noise.",
    rabbit:
      "Always use limit orders near the institutional VWAP to enter trades with zero spread slippage.",
  },
  "Stop-Loss Discipline": {
    bull: "A stop-loss isn't an admission of defeat; it frees up your capital so you can immediately redeploy into the next high-momentum winner.",
    bear: "Small losses are your insurance premium. A 10% loss requires an 11% gain to break even, but a 50% loss requires a 100% gain just to get back to zero.",
    stag: "Set your stop-loss based on structural technical invalidation (like breaking the 200-EMA), not based on emotional pain tolerance.",
    rabbit:
      "Automate your stop-loss order on the exchange as soon as your buy order fills. Never rely on 'mental stops' in volatile markets.",
  },
  "Institutional VWAP": {
    bull: "When a stock pulls back to its rising daily VWAP and bounces, institutions are actively defending their entry price — that's your buy trigger.",
    bear: "If the price breaks and closes decisively below VWAP on heavy volume, the big players are dumping. Step aside immediately.",
    stag: "VWAP is the true volume-weighted benchmark of institutional fair value. Buying below VWAP means you got a discount compared to the average participant.",
    rabbit:
      "In the first 30 minutes of trading, VWAP is volatile. Wait until 9:45 AM or 10:00 AM for the anchor curve to stabilize before executing.",
  },
  "Psychology of Holding Winners": {
    bull: "The biggest money in markets isn't made in the buying or the selling, but in the waiting. Trail your stops and let winners run.",
    bear: "Take partial profits into vertical blow-off rallies. Locking in 30% of your gains makes holding the remainder psychologically effortless.",
    stag: "If the business fundamentals and earnings growth are still accelerating, selling just because the stock gained 20% is leaving fortunes on the table.",
    rabbit:
      "Use moving average crossovers like the 9/21-EMA on daily charts to objectively tell you when momentum is stalling rather than guessing.",
  },
};

/**
 * Generates an interactive multi-agent discussion or answers a user's question
 * using OpenRouter free-tier LLM with instantaneous quantitative fallback.
 */
export async function fetchAgentDiscussion(
  topicOrQuestion?: string,
  isUserQuestion = false,
  apiKey: string = OPENROUTER_DEFAULT_KEY,
): Promise<DiscussionTurn> {
  const chosenTopic =
    topicOrQuestion && topicOrQuestion.trim()
      ? topicOrQuestion.trim()
      : CURATED_TOPICS[Math.floor(Math.random() * CURATED_TOPICS.length)];

  const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const turnId = `disc-${Date.now()}`;

  // Try OpenRouter with ultra-compact prompt for minimal token consumption (~150 tokens)
  if (apiKey && apiKey.trim() !== "") {
    const prompt = isUserQuestion
      ? `A retail investor asks: "${chosenTopic}".
Provide a concise, practical tip from each of the 4 stock market AI agents:
- Bull (Focus: Growth, upside opportunity, breakout momentum)
- Bear (Focus: Risk management, downside protection, stop-loss safety)
- Stag (Focus: Long-term compounding, asset allocation, valuation)
- Rabbit (Focus: Microstructure, timing, avoiding slippage, order types)

Return strict JSON ONLY with this schema:
{"topic": "${chosenTopic}", "bull": "1-2 sentence tip", "bear": "1-2 sentence tip", "stag": "1-2 sentence tip", "rabbit": "1-2 sentence tip"}`
      : `Discuss the topic: "${chosenTopic}".
Each of the 4 stock market AI agents shares 1 actionable, practical investing tip from their perspective:
- Bull (Upside momentum & growth)
- Bear (Capital preservation & risk)
- Stag (Portfolio strategy & patience)
- Rabbit (Execution timing & orderbook tricks)

Return strict JSON ONLY with this schema:
{"topic": "${chosenTopic}", "bull": "1-2 sentence tip", "bear": "1-2 sentence tip", "stag": "1-2 sentence tip", "rabbit": "1-2 sentence tip"}`;

    for (const model of OPENROUTER_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "HTTP-Referer": "https://mindspace.ai",
            "X-Title": "Mindspace 4-Agent Discussions",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are Mindspace 4-Agent Stock Intelligence. Return raw valid JSON only without markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.6,
            max_tokens: 350,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content;
          if (raw) {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

            if (parsed.bull && parsed.bear && parsed.stag && parsed.rabbit) {
              return buildTurnResult(
                turnId,
                chosenTopic,
                nowStr,
                parsed.bull,
                parsed.bear,
                parsed.stag,
                parsed.rabbit,
                isUserQuestion,
              );
            }
          }
        }
      } catch {
        // Fallback to next model or offline engine
      }
    }
  }

  // Offline high-fidelity fallback (0 tokens, instantaneous)
  const matchingKey = Object.keys(OFFLINE_DIALOGS).find((k) =>
    chosenTopic.toLowerCase().includes(k.toLowerCase()),
  );
  const fallback = OFFLINE_DIALOGS[matchingKey || "default"] || OFFLINE_DIALOGS.default;

  const bullMsg = isUserQuestion
    ? `Look for the growth catalyst in "${chosenTopic}". Momentum favors assets with strong demand and positive earnings surprises.`
    : fallback.bull;

  const bearMsg = isUserQuestion
    ? `Before jumping in, ask what happens if your thesis on "${chosenTopic}" is wrong. Keep your downside strictly protected with an exit rule.`
    : fallback.bear;

  const stagMsg = isUserQuestion
    ? `Consider where "${chosenTopic}" fits in your overall asset allocation. Don't let short-term news override a 3-year valuation thesis.`
    : fallback.stag;

  const rabbitMsg = isUserQuestion
    ? `If you execute on "${chosenTopic}", time your entry during low-spread windows and use limit orders near the VWAP anchor.`
    : fallback.rabbit;

  return buildTurnResult(
    turnId,
    chosenTopic,
    nowStr,
    bullMsg,
    bearMsg,
    stagMsg,
    rabbitMsg,
    isUserQuestion,
  );
}

function buildTurnResult(
  id: string,
  topic: string,
  time: string,
  bull: string,
  bear: string,
  stag: string,
  rabbit: string,
  isUserQuestion: boolean,
): DiscussionTurn {
  const messages: AgentDiscussionMessage[] = [];

  if (isUserQuestion) {
    messages.push({
      id: `${id}-user`,
      sender: "user",
      name: "You",
      avatar: "👤",
      roleTitle: "Investor Question",
      message: topic,
      timestamp: time,
      isUser: true,
    });
  }

  messages.push(
    {
      id: `${id}-bull`,
      sender: "bull",
      name: "Bull",
      avatar: "🐂",
      roleTitle: "Growth & Upside Momentum",
      message: bull,
      timestamp: time,
    },
    {
      id: `${id}-bear`,
      sender: "bear",
      name: "Bear",
      avatar: "🐻",
      roleTitle: "Risk & Capital Defense",
      message: bear,
      timestamp: time,
    },
    {
      id: `${id}-stag`,
      sender: "stag",
      name: "Stag",
      avatar: "🦌",
      roleTitle: "Institutional Valuation",
      message: stag,
      timestamp: time,
    },
    {
      id: `${id}-rabbit`,
      sender: "rabbit",
      name: "Rabbit",
      avatar: "🐇",
      roleTitle: "Orderbook & Execution Timing",
      message: rabbit,
      timestamp: time,
    },
  );

  return {
    id,
    topic,
    userQuestion: isUserQuestion ? topic : undefined,
    messages,
    timestamp: time,
  };
}
