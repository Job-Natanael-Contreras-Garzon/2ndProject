// Validación de lo que llega en el cuerpo de las peticiones de ofertas.
// Cada función devuelve un texto con el error, o null si todo está bien.

const MAX_MENSAJE = 200;

// Mensaje obligatorio (contraoferta, respuesta): no vacío y de hasta 200 caracteres
function validarMensajeObligatorio(message, textoVacio) {
    if (!message || !message.trim()) return textoVacio;
    if (message.length > MAX_MENSAJE) return `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.`;
    return null;
}

// Oferta nueva: necesita un mensaje, un producto o ambos
function validarNuevaOferta({ offeredPostId, message } = {}) {
    if (!offeredPostId && !message?.trim()) {
        return "Escribe un mensaje o elige un producto para ofertar.";
    }
    if (message && message.length > MAX_MENSAJE) {
        return `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.`;
    }
    return null;
}

const validarContraoferta = (message) =>
    validarMensajeObligatorio(message, "Escribe un mensaje para la contraoferta.");

const validarRespuesta = (message) =>
    validarMensajeObligatorio(message, "Escribe un mensaje para responder.");

module.exports = { MAX_MENSAJE, validarNuevaOferta, validarContraoferta, validarRespuesta };
