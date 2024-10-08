<script setup lang="ts">
import type { Term } from 'n3';
import { Badge } from '@/components/ui/badge'
import graphStoreService from '@/services/GraphStoreService';
import type { HTMLAttributes } from 'vue';

defineProps<{
  term: Term;
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{
  (e: 'clickUri', value: string): void
}>()
</script>

<template>
  <div class="mb-1">
    <Badge
      v-if="term.termType === 'NamedNode'"
      variant="outline"
      class="cursor-pointer"
      @click="emit('clickUri', term.value)"
    >{{ graphStoreService.getPrefixedUri(term.value) }}</Badge>
    <div v-else>{{ term.value }}</div>
  </div>
</template>
