<script setup lang="ts">
import TheHeader from '@/components/TheHeader.vue';
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <!-- Header Section -->
    <header class="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <TheHeader />
    </header>

    <!-- Main View -->
    <main class="flex-grow h-full flex flex-col">
      <RouterView class="flex-grow" />
    </main>

  </div>
</template>