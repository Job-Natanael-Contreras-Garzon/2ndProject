const { Op } = require("sequelize");
const { sequelize, Post, User, Activity, Offer } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const {
    getOfferError,
    getRespondError,
    getAcceptError,
} = require("../rules/offerRules");

// Enviar una oferta por la publicación de otro usuario
exports.create = async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
        throw new HttpError(404, "Publicación no encontrada.");
    }

    const { offeredPostId, message } = req.body;

    // La oferta necesita un mensaje, un producto o ambos
    if (!offeredPostId && !message?.trim()) {
        throw new HttpError(400, "Escribe un mensaje o elige un producto para ofertar.");
    }
    if (message && message.length > 200) {
        throw new HttpError(400, "El mensaje no puede pasar de 200 caracteres.");
    }

    // Producto que ofrece (opcional)
    let offeredPost = null;
    if (offeredPostId) {
        offeredPost = await Post.findByPk(offeredPostId);
        if (!offeredPost) {
            throw new HttpError(404, "El producto que ofreces no existe.");
        }
    }

    // ¿Ya tiene una oferta pendiente por esta publicación?
    const pendingOffer = await Offer.findOne({
        where: { targetPostId: post.id, proposerId: req.user.id, status: "pendiente" },
    });

    const error = getOfferError(post, req.user.id, offeredPost, pendingOffer);
    if (error) {
        const status = post.userId === req.user.id ? 403 : 400;
        throw new HttpError(status, error);
    }

    const offer = await Offer.create({
        targetPostId: post.id,
        offeredPostId: offeredPost ? offeredPost.id : null,
        proposerId: req.user.id,
        message: message?.trim() || null,
    });

    // Historial de quien envía la oferta
    const owner = await User.findByPk(post.userId);
    await Activity.create({
        userId: req.user.id,
        type: "oferta_enviada",
        postId: post.id,
        postTitle: post.title,
        otherUserName: owner ? owner.name : "Usuario eliminado",
    });

    res.status(201).json({ message: "Oferta enviada.", offer });
};

// Ofertas pendientes que recibió una publicación (solo las ve su dueño)
exports.listByPost = async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
        throw new HttpError(404, "Publicación no encontrada.");
    }
    if (post.userId !== req.user.id) {
        throw new HttpError(403, "Solo el dueño puede ver las ofertas de su publicación.");
    }

    const offers = await Offer.findAll({
        where: { targetPostId: post.id, status: "pendiente" },
        include: [
            { model: User, as: "proposer", attributes: ["id", "name"] },
            {
                model: Post,
                as: "offeredPost",
                attributes: ["id", "title", "category", "condition"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    res.json({ offers });
};

// El dueño acepta una oferta: la publicación queda reservada para quien ofertó
exports.accept = async (req, res) => {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) {
        throw new HttpError(404, "Oferta no encontrada.");
    }
    const post = await Post.findByPk(offer.targetPostId);

    const error = getAcceptError(offer, post, req.user.id);
    if (error) {
        const status = post.userId !== req.user.id ? 403 : 400;
        throw new HttpError(status, error);
    }

    const owner = await User.findByPk(req.user.id);
    const otherOffers = await Offer.findAll({
        where: { targetPostId: post.id, status: "pendiente", id: { [Op.ne]: offer.id } },
    });

    // Todo o nada: si algo falla, no se guarda ningún cambio
    await sequelize.transaction(async (t) => {
        await offer.update({ status: "aceptada" }, { transaction: t });
        await post.update(
            { state: "reservado", reservedById: offer.proposerId },
            { transaction: t },
        );
        await Activity.create(
            {
                userId: offer.proposerId,
                type: "oferta_aceptada",
                postId: post.id,
                postTitle: post.title,
                otherUserName: owner.name,
            },
            { transaction: t },
        );

        // Las demás ofertas pendientes se rechazan solas
        for (const other of otherOffers) {
            await other.update({ status: "rechazada" }, { transaction: t });
            await Activity.create(
                {
                    userId: other.proposerId,
                    type: "oferta_rechazada",
                    postId: post.id,
                    postTitle: post.title,
                    otherUserName: owner.name,
                },
                { transaction: t },
            );
        }
    });

    res.json({ message: "Oferta aceptada.", offer, post });
};

// El dueño rechaza una oferta
exports.reject = async (req, res) => {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) {
        throw new HttpError(404, "Oferta no encontrada.");
    }
    const post = await Post.findByPk(offer.targetPostId);

    const error = getRespondError(offer, post, req.user.id);
    if (error) {
        const status = post.userId !== req.user.id ? 403 : 400;
        throw new HttpError(status, error);
    }

    const owner = await User.findByPk(req.user.id);
    await offer.update({ status: "rechazada" });
    await Activity.create({
        userId: offer.proposerId,
        type: "oferta_rechazada",
        postId: post.id,
        postTitle: post.title,
        otherUserName: owner.name,
    });

    res.json({ message: "Oferta rechazada.", offer });
};
