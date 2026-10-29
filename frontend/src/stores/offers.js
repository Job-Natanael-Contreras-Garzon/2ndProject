import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";

const API_URL = import.meta.env.VITE_API_URL;

const NETWORK_ERROR_MESSAGE =
    "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo en unos segundos.";

async function request(url, options) {
    try {
        return await fetch(url, options);
    } catch {
        const err = new Error(NETWORK_ERROR_MESSAGE);
        err.network = true;
        throw err;
    }
}

export const useOffersStore = defineStore("offers", () => {
    const auth = useAuthStore();

    function getHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
        };
    }

    // Hace la petición y devuelve los datos; si el servidor responde con error, lo lanza
    async function call(path, options, defaultMessage) {
        const res = await request(`${API_URL}${path}`, {
            ...options,
            headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || data.error || defaultMessage);
        }
        return data;
    }

    // Enviar una oferta por una publicación (offerData: { offeredPostId, message })
    function sendOffer(postId, offerData) {
        return call(
            `/posts/${postId}/offers`,
            { method: "POST", body: JSON.stringify(offerData) },
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

    return { sendOffer, fetchOffers, acceptOffer, rejectOffer };
});
