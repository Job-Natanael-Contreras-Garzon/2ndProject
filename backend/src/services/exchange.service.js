// Cambios en la base de datos cuando un intercambio se confirma o se cancela.
// El controlador valida con las reglas (rules/postRules.js) y responde; aquí solo se guarda.

const { sequelize, User, Activity, Offer, OfferMessage } = require("../models");

async function getUserName(id) {
    const user = await User.findByPk(id);
    return user ? user.name : "Usuario eliminado";
}

// Una de las partes confirma la entrega. Devuelve true si con esta confirmación se completó.
async function confirmarEntrega({ post, userId }) {
    const isOwner = post.userId === userId;
    const otherId = isOwner ? post.reservedById : post.userId;
    const flags = isOwner ? { ownerConfirmed: true } : { receiverConfirmed: true };
    const ownerDone = isOwner || post.ownerConfirmed;
    const receiverDone = !isOwner || post.receiverConfirmed;
    const completed = Boolean(ownerDone && receiverDone);

    const myName = await getUserName(userId);
    const otherName = await getUserName(otherId);

    await post.update(completed ? { ...flags, state: "intercambiado" } : flags);

    // Historial de ambas partes: quién confirmó la entrega
    await Activity.create({
        userId,
        type: "entrega_confirmada",
        role: isOwner ? "entregador" : "receptor",
        postId: post.id,
        postTitle: post.title,
        otherUserName: otherName,
        actorId: userId,
    });
    await Activity.create({
        userId: otherId,
        type: "entrega_confirmada",
        role: isOwner ? "receptor" : "entregador",
        postId: post.id,
        postTitle: post.title,
        otherUserName: myName,
        actorId: userId,
    });

    if (completed) {
        await Activity.create({
            userId: post.reservedById,
            type: "intercambio_completado",
            role: "receptor",
            postId: post.id,
            postTitle: post.title,
            otherUserName: await getUserName(post.userId),
        });
        await Activity.create({
            userId: post.userId,
            type: "intercambio_completado",
            role: "entregador",
            postId: post.id,
            postTitle: post.title,
            otherUserName: await getUserName(post.reservedById),
        });
    }
    return completed;
}

// Cualquiera de las dos partes cancela con motivo: la publicación vuelve a estar disponible
// y la oferta aceptada queda cancelada con el motivo en su hilo.
async function cancelarIntercambio({ post, userId, reason }) {
    const text = reason.trim();
    const isOwner = post.userId === userId;
    const otherId = isOwner ? post.reservedById : post.userId;
    const myName = await getUserName(userId);
    const otherName = await getUserName(otherId);

    await sequelize.transaction(async (t) => {
        await post.update(
            {
                state: "disponible",
                reservedById: null,
                ownerConfirmed: false,
                receiverConfirmed: false,
            },
            { transaction: t },
        );

        // Las demás ofertas ya estaban rechazadas y siguen así.
        const accepted = await Offer.findOne({
            where: {
                targetPostId: post.id,
                proposerId: isOwner ? otherId : userId,
                status: "aceptada",
            },
            transaction: t,
        });
        if (accepted) {
            await accepted.update({ status: "cancelada" }, { transaction: t });
            await OfferMessage.create(
                {
                    offerId: accepted.id,
                    senderId: userId,
                    kind: "sistema",
                    text: `${myName} canceló el intercambio. Motivo: ${text}`,
                },
                { transaction: t },
            );
        }

        await Activity.create(
            {
                userId,
                type: "intercambio_cancelado",
                role: isOwner ? "entregador" : "receptor",
                postId: post.id,
                postTitle: post.title,
                otherUserName: otherName,
                actorId: userId,
                reason: text,
            },
            { transaction: t },
        );
        await Activity.create(
            {
                userId: otherId,
                type: "intercambio_cancelado",
                role: isOwner ? "receptor" : "entregador",
                postId: post.id,
                postTitle: post.title,
                otherUserName: myName,
                actorId: userId,
                reason: text,
            },
            { transaction: t },
        );
    });
}

module.exports = { getUserName, confirmarEntrega, cancelarIntercambio };
