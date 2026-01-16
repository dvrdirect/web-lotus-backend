// Small script to ensure models load correctly

const { User, Service } = require("../src/models");

console.log("User model loaded:", typeof User === "function");
console.log("Service model loaded:", typeof Service === "function");
