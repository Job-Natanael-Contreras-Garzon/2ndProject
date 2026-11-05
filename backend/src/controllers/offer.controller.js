const { Op } = require("sequelize");
const { sequelize, Post, User, Activity, Offer, OfferMessage } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const {
    getOfferError,
    getRespondError,
    getAcceptError,
    getCounterError,
    getThreadError,
    getReplyError,
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

    // Primer mensaje del hilo de negociación
    await OfferMessage.create({
        offerId: offer.id,
        senderId: req.user.id,
        kind: "oferta",
        text: message?.trim() || `Ofrece «${offeredPost.title}»`,
    });

    // Historial de quien envía la oferta
    const owner = await User.findByPk(post.userId);
    await Activity.create({
        userId: req.user.id,
        type: "oferta_enviada",
        offerId: offer.id,
        postId: post.id,
        postTitle: post.title,
        otherUserName: owner ? owner.name : "Usuario eliminado",
    });

    res.status(201).json({ message: "Oferta enviada.", offer });
};

// Ofertas pendientes o en contraoferta que recibió una publicación (solo las ve su dueño)
exports.listByPost = async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
        throw new HttpError(404, "Publicación no encontrada.");
    }
    if (post.userId !== req.user.id) {
        throw new HttpError(403, "Solo el dueño puede ver las ofertas de su publicación.");
    }

    const offers = await Offer.findAll({
        where: {
            targetPostId: post.id,
            status: { [Op.in]: ["pendiente", "contraoferta"] },
        },
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
        where: {
            targetPostId: post.id,
            status: { [Op.in]: ["pendiente", "contraoferta"] },
            id: { [Op.ne]: offer.id },
        },
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
                offerId: offer.id,
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
                    offerId: other.id,
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
        offerId: offer.id,
        postId: post.id,
        postTitle: post.title,
        otherUserName: owner.name,
    });

    res.json({ message: "Oferta rechazada.", offer });
};

// El dueño realiza una contraoferta: se registra en el historial de ambos usuarios
exports.counter = async (req, res) => {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) {
        throw new HttpError(404, "Oferta no encontrada.");
    }
    const post = await Post.findByPk(offer.targetPostId);

    const { message } = req.body || {};
    if (!message || !message.trim()) {
        throw new HttpError(400, "Escribe un mensaje para la contraoferta.");
    }
    if (message.length > 200) {
        throw new HttpError(400, "El mensaje no puede pasar de 200 caracteres.");
    }

    const error = getCounterError(offer, post, req.user.id);
    if (error) {
        const status = post.userId !== req.user.id ? 403 : 400;
        throw new HttpError(status, error);
    }

    const owner = await User.findByPk(req.user.id);
    const proposer = await User.findByPk(offer.proposerId);

    await sequelize.transaction(async (t) => {
        await offer.update(
            { status: "contraoferta", message: message.trim() },
            { transaction: t },
        );

        // La contraoferta se suma al hilo sin borrar los mensajes anteriores
        await OfferMessage.create(
            {
                offerId: offer.id,
                senderId: req.user.id,
                kind: "contraoferta",
                text: message.trim(),
            },
            { transaction: t },
        );

        // Historial del dueño que envía la contraoferta
        await Activity.create(
            {
                userId: req.user.id,
                type: "contraoferta_enviada",
                offerId: offer.id,
                postId: post.id,
                postTitle: post.title,
                otherUserName: proposer ? proposer.name : "Usuario eliminado",
            },
            { transaction: t },
        );

        // Historial del ofertante que recibe la contraoferta
        await Activity.create(
            {
                userId: offer.proposerId,
                type: "contraoferta_recibida",
                offerId: offer.id,
                postId: post.id,
                postTitle: post.title,
                otherUserName: owner ? owner.name : "Usuario eliminado",
            },
            { transaction: t },
        );
    });

    res.json({ message: "Contraoferta enviada.", offer });
};

// Ofertas que envió el usuario (con la publicación y su dueño), para ver su negociación
exports.mine = async (req, res) => {
    const offers = await Offer.findAll({
        where: { proposerId: req.user.id },
        include: [
            {
                model: Post,
                as: "targetPost",
                attributes: ["id", "title", "state"],
                include: [{ model: User, as: "owner", attributes: ["id", "name"] }],
            },
        ],
        order: [["updatedAt", "DESC"]],
    });
    res.json({ offers });
};

// Hilo de negociación de una oferta: lo ven el dueño de la publicación y quien ofertó
exports.thread = async (req, res) => {
    const offer = await Offer.findByPk(req.params.id, {
        include: [
            { model: User, as: "proposer", attributes: ["id", "name"] },
            {
                model: Post,
                as: "targetPost",
                attributes: ["id", "title", "state", "userId"],
                include: [{ model: User, as: "owner", attributes: ["id", "name"] }],
            },
            { model: Post, as: "offeredPost", attributes: ["id", "title"] },
        ],
    });
    if (!offer) {
        throw new HttpError(404, "Oferta no encontrada.");
    }

    const error = getThreadError(offer, offer.targetPost, req.user.id);
    if (error) {
        throw new HttpError(403, error);
    }

    const messages = await OfferMessage.findAll({
        where: { offerId: offer.id },
        include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
        order: [["createdAt", "ASC"]],
    });
    res.json({ offer, messages });
};

// Quien ofertó responde a una contraoferta: la oferta vuelve a quedar pendiente para el dueño
exports.reply = async (req, res) => {
    const offer = await Offer.findByPk(req.params.id);
    if (!offer) {
        throw new HttpError(404, "Oferta no encontrada.");
    }
    const post = await Post.findByPk(offer.targetPostId);

    const { message } = req.body || {};
    if (!message || !message.trim()) {
        throw new HttpError(400, "Escribe un mensaje para responder.");
    }
    if (message.length > 200) {
        throw new HttpError(400, "El mensaje no puede pasar de 200 caracteres.");
    }

    const error = getReplyError(offer, post, req.user.id);
    if (error) {
        const status = offer.proposerId !== req.user.id ? 403 : 400;
        throw new HttpError(status, error);
    }

    await sequelize.transaction(async (t) => {
        await offer.update({ status: "pendiente", message: message.trim() }, { transaction: t });
        await OfferMessage.create(
            {
                offerId: offer.id,
                senderId: req.user.id,
                kind: "respuesta",
                text: message.trim(),
            },
            { transaction: t },
        );
    });

    res.json({ message: "Respuesta enviada.", offer });
};
