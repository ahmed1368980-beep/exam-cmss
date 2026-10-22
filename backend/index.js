require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// CORS : origines autorisees via CORS_ORIGINS (separees par des virgules)
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      cb(new Error("Origine non autorisee par CORS"));
    },
  })
);

// --- Schema et modele Mongoose ---
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    // Cle d'idempotence : evite les doublons si le client reessaie un POST
    clientId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);
const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);

// --- Connexion MongoDB (reutilisee entre les appels, utile en serverless) ---
let connPromise = null;
function connectDB() {
  if (!process.env.MONGODB_URI) {
    return Promise.reject(new Error("MONGODB_URI manquante"));
  }
  if (!connPromise) {
    connPromise = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((err) => {
        connPromise = null;
        throw err;
      });
  }
  return connPromise;
}

async function requireDB(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Erreur connexion MongoDB:", err.message);
    res.status(503).json({ error: "Base de donnees indisponible" });
  }
}

// --- Routes ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Le serveur repond", env: process.env.NODE_ENV || "development" });
});

app.get("/api/items", requireDB, async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/items", requireDB, async (req, res) => {
  const { name, description = "", clientId } = req.body || {};
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Le champ 'name' est obligatoire" });
  }
  if (name.length > 100 || String(description).length > 500) {
    return res.status(400).json({ error: "Champ trop long" });
  }
  if (clientId !== undefined && typeof clientId !== "string") {
    return res.status(400).json({ error: "'clientId' invalide" });
  }
  try {
    if (clientId) {
      const existing = await Item.findOne({ clientId });
      if (existing) return res.status(200).json(existing); // nouvelle tentative : pas de doublon
    }
    const item = await Item.create({ name, description: String(description), clientId });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000 && clientId) {
      const existing = await Item.findOne({ clientId });
      return res.status(200).json(existing);
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.use((req, res) => res.status(404).json({ error: "Route introuvable" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.message.includes("CORS") ? 403 : 500).json({ error: err.message });
});

// --- Demarrage (local / Railway) ; sur Vercel l'app est exportee ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  connectDB()
    .then(() => console.log("MongoDB connecte"))
    .catch((err) => console.error("MongoDB non connecte:", err.message));
  app.listen(PORT, () => console.log(`Serveur sur le port ${PORT}`));
}

module.exports = app;
