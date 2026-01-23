module.exports = function isAdmin(req, res, next) {
  if (!req.user || req.user.email !== "dvrdirect@gmail.com") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};
