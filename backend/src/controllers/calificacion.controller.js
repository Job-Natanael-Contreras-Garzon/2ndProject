const { Post, Calificacion } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const { getCalificarError } = require("../rules/calificacionRules");

// Cada parte califica a la otra una sola vez, de 1 a 5, con comentario opcional.
exports.crear = async (req, res) => {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
        throw new HttpError(404, "Publicación no encontrada.");
    }

    const { puntaje, comentario } = req.body || {};
    const error = getCalificarError(post, req.user.id, puntaje);
    if (error) {
        const esParticipante =
            post.userId === req.user.id || post.reservedById === req.user.id;
        throw new HttpError(esParticipante || post.state !== "intercambiado" ? 400 : 403, error);
    }

    const yaCalifico = await Calificacion.findOne({
        where: { postId: post.id, calificadorId: req.user.id },
    });
    if (yaCalifico) {
        throw new HttpError(400, "Ya calificaste este intercambio.");
    }

    // A quien se califica es la otra parte del intercambio
    const calificadoId = post.userId === req.user.id ? post.reservedById : post.userId;

    const calificacion = await Calificacion.create({
        postId: post.id,
        calificadorId: req.user.id,
        calificadoId,
        puntaje,
        comentario: comentario && comentario.trim() ? comentario.trim() : null,
    });

    res.status(201).json({ message: "Calificación enviada.", calificacion });
};
