<script setup>
import BaseButton from "@/components/BaseButton.vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import logo from "@/assets/logo.png";

const auth = useAuthStore();
const router = useRouter();

async function logout() {
    await auth.logout();
    router.push({ name: "login" });
}
</script>

<template>
    <div class="navbar border-b border-base-200 bg-base-100 px-4">
        <div class="mx-auto flex w-full max-w-7xl items-center justify-between">


            <div class="flex-none">
                <BaseButton :to="{ name: 'dashboard' }" as="RouterLink" variant="discreto" class="px-2 normal-case">
                    <img :src="logo" alt="Logo" class="h-8 w-auto" />
                </BaseButton>
            </div>

            <div class="flex items-center gap-4">
                <ul class="menu menu-horizontal gap-1 px-1">
                    <li>
                        <RouterLink :to="{ name: 'dashboard' }" exact-active-class="active font-medium">
                            Explorar
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'posts' }" exact-active-class="active font-medium">
                            Mis publicaciones
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'history' }" exact-active-class="active font-medium">
                            Historial
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'profile' }" exact-active-class="active font-medium">
                            Perfil
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'mis-datos' }" exact-active-class="active font-medium">
                            Mis datos
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'analytics' }" exact-active-class="active font-medium">
                            Analítica
                        </RouterLink>
                    </li>
                </ul>

                <BaseButton @click="logout" variant="peligro" size="sm">
                    Cerrar sesión
                </BaseButton>
            </div>

        </div>
    </div>
</template>