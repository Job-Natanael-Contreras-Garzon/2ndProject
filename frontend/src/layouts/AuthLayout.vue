<script setup>
import Navbar from "@/components/Navbar.vue";
</script>

<template>
    <div class="min-h-screen bg-base-200">
        <Navbar />

        <main class="mx-auto max-w-7xl px-4 py-6">
            <RouterView />
        </main>
    </div>
</template>