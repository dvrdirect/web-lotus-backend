const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { User, Reservation } = require("../models");

const normalizeString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value);
};

const normalizeBoolean = (value) => {
  if (value === undefined) return undefined;
  return Boolean(value);
};

const normalizeStringArray = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .map((v) => v.trim())
    .filter(Boolean);
};

const ensureClinicalHistoryDefaults = (user) => {
  if (!user.clinicalHistory) user.clinicalHistory = {};
  if (!user.clinicalHistory.userEditable)
    user.clinicalHistory.userEditable = {};
  if (!user.clinicalHistory.userEditable.spaPreferences) {
    user.clinicalHistory.userEditable.spaPreferences = {};
  }
  if (!user.clinicalHistory.staffOnly) user.clinicalHistory.staffOnly = {};
  if (!user.clinicalHistory.staffOnly.medicalConditions) {
    user.clinicalHistory.staffOnly.medicalConditions = {};
  }
};

const pickAdminPatch = (body) => {
  const src = body && typeof body === "object" ? body : {};
  const patch = {};

  if (src.userEditable && typeof src.userEditable === "object") {
    const ue = src.userEditable;
    const uePatch = {};

    const allergies = normalizeString(ue.allergies);
    if (allergies !== undefined) uePatch.allergies = allergies;

    const currentMedications = normalizeString(ue.currentMedications);
    if (currentMedications !== undefined)
      uePatch.currentMedications = currentMedications;

    const spaSrc =
      ue.spaPreferences && typeof ue.spaPreferences === "object"
        ? ue.spaPreferences
        : {};
    const spaPatch = {};
    const goal = normalizeString(spaSrc.goal);
    if (goal !== undefined) spaPatch.goal = goal;
    const pressure = normalizeString(spaSrc.pressure);
    if (pressure !== undefined) spaPatch.pressure = pressure;
    const favoriteTreatments = normalizeStringArray(spaSrc.favoriteTreatments);
    if (favoriteTreatments !== undefined)
      spaPatch.favoriteTreatments = favoriteTreatments;
    const preferredAromas = normalizeStringArray(spaSrc.preferredAromas);
    if (preferredAromas !== undefined)
      spaPatch.preferredAromas = preferredAromas;
    const sensitiveZones = normalizeStringArray(spaSrc.sensitiveZones);
    if (sensitiveZones !== undefined) spaPatch.sensitiveZones = sensitiveZones;

    if (Object.keys(spaPatch).length) uePatch.spaPreferences = spaPatch;
    if (Object.keys(uePatch).length) patch.userEditable = uePatch;
  }

  if (src.staffOnly && typeof src.staffOnly === "object") {
    const so = src.staffOnly;
    const soPatch = {};

    const internalNotes = normalizeString(so.internalNotes);
    if (internalNotes !== undefined) soPatch.internalNotes = internalNotes;

    const mcSrc =
      so.medicalConditions && typeof so.medicalConditions === "object"
        ? so.medicalConditions
        : {};
    const mcPatch = {};
    const pregnant = normalizeBoolean(mcSrc.pregnant);
    if (pregnant !== undefined) mcPatch.pregnant = pregnant;
    const diabetes = normalizeBoolean(mcSrc.diabetes);
    if (diabetes !== undefined) mcPatch.diabetes = diabetes;
    const hypertension = normalizeBoolean(mcSrc.hypertension);
    if (hypertension !== undefined) mcPatch.hypertension = hypertension;
    const heartProblems = normalizeBoolean(mcSrc.heartProblems);
    if (heartProblems !== undefined) mcPatch.heartProblems = heartProblems;
    const recentInjuries = normalizeBoolean(mcSrc.recentInjuries);
    if (recentInjuries !== undefined) mcPatch.recentInjuries = recentInjuries;
    const migraine = normalizeBoolean(mcSrc.migraine);
    if (migraine !== undefined) mcPatch.migraine = migraine;

    if (Object.keys(mcPatch).length) soPatch.medicalConditions = mcPatch;
    if (Object.keys(soPatch).length) patch.staffOnly = soPatch;
  }

  return patch;
};

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

// GET /api/admin/reservations?userId=... - listar reservas de un usuario (admin)
router.get("/reservations", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId es requerido" });

    const reservations = await Reservation.find({ user: userId })
      .sort({ scheduledAt: -1 })
      .lean();

    return res.json({ reservations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:userId/reservations - listar reservas por usuario (admin)
router.get("/users/:userId/reservations", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId es requerido" });

    const reservations = await Reservation.find({ user: userId })
      .sort({ scheduledAt: -1 })
      .select("_id serviceName scheduledAt notes status")
      .lean();

    const payload = reservations.map((item) => ({
      _id: item._id,
      date: item.scheduledAt,
      service: item.serviceName,
      notes: item.notes,
      status: item.status,
    }));

    return res.json({ reservations: payload });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/reservations/:id - eliminar reserva (admin only)
router.delete("/reservations/:id", auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const userId = reservation.user;

    // Delete reservation
    await Reservation.findByIdAndDelete(id);

    // Recalculate user's appointmentsCount and clean history entries matching this reservation
    const user = await User.findById(userId);
    if (user) {
      // Recalculate total reservations for user
      const total = await Reservation.countDocuments({ user: user._id });
      user.appointmentsCount = total;

      // Remove any appointmentsHistory item that matches same day and service
      const remainingHistory = (user.appointmentsHistory || []).filter(
        (item) => {
          if (!item || !item.date || !item.service) return true;
          const itemDateKey = new Date(item.date).toISOString().slice(0, 10);
          const resDateKey = new Date(reservation.scheduledAt)
            .toISOString()
            .slice(0, 10);
          // keep the item if it does not match the reservation being deleted
          return !(
            itemDateKey === resDateKey &&
            item.service === reservation.serviceName
          );
        },
      );
      user.appointmentsHistory = remainingHistory;

      await user.save();
    }

    return res.json({
      ok: true,
      message: "Reserva eliminada correctamente",
      data: {
        appointmentsCount: user ? user.appointmentsCount : 0,
        appointmentsHistory: user ? user.appointmentsHistory : [],
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Clinical history (admin/staff) ---

// GET /api/admin/users/:userId/clinical-history
router.get(
  "/users/:userId/clinical-history",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select(
        "clinicalHistory name email",
      );
      if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });

      ensureClinicalHistoryDefaults(user);

      return res.json({
        user: { id: user._id, name: user.name, email: user.email },
        clinicalHistory: {
          userEditable: {
            allergies: user.clinicalHistory.userEditable.allergies || "",
            currentMedications:
              user.clinicalHistory.userEditable.currentMedications || "",
            spaPreferences: {
              goal:
                user.clinicalHistory.userEditable.spaPreferences.goal ||
                "relajacion",
              pressure:
                user.clinicalHistory.userEditable.spaPreferences.pressure ||
                "media",
              favoriteTreatments:
                user.clinicalHistory.userEditable.spaPreferences
                  .favoriteTreatments || [],
              preferredAromas:
                user.clinicalHistory.userEditable.spaPreferences
                  .preferredAromas || [],
              sensitiveZones:
                user.clinicalHistory.userEditable.spaPreferences
                  .sensitiveZones || [],
            },
          },
          staffOnly: {
            medicalConditions: {
              pregnant: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.pregnant,
              ),
              diabetes: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.diabetes,
              ),
              hypertension: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.hypertension,
              ),
              heartProblems: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.heartProblems,
              ),
              recentInjuries: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.recentInjuries,
              ),
              migraine: Boolean(
                user.clinicalHistory.staffOnly.medicalConditions.migraine,
              ),
            },
            internalNotes: user.clinicalHistory.staffOnly.internalNotes || "",
          },
          updatedAt: user.clinicalHistory.updatedAt || null,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
);

// PUT /api/admin/users/:userId/clinical-history
router.put(
  "/users/:userId/clinical-history",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const patch = pickAdminPatch(req.body);

      const user = await User.findById(userId).select("clinicalHistory");
      if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });

      ensureClinicalHistoryDefaults(user);

      if (patch.userEditable) {
        const ue = patch.userEditable;
        if (ue.allergies !== undefined)
          user.clinicalHistory.userEditable.allergies = ue.allergies;
        if (ue.currentMedications !== undefined) {
          user.clinicalHistory.userEditable.currentMedications =
            ue.currentMedications;
        }
        if (ue.spaPreferences) {
          const spa = ue.spaPreferences;
          if (spa.goal !== undefined)
            user.clinicalHistory.userEditable.spaPreferences.goal = spa.goal;
          if (spa.pressure !== undefined)
            user.clinicalHistory.userEditable.spaPreferences.pressure =
              spa.pressure;
          if (spa.favoriteTreatments !== undefined) {
            user.clinicalHistory.userEditable.spaPreferences.favoriteTreatments =
              spa.favoriteTreatments;
          }
          if (spa.preferredAromas !== undefined) {
            user.clinicalHistory.userEditable.spaPreferences.preferredAromas =
              spa.preferredAromas;
          }
          if (spa.sensitiveZones !== undefined) {
            user.clinicalHistory.userEditable.spaPreferences.sensitiveZones =
              spa.sensitiveZones;
          }
        }
      }

      if (patch.staffOnly) {
        const so = patch.staffOnly;
        if (so.internalNotes !== undefined)
          user.clinicalHistory.staffOnly.internalNotes = so.internalNotes;
        if (so.medicalConditions) {
          const mc = so.medicalConditions;
          if (mc.pregnant !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.pregnant =
              mc.pregnant;
          if (mc.diabetes !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.diabetes =
              mc.diabetes;
          if (mc.hypertension !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.hypertension =
              mc.hypertension;
          if (mc.heartProblems !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.heartProblems =
              mc.heartProblems;
          if (mc.recentInjuries !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.recentInjuries =
              mc.recentInjuries;
          if (mc.migraine !== undefined)
            user.clinicalHistory.staffOnly.medicalConditions.migraine =
              mc.migraine;
        }
      }

      user.clinicalHistory.updatedAt = new Date();
      await user.save();

      return res.json({ ok: true, updatedAt: user.clinicalHistory.updatedAt });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
);

module.exports = router;
