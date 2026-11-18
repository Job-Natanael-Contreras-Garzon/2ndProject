<script setup>
import BaseButton from "@/components/BaseButton.vue";
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { API_URL } from "@/api/client";

const email = ref("");
const error = ref("");
const successMessage = ref("");
const loading = ref(false);

async function handleRecover() {
    error.value = "";
    successMessage.value = "";
    loading.value = true;

    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.value }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Error al solicitar restablecimiento");
        }

        successMessage.value = data.message;
    } catch (err) {
        error.value = err.message || "Error al procesar la solicitud";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-base-200 px-4 py-8">
        <div class="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
            <div class="card-body">

                <div class="text-center mb-4">
                    <h1 class="texto-titulo-pagina">Trueque U</h1>
                    <h2 class="texto-titulo-seccion mt-1">Recuperar contraseña</h2>
                    <p class="text-xs mt-1">
                        Ingresa tu correo y te enviaremos las instrucciones de recuperación.
                    </p>
                </div>

                <div v-if="error" class="alert alert-error shadow-sm text-sm py-2 px-3 mb-2">

                    <span>{{ error }}</span>
                </div>

                <div v-if="successMessage" class="alert alert-success shadow-sm text-sm py-2 px-3 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ successMessage }}</span>
                </div>

                <form @submit.prevent="handleRecover" class="space-y-4">
                    <div class="form-control">
                        <label class="label" for="email">
                            <span class="label-text font-medium">Correo electrónico</span>
                        </label>
                        <input v-model="email" id="email" type="email" placeholder="tu-correo@ejemplo.com"
                            class="input input-bordered w-full focus:input-primary" required />
                    </div>

                    <div class="form-control mt-6">
                        <BaseButton type="submit" :disabled="loading" variant="accion" class="w-full shadow-md">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            {{ loading ? "Enviando..." : "Recuperar" }}
                        </BaseButton>
                    </div>
                </form>

                <div class="divider text-sm my-4">O</div>

                <p class="text-center text-sm">
                    <RouterLink :to="{ name: 'login' }" class="link link-primary font-semibold">
                        Volver al inicio de sesión
                    </RouterLink>
                </p>

            </div>
        </div>
    </div>
</template>