const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { User } = require("../models");

// POST /api/admin/add-past-appointment
router.post("/add-past-appointment", auth, isAdmin, async (req, res) => {
  try {
    const { userId, date, service, notes } = req.body;

    if (!userId || !date || !service) {
      return res
        .status(400)
        .json({ error: "userId, date y service son obligatorios" });
    }

    const normalizedDate = new Date(date);
    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const targetDateKey = normalizedDate.toISOString().slice(0, 10);
    const alreadyExists = (user.appointmentsHistory || []).some((item) => {
      if (!item || !item.date || !item.service) return false;
      const itemDateKey = new Date(item.date).toISOString().slice(0, 10);
      return itemDateKey === targetDateKey && item.service === service;
    });

    if (alreadyExists) {
      return res
        .status(409)
        .json({ error: "La cita ya existe para esa fecha y servicio" });
    }

    user.appointmentsHistory = user.appointmentsHistory || [];
    user.appointmentsHistory.push({
      date: normalizedDate,
      service,
      notes,
      addedByAdmin: true,
    });

    user.appointmentsCount = (user.appointmentsCount || 0) + 1;

    await user.save();

    return res.json({
      ok: true,
      message: "Cita agregada correctamente",
      data: {
        appointmentsCount: user.appointmentsCount,
        appointmentsHistory: user.appointmentsHistory,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
