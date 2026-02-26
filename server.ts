import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // Player state storage (in-memory for demo)
  const players = new Map<string, any>();

  wss.on("connection", (ws: WebSocket) => {
    let playerId: string | null = null;

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === "join") {
          playerId = data.player.id;
          players.set(playerId!, { ...data.player, ws });
          broadcastPresence();
        }

        if (data.type === "update_location") {
          if (playerId && players.has(playerId)) {
            const player = players.get(playerId);
            player.location = data.location;
            broadcastPresence();
          }
        }

        if (data.type === "chat") {
          broadcast({
            type: "chat",
            sender: data.sender,
            message: data.message,
            timestamp: Date.now()
          });
        }

        if (data.type === "catch") {
          broadcast({
            type: "catch_ticker",
            playerName: data.playerName,
            fishName: data.fishName,
            rarity: data.rarity,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    });

    ws.on("close", () => {
      if (playerId) {
        players.delete(playerId);
        broadcastPresence();
      }
    });

    function broadcastPresence() {
      const presenceList = Array.from(players.values()).map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        hasPassport: p.hasPassport,
        level: p.level
      }));

      broadcast({
        type: "presence",
        players: presenceList
      });
    }

    function broadcast(data: any) {
      const payload = JSON.stringify(data);
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  });

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { amount, price, successUrl, cancelUrl } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${amount.toLocaleString()} Fishing Coins`,
                description: "Premium currency for fishing gear and licenses.",
              },
              unit_amount: price * 100, // Price in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
