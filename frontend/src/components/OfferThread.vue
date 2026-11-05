<script setup>
import { ref, computed, onMounted } from "vue";
import { useOffersStore } from "@/stores/offers";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
    // Oferta de la que se ve la negociación
    offerId: {
        type: String,
        required: true,
    },
});

// "replied" avisa que quien ofertó respondió a una contraoferta
const emit = defineEmits(["replied"]);

const offersStore = useOffersStore();
const authStore = useAuthStore();

const offer = ref(null);
const messages = ref([]);
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const reply = ref("");

const kindLabels = {
    oferta: "Oferta",
    contraoferta: "Contraoferta",
    respuesta: "Respuesta",
    sistema: "Aviso",
};
const statusLabels = {
    pendiente: "Esperando respuesta del dueño",
    contraoferta: "Contraoferta enviada: esperando respuesta de quien ofertó",
    aceptada: "Oferta aceptada",
    rechazada: "Oferta rechazada",
    cancelada: "Intercambio cancelado",
};

const isProposer = computed(() => offer.value?.proposerId === authStore.user?.id);
// Solo quien ofertó puede responder, y solo cuando el dueño le envió una contraoferta
const canReply = computed(() => isProposer.value && offer.value?.status === "contraoferta");

function senderName(message) {
    return message.senderId === authStore.user?.id ? "Tú" : message.sender?.name || "Usuario eliminado";
}

function formatDate(value) {
    return new Date(value).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" });
}

async function load() {
    loading.value = true;
    error.value = "";
    try {
        const data = await offersStore.fetchThread(props.offerId);
        offer.value = data.offer;
        messages.value = data.messages;
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function sendReply() {
    error.value = "";
    if (!reply.value.trim()) {
        error.value = "Escribe un mensaje para responder.";
        return;
    }
    sending.value = true;
    try {
        await offersStore.replyOffer(props.offerId, reply.value.trim());
        reply.value = "";
        emit("replied");
        await load();
    } catch (err) {
        error.value = err.message;
    } finally {
        sending.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div data-testid="offer-thread">
        <div v-if="loading" class="flex justify-center py-6">
            <span class="loading loading-spinner loading-md text-primary"></span>
        </div>

        <template v-else-if="offer">
            <p class="text-sm text-base-content/70 mb-3">
                <strong>{{ offer.targetPost?.title }}</strong>
                · {{ offer.targetPost?.owner?.name }} y {{ offer.proposer?.name }}
            </p>

            <ul class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                <li v-for="message in messages" :key="message.id" class="chat"
                    :class="message.senderId === authStore.user?.id ? 'chat-end' : 'chat-start'">
                    <div class="chat-header text-xs opacity-70">
                        {{ senderName(message) }} · {{ kindLabels[message.kind] }}
                        <time class="ml-1">{{ formatDate(message.createdAt) }}</time>
                    </div>
                    <div class="chat-bubble text-sm"
                        :class="message.senderId === authStore.user?.id ? 'chat-bubble-primary' : ''">
                        {{ message.text }}
                    </div>
                </li>
            </ul>

            <p class="text-xs font-semibold mt-3" data-testid="thread-status">
                {{ statusLabels[offer.status] || offer.status }}
            </p>

            <form v-if="canReply" @submit.prevent="sendReply" class="mt-3 flex flex-col gap-2 border-t border-base-300 pt-3">
                <textarea v-model="reply" maxlength="200" rows="2" aria-label="Tu respuesta"
                    placeholder="Ej. Acepto, te llevo los apuntes mañana"
                    class="textarea textarea-bordered w-full text-sm focus:textarea-primary"></textarea>
                <div class="flex justify-end">
                    <button type="submit" :disabled="sending" class="btn btn-primary btn-sm">Responder</button>
                </div>
            </form>
        </template>

        <div v-if="error" role="alert" class="alert alert-error shadow-sm text-sm py-2 px-3 mt-3">
            <span>{{ error }}</span>
        </div>
    </div>
</template>
