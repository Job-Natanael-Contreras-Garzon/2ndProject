// Acciones sobre una publicación en "Explorar": hacer una oferta, confirmar la entrega y cancelar.
// Cada acción deja un aviso en pantalla (completado, cancelado, oferta enviada o error).

import { ref } from "vue";

// recargar: vuelve a cargar la lista. mostrarFiltro: aplica filtros en la URL.
// alEnviarOferta: se llama después de enviar una oferta (para refrescar "mis ofertas").
export function useIntercambio({ postsStore, recargar, mostrarFiltro, alEnviarOferta }) {
    const completedPost = ref(null);
    const cancelledPost = ref(null);
    const actionError = ref(null);

    // Oferta: publicación elegida, ventana abierta y aviso de oferta enviada
    const offerPost = ref(null);
    const isOfferOpen = ref(false);
    const offerSent = ref(null);

    // Cancelación: publicación elegida, ventana abierta, estado y error del servidor
    const cancelPost = ref(null);
    const isCancelOpen = ref(false);
    const cancelBusy = ref(false);
    const cancelError = ref("");

    function openOffer(post) {
        actionError.value = null;
        completedPost.value = null;
        offerSent.value = null;
        offerPost.value = post;
        isOfferOpen.value = true;
    }

    function handleOfferSent() {
        offerSent.value = { title: offerPost.value.title, owner: offerPost.value.owner?.name };
        isOfferOpen.value = false;
        alEnviarOferta();
    }

    function showCompleted() {
        completedPost.value = null;
        mostrarFiltro({ state: "intercambiado" });
    }

    function showAvailable() {
        actionError.value = null;
        mostrarFiltro({ state: "disponible" });
    }

    // Cierra uno de los avisos: "completedPost", "cancelledPost", "offerSent" o "actionError"
    function cerrarAviso(nombre) {
        const avisos = { completedPost, cancelledPost, offerSent, actionError };
        avisos[nombre].value = null;
    }

    // Confirmar la entrega: con la confirmación de ambas partes el intercambio se completa
    async function handleConfirm(post) {
        const message =
            `¿Confirmas que recibiste "${post.title}" de ${post.owner?.name}? ` +
            "El intercambio se completará cuando ambas personas confirmen.";
        if (!confirm(message)) return;
        actionError.value = null;
        completedPost.value = null;
        try {
            const data = await postsStore.confirmDelivery(post.id);
            if (data.completed) {
                completedPost.value = { title: post.title, owner: post.owner?.name };
            }
        } catch (err) {
            actionError.value = {
                title: `No se pudo confirmar la entrega de "${post.title}"`,
                text: err.message,
            };
            if (err.network) return;
        }
        recargar();
    }

    function openCancel(post) {
        actionError.value = null;
        completedPost.value = null;
        cancelError.value = "";
        cancelPost.value = post;
        isCancelOpen.value = true;
    }

    // Cancelar el intercambio acordado con un motivo
    async function handleCancel(reason) {
        cancelBusy.value = true;
        cancelError.value = "";
        try {
            await postsStore.cancelExchange(cancelPost.value.id, reason);
            isCancelOpen.value = false;
            cancelledPost.value = { title: cancelPost.value.title };
        } catch (err) {
            cancelError.value = err.message;
            if (err.network) return;
        } finally {
            cancelBusy.value = false;
        }
        recargar();
    }

    return {
        completedPost,
        cancelledPost,
        actionError,
        offerPost,
        isOfferOpen,
        offerSent,
        cancelPost,
        isCancelOpen,
        cancelBusy,
        cancelError,
        openOffer,
        handleOfferSent,
        showCompleted,
        showAvailable,
        cerrarAviso,
        handleConfirm,
        openCancel,
        handleCancel,
    };
}
