const router = require("express").Router();
const c = require("../controllers/post.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/posts", verifyToken, c.list);
router.get("/posts/explore", verifyToken, c.explore);
router.post("/posts", verifyToken, c.create);
router.put("/posts/:id", verifyToken, c.update);
router.delete("/posts/:id", verifyToken, c.delete);
router.patch("/posts/:id/reservation", verifyToken, c.toggleReservation);
router.patch("/posts/:id/confirm", verifyToken, c.confirm);
router.patch("/posts/:id/cancel", verifyToken, c.cancel);

module.exports = router;
