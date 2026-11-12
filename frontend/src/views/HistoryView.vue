<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/stores/activity";
import { useAuthStore } from "@/stores/auth";
import { track } from "@/utils/analitica";

import PageTitle from "@/components/PageTitle.vue";
import StateBadge from "@/components/StateBadge.vue";
import Modal from "@/components/Modal.vue";
import OfferThread from "@/components/OfferThread.vue";

const API_URL = import.meta.env.VITE_API_URL;
const route = useRoute();
const router = useRouter();
const activityStore = useActivityStore();
const authStore = useAuthStore();
const { activities, loading, error } = storeToRefs(activityStore);

const tabs = [
    { value: "", label: "Todos" },
    { value: "reservas", label: "Reservas" },
    { value: "intercambios", label: "Intercambios" },
    { value: "ofertas", label: "Ofertas" },
    { value: "cancelaciones", label: "Cancelaciones" },
];
const typeValues = tabs.map((tab) => tab.value).filter(Boolean);
const categoryLabels = {
    libros: "Libros",
    electronica: "Electrónica",
    ropa: "Ropa",
    otros: "Otros",
};
const conditionLabels = { nuevo: "Nuevo", usado: "Usado" };

const showDetail = ref(false);
const detail = ref(null);
const detailLoading = ref(false);
const detailError = ref(null);

// Calificación del intercambio completado
const puntaje = ref(5);
const comentario = ref("");
const enviando = ref(false);
const mensajeCalificacion = ref("");
const errorCalificacion = ref("");

const type = computed(() => {
    const value = route.query.type;
    return typeValues.includes(value) ? value : "";
});

const emptyText = computed(() => {
    if (type.value === "reservas") {
        return "Todavía no tienes reservas registradas.";
    }
    if (type.value === "ofertas") {
        return "Todavía no tienes ofertas ni contraofertas registradas.";
    }
    if (type.value === "cancelaciones") {
        return "No has cancelado ni te han cancelado ningún intercambio.";
    }
    return "Todavía no has completado ningún intercambio.";
});

function selectTab(value) {
    router.push({ name: "history", query: value ? { type: value } : {} });
}

function loadActivities() {
    activityStore.fetchActivities(type.value);
}

function describe(activity) {
    const title = `«${activity.postTitle}»`;
    if (activity.type === "reservado") {
        return `Reservaste ${title} de ${activity.otherUserName}`;
    }
    if (activity.type === "reserva_liberada") {
        return `Liberaste la reserva de ${title} de ${activity.otherUserName}`;
    }
    if (activity.type === "oferta_enviada") {
        return `Enviaste una oferta por ${title} a ${activity.otherUserName}`;
    }
    if (activity.type === "oferta_aceptada") {
        return `${activity.otherUserName} aceptó tu oferta por ${title}`;
    }
    if (activity.type === "oferta_rechazada") {
        return `${activity.otherUserName} rechazó tu oferta por ${title}`;
    }
    if (activity.type === "contraoferta_enviada") {
        return `Enviaste una contraoferta por ${title} a ${activity.otherUserName}`;
    }
    if (activity.type === "contraoferta_recibida") {
        return `Recibiste una contraoferta por ${title} de ${activity.otherUserName}`;
    }
    if (activity.type === "entrega_confirmada") {
        return activity.actorId === authStore.user?.id
            ? `Confirmaste la entrega de ${title} con ${activity.otherUserName}`
            : `${activity.otherUserName} confirmó la entrega de ${title}`;
    }
    if (activity.type === "intercambio_cancelado") {
        return activity.actorId === authStore.user?.id
            ? `Cancelaste el intercambio de ${title} con ${activity.otherUserName}`
            : `${activity.otherUserName} canceló el intercambio de ${title}`;
    }
    if (activity.role === "receptor") {
        return `Recibiste ${title} de ${activity.otherUserName}`;
    }
    return `Entregaste ${title} a ${activity.otherUserName}`;
}

function formatDate(value) {
    return new Date(value).toLocaleString("es", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatFullDate(value) {
    return new Date(value).toLocaleString("es", {
        dateStyle: "long",
        timeStyle: "short",
    });
}

async function openDetail(activity) {
    detail.value = null;
    detailError.value = null;
    detailLoading.value = true;
    showDetail.value = true;
    puntaje.value = 5;
    comentario.value = "";
    mensajeCalificacion.value = "";
    errorCalificacion.value = "";
    try {
        detail.value = await activityStore.fetchActivity(activity.id);
        if (detail.value.type === "intercambio_completado") {
            track("calificacion_iniciada");
        }
    } catch (err) {
        detailError.value = err.message;
    } finally {
        detailLoading.value = false;
    }
}

// Cada parte califica a la otra una sola vez (el backend rechaza una segunda calificación)
async function enviarCalificacion() {
    mensajeCalificacion.value = "";
    errorCalificacion.value = "";
    enviando.value = true;
    try {
        const res = await fetch(`${API_URL}/posts/${detail.value.postId}/calificacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authStore.token}`,
            },
            body: JSON.stringify({ puntaje: Number(puntaje.value), comentario: comentario.value }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "No se pudo enviar la calificación.");
        }
        mensajeCalificacion.value = "Calificación enviada. ¡Gracias!";
        track("calificacion_enviada", { puntaje: Number(puntaje.value) });
    } catch (err) {
        errorCalificacion.value = err.message;
    } finally {
        enviando.value = false;
    }
}

watch(type, loadActivities, { immediate: true });
</script>

<template>
    <div class="mx-auto max-w-3xl p-6">
        <PageTitle title="Historial" subtitle="Revisa tus ofertas, confirmaciones de entrega, cancelaciones y los intercambios que completaste" />

        <div role="tablist" class="tabs tabs-box mt-6">
            <button v-for="tab in tabs" :key="tab.value" type="button" role="tab" @click="selectTab(tab.value)"
                class="tab h-12 flex-1 text-base" :class="{ 'tab-active': type === tab.value }"
                :aria-selected="type === tab.value">
                {{ tab.label }}
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="error" class="alert alert-error shadow-sm mt-6 flex justify-between">
            <span>{{ error }}</span>
            <button type="button" @click="loadActivities" class="btn btn-sm">Reintentar</button>
        </div>

        <template v-else>
            <ul v-if="activities.length > 0" class="mt-6 flex flex-col gap-3">
                <li v-for="activity in activities" :key="activity.id">
                    <button type="button" @click="openDetail(activity)"
                        class="card bg-base-100 shadow-sm border border-base-300 w-full cursor-pointer flex-row items-center gap-4 p-5 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary">
                        <svg v-if="activity.type === 'reservado'" xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-warning">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                        <svg v-else-if="activity.type === 'reserva_liberada'" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-base-content/60">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                        </svg>
                        <svg v-else-if="activity.type === 'oferta_enviada' || activity.type === 'contraoferta_enviada' || activity.type === 'contraoferta_recibida'"
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="h-8 w-8 shrink-0 text-info">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        <svg v-else-if="activity.type === 'oferta_rechazada' || activity.type === 'intercambio_cancelado'" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-error">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <svg v-else-if="activity.type === 'entrega_confirmada'" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-info">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>                        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke-width="1.5" stroke="currentColor" class="h-8 w-8 shrink-0 text-success">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <div>
                            <p class="font-semibold text-lg">{{ describe(activity) }}</p>
                            <p v-if="activity.reason" class="text-sm mt-1">
                                <span class="font-medium">Motivo:</span> {{ activity.reason }}
                            </p>
                            <p class="text-sm text-base-content/60 mt-1">{{ formatDate(activity.createdAt) }}</p>
                        </div>
                    </button>
                </li>
            </ul>

            <div v-else class="card bg-base-100 shadow-sm border border-base-300 mt-6 py-12 px-4 items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="h-12 w-12 text-base-content/40">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <template v-if="type === ''">
                    <p class="font-semibold mt-3">Todavía no tienes actividad</p>
                    <p class="text-sm text-base-content/60 mt-1">
                        Cuando envíes una oferta, reserves o completes un intercambio, aparecerá aquí.
                    </p>
                    <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary mt-4">Ir a Explorar</RouterLink>
                </template>
                <template v-else>
                    <p class="font-semibold mt-3">{{ emptyText }}</p>
                    <button type="button" @click="selectTab('')" class="btn btn-primary mt-4">Ver todo el historial</button>
                </template>
            </div>
        </template>

        <Modal v-model="showDetail" title="Detalle de la actividad">
            <div v-if="detailLoading" class="flex justify-center py-8">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>

            <div v-else-if="detailError" role="alert" class="alert alert-error">
                <span>{{ detailError }}</span>
            </div>

            <div v-else-if="detail" class="flex flex-col gap-3">
                <p class="font-semibold text-lg">{{ describe(detail) }}</p>
                <dl class="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                    <dt class="text-base-content/60">Objeto</dt>
                    <dd>{{ detail.postTitle }}</dd>
                    <dt class="text-base-content/60">Otra persona</dt>
                    <dd>{{ detail.otherUserName }}</dd>
                    <dt class="text-base-content/60">Fecha y hora</dt>
                    <dd>{{ formatFullDate(detail.createdAt) }}</dd>
                    <template v-if="detail.reason">
                        <dt class="text-base-content/60">Motivo</dt>
                        <dd data-testid="detail-reason">{{ detail.reason }}</dd>
                    </template>
                    <template v-if="detail.Post">
                        <dt class="text-base-content/60">Estado actual</dt>
                        <dd><StateBadge :state="detail.Post.state" /></dd>
                        <dt class="text-base-content/60">Categoría</dt>
                        <dd>{{ categoryLabels[detail.Post.category] || detail.Post.category }}</dd>
                        <dt class="text-base-content/60">Condición</dt>
                        <dd>{{ conditionLabels[detail.Post.condition] || detail.Post.condition }}</dd>
                    </template>
                </dl>
                <p v-if="!detail.Post" class="text-sm text-base-content/60">
                    Esta publicación ya no está disponible.
                </p>

                <div v-if="detail.type === 'intercambio_completado' && detail.postId"
                    class="border-t border-base-300 pt-3">
                    <p class="font-semibold text-sm mb-2">Calificar a {{ detail.otherUserName }}</p>
                    <div class="flex flex-col gap-2">
                        <select v-model="puntaje" class="select select-bordered w-full" aria-label="Puntaje">
                            <option v-for="n in 5" :key="n" :value="n">{{ n }} {{ n === 1 ? "estrella" : "estrellas" }}</option>
                        </select>
                        <textarea v-model="comentario" class="textarea textarea-bordered w-full"
                            placeholder="Comentario (opcional)"></textarea>
                        <button type="button" @click="enviarCalificacion" :disabled="enviando"
                            class="btn btn-primary">Enviar calificación</button>
                        <p v-if="mensajeCalificacion" class="text-success text-sm" role="status">{{ mensajeCalificacion }}</p>
                        <p v-if="errorCalificacion" class="text-error text-sm" role="alert">{{ errorCalificacion }}</p>
                    </div>
                </div>

                <div v-if="detail.offerId" class="border-t border-base-300 pt-3">
                    <p class="font-semibold text-sm mb-2">Negociación</p>
                    <OfferThread :offer-id="detail.offerId" />
                </div>
            </div>

            <div class="modal-action">
                <button type="button" @click="showDetail = false" class="btn btn-primary btn-lg w-full">Cerrar</button>
            </div>
        </Modal>
    </div>
</template>
