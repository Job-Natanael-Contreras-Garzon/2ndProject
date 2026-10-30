<script setup>
import { ref, watch } from "vue";
import { usePostsStore } from "@/stores/posts";

const props = defineProps({
    post: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["saved", "cancel"]);

const postsStore = usePostsStore();
const submitting = ref(false);
const formError = ref("");

const form = ref({
    title: "",
    category: "",
    condition: "",
});

watch(
    () => props.post,
    (val) => {
        formError.value = "";
        if (val) {
            form.value = {
                title: val.title,
                category: val.category,
                condition: val.condition,
            };
        } else {
            form.value = { title: "", category: "", condition: "" };
        }
    },
    { immediate: true }
);

async function handleSubmit() {
    formError.value = "";
    submitting.value = true;
    try {
        if (props.post?.id) {
            await postsStore.updatePost(props.post.id, form.value);
        } else {
            await postsStore.createPost(form.value);
        }
        emit("saved");
    } catch (err) {
        formError.value = err.message;
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div>
        <div v-if="formError" class="alert alert-error shadow-sm text-sm py-2 px-3 mb-3">
            <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="form-control">
                <label class="label"><span class="label-text font-medium">Título del producto</span></label>
                <input v-model="form.title" type="text" placeholder="Ej. Calculadora científica Casio"
                    class="input input-bordered w-full focus:input-primary" required />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text font-medium">Categoría</span></label>
                <select v-model="form.category" class="select select-bordered w-full focus:select-primary" required>
                    <option value="" disabled>Elige una categoría</option>
                    <option value="libros">Libros</option>
                    <option value="electronica">Electrónica</option>
                    <option value="ropa">Ropa</option>
                    <option value="otros">Otros</option>
                </select>
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text font-medium">Condición</span></label>
                <select v-model="form.condition" class="select select-bordered w-full focus:select-primary" required>
                    <option value="" disabled>Elige la condición</option>
                    <option value="nuevo">Nuevo</option>
                    <option value="usado">Usado</option>
                </select>
            </div>

            <div class="modal-action mt-6">
                <button type="button" @click="$emit('cancel')" class="btn btn-ghost" :disabled="submitting">
                    Cancelar
                </button>
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                    <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                    {{ post ? "Guardar cambios" : "Publicar" }}
                </button>
            </div>
        </form>
    </div>
</template>