const mongoose = require("mongoose");

const { Schema } = mongoose;

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
