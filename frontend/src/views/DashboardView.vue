<script setup>
import BaseButton from "@/components/BaseButton.vue";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { usePostsStore } from "@/stores/posts";
import { useAuthStore } from "@/stores/auth";
import { useFiltrosExplorar } from "@/composables/useFiltrosExplorar";
import { useOfertasEnviadas } from "@/composables/useOfertasEnviadas";
import { useIntercambio } from "@/composables/useIntercambio";

import PageTitle from "@/components/PageTitle.vue";
import Modal from "@/components/Modal.vue";
import OfferForm from "@/components/OfferForm.vue";
import OfferThread from "@/components/OfferThread.vue";
import CancelExchangeForm from "@/components/CancelExchangeForm.vue";
import ExplorarFiltros from "@/components/explorar/ExplorarFiltros.vue";
import AvisosIntercambio from "@/components/explorar/AvisosIntercambio.vue";
import PublicacionCard from "@/components/explorar/PublicacionCard.vue";

const postsStore = usePostsStore();
const authStore = useAuthStore();
const { explorePosts, exploreLoading, exploreError } = storeToRefs(postsStore);

// Ofertas que envié yo (para ver la negociación desde cada tarjeta)
const { threadOffer, isThreadOpen, offerByPost, loadMyOffers, hasActiveOffer, openThread } =
    useOfertasEnviadas();

// Carga la lista y mis ofertas. Sin argumento usa los filtros actuales de la URL.
function loadPosts(valores = filtros.filters.value) {
    postsStore.fetchExplore(valores);
    loadMyOffers();
}

// Acciones sobre una publicación: ofertar, confirmar la entrega y cancelar
const {
    completedPost, cancelledPost, offerSent, actionError,
    offerPost, isOfferOpen, cancelPost, isCancelOpen, cancelBusy, cancelError,
    openOffer, handleOfferSent, showCompleted, showAvailable, cerrarAviso,
    handleConfirm, openCancel, handleCancel,
} = useIntercambio({
    postsStore,
    recargar: loadPosts,
    mostrarFiltro: (valores) => filtros.applyFilters(valores),
    alEnviarOferta: loadMyOffers,
});

// Filtros de la URL. Va al final porque carga la lista apenas se crea.
const filtros = useFiltrosExplorar(loadPosts);
const {
    q, state, category, condition, showMoreFilters,
    vista, chips, extraFiltersCount,
    cambiarVista, search, removeFilter, clearFilters,
} = filtros;

// En "Mis ofertas" solo se muestran las publicaciones donde envié una oferta
const publicaciones = computed(() =>
    vista.value === "mis-ofertas"
        ? explorePosts.value.filter((post) => offerByPost.value[post.id])
        : explorePosts.value,
);

const countText = computed(() => {
    const n = publicaciones.value.length;
    if (chips.value.length > 0) {
        return n === 1 ? "1 resultado" : `${n} resultados`;
    }
    return n === 1 ? "1 publicación" : `${n} publicaciones`;
});

function puedeOfertar(post) {
    return post.state === "disponible" && !hasActiveOffer(post);
}
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

        <ExplorarFiltros v-model:q="q" v-model:state="state" v-model:category="category"
            v-model:condition="condition" v-model:show-more-filters="showMoreFilters" :chips="chips"
            :extra-filters-count="extraFiltersCount" @search="search" @remove-filter="removeFilter"
            @clear="clearFilters" />

        <AvisosIntercambio :completed-post="completedPost" :cancelled-post="cancelledPost"
            :offer-sent="offerSent" :action-error="actionError" @cerrar="cerrarAviso"
            @ver-intercambiados="showCompleted" @ver-disponibles="showAvailable" />

        <div v-if="exploreLoading" class="flex justify-center py-16">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="exploreError" class="alert alert-error shadow-sm mt-6 flex justify-between">
            <span>{{ exploreError }}</span>
            <BaseButton type="button" @click="loadPosts()" size="sm">Reintentar</BaseButton>
        </div>

        <template v-else>
            <p class="texto-secundario mt-6 mb-3">{{ countText }}</p>

            <div v-if="publicaciones.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <PublicacionCard v-for="post in publicaciones" :key="post.id" :post="post" :vista="vista"
                    :oferta="offerByPost[post.id] || null" :puede-ofertar="puedeOfertar(post)"
                    :user-id="authStore.user?.id" @ofertar="openOffer(post)"
                    @negociacion="openThread(post)" @confirmar="handleConfirm(post)"
                    @cancelar="openCancel(post)" />
            </div>

            <div v-else class="card bg-base-100 shadow-sm border border-base-300 py-12 px-4 items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="h-12 w-12 text-base-content/40">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <template v-if="chips.length > 0">
                    <p class="font-semibold mt-3">No hay publicaciones que coincidan con los filtros</p>
                    <p class="texto-secundario mt-1">Prueba con otra palabra o quita algunos filtros.</p>
                    <BaseButton type="button" @click="clearFilters" variant="accion" class="mt-4">Limpiar filtros</BaseButton>
                </template>
                <template v-else-if="vista === 'mis-ofertas'">
                    <p class="font-semibold mt-3">Todavía no enviaste ofertas</p>
                    <p class="texto-secundario mt-1">Cuando hagas una oferta, podrás ver aquí su estado.</p>
                    <BaseButton type="button" @click="cambiarVista('todas')" variant="accion" class="mt-4">
                        Ver todas las publicaciones
                    </BaseButton>
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
                <BaseButton type="button" @click="isThreadOpen = false" variant="accion">Cerrar</BaseButton>
            </div>
        </Modal>

        <Modal v-model="isOfferOpen" title="Hacer una oferta">
            <OfferForm v-if="isOfferOpen" :post="offerPost" @saved="handleOfferSent" @cancel="isOfferOpen = false" />
        </Modal>
    </div>
</template>
