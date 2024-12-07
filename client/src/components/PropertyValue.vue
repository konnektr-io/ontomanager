<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import { useDialog } from 'primevue/usedialog'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Panel from 'primevue/panel'
import graphStoreService from '@/services/GraphStoreService'
import { useGraphStore } from '@/stores/graph'
import { vocab } from '@/utils/vocab'
import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'
import TermValue from './TermValue.vue'
import PropertyValues from './PropertyValues.vue'

const props = defineProps<{
  subject: string;
  predicate: string;
  predicateObjects: {
    editable: boolean;
    objects: Quad_Object[];
  };
}>()

const { selectedOntology, selectedResource, editMode } = storeToRefs(useGraphStore())
const predicateLabel = ref<string>('')
watch(() => props.predicate, async () => {
  predicateLabel.value = await graphStoreService.getLabel(props.predicate)
}, { immediate: true })

const dialog = useDialog()
const openDialog = (predicate: string) => {
  if (!selectedOntology.value) return
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
      subjectUri: props.subject,
      predicateUri: predicate,
      graphUri: selectedOntology.value.node?.value
    }
  })
}
</script>

<template>
  <div
    v-if="predicate !== vocab.rdf.first.value && predicate !== vocab.rdf.rest.value"
    class="flex items-center gap-2"
  >
    <div
      v-tooltip="predicate"
      class="text-sm font-medium !text-muted-foreground cursor-pointer"
      @click="selectedResource = predicate"
    >
      {{ predicateLabel }}
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
  <div class="flex flex-wrap items-center gap-2">
    <TermValue
      v-for="object of predicateObjects.objects.filter(object => object.termType === 'NamedNode' && object.value !== vocab.rdf.nil.value)"
      :key="object.id"
      :term="object"
      class="text-sm"
      @click-uri="selectedResource = object.value"
    >
    </TermValue>
  </div>
  <div class="gap-1">
    <TermValue
      v-for="object of predicateObjects.objects.filter(object => object.termType === 'Literal')"
      :key="object.id"
      :term="object"
      class="text-sm"
      @click-uri="selectedResource = object.value"
    >
    </TermValue>
  </div>
  <div
    v-if="predicate !== vocab.rdfs.subClassOf.value && predicate !== vocab.rdf.first.value && predicate !== vocab.rdf.rest.value"
    class="pl-6 pt-1 flex flex-col gap-1"
  >
    <Panel
      v-for="object of predicateObjects.objects.filter(object => object.termType === 'BlankNode')"
      :key="object.id"
      :pt:header:class="`pb-0 pt-2`"
      :pt:content:class="`pb-2`"
      class="py-0"
    >
      <PropertyValues :subject="object.value" />
    </Panel>
  </div>
  <div
    v-else-if="predicate === vocab.rdf.first.value || predicate === vocab.rdf.rest.value"
    class="flex flex-col"
  >
    <PropertyValues
      v-for="object of predicateObjects.objects.filter(object => object.termType === 'BlankNode')"
      :key="object.id"
      :subject="object.value"
    />
    <Divider
      v-if="predicate === vocab.rdf.first.value"
      class="my-2"
    />
  </div>
</template>
