// Reglas para enviar una oferta.
// offeredPost es el producto que ofrece (puede ser null) y pendingOffer
// es una oferta pendiente que el mismo usuario ya hizo por esta publicación (o null).
function getOfferError(post, userId, offeredPost, pendingOffer) {
    if (post.userId === userId) {
        return "No puedes ofertar por tu propia publicación.";
    }

    if (post.state !== "disponible") {
        return "Solo puedes ofertar por una publicación disponible.";
    }

    if (pendingOffer) {
        return "Ya tienes una oferta pendiente por esta publicación.";
    }

    if (offeredPost && offeredPost.userId !== userId) {
        return "Solo puedes ofrecer un producto tuyo.";
    }

    if (offeredPost && offeredPost.state !== "disponible") {
        return "El producto que ofreces debe estar disponible.";
    }

    return null;
}

// Reglas para aceptar o rechazar una oferta.
function getRespondError(offer, post, userId) {
    if (post.userId !== userId) {
        return "Solo el dueño de la publicación puede responder ofertas.";
    }

    if (offer.status !== "pendiente") {
        return "Esta oferta ya fue respondida.";
    }

    return null;
}

// Aceptar además exige que la publicación siga disponible.
function getAcceptError(offer, post, userId) {
    const error = getRespondError(offer, post, userId);
    if (error) return error;

    if (post.state !== "disponible") {
        return "La publicación ya no está disponible.";
    }

    return null;
}

module.exports = { getOfferError, getRespondError, getAcceptError };
