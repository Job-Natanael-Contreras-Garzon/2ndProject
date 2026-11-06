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
import OfferThread from "@/components/OfferThread.vue";
import CancelExchangeForm from "@/components/CancelExchangeForm.vue";
import { useOffersStore } from "@/stores/offers";

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

// Vista: "todas" las publicaciones o "mis-ofertas" (solo donde envié una oferta)
const vista = computed(() => (route.query.vista === "mis-ofertas" ? "mis-ofertas" : "todas"));

function cambiarVista(valor) {
    const query = { ...route.query };
    if (valor === "mis-ofertas") query.vista = valor;
    else delete query.vista;
    router.push({ name: "dashboard", query });
}

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
    const n = publicaciones.value.length;
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
    if (vista.value === "mis-ofertas") query.vista = "mis-ofertas";
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
    loadMyOffers();
}

// Ofertas que envié yo: permiten ver la negociación desde la card de cada publicación
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

// Oferta más reciente que envié por cada publicación (la lista llega ordenada de más nueva a más vieja)
const offerByPost = computed(() => {
    const map = {};
    for (const offer of myOffers.value) {
        if (!map[offer.targetPostId]) map[offer.targetPostId] = offer;
    }
    return map;
});

// En "Mis ofertas" solo se muestran las publicaciones donde envié una oferta
const publicaciones = computed(() =>
    vista.value === "mis-ofertas"
        ? explorePosts.value.filter((post) => offerByPost.value[post.id])
        : explorePosts.value,
);

const estadoOferta = {
    pendiente: "Pendiente de respuesta",
    contraoferta: "Te enviaron una contraoferta",
    aceptada: "Aceptada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
};

function hasActiveOffer(post) {
    const status = offerByPost.value[post.id]?.status;
    return status === "pendiente" || status === "contraoferta";
}

function openThread(post) {
    threadOffer.value = offerByPost.value[post.id];
    isThreadOpen.value = true;
}

const completedPost = ref(null);
const cancelledPost = ref(null);
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
    loadMyOffers();
}

function showCompleted() {
    completedPost.value = null;
    applyFilters({ state: "intercambiado" });
}

function showAvailable() {
    actionError.value = null;
    applyFilters({ state: "disponible" });
}

// Confirmar la entrega: con la confirmación de ambas partes el intercambio se completa
async function handleConfirm(post) {
    const message = `¿Confirmas que recibiste "${post.title}" de ${post.owner?.name}? ` +
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
        actionError.value = { title: `No se pudo confirmar la entrega de "${post.title}"`, text: err.message };
        if (err.network) return;
    }
    loadPosts();
}

// Cancelar el intercambio acordado con un motivo
const cancelPost = ref(null);
const isCancelOpen = ref(false);
const cancelBusy = ref(false);
const cancelError = ref("");

function openCancel(post) {
    actionError.value = null;
    completedPost.value = null;
    cancelError.value = "";
    cancelPost.value = post;
    isCancelOpen.value = true;
}

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
    loadPosts();
}
watch(q, (value) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        if (route.name === "dashboard" && value.trim() !== filters.value.q) search();
    }, 400);
});

watch(
    () => route.query,
    () => {
        if (route.name !== "dashboard") return;
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
                <li>El dueño acepta, rechaza o contraoferta. Si acepta, el objeto queda reservado para ti y nadie
                    más puede reservarlo. Puedes seguir la conversación en <strong>Ver negociación</strong>.</li>
                <li>Cuando ambas personas se entreguen el objeto, cada una pulsa <strong>Confirmar entrega</strong>.
                    El intercambio se completa solo cuando confirman las dos.</li>
                <li>Si algo falla antes de completarse, cualquiera puede pulsar <strong>Cancelar intercambio</strong>
                    e indicar el motivo: la publicación vuelve a estar disponible.</li>
            </ol>
        </details>

        <div role="tablist" class="tabs tabs-box mt-6">
            <button type="button" role="tab" @click="cambiarVista('todas')" class="tab h-12 flex-1 text-base"
                :class="{ 'tab-active': vista === 'todas' }" :aria-selected="vista === 'todas'">
                Todas las publicaciones
            </button>
            <button type="button" role="tab" @click="cambiarVista('mis-ofertas')" class="tab h-12 flex-1 text-base"
                :class="{ 'tab-active': vista === 'mis-ofertas' }" :aria-selected="vista === 'mis-ofertas'">
                Mis ofertas
            </button>
        </div>

        <form @submit.prevent="search" class="card bg-base-100 shadow-sm border border-base-300 mt-4 p-4 gap-3">
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

        <div v-if="cancelledPost" role="status" class="alert alert-info shadow-sm mt-6 flex flex-wrap justify-between">
            <div>
                <p class="font-semibold">Intercambio cancelado: {{ cancelledPost.title }}</p>
                <p class="text-sm">La publicación volvió a estar disponible. El motivo quedó en tu historial.</p>
            </div>
            <button type="button" @click="cancelledPost = null" class="btn btn-ghost btn-sm">Cerrar</button>
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

            <div v-if="publicaciones.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="post in publicaciones" :key="post.id"
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
                    <p v-if="vista === 'mis-ofertas'" class="text-sm font-semibold">
                        Tu oferta: {{ estadoOferta[offerByPost[post.id].status] || offerByPost[post.id].status }}
                    </p>
                    <div v-if="offerByPost[post.id]" class="flex flex-wrap items-center gap-2">
                        <span v-if="offerByPost[post.id].status === 'contraoferta'"
                            class="badge badge-warning badge-sm">Nueva contraoferta</span>
                        <button type="button" @click="openThread(post)"
                            class="btn btn-outline btn-primary btn-sm">Ver negociación</button>
                    </div>
                    <div v-if="post.state === 'disponible' && !hasActiveOffer(post)">
                        <button type="button" @click="openOffer(post)"
                            class="btn btn-primary btn-sm">Hacer oferta</button>
                    </div>
                    <template v-else-if="post.state === 'reservado' && post.reservedById === authStore.user?.id">
                        <p class="text-xs font-semibold">Reservado por ti</p>
                        <p v-if="post.ownerConfirmed" class="text-xs text-base-content/70">
                            {{ post.owner?.name }} ya confirmó la entrega.
                        </p>
                        <p v-if="post.receiverConfirmed" class="text-xs font-semibold text-success">
                            Confirmaste la entrega. Esperando confirmación de {{ post.owner?.name }}.
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <button v-if="!post.receiverConfirmed" type="button" @click="handleConfirm(post)"
                                class="btn btn-success btn-sm">Confirmar entrega</button>
                            <button type="button" @click="openCancel(post)"
                                class="btn btn-ghost btn-sm">Cancelar intercambio</button>
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
                <template v-else-if="vista === 'mis-ofertas'">
                    <p class="font-semibold mt-3">Todavía no enviaste ofertas</p>
                    <p class="text-sm text-base-content/60 mt-1">Cuando hagas una oferta, podrás ver aquí su estado.</p>
                    <button type="button" @click="cambiarVista('todas')" class="btn btn-primary mt-4">
                        Ver todas las publicaciones
                    </button>
                </template>
                <p v-else class="font-semibold mt-3">Todavía no hay publicaciones de otros estudiantes.</p>
            </div>
        </template>

        <Modal v-model="isCancelOpen" title="Cancelar intercambio">
            <CancelExchangeForm v-if="isCancelOpen" :title="cancelPost.title" :other-name="cancelPost.owner?.name"
                :server-error="cancelError" :submitting="cancelBusy" @submit="handleCancel"
                @cancel="isCancelOpen = false" />
        </Modal>

        <Modal v-model="isThreadOpen" title="Negociación">
            <OfferThread v-if="isThreadOpen" :offer-id="threadOffer.id" @replied="loadMyOffers" />
            <div class="modal-action mt-6">
                <button type="button" @click="isThreadOpen = false" class="btn btn-primary">Cerrar</button>
            </div>
        </Modal>

        <Modal v-model="isOfferOpen" title="Hacer una oferta">
            <OfferForm v-if="isOfferOpen" :post="offerPost" @saved="handleOfferSent" @cancel="isOfferOpen = false" />
        </Modal>
    </div>
</template>
