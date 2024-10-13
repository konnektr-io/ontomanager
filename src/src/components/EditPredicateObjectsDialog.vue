<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue';
import { useGraphStore } from '@/stores/graph-store';
import { NamedNode, Literal, DataFactory } from 'n3';
import Dialog from 'primevue/dialog';
import TermValue from './TermValue.vue';

const { namedNode, literal } = DataFactory

const dialogRef = inject<Ref<{
  data: { subject: string, predicate: string, graphId: string }
}>>('dialogRef');
const { getQuads } = useGraphStore();

const objects = computed(() => {
  const { subject, predicate, graphId } = dialogRef?.value.data as { subject: string, predicate: string, graphId: string };
  return getQuads(namedNode(subject), namedNode(predicate), null, literal(graphId)).map(quad => quad.object);
})

</script>

<template>
  <div>
    <div class="flex mt-1 mb-4 text-lg">
      Edit Annotations
    </div>
    <div class="text-surface-500 dark:text-surface-400 block mb-8">Update your information.</div>
    <div>
      <TermValue
        v-for="object of objects"
        :key="object.value"
        :term="object"
        class="text-sm"
      >
      </TermValue>
    </div>
  </div>
</template>

<style scoped>
/* Add your dialog styles here */
</style>