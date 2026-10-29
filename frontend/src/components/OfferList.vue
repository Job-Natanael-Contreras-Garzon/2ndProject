<script setup>
import { ref, onMounted } from "vue";
import { useOffersStore } from "@/stores/offers";

const props = defineProps({
    // Publicación propia de la que se ven las ofertas recibidas
    post: {
        type: Object,
        required: true,
    },
});

// "answered" avisa que se aceptó o rechazó una oferta (action: "accept" | "reject")
const emit = defineEmits(["answered", "close"]);

const offersStore = useOffersStore();

const categoryLabels = {
    libros: "Libros",
    electronica: "Electrónica",
    ropa: "Ropa",
    otros: "Otros",
};
const conditionLabels = { nuevo: "Nuevo", usado: "Usado" };

const offers = ref([]);
const loading = ref(false);
const error = ref("");
const busyId = ref(null);

async function loadOffers() {
    loading.value = true;
    error.value = "";
    try {
        offers.value = await offersStore.fetchOffers(props.post.id);
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function answer(offer, action) {
    if (action === "accept") {
        const message = `¿Aceptas la oferta de ${offer.proposer?.name}? ` +
            `"${props.post.title}" quedará reservado para esa persona y las demás ofertas se rechazarán.`;
        if (!confirm(message)) return;
    }

    error.value = "";
    busyId.value = offer.id;
    try {
        if (action === "accept") {
            await offersStore.acceptOffer(offer.id);
        } else {
            await offersStore.rejectOffer(offer.id);
        }
        emit("answered", action);
        // Al aceptar, la ventana se cierra sola: no hay nada más que mostrar
        if (action === "accept") return;
    } catch (err) {
        error.value = err.message;
    } finally {
        busyId.value = null;
    }
    // Se recarga la lista para mostrar lo que queda pendiente
    await loadOffers();
}

onMounted(loadOffers);
</script>

<template>
    <div>
        <p class="text-sm text-base-content/70 mb-3">
            Ofertas por <strong>{{ post.title }}</strong>
        </p>

        <div v-if="error" role="alert" class="alert alert-error shadow-sm text-sm py-2 px-3 mb-3">
            <span>{{ error }}</span>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <p v-else-if="offers.length === 0 && !error" class="text-sm text-base-content/60 py-4">
            Todavía no hay ofertas pendientes para esta publicación.
        </p>

        <ul v-else class="flex flex-col gap-3">
            <li v-for="offer in offers" :key="offer.id"
                class="card bg-base-100 border border-base-300 p-4 flex flex-col gap-2">
                <p class="font-semibold">{{ offer.proposer?.name }}</p>

                <p v-if="offer.offeredPost" class="text-sm">
                    Ofrece <strong>{{ offer.offeredPost.title }}</strong>
                    <span class="text-base-content/60">
                        ({{ categoryLabels[offer.offeredPost.category] || offer.offeredPost.category }},
                        {{ conditionLabels[offer.offeredPost.condition] || offer.offeredPost.condition }})
                    </span>
                </p>
                <p v-else class="text-sm text-base-content/60">No ofrece un producto, solo un mensaje.</p>

                <p v-if="offer.message" class="text-sm italic">«{{ offer.message }}»</p>

                <div class="flex flex-wrap gap-2 mt-1">
                    <button type="button" @click="answer(offer, 'accept')" :disabled="busyId !== null"
                        class="btn btn-success btn-sm">Aceptar</button>
                    <button type="button" @click="answer(offer, 'reject')" :disabled="busyId !== null"
                        class="btn btn-ghost btn-sm">Rechazar</button>
                </div>
            </li>
        </ul>

        <div class="modal-action mt-6">
            <button type="button" @click="$emit('close')" class="btn btn-primary">Cerrar</button>
        </div>
    </div>
</template>
