const REASON_MIN = 5;
const REASON_MAX = 200;

// Reglas para confirmar la entrega: cada parte confirma una sola vez y, con ambas
// confirmaciones, el intercambio pasa a completado.
function getConfirmError(post, userId) {
    if (post.state !== "reservado") {
        return "Solo puedes confirmar la entrega de una publicación reservada.";
    }

    if (post.userId !== userId && post.reservedById !== userId) {
        return "Solo el dueño o quien reservó pueden confirmar la entrega.";
    }

    const alreadyConfirmed =
        post.userId === userId ? post.ownerConfirmed : post.receiverConfirmed;
    if (alreadyConfirmed) {
        return "Ya confirmaste la entrega. Falta la confirmación de la otra parte.";
    }

    return null;
}

// Reglas para cancelar un intercambio acordado antes de completarse: solo las dos partes
// y siempre con un motivo.
function getCancelError(post, userId, reason) {
    if (post.state !== "reservado") {
        return "Solo puedes cancelar el intercambio de una publicación reservada.";
    }

    if (post.userId !== userId && post.reservedById !== userId) {
        return "Solo el dueño o quien reservó pueden cancelar el intercambio.";
    }

    const text = typeof reason === "string" ? reason.trim() : "";
    if (!text) {
        return "Escribe el motivo de la cancelación.";
    }
    if (text.length < REASON_MIN) {
        return `El motivo debe tener al menos ${REASON_MIN} caracteres.`;
    }
    if (text.length > REASON_MAX) {
        return `El motivo no puede pasar de ${REASON_MAX} caracteres.`;
    }

    return null;
}

function getReserveError(post, userId) {
    if (post.state === "intercambiado") {
        return "No puedes reservar una publicación intercambiada.";
    }

    if (post.state === "disponible" && post.userId === userId) {
        return "No puedes reservar tu propia publicación.";
    }

    if (
        post.state === "reservado" &&
        post.userId !== userId &&
        post.reservedById !== userId
    ) {
        return "Solo el dueño o quien reservó pueden liberar la reserva.";
    }

    return null;
}

function getEditError(post, accion) {
    if (post.state === "reservado") {
        return `No puedes ${accion} una publicación reservada.`;
    }

    if (post.state === "intercambiado") {
        return `No puedes ${accion} una publicación intercambiada.`;
    }

    return null;
}

module.exports = {
    getConfirmError,
    getCancelError,
    getReserveError,
    getEditError,
};
