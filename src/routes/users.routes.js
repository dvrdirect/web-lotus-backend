const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { User } = require("../models");

const normalizeString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value);
};

const normalizeStringArray = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .map((v) => v.trim())
    .filter(Boolean);
};

const pickUserEditablePatch = (body) => {
  const src = body && typeof body === "object" ? body : {};
  const userEditable =
    src.userEditable && typeof src.userEditable === "object"
      ? src.userEditable
      : src;
  const spaSrc =
    userEditable.spaPreferences &&
    typeof userEditable.spaPreferences === "object"
      ? userEditable.spaPreferences
      : {};

  const patch = {};

  const allergies = normalizeString(userEditable.allergies);
  if (allergies !== undefined) patch.allergies = allergies;

  const currentMedications = normalizeString(userEditable.currentMedications);
  if (currentMedications !== undefined)
    patch.currentMedications = currentMedications;

  const spaPreferences = {};
  const goal = normalizeString(spaSrc.goal);
  if (goal !== undefined) spaPreferences.goal = goal;

  const pressure = normalizeString(spaSrc.pressure);
  if (pressure !== undefined) spaPreferences.pressure = pressure;

  const favoriteTreatments = normalizeStringArray(spaSrc.favoriteTreatments);
  if (favoriteTreatments !== undefined)
    spaPreferences.favoriteTreatments = favoriteTreatments;

  const preferredAromas = normalizeStringArray(spaSrc.preferredAromas);
  if (preferredAromas !== undefined)
    spaPreferences.preferredAromas = preferredAromas;

  const sensitiveZones = normalizeStringArray(spaSrc.sensitiveZones);
  if (sensitiveZones !== undefined)
    spaPreferences.sensitiveZones = sensitiveZones;

  if (Object.keys(spaPreferences).length) patch.spaPreferences = spaPreferences;

  return patch;
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

// GET /api/users/clinical-history
// Customer only sees userEditable (backend manda).
router.get("/clinical-history", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("clinicalHistory");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    ensureClinicalHistoryDefaults(user);

    const payload = {
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
            user.clinicalHistory.userEditable.spaPreferences.preferredAromas ||
            [],
          sensitiveZones:
            user.clinicalHistory.userEditable.spaPreferences.sensitiveZones ||
            [],
        },
      },
      updatedAt: user.clinicalHistory.updatedAt || null,
    };

    return res.json({ clinicalHistory: payload });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/clinical-history
// Security: never trust payload. Only update clinicalHistory.userEditable.
router.put("/clinical-history", auth, async (req, res) => {
  try {
    const patch = pickUserEditablePatch(req.body);

    const user = await User.findById(req.user._id).select("clinicalHistory");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    ensureClinicalHistoryDefaults(user);

    if (patch.allergies !== undefined) {
      user.clinicalHistory.userEditable.allergies = patch.allergies;
    }
    if (patch.currentMedications !== undefined) {
      user.clinicalHistory.userEditable.currentMedications =
        patch.currentMedications;
    }

    if (patch.spaPreferences) {
      const spa = patch.spaPreferences;
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

    user.clinicalHistory.updatedAt = new Date();

    await user.save();

    return res.json({
      ok: true,
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
              user.clinicalHistory.userEditable.spaPreferences.sensitiveZones ||
              [],
          },
        },
        updatedAt: user.clinicalHistory.updatedAt || null,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
