const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { User, Reservation } = require("../models");

// GET /api/admin/user?email=... or ?id=...
router.get("/user", auth, isAdmin, async (req, res) => {
  try {
    const { email, id } = req.query;

    if (!email && !id) {
      return res.status(400).json({ error: "email o id son obligatorios" });
    }

    const query = {};
    if (id) {
      query._id = id;
    } else {
      // Búsqueda insensible a mayúsculas/minúsculas
      query.email = new RegExp(`^${String(email).trim()}$`, "i");
    }

    const user = await User.findOne(query).select(
      "name email appointmentsCount appointmentsHistory",
    );

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        appointmentsCount: user.appointmentsCount || 0,
        appointmentsHistory: user.appointmentsHistory || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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

    const dayStart = new Date(normalizedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(normalizedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const reservationExists = await Reservation.findOne({
      user: user._id,
      serviceName: service,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
    });

    if (reservationExists) {
      return res
        .status(409)
        .json({ error: "La reserva ya existe para esa fecha y servicio" });
    }

    user.appointmentsHistory = user.appointmentsHistory || [];
    user.appointmentsHistory.push({
      date: normalizedDate,
      service,
      notes,
      addedByAdmin: true,
    });

    user.appointmentsCount = (user.appointmentsCount || 0) + 1;

    await Reservation.create({
      user: user._id,
      email: user.email,
      serviceName: service,
      scheduledAt: normalizedDate,
      notes,
      status: "completed",
      createdBy: "admin",
    });

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
