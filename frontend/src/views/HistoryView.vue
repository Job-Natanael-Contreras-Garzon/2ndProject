<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/stores/activity";

import PageTitle from "@/components/PageTitle.vue";
import StateBadge from "@/components/StateBadge.vue";
import Modal from "@/components/Modal.vue";

const route = useRoute();
const router = useRouter();
const activityStore = useActivityStore();
const { activities, loading, error } = storeToRefs(activityStore);

const tabs = [
    { value: "", label: "Todos" },
    { value: "reservas", label: "Reservas" },
    { value: "intercambios", label: "Intercambios" },
];
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

const type = computed(() => {
    const value = route.query.type;
    return value === "reservas" || value === "intercambios" ? value : "";
});

const emptyText = computed(() => {
    if (type.value === "reservas") {
        return "Todavía no tienes reservas registradas.";
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
    try {
        detail.value = await activityStore.fetchActivity(activity.id);
    } catch (err) {
        detailError.value = err.message;
    } finally {
        detailLoading.value = false;
    }
}

watch(type, loadActivities, { immediate: true });
</script>

<template>
    <div class="mx-auto max-w-3xl p-6">
        <PageTitle title="Historial" subtitle="Revisa tus ofertas, lo que has reservado y los intercambios que completaste" />

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
                        <svg v-else-if="activity.type === 'oferta_enviada'" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-info">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        <svg v-else-if="activity.type === 'oferta_rechazada'" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="h-8 w-8 shrink-0 text-error">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke-width="1.5" stroke="currentColor" class="h-8 w-8 shrink-0 text-success">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <div>
                            <p class="font-semibold text-lg">{{ describe(activity) }}</p>
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
            </div>

            <div class="modal-action">
                <button type="button" @click="showDetail = false" class="btn btn-primary btn-lg w-full">Cerrar</button>
            </div>
        </Modal>
    </div>
</template>
