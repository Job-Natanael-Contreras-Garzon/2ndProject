const { Post, User, Offer } = require("../models");
const { HttpError } = require("../middleware/errorHandler");
const {
    getOfferError,
    getRespondError,
    getAcceptError,
    getCounterError,
    getThreadError,
    getReplyError,
} = require("../rules/offerRules");
const {
    validarNuevaOferta,
    validarContraoferta,
    validarRespuesta,
} = require("../validators/offerValidator");
const ofertas = require("../services/offer.service");

// Cada función de aquí hace tres cosas: lee la petición, llama a la regla o al servicio y responde.

async function buscarPublicacion(id) {
    const post = await Post.findByPk(id);
    if (!post) throw new HttpError(404, "Publicación no encontrada.");
    return post;
}

// Oferta y la publicación por la que se ofertó
async function buscarOfertaConPublicacion(id) {
    const offer = await Offer.findByPk(id);
    if (!offer) throw new HttpError(404, "Oferta no encontrada.");
    const post = await Post.findByPk(offer.targetPostId);
    return { offer, post };
}

// Si la regla devuelve un error, se responde 403 cuando quien actúa no es el dueño esperado
function lanzarSiHayError(error, esQuienCorresponde) {
    if (error) throw new HttpError(esQuienCorresponde ? 400 : 403, error);
}

// Enviar una oferta por la publicación de otro usuario
exports.create = async (req, res) => {
    const post = await buscarPublicacion(req.params.id);

    const errorCuerpo = validarNuevaOferta(req.body);
    if (errorCuerpo) throw new HttpError(400, errorCuerpo);

    // Producto que ofrece (opcional)
    const { offeredPostId, message } = req.body;
    let offeredPost = null;
    if (offeredPostId) {
        offeredPost = await Post.findByPk(offeredPostId);
        if (!offeredPost) throw new HttpError(404, "El producto que ofreces no existe.");
    }

    // ¿Ya tiene una oferta pendiente por esta publicación?
    const pendingOffer = await Offer.findOne({
        where: { targetPostId: post.id, proposerId: req.user.id, status: "pendiente" },
    });

    const error = getOfferError(post, req.user.id, offeredPost, pendingOffer);
    lanzarSiHayError(error, post.userId !== req.user.id);

    const offer = await ofertas.crearOferta({
        post,
        offeredPost,
        proposerId: req.user.id,
        message,
    });
    res.status(201).json({ message: "Oferta enviada.", offer });
};

// Ofertas pendientes o en contraoferta que recibió una publicación (solo las ve su dueño)
exports.listByPost = async (req, res) => {
    const post = await buscarPublicacion(req.params.id);
    if (post.userId !== req.user.id) {
        throw new HttpError(403, "Solo el dueño puede ver las ofertas de su publicación.");
    }
    res.json({ offers: await ofertas.listarRecibidas(post.id) });
};

// El dueño acepta una oferta: la publicación queda reservada para quien ofertó
exports.accept = async (req, res) => {
    const { offer, post } = await buscarOfertaConPublicacion(req.params.id);
    lanzarSiHayError(getAcceptError(offer, post, req.user.id), post.userId === req.user.id);

    const owner = await User.findByPk(req.user.id);
    await ofertas.aceptar({ offer, post, owner });
    res.json({ message: "Oferta aceptada.", offer, post });
};

// El dueño rechaza una oferta
exports.reject = async (req, res) => {
    const { offer, post } = await buscarOfertaConPublicacion(req.params.id);
    lanzarSiHayError(getRespondError(offer, post, req.user.id), post.userId === req.user.id);

    const owner = await User.findByPk(req.user.id);
    await ofertas.rechazar({ offer, post, owner });
    res.json({ message: "Oferta rechazada.", offer });
};

// El dueño realiza una contraoferta: se registra en el historial de ambos usuarios
exports.counter = async (req, res) => {
    const { offer, post } = await buscarOfertaConPublicacion(req.params.id);

    const { message } = req.body || {};
    const errorCuerpo = validarContraoferta(message);
    if (errorCuerpo) throw new HttpError(400, errorCuerpo);

    lanzarSiHayError(getCounterError(offer, post, req.user.id), post.userId === req.user.id);

    const owner = await User.findByPk(req.user.id);
    await ofertas.contraofertar({ offer, post, owner, message });
    res.json({ message: "Contraoferta enviada.", offer });
};

// Ofertas que envió el usuario (con la publicación y su dueño), para ver su negociación
exports.mine = async (req, res) => {
    res.json({ offers: await ofertas.listarEnviadas(req.user.id) });
};

// Hilo de negociación de una oferta: lo ven el dueño de la publicación y quien ofertó
exports.thread = async (req, res) => {
    const offer = await ofertas.buscarConHilo(req.params.id);
    if (!offer) throw new HttpError(404, "Oferta no encontrada.");

    const error = getThreadError(offer, offer.targetPost, req.user.id);
    if (error) throw new HttpError(403, error);

    res.json({ offer, messages: await ofertas.listarMensajes(offer.id) });
};

// Quien ofertó responde a una contraoferta: la oferta vuelve a quedar pendiente para el dueño
exports.reply = async (req, res) => {
    const { offer, post } = await buscarOfertaConPublicacion(req.params.id);

    const { message } = req.body || {};
    const errorCuerpo = validarRespuesta(message);
    if (errorCuerpo) throw new HttpError(400, errorCuerpo);

    lanzarSiHayError(getReplyError(offer, post, req.user.id), offer.proposerId === req.user.id);

    await ofertas.responder({ offer, userId: req.user.id, message });
    res.json({ message: "Respuesta enviada.", offer });
};
