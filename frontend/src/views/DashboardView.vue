<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { usePostsStore } from "@/stores/posts";
import { useAuthStore } from "@/stores/auth";

import PageTitle from "@/components/PageTitle.vue";
import StateBadge from "@/components/StateBadge.vue";
import Modal from "@/components/Modal.vue";
import OfferForm from "@/components/OfferForm.vue";

const route = useRoute();
const router = useRouter();
const postsStore = usePostsStore();
const authStore = useAuthStore();
const { explorePosts, exploreLoading, exploreError } = storeToRefs(postsStore);

const categoryLabels = {
    libros: "Libros",
    electronica: "Electrónica",
    ropa: "Ropa",
    otros: "Otros",
};
const conditionLabels = { nuevo: "Nuevo", usado: "Usado" };
const stateLabels = {
    disponible: "Disponible",
    reservado: "Reservado",
    intercambiado: "Intercambiado",
};

const q = ref("");
const category = ref("");
const condition = ref("");
const state = ref("");
const showMoreFilters = ref(false);
let searchTimer = null;

const filters = computed(() => ({
    q: route.query.q || "",
    category: route.query.category || "",
    condition: route.query.condition || "",
    state: route.query.state || "",
}));

const chips = computed(() => {
    const list = [];
    if (filters.value.q) {
        list.push({ key: "q", text: `Búsqueda: ${filters.value.q}` });
    }
    if (filters.value.category) {
        list.push({
            key: "category",
            text: `Categoría: ${categoryLabels[filters.value.category] || filters.value.category}`,
        });
    }
    if (filters.value.condition) {
        list.push({
            key: "condition",
            text: `Condición: ${conditionLabels[filters.value.condition] || filters.value.condition}`,
        });
    }
    if (filters.value.state) {
        list.push({
            key: "state",
            text: `Estado: ${stateLabels[filters.value.state] || filters.value.state}`,
        });
    }
    return list;
});

const extraFiltersCount = computed(() => {
    let count = 0;
    if (filters.value.category) count++;
    if (filters.value.condition) count++;
    return count;
});

const countText = computed(() => {
    const n = explorePosts.value.length;
    if (chips.value.length > 0) {
        return n === 1 ? "1 resultado" : `${n} resultados`;
    }
    return n === 1 ? "1 publicación" : `${n} publicaciones`;
});

function applyFilters(values) {
    const query = {};
    for (const [key, value] of Object.entries(values)) {
        if (value) query[key] = value;
    }
    router.push({ name: "dashboard", query });
}

function search() {
    clearTimeout(searchTimer);
    applyFilters({
        q: q.value.trim(),
        category: category.value,
        condition: condition.value,
        state: state.value,
    });
}

function removeFilter(key) {
    applyFilters({ ...filters.value, [key]: "" });
}

function clearFilters() {
    applyFilters({});
}

function loadPosts() {
    postsStore.fetchExplore(filters.value);
}

const completedPost = ref(null);
const actionError = ref(null);

// Oferta: publicación elegida, ventana abierta y aviso de oferta enviada
const offerPost = ref(null);
const isOfferOpen = ref(false);
const offerSent = ref(null);

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
}

function showCompleted() {
    completedPost.value = null;
    applyFilters({ state: "intercambiado" });
}

function showAvailable() {
    actionError.value = null;
    applyFilters({ state: "disponible" });
}

async function handleToggleReservation(post) {
    const reserving = post.state === "disponible";
    actionError.value = null;
    completedPost.value = null;
    try {
        await postsStore.toggleReservation(post.id);
    } catch (err) {
        if (err.network) {
            actionError.value = {
                title: reserving ? `No se pudo reservar "${post.title}"` : `No se pudo liberar la reserva de "${post.title}"`,
                text: err.message,
            };
            return;
        }
        actionError.value = reserving
            ? {
                  title: `No se pudo reservar "${post.title}"`,
                  text: "Otra persona lo reservó antes que tú o ya fue intercambiado. Actualizamos la lista: elige otro objeto disponible.",
                  canShowAvailable: true,
              }
            : { title: `No se pudo liberar la reserva de "${post.title}"`, text: err.message };
    }
    loadPosts();
}

async function handleComplete(post) {
    const message = `¿Confirmas que recibiste "${post.title}" de ${post.owner?.name}? ` +
        "El intercambio quedará cerrado y no se puede deshacer.";
    if (!confirm(message)) return;
    actionError.value = null;
    try {
        await postsStore.completeExchange(post.id);
        completedPost.value = { title: post.title, owner: post.owner?.name };
    } catch (err) {
        actionError.value = { title: `No se pudo completar el intercambio de "${post.title}"`, text: err.message };
        if (err.network) return;
    }
    loadPosts();
}

watch(q, (value) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        if (value.trim() !== filters.value.q) search();
    }, 400);
});

watch(
    () => route.query,
    () => {
        if (q.value.trim() !== filters.value.q) q.value = filters.value.q;
        category.value = filters.value.category;
        condition.value = filters.value.condition;
        state.value = filters.value.state;
        if (extraFiltersCount.value > 0) showMoreFilters.value = true;
        loadPosts();
    },
    { immediate: true },
);
</script>

<template>
    <div class="mx-auto max-w-6xl p-6">
        <PageTitle title="Explorar" subtitle="Encuentra objetos para intercambiar con otros estudiantes" />

        <details class="mt-3 text-sm">
            <summary class="cursor-pointer link link-primary w-fit">¿Cómo funciona un intercambio?</summary>
            <ol class="list-decimal ml-6 mt-2 space-y-1 text-base-content/80">
                <li>Pulsa <strong>Hacer oferta</strong> en el objeto que te interesa. Puedes ofrecer uno de tus
                    productos o solo escribir un mensaje.</li>
                <li>El dueño acepta o rechaza tu oferta. Si la acepta, el objeto queda reservado para ti y nadie
                    más puede reservarlo. Si cambias de opinión, usa <strong>Liberar reserva</strong>.</li>
                <li>Cuando recibas el objeto, pulsa <strong>Completar intercambio</strong>. Esta acción no se puede
                    deshacer.</li>
            </ol>
        </details>

        <form @submit.prevent="search" class="card bg-base-100 shadow-sm border border-base-300 mt-6 p-4 gap-3">
            <div class="flex flex-col lg:flex-row gap-3">
                <input v-model="q" type="search" placeholder="Buscar por título"
                    class="input input-bordered w-full lg:flex-1" />
                <select v-model="state" @change="search" class="select select-bordered w-full lg:w-56">
                    <option value="">Disponibles y reservados</option>
                    <option value="disponible">Disponible</option>
                    <option value="reservado">Reservado</option>
                    <option value="intercambiado">Intercambiado</option>
                </select>
                <button type="button" @click="showMoreFilters = !showMoreFilters" class="btn btn-outline"
                    :aria-expanded="showMoreFilters">
                    {{ showMoreFilters ? "Menos filtros" : "Más filtros" }}
                    <span v-if="extraFiltersCount > 0" class="badge badge-primary badge-sm">{{ extraFiltersCount }}</span>
                </button>
            </div>
            <div v-if="showMoreFilters" class="flex flex-col lg:flex-row gap-3">
                <select v-model="category" @change="search" class="select select-bordered w-full lg:w-52">
                    <option value="">Todas las categorías</option>
                    <option value="libros">Libros</option>
                    <option value="electronica">Electrónica</option>
                    <option value="ropa">Ropa</option>
                    <option value="otros">Otros</option>
                </select>
                <select v-model="condition" @change="search" class="select select-bordered w-full lg:w-52">
                    <option value="">Cualquier condición</option>
                    <option value="nuevo">Nuevo</option>
                    <option value="usado">Usado</option>
                </select>
            </div>
        </form>

        <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2 mt-4">
            <button v-for="chip in chips" :key="chip.key" type="button" @click="removeFilter(chip.key)"
                :aria-label="`Quitar filtro ${chip.text}`" class="btn btn-primary btn-soft btn-sm gap-2">
                {{ chip.text }}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                    stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
            <button type="button" @click="clearFilters" class="btn btn-outline btn-sm">Limpiar filtros</button>
        </div>

        <div v-if="completedPost" role="status" class="alert alert-success shadow-sm mt-6 flex flex-wrap justify-between">
            <div>
                <p class="font-semibold">Intercambio completado: {{ completedPost.title }}</p>
                <p class="text-sm">
                    Completaste el intercambio con {{ completedPost.owner }}. La publicación ya no aparece en
                    "Disponibles y reservados".
                </p>
            </div>
            <div class="flex gap-2">
                <button type="button" @click="showCompleted" class="btn btn-sm">Ver intercambiados</button>
                <button type="button" @click="completedPost = null" class="btn btn-ghost btn-sm">Cerrar</button>
            </div>
        </div>

        <div v-if="offerSent" role="status" class="alert alert-success shadow-sm mt-6 flex flex-wrap justify-between">
            <div>
                <p class="font-semibold">Oferta enviada: {{ offerSent.title }}</p>
                <p class="text-sm">
                    {{ offerSent.owner }} la verá y podrá aceptarla o rechazarla. Si la acepta, el objeto quedará
                    reservado para ti.
                </p>
            </div>
            <button type="button" @click="offerSent = null" class="btn btn-ghost btn-sm">Cerrar</button>
        </div>

        <div v-if="actionError" role="alert" class="alert alert-error shadow-sm mt-6 flex flex-wrap justify-between">
            <div>
                <p class="font-semibold">{{ actionError.title }}</p>
                <p class="text-sm">{{ actionError.text }}</p>
            </div>
            <div class="flex gap-2">
                <button v-if="actionError.canShowAvailable" type="button" @click="showAvailable"
                    class="btn btn-sm">Ver disponibles</button>
                <button type="button" @click="actionError = null" class="btn btn-ghost btn-sm">Cerrar</button>
            </div>
        </div>

        <div v-if="exploreLoading" class="flex justify-center py-16">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="exploreError" class="alert alert-error shadow-sm mt-6 flex justify-between">
            <span>{{ exploreError }}</span>
            <button type="button" @click="loadPosts" class="btn btn-sm">Reintentar</button>
        </div>

        <template v-else>
            <p class="text-sm text-base-content/70 mt-6 mb-3">{{ countText }}</p>

            <div v-if="explorePosts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="post in explorePosts" :key="post.id"
                    class="card bg-base-100 shadow-sm border border-base-300 p-4 flex flex-col gap-2">
                    <h2 class="font-bold text-lg">{{ post.title }}</h2>
                    <p class="text-sm text-base-content/60">de {{ post.owner?.name }}</p>
                    <div class="flex flex-wrap gap-2">
                        <span class="badge badge-outline badge-sm">
                            {{ categoryLabels[post.category] || post.category }}
                        </span>
                        <span class="badge badge-outline badge-sm">
                            {{ conditionLabels[post.condition] || post.condition }}
                        </span>
                    </div>
                    <div>
                        <StateBadge :state="post.state" />
                    </div>
                    <div v-if="post.state === 'disponible'">
                        <button type="button" @click="openOffer(post)"
                            class="btn btn-primary btn-sm">Hacer oferta</button>
                    </div>
                    <template v-else-if="post.state === 'reservado' && post.reservedById === authStore.user?.id">
                        <p class="text-xs font-semibold">Reservado por ti</p>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" @click="handleComplete(post)"
                                class="btn btn-success btn-sm">Completar intercambio</button>
                            <button type="button" @click="handleToggleReservation(post)"
                                class="btn btn-ghost btn-sm">Liberar reserva</button>
                        </div>
                    </template>
                    <p v-else-if="post.state === 'reservado'" class="text-xs text-base-content/60">
                        Reservado por otra persona
                    </p>
                </div>
            </div>

            <div v-else class="card bg-base-100 shadow-sm border border-base-300 py-12 px-4 items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="h-12 w-12 text-base-content/40">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <template v-if="chips.length > 0">
                    <p class="font-semibold mt-3">No hay publicaciones que coincidan con los filtros</p>
                    <p class="text-sm text-base-content/60 mt-1">Prueba con otra palabra o quita algunos filtros.</p>
                    <button type="button" @click="clearFilters" class="btn btn-primary mt-4">Limpiar filtros</button>
                </template>
                <p v-else class="font-semibold mt-3">Todavía no hay publicaciones de otros estudiantes.</p>
            </div>
        </template>

        <Modal v-model="isOfferOpen" title="Hacer una oferta">
            <OfferForm v-if="isOfferOpen" :post="offerPost" @saved="handleOfferSent" @cancel="isOfferOpen = false" />
        </Modal>
    </div>
</template>
