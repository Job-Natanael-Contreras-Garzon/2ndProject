// Consultas y cambios en la base de datos para las ofertas.
// El controlador decide qué responder; aquí solo se guarda y se lee.

const { Op } = require("sequelize");
const { sequelize, Post, User, Activity, Offer, OfferMessage } = require("../models");

const ESTADOS_ABIERTOS = ["pendiente", "contraoferta"];

// Guarda una línea del historial de un usuario
function registrarActividad(userId, type, offer, post, otherUserName, transaction) {
    return Activity.create(
        {
            userId,
            type,
            offerId: offer.id,
            postId: post.id,
            postTitle: post.title,
            otherUserName,
        },
        { transaction },
    );
}

// Oferta nueva + primer mensaje del hilo + historial de quien ofertó
async function crearOferta({ post, offeredPost, proposerId, message }) {
    const offer = await Offer.create({
        targetPostId: post.id,
        offeredPostId: offeredPost ? offeredPost.id : null,
        proposerId,
        message: message?.trim() || null,
    });

    await OfferMessage.create({
        offerId: offer.id,
        senderId: proposerId,
        kind: "oferta",
        text: message?.trim() || `Ofrece «${offeredPost.title}»`,
    });

    const owner = await User.findByPk(post.userId);
    await registrarActividad(
        proposerId,
        "oferta_enviada",
        offer,
        post,
        owner ? owner.name : "Usuario eliminado",
    );
    return offer;
}

// Ofertas pendientes o en contraoferta que recibió una publicación
function listarRecibidas(postId) {
    return Offer.findAll({
        where: { targetPostId: postId, status: { [Op.in]: ESTADOS_ABIERTOS } },
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
}

// Acepta una oferta, reserva la publicación y rechaza las demás. Todo o nada.
async function aceptar({ offer, post, owner }) {
    const otras = await Offer.findAll({
        where: {
            targetPostId: post.id,
            status: { [Op.in]: ESTADOS_ABIERTOS },
            id: { [Op.ne]: offer.id },
        },
    });

    await sequelize.transaction(async (t) => {
        await offer.update({ status: "aceptada" }, { transaction: t });
        await post.update({ state: "reservado", reservedById: offer.proposerId }, { transaction: t });
        await registrarActividad(offer.proposerId, "oferta_aceptada", offer, post, owner.name, t);

        for (const otra of otras) {
            await otra.update({ status: "rechazada" }, { transaction: t });
            await registrarActividad(otra.proposerId, "oferta_rechazada", otra, post, owner.name, t);
        }
    });
}

async function rechazar({ offer, post, owner }) {
    await offer.update({ status: "rechazada" });
    await registrarActividad(offer.proposerId, "oferta_rechazada", offer, post, owner.name);
}

// Contraoferta del dueño: se suma al hilo y queda en el historial de ambos
async function contraofertar({ offer, post, owner, message }) {
    const proposer = await User.findByPk(offer.proposerId);
    const texto = message.trim();

    await sequelize.transaction(async (t) => {
        await offer.update({ status: "contraoferta", message: texto }, { transaction: t });
        await OfferMessage.create(
            { offerId: offer.id, senderId: owner.id, kind: "contraoferta", text: texto },
            { transaction: t },
        );
        await registrarActividad(
            owner.id,
            "contraoferta_enviada",
            offer,
            post,
            proposer ? proposer.name : "Usuario eliminado",
            t,
        );
        await registrarActividad(offer.proposerId, "contraoferta_recibida", offer, post, owner.name, t);
    });
}

// Quien ofertó responde: la oferta vuelve a quedar pendiente para el dueño
async function responder({ offer, userId, message }) {
    const texto = message.trim();
    await sequelize.transaction(async (t) => {
        await offer.update({ status: "pendiente", message: texto }, { transaction: t });
        await OfferMessage.create(
            { offerId: offer.id, senderId: userId, kind: "respuesta", text: texto },
            { transaction: t },
        );
    });
}

// Ofertas que envió un usuario, con la publicación y su dueño
function listarEnviadas(userId) {
    return Offer.findAll({
        where: { proposerId: userId },
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
}

// Oferta con todo lo necesario para mostrar su hilo
function buscarConHilo(id) {
    return Offer.findByPk(id, {
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
}

function listarMensajes(offerId) {
    return OfferMessage.findAll({
        where: { offerId },
        include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
        order: [["createdAt", "ASC"]],
    });
}

module.exports = {
    crearOferta,
    listarRecibidas,
    aceptar,
    rechazar,
    contraofertar,
    responder,
    listarEnviadas,
    buscarConHilo,
    listarMensajes,
};
