const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");

router.post("/eventos", analyticsController.registrarEvento);
router.get("/eventos/resumen", analyticsController.obtenerResumen);

module.exports = router;
