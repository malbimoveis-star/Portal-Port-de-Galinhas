// backend/src/server.js

const express = require("express");
const path = require("path");

const app = express();

// ==============================
// Middleware
// ==============================

app.use(express.json());

// ==============================
// Servir arquivos estáticos
// ==============================

// Frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Pasta assets (imagens)
app.use("/assets", express.static(path.join(__dirname, "../../assets")));

// Caso exista uma pasta uploads na raiz
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// ==============================
// Rotas da API
// ==============================

const comerciantesRoutes = require("./routes/comerciantes");
const anunciosRoutes = require("./routes/anuncios");

app.use("/api/comerciantes", comerciantesRoutes);
app.use("/api/anuncios", anunciosRoutes);

// ==============================
// Página inicial
// ==============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// ==============================
// Página 404
// ==============================

app.use((req, res) => {
  res.status(404).send("Rota não encontrada.");
});

// ==============================
// Iniciar servidor
// ==============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
