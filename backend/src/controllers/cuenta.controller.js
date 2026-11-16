const { Op } = require("sequelize");
const { sequelize, User, Post, Offer, OfferMessage, Activity, Calificacion } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const { getEliminarCuentaError } = require("../rules/cuentaRules");

// Todos los datos de la persona que inició sesión (sin la contraseña ni los tokens).
exports.misDatos = async (req, res) => {
    const userId = req.user.id;

    const usuario = await User.findByPk(userId);
    const publicaciones = await Post.findAll({ where: { userId }, order: [["publishedAt", "DESC"]] });
    const ofertas = await Offer.findAll({
        where: { proposerId: userId },
        include: [{ model: Post, as: "targetPost", attributes: ["title"] }],
        order: [["createdAt", "DESC"]],
    });
    const actividad = await Activity.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
    const recibidas = await Calificacion.findAll({ where: { calificadoId: userId } });
    const dadas = await Calificacion.findAll({ where: { calificadorId: userId } });

    res.json({
        exportadoEn: new Date().toISOString(),
        usuario: { nombre: usuario.name, correo: usuario.email, registradoEn: usuario.createdAt },
        publicaciones: publicaciones.map((p) => ({
            titulo: p.title,
            categoria: p.category,
            condicion: p.condition,
            estado: p.state,
            publicadaEn: p.publishedAt,
        })),
        ofertas: ofertas.map((o) => ({
            publicacion: o.targetPost ? o.targetPost.title : null,
            mensaje: o.message,
            estado: o.status,
            enviadaEn: o.createdAt,
        })),
        actividad: actividad.map((a) => ({
            tipo: a.type,
            publicacion: a.postTitle,
            conQuien: a.otherUserName,
            motivo: a.reason,
            fecha: a.createdAt,
        })),
        calificaciones: {
            recibidas: recibidas.map((c) => ({ puntaje: c.puntaje, comentario: c.comentario, fecha: c.createdAt })),
            dadas: dadas.map((c) => ({ puntaje: c.puntaje, comentario: c.comentario, fecha: c.createdAt })),
        },
    });
};

// Elimina la cuenta y todo lo que la persona tiene en la app.
exports.eliminar = async (req, res) => {
    const userId = req.user.id;

    // Regla de la app: con un intercambio en curso no se puede eliminar
    const enCurso = await Post.findAll({
        where: { state: "reservado", [Op.or]: [{ userId }, { reservedById: userId }] },
    });
    const error = getEliminarCuentaError(enCurso);
    if (error) {
        throw new HttpError(409, error);
    }

    // Todo en una transacción: o se borra completo o no se borra nada
    await sequelize.transaction(async (t) => {
        const misPosts = await Post.findAll({ where: { userId }, attributes: ["id"], transaction: t });
        const idsPosts = misPosts.map((p) => p.id);

        // Ofertas que envió y ofertas recibidas en sus publicaciones, con sus mensajes
        const ofertas = await Offer.findAll({
            where: { [Op.or]: [{ proposerId: userId }, { targetPostId: { [Op.in]: idsPosts } }] },
            attributes: ["id"],
            transaction: t,
        });
        const idsOfertas = ofertas.map((o) => o.id);
        await OfferMessage.destroy({ where: { offerId: { [Op.in]: idsOfertas } }, transaction: t });
        await Offer.destroy({ where: { id: { [Op.in]: idsOfertas } }, transaction: t });

        // Las ofertas de otras personas que usaban sus objetos quedan sin objeto
        await Offer.update({ offeredPostId: null }, { where: { offeredPostId: { [Op.in]: idsPosts } }, transaction: t });
        // En intercambios ya completados de otras personas, deja de figurar como receptor
        await Post.update({ reservedById: null }, { where: { reservedById: userId }, transaction: t });

        await Activity.destroy({ where: { userId }, transaction: t });
        await Calificacion.destroy({
            where: { [Op.or]: [{ calificadorId: userId }, { calificadoId: userId }] },
            transaction: t,
        });
        await Post.destroy({ where: { userId }, transaction: t });
        await User.destroy({ where: { id: userId }, transaction: t });
    });

    res.json({ message: "Tu cuenta y tus datos fueron eliminados." });
};
