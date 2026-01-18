const express = require("express");
const router = express.Router();
const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// POST /signup: registro de usuario
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ error: "El correo ya está registrado" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash, name });
    res
      .status(201)
      .json({
        message: "Usuario creado",
        user: { email: user.email, name: user.name },
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /signin: login y JWT
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Correo y contraseña requeridos" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Credenciales inválidas" });
    const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const auth = require("../middleware/auth");

// GET: información del usuario conectado (correo y nombre)
router.get("/me", auth, (req, res) => {
  const { email, name } = req.user;
  res.json({ email, name });
});

// GET: datos guardados por el usuario (servicios creados)
router.get("/data", auth, async (req, res) => {
  // Aquí se asume que Service tiene un campo userId (no implementado aún)
  // const services = await Service.find({ userId: req.user._id });
  // res.json(services);
  res.json([]); // Placeholder
});

module.exports = router;
