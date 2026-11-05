const { Op } = require("sequelize");
const { Activity, Post } = require("../models");
const { HttpError } = require("../middleware/errorHandler");

exports.list = async (req, res) => {
    const where = { userId: req.user.id };
    if (req.query.type === "reservas") {
        where.type = { [Op.in]: ["reservado", "reserva_liberada"] };
    }
    if (req.query.type === "intercambios") {
        where.type = "intercambio_completado";
    }
    if (req.query.type === "ofertas") {
        where.type = {
            [Op.in]: [
                "oferta_enviada",
                "oferta_aceptada",
                "oferta_rechazada",
                "contraoferta_enviada",
                "contraoferta_recibida",
            ],
        };
    }
    if (req.query.type === "cancelaciones") {
        where.type = "intercambio_cancelado";
    }

    const activities = await Activity.findAll({
        where,
        order: [["createdAt", "DESC"]],
    });
    res.json({ activities });
};

exports.detail = async (req, res) => {
    const activity = await Activity.findOne({
        where: { id: req.params.id, userId: req.user.id },
        include: [
            {
                model: Post,
                attributes: ["id", "title", "category", "condition", "state"],
            },
        ],
    });

    if (!activity) {
        throw new HttpError(404, "Actividad no encontrada.");
    }

    res.json({ activity });
};
