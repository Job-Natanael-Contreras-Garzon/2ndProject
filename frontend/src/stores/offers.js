import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { pedirApi } from "@/api/client";

export const useOffersStore = defineStore("offers", () => {
    const auth = useAuthStore();

    // Hace la petición con la sesión y devuelve los datos; si el servidor responde con error, lo lanza
    function call(path, options = {}, mensajeError) {
        return pedirApi(path, { ...options, token: auth.token, mensajeError });
    }

    // Enviar una oferta por una publicación (offerData: { offeredPostId, message })
    function sendOffer(postId, offerData) {
        return call(
            `/posts/${postId}/offers`,
            { method: "POST", body: offerData },
            "Error al enviar la oferta",
        );
    }

    // Ofertas pendientes que recibió una publicación propia
    async function fetchOffers(postId) {
        const data = await call(
            `/posts/${postId}/offers`,
            { method: "GET" },
            "Error al cargar las ofertas",
        );
        return data.offers || [];
    }

    function acceptOffer(id) {
        return call(
            `/offers/${id}/accept`,
            { method: "PATCH" },
            "Error al aceptar la oferta",
        );
    }

    function rejectOffer(id) {
        return call(
            `/offers/${id}/reject`,
            { method: "PATCH" },
            "Error al rechazar la oferta",
        );
    }

    function counterOffer(id, counterData) {
        return call(
            `/offers/${id}/counter`,
            { method: "PATCH", body: counterData },
            "Error al enviar la contraoferta",
        );
    }

    // Ofertas que envié yo (con la publicación y su dueño)
    async function fetchMyOffers() {
        const data = await call("/offers/mine", { method: "GET" }, "Error al cargar tus ofertas");
        return data.offers || [];
    }

    // Hilo de negociación de una oferta: { offer, messages }
    function fetchThread(offerId) {
        return call(
            `/offers/${offerId}/thread`,
            { method: "GET" },
            "Error al cargar la negociación",
        );
    }

    // Quien ofertó responde a la contraoferta del dueño
    function replyOffer(offerId, message) {
        return call(
            `/offers/${offerId}/reply`,
            { method: "POST", body: { message } },
            "Error al enviar la respuesta",
        );
    }

    return {
        sendOffer,
        fetchOffers,
        acceptOffer,
        rejectOffer,
        counterOffer,
        fetchMyOffers,
        fetchThread,
        replyOffer,
    };
});
