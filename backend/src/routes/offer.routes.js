const router = require("express").Router();
const c = require("../controllers/offer.controller");
const { verifyToken } = require("../middleware/auth");

router.post("/posts/:id/offers", verifyToken, c.create);
router.get("/posts/:id/offers", verifyToken, c.listByPost);
router.patch("/offers/:id/accept", verifyToken, c.accept);
router.patch("/offers/:id/reject", verifyToken, c.reject);

module.exports = router;
