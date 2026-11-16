const router = require("express").Router();
const c = require("../controllers/cuenta.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/mis-datos", verifyToken, c.misDatos);
router.delete("/cuenta", verifyToken, c.eliminar);

module.exports = router;
