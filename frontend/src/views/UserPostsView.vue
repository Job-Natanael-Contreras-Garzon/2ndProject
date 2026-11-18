<script setup>
import BaseButton from "@/components/BaseButton.vue";
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { usePostsStore } from "@/stores/posts";
import { useAuthStore } from "@/stores/auth";

import PageTitle from "@/components/PageTitle.vue";
import DataTable from "@/components/DataTable.vue";
import Modal from "@/components/Modal.vue";
import StateBadge from "@/components/StateBadge.vue";
import PostForm from "@/components/PostForm.vue";
import OfferList from "@/components/OfferList.vue";
import CancelExchangeForm from "@/components/CancelExchangeForm.vue";
import { track } from "@/utils/analitica";

const authStore = useAuthStore();
const postsStore = usePostsStore();
const { posts, loading, error } = storeToRefs(postsStore);

const categoryLabels = {
    libros: "Libros",
    electronica: "Electrónica",
    ropa: "Ropa",
    otros: "Otros",
};
const conditionLabels = { nuevo: "Nuevo", usado: "Usado" };

const isModalOpen = ref(false);
const selectedPost = ref(null);
const actionError = ref("");

function openCreateModal() {
    selectedPost.value = null;
    isModalOpen.value = true;
    track("publicacion_iniciada", { origen: "mis_publicaciones" });
}

function openEditModal(post) {
    selectedPost.value = { ...post };
    isModalOpen.value = true;
}

// Ofertas recibidas: publicación elegida y ventana abierta
const offersPost = ref(null);
const isOffersOpen = ref(false);

function openOffers(post) {
    offersPost.value = post;
    isOffersOpen.value = true;
}

// Al aceptar o enviar contraoferta, se cierra la ventana y se actualiza la tabla
function handleAnswered(action) {
    if (action === "accept" || action === "counter") isOffersOpen.value = false;
    postsStore.fetchPosts().catch(() => {});
}

function showActionError(err) {
    actionError.value = err.message;
    postsStore.fetchPosts().catch(() => {});
}

async function handleDelete(id) {
    if (!confirm("¿Deseas eliminar esta publicación?")) return;
    actionError.value = "";
    try {
        await postsStore.deletePost(id);
    } catch (err) {
        showActionError(err);
    }
}

// Confirmar la entrega: con la confirmación de ambas partes el intercambio se completa
async function handleConfirm(post) {
    const message = `¿Confirmas que entregaste "${post.title}" a ${post.reservedBy?.name}? ` +
        "El intercambio se completará cuando ambas personas confirmen.";
    if (!confirm(message)) return;
    actionError.value = "";
    cancelledTitle.value = "";
    try {
        await postsStore.confirmDelivery(post.id);
    } catch (err) {
        showActionError(err);
        return;
    }
    postsStore.fetchPosts().catch(() => {});
}

// Cancelar el intercambio acordado con un motivo
const cancelPost = ref(null);
const isCancelOpen = ref(false);
const cancelBusy = ref(false);
const cancelError = ref("");
const cancelledTitle = ref("");

function openCancel(post) {
    actionError.value = "";
    cancelledTitle.value = "";
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
        cancelledTitle.value = cancelPost.value.title;
    } catch (err) {
        cancelError.value = err.message;
        return;
    } finally {
        cancelBusy.value = false;
    }
    postsStore.fetchPosts().catch(() => {});
}
onMounted(() => {
    postsStore.fetchPosts();
});
</script>

<template>
    <div class="mx-auto max-w-6xl p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <PageTitle title="Mis publicaciones" subtitle="Gestión de artículos para hacer trueque" />
            <BaseButton @click="openCreateModal" variant="accion" class="shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nueva publicación
            </BaseButton>
        </div>

        <div v-if="actionError" role="alert" class="alert alert-error shadow-sm mb-4 flex justify-between">
            <span>{{ actionError }} La lista se actualizó con el estado actual.</span>
            <BaseButton type="button" @click="actionError = ''" variant="discreto" size="sm">Cerrar</BaseButton>
        </div>

        <div v-if="cancelledTitle" role="status" class="alert alert-info shadow-sm mb-4 flex justify-between">
            <span>
                Intercambio cancelado: {{ cancelledTitle }}. La publicación volvió a estar disponible y el motivo
                quedó en tu historial.
            </span>
            <BaseButton type="button" @click="cancelledTitle = ''" variant="discreto" size="sm">Cerrar</BaseButton>
        </div>

        <DataTable :items="posts" :loading="loading" :error="error" :colspan="5"
            empty-message="No hay productos publicados.">
            <template #header>
                <th>Título</th>
                <th>Categoría</th>
                <th>Condición</th>
                <th>Estado</th>
                <th>Acciones</th>
            </template>

            <tr v-for="post in posts" :key="post.id" class="hover">
                <td class="font-semibold text-base-content">{{ post.title }}</td>
                <td>
                    <span class="badge badge-outline badge-sm">{{ categoryLabels[post.category] || post.category }}</span>
                </td>
                <td>
                    <span class="badge badge-outline badge-sm">{{ conditionLabels[post.condition] || post.condition }}</span>
                </td>
                <td>
                    <StateBadge :state="post.state" />
                </td>
                <td>
                    <div v-if="!post.userId || post.userId === authStore.user?.id"
                        class="flex flex-col items-start gap-1">
                        <div class="flex flex-wrap items-center gap-1">

                            <template v-if="post.state === 'reservado'">
                                <BaseButton v-if="!post.ownerConfirmed" type="button" @click="handleConfirm(post)" variant="confirmar" size="sm">Confirmar entrega</BaseButton>
                                <BaseButton type="button" @click="openCancel(post)" variant="discreto" size="sm">Cancelar intercambio</BaseButton>
                            </template>

                            <div class="tooltip tooltip-left"
                                :data-tip="post.state === 'reservado' ? 'Publicación reservada, no se puede editar' : post.state === 'intercambiado' ? 'Publicación intercambiada, no se puede editar' : 'Editar'">
                                <BaseButton @click="openEditModal(post)"
                                    :disabled="post.state === 'reservado' || post.state === 'intercambiado'"
                                    aria-label="Editar" variant="icono" class="text-info disabled:opacity-30">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                        stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                </BaseButton>
                            </div>

                            <div class="tooltip tooltip-left"
                                :data-tip="post.state === 'reservado' ? 'Publicación reservada, no se puede eliminar' : post.state === 'intercambiado' ? 'Publicación intercambiada, no se puede eliminar' : 'Eliminar'">
                                <BaseButton @click="handleDelete(post.id)"
                                    :disabled="post.state === 'reservado' || post.state === 'intercambiado'"
                                    aria-label="Eliminar" variant="icono" class="text-error disabled:opacity-30">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                        stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </BaseButton>
                            </div>

                        </div>

                        <BaseButton v-if="post.state === 'disponible'" type="button" @click="openOffers(post)" variant="secundario" size="sm">Ver ofertas recibidas</BaseButton>
                        <span v-if="post.state === 'reservado'" class="text-xs text-warning font-medium">
                            Reservado por {{ post.reservedBy?.name }}
                        </span>
                        <span v-if="post.state === 'reservado' && post.receiverConfirmed" class="text-xs font-medium">
                            {{ post.reservedBy?.name }} ya confirmó la entrega.
                        </span>
                        <span v-if="post.state === 'reservado' && post.ownerConfirmed"
                            class="text-xs font-semibold text-success">
                            Confirmaste la entrega. Esperando confirmación de {{ post.reservedBy?.name }}.
                        </span>
                        <span v-if="post.state === 'intercambiado'" class="text-xs opacity-60 font-medium">
                            Intercambiado, no se puede modificar
                        </span>
                    </div>

                    <span v-else class="text-xs opacity-50 italic">
                        Solo lectura
                    </span>
                </td>
            </tr>
        </DataTable>

        <Modal v-model="isModalOpen" :title="selectedPost ? 'Editar publicación' : 'Nueva publicación'">
            <PostForm :post="selectedPost" @saved="isModalOpen = false" @cancel="isModalOpen = false" />
        </Modal>

        <Modal v-model="isCancelOpen" title="Cancelar intercambio">
            <CancelExchangeForm v-if="isCancelOpen" :title="cancelPost.title" :other-name="cancelPost.reservedBy?.name"
                :server-error="cancelError" :submitting="cancelBusy" @submit="handleCancel"
                @cancel="isCancelOpen = false" />
        </Modal>

        <Modal v-model="isOffersOpen" title="Ofertas recibidas">
            <OfferList v-if="isOffersOpen" :post="offersPost" @answered="handleAnswered"
                @close="isOffersOpen = false" />
        </Modal>
    </div>
</template>
