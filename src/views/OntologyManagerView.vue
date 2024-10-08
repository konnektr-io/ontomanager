<script setup lang="ts">
import TaxonomyTree from '@/components/TaxonomyTree.vue'
import ClassEditor from '@/components/ClassEditor.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/stores/main';

const { selected } = storeToRefs(useMainStore());
</script>

<template>
  <main class="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
    <div class="mx-auto grid w-full max-w-6xl gap-2">
      <h1 class="text-3xl font-semibold">
        Taxonomy
      </h1>
    </div>
    <div class="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
      <div class="grid gap-4">
        <TaxonomyTree v-model="selected" />
      </div>
      <div class="grid gap-6">
        <ClassEditor
          v-if="selected"
          :selected="selected"
        />
      </div>
    </div>
  </main>
</template>