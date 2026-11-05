import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";

const API_URL = import.meta.env.VITE_API_URL;

const NETWORK_ERROR_MESSAGE =
    "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo en unos segundos.";

async function request(url, options) {
    try {
        return await fetch(url, options);
    } catch {
        const err = new Error(NETWORK_ERROR_MESSAGE);
        err.network = true;
        throw err;
    }
}

export const usePostsStore = defineStore("posts", () => {
    const posts = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const explorePosts = ref([]);
    const exploreLoading = ref(false);
    const exploreError = ref(null);

    const auth = useAuthStore();

    function getHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
        };
    }

    async function fetchPosts() {
        loading.value = true;
        error.value = null;
        try {
            const res = await request(`${API_URL}/posts`, {
                headers: getHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(
                    data.message || data.error ||
                        "Error al cargar publicaciones",
                );
            }
            posts.value = data.posts || [];
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchExplore(filters = {}) {
        exploreLoading.value = true;
        exploreError.value = null;
        try {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(filters)) {
                if (value) params.set(key, value);
            }
            const res = await request(`${API_URL}/posts/explore?${params}`, {
                headers: getHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(
                    data.message || data.error ||
                        "Error al cargar publicaciones",
                );
            }
            explorePosts.value = data.posts || [];
        } catch (err) {
            exploreError.value = err.message;
        } finally {
            exploreLoading.value = false;
        }
    }

    async function createPost(postData) {
        const res = await request(`${API_URL}/posts`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(postData),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(
                data.message || data.error ||
                    "Error al registrar la publicación",
            );
        }

        if (data.post) {
            posts.value.unshift(data.post);
        }
        return data;
    }

    async function updatePost(id, postData) {
        const res = await request(`${API_URL}/posts/${id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(postData),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(
                data.message || data.error ||
                    "Error al actualizar la publicación",
            );
        }

        const index = posts.value.findIndex((p) => p.id === id);
        if (index !== -1 && data.post) {
            posts.value[index] = data.post;
        }
        return data;
    }

    async function deletePost(id) {
        const res = await request(`${API_URL}/posts/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
                data.message || data.error ||
                    "Error al eliminar la publicación",
            );
        }

        posts.value = posts.value.filter((p) => p.id !== id);
    }

    async function toggleReservation(id) {
        const res = await request(`${API_URL}/posts/${id}/reservation`, {
            method: "PATCH",
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.message || data.error ||
                    "Error al reservar la publicación",
            );
        }
        const index = posts.value.findIndex((p) => p.id === id);

        if (index !== -1 && data.post) {
            posts.value[index] = data.post;
        }
        return data;
    }

    // Peticion PATCH comun de las acciones del intercambio acordado
    async function exchangeAction(id, action, body, defaultMessage) {
        const res = await request(`${API_URL}/posts/${id}/${action}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || data.error || defaultMessage);
        }
        const index = posts.value.findIndex((p) => p.id === id);

        if (index !== -1 && data.post) {
            posts.value[index] = data.post;
        }
        return data;
    }

    // Confirma la entrega de la parte actual; con ambas confirmaciones se completa (data.completed)
    function confirmDelivery(id) {
        return exchangeAction(id, "confirm", null, "Error al confirmar la entrega");
    }

    // Cancela el intercambio acordado indicando el motivo
    function cancelExchange(id, reason) {
        return exchangeAction(id, "cancel", { reason }, "Error al cancelar el intercambio");
    }
    return {
        posts,
        loading,
        error,
        explorePosts,
        exploreLoading,
        exploreError,
        fetchPosts,
        fetchExplore,
        createPost,
        updatePost,
        deletePost,
        toggleReservation,
        confirmDelivery,
        cancelExchange,
    };
});
