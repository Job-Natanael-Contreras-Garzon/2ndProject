<script setup>
import BaseButton from "@/components/BaseButton.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleRegister() {
    error.value = "";
    loading.value = true;

    try {
        await auth.register({
            name: name.value,
            email: email.value,
            password: password.value,
        });
        await auth.login(email.value, password.value);
        router.push({ name: "dashboard" });
    } catch (err) {
        error.value = err.message || "Error al registrar la cuenta";
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
                    <h2 class="texto-titulo-seccion mt-1">Crear cuenta</h2>
                </div>


                <div v-if="error" class="alert alert-error shadow-sm text-sm py-2 px-3 mb-2">

                    <span>{{ error }}</span>
                </div>

                <form @submit.prevent="handleRegister" class="space-y-4">

                    <div class="form-control">
                        <label class="label" for="name">
                            <span class="label-text font-medium">Nombre completo</span>
                        </label>
                        <input v-model="name" id="name" type="text" placeholder="Ej. Juan Pérez"
                            class="input input-bordered w-full focus:input-primary" required />
                    </div>

                    <div class="form-control">
                        <label class="label" for="email">
                            <span class="label-text font-medium">Correo electrónico</span>
                        </label>
                        <input v-model="email" id="email" type="email" placeholder="tu-correo@ejemplo.com"
                            class="input input-bordered w-full focus:input-primary" required />
                    </div>

                    <div class="form-control">
                        <label class="label" for="password">
                            <span class="label-text font-medium">Contraseña</span>
                        </label>
                        <input v-model="password" id="password" type="password" placeholder="••••••••"
                            class="input input-bordered w-full focus:input-primary" required />
                    </div>

                    <div class="form-control mt-6">
                        <BaseButton type="submit" :disabled="loading" variant="accion" class="w-full shadow-md">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            {{ loading ? "Registrando..." : "Crear cuenta" }}
                        </BaseButton>
                    </div>
                </form>


                <div class="divider text-sm my-4">O</div>

                <p class="text-center text-sm">
                    ¿Ya tienes una cuenta?
                    <RouterLink :to="{ name: 'login' }" class="link link-primary font-semibold">
                        Inicia sesión
                    </RouterLink>
                </p>

            </div>
        </div>
    </div>
</template>