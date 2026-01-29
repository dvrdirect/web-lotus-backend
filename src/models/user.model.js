const mongoose = require("mongoose");

const { Schema } = mongoose;

const clinicalHistorySchema = new Schema(
  {
    userEditable: {
      allergies: { type: String, default: "" },
      currentMedications: { type: String, default: "" },
      spaPreferences: {
        goal: { type: String, default: "relajacion" },
        pressure: { type: String, default: "media" },
        favoriteTreatments: { type: [String], default: [] },
        preferredAromas: { type: [String], default: [] },
        sensitiveZones: { type: [String], default: [] },
      },
    },
    staffOnly: {
      medicalConditions: {
        pregnant: { type: Boolean, default: false },
        diabetes: { type: Boolean, default: false },
        hypertension: { type: Boolean, default: false },
        heartProblems: { type: Boolean, default: false },
        recentInjuries: { type: Boolean, default: false },
        migraine: { type: Boolean, default: false },
      },
      internalNotes: { type: String, default: "" },
    },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Invalid email format"],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 30,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    birthdate: {
      type: String,
    },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },
    clinicalHistory: {
      type: clinicalHistorySchema,
      default: () => ({}),
    },
    appointmentsCount: {
      type: Number,
      default: 0,
    },
    appointmentsHistory: [
      {
        date: {
          type: Date,
        },
        service: {
          type: String,
          trim: true,
        },
        notes: {
          type: String,
          trim: true,
        },
        addedByAdmin: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
