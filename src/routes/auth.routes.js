const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Falta idToken" });
    }

    if (!googleClient) {
      return res
        .status(500)
        .json({ error: "GOOGLE_CLIENT_ID no está configurado en el servidor" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || (email ? email.split("@")[0] : "Usuario");

    if (!email) {
      return res
        .status(400)
        .json({ error: "El token de Google no contiene un correo válido" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Creamos un usuario "solo Google" con contraseña placeholder
      user = await User.create({
        email,
        name,
        password: `google-oauth-${payload.sub || Date.now()}`,
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        birthdate: user.birthdate,
        role: user.role || "customer",
      },
      token,
    });
  } catch (err) {
    console.error("Error en auth Google backend", err);
    return res
      .status(401)
      .json({ error: "Token de Google inválido o expirado" });
  }
});

module.exports = router;
