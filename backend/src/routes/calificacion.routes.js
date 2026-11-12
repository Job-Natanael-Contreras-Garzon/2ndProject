const router = require("express").Router();
const c = require("../controllers/calificacion.controller");
const { verifyToken } = require("../middleware/auth");

router.post("/posts/:id/calificacion", verifyToken, c.crear);

module.exports = router;
