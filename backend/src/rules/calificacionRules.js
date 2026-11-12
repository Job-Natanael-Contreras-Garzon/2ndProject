// Reglas para calificar un intercambio. Devuelve el mensaje de error, o null si se puede.
function getCalificarError(post, userId, puntaje) {
    if (post.state !== "intercambiado") {
        return "Solo se puede calificar un intercambio completado.";
    }

    if (post.userId !== userId && post.reservedById !== userId) {
        return "Solo el dueño o quien recibió el objeto pueden calificar.";
    }

    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
        return "El puntaje debe ser un número entero de 1 a 5.";
    }

    return null;
}

module.exports = { getCalificarError };
