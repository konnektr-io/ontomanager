<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { Quad_Object } from 'n3';
import { useDialog } from 'primevue/usedialog';
import Button from 'primevue/button';
import { useMainStore } from '@/stores/main';
import { useGraphStore } from '@/stores/graph-store';
import TermValue from './TermValue.vue';
import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue';

const props = defineProps<{
  subject: string;
}>()

const dialog = useDialog();
const { selected } = storeToRefs(useMainStore());
const { selectedOntology, editMode } = storeToRefs(useGraphStore());
const { getQuads, getSubjectQuads, getLabel } = useGraphStore();

const groupedAnnotations = computed(() => {
  const annotations = getSubjectQuads(props.subject);
  return annotations.reduce((acc, annotation) => {
    const graphId = annotation.graph.value;
    const editable = (selectedOntology.value && graphId === selectedOntology.value.url) ?? false;
    const predicate = annotation.predicate.value;
    if (!acc[predicate]) {
      acc[predicate] = { objects: [], editable };
    }
    acc[predicate].objects.push(annotation.object);
    return acc;
  }, {} as Record<string, { editable: boolean, objects: Quad_Object[] }>);
});

const openDialog = (predicate: string) => {
  if (!selectedOntology.value) return;
  dialog.open(EditPredicateObjectsDialog, {
    props: {
      header: 'Edit Objects',
      style: {
        width: '50vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      subject: props.subject,
      predicate,
      graphId: selectedOntology.value.url
    }
  });
};
</script>

<template>
  <div
    v-for="(predicateObjects, predicate) in groupedAnnotations"
    :key="`${predicate}`"
    class="text-sm mb-2"
  >
    <div class="flex items-center gap-2">
      <div
        v-tooltip="predicate"
        class="text-sm font-medium !text-muted-foreground cursor-pointer"
        @click="selected = predicate"
      >
        {{ getLabel(predicate) }}
      </div>
      <Button
        v-if="editMode && predicateObjects.editable"
        icon="pi pi-pencil"
        size="small"
        text
        rounded
        @click="() => openDialog(predicate)"
      />
    </div>
    <div class="flex items-center gap-2">
      <TermValue
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'NamedNode')"
        :key="object.value"
        :term="object"
        class="text-sm"
        @click-uri="selected = object.value"
      >
      </TermValue>
    </div>
    <div>
      <TermValue
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'Literal')"
        :key="object.value"
        :term="object"
        class="text-sm"
        @click-uri="selected = object.value"
      >
      </TermValue>
    </div>
    <div class="pl-6">
      <div
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'BlankNode')"
        :key="object.value"
      >
        <div
          v-for="quad of getQuads(object, null, null, null)"
          :key="`${quad.predicate.value}_${quad.object.value}`"
        >
          <div class="flex items-center gap-2">
            <div
              v-tooltip="quad.predicate.value"
              class="text-sm font-medium text-muted-foreground cursor-pointer"
              @click="selected = quad.predicate.value"
            >
              {{ getLabel(quad.predicate.value) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <TermValue
              :term="quad.object"
              class="text-sm"
            >
            </TermValue>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
