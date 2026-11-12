const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Calificacion } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const { jwtSecret, jwtDuration, resetTokenMinutes } = require("../database/config");

function generateToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        jwtSecret,
        { expiresIn: jwtDuration },
    );
}

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        throw new HttpError(400, "Nombre, email y contraseña son obligatorios");
    }

    const normalizedEmail = email.toLowerCase();
    if (await User.findOne({ where: { email: normalizedEmail } })) {
        throw new HttpError(409, "El correo electrónico ya se encuentra registrado");
    }

    const user = await User.create({
        name,
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
    });

    res.status(201).json({
        message: "Usuario registrado satisfactoriamente",
        user,
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new HttpError(400, "Email y contraseña requeridos");
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new HttpError(401, "Credenciales invalidas");
    }

    res.json({ token: generateToken(user), user });
};

exports.logout = (_req, res) => {
    res.json({ message: "Sesion cerrada correctamente" });
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) throw new HttpError(400, "El email es obligatorio");

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        return res.json({
            message: "Si el correo existe en el sistema, el token fue emitido",
        });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await user.update({
        resetToken,
        resetTokenExpires: new Date(Date.now() + resetTokenMinutes * 60 * 1000),
    });

    res.json({
        message: "Token de recuperacion generado exitosamente",
        simulatedResetToken: resetToken,
    });
};

exports.resetPassword = async (req, res) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
        throw new HttpError(400, "El token y la nueva contraseña son requeridos");
    }

    const user = await User.findOne({
        where: { resetToken, resetTokenExpires: { [Op.gt]: new Date() } },
    });
    if (!user) {
        throw new HttpError(400, "El token de restablecimiento es invalido o ha caducado");
    }

    await user.update({
        password: await bcrypt.hash(newPassword, 10),
        resetToken: null,
        resetTokenExpires: null,
    });

    res.json({ message: "Contraseña cambiada exitosamente" });
};

// El perfil muestra el promedio y la cantidad de calificaciones que recibió la persona
exports.profile = async (req, res) => {
    const { id, name, email } = req.user;
    const recibidas = await Calificacion.findAll({ where: { calificadoId: id } });
    const cantidad = recibidas.length;
    const suma = recibidas.reduce((total, c) => total + c.puntaje, 0);
    const promedio = cantidad > 0 ? Number((suma / cantidad).toFixed(1)) : 0;
    res.json({ user: { id, name, email, calificaciones: { promedio, cantidad } } });
};
