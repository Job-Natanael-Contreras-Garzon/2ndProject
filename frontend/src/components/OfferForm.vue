<script setup>
import { ref, computed, onMounted } from "vue";
import { usePostsStore } from "@/stores/posts";
import { useOffersStore } from "@/stores/offers";

const props = defineProps({
    // Publicación por la que se hace la oferta
    post: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(["saved", "cancel"]);

const postsStore = usePostsStore();
const offersStore = useOffersStore();

const submitting = ref(false);
const formError = ref("");
const form = ref({ offeredPostId: "", message: "" });

// Solo se pueden ofrecer productos propios que estén disponibles
const myAvailablePosts = computed(() =>
    postsStore.posts.filter((p) => p.state === "disponible"),
);

async function handleSubmit() {
    formError.value = "";
    if (!form.value.offeredPostId && !form.value.message.trim()) {
        formError.value = "Escribe un mensaje o elige un producto para ofertar.";
        return;
    }

    submitting.value = true;
    try {
        await offersStore.sendOffer(props.post.id, {
            offeredPostId: form.value.offeredPostId || null,
            message: form.value.message.trim(),
        });
        emit("saved");
    } catch (err) {
        formError.value = err.message;
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    postsStore.fetchPosts().catch(() => {});
});
</script>

<template>
    <div>
        <p class="text-sm text-base-content/70 mb-3">
            Oferta por <strong>{{ post.title }}</strong> de {{ post.owner?.name }}
        </p>

        <div v-if="formError" role="alert" class="alert alert-error shadow-sm text-sm py-2 px-3 mb-3">
            <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="form-control">
                <label class="label"><span class="label-text font-medium">Producto que ofreces (opcional)</span></label>
                <select v-model="form.offeredPostId" class="select select-bordered w-full focus:select-primary">
                    <option value="">Ninguno, solo un mensaje</option>
                    <option v-for="mine in myAvailablePosts" :key="mine.id" :value="mine.id">
                        {{ mine.title }}
                    </option>
                </select>
                <p v-if="myAvailablePosts.length === 0" class="text-xs text-base-content/60 mt-1">
                    No tienes productos disponibles para ofrecer.
                </p>
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text font-medium">Mensaje (opcional)</span></label>
                <textarea v-model="form.message" maxlength="200" rows="3"
                    placeholder="Ej. Te cambio mi libro, está casi nuevo"
                    class="textarea textarea-bordered w-full focus:textarea-primary"></textarea>
            </div>

            <div class="modal-action mt-6">
                <button type="button" @click="$emit('cancel')" class="btn btn-ghost" :disabled="submitting">
                    Cancelar
                </button>
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                    <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                    Enviar oferta
                </button>
            </div>
        </form>
    </div>
</template>
