// Ofertas que envié yo: permiten ver la negociación desde la tarjeta de cada publicación.

import { ref, computed } from "vue";
import { useOffersStore } from "@/stores/offers";

export function useOfertasEnviadas() {
    const offersStore = useOffersStore();
    const myOffers = ref([]);
    const threadOffer = ref(null);
    const isThreadOpen = ref(false);

    async function loadMyOffers() {
        try {
            myOffers.value = await offersStore.fetchMyOffers();
        } catch {
            myOffers.value = [];
        }
    }

    // Oferta más reciente que envié por cada publicación (la lista llega de más nueva a más vieja)
    const offerByPost = computed(() => {
        const map = {};
        for (const offer of myOffers.value) {
            if (!map[offer.targetPostId]) map[offer.targetPostId] = offer;
        }
        return map;
    });

    function hasActiveOffer(post) {
        const status = offerByPost.value[post.id]?.status;
        return status === "pendiente" || status === "contraoferta";
    }

    function openThread(post) {
        threadOffer.value = offerByPost.value[post.id];
        isThreadOpen.value = true;
    }

    return { myOffers, threadOffer, isThreadOpen, offerByPost, loadMyOffers, hasActiveOffer, openThread };
}
