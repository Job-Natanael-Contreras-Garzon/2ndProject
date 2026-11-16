const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../database/config");
const { HttpError } = require("./errorHandler");
const { User } = require("../models");

async function verifyToken(req, _res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new HttpError(401, "Debes iniciar sesión para continuar.");
    }

    try {
        req.user = jwt.verify(token, jwtSecret);
    } catch {
        throw new HttpError(403, "Tu sesión expiró. Inicia sesión nuevamente.");
    }

    // Si la cuenta se eliminó, el token que quedó guardado ya no sirve
    if (!(await User.findByPk(req.user.id))) {
        throw new HttpError(401, "Tu cuenta ya no existe.");
    }
    next();
}

module.exports = { verifyToken };
