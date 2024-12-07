<script setup lang="ts">
import { ref, computed, inject, type Ref, watch } from 'vue'
import { DataFactory } from 'n3'
import { storeToRefs } from 'pinia'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { TreeType, useGraphStore } from '@/stores/graph'
import { vocab } from '@/utils/vocab'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    parentUri: string;
    type: TreeType;
    graphId: string;
  }
}>>('dialogRef')

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad } = useGraphStore()

const parentUri = computed(() => dialogRef?.value.data.parentUri)
const type = computed(() => dialogRef?.value.data.type)
const graphId = computed(() => dialogRef?.value.data.graphId)
const graphDetails = computed(() => userGraphs.value.find(g => g.node?.value === graphId.value))
const scopeId = computed(() => graphDetails.value?.scopeId)

const newResourceLabel = ref('')
const newResourceUri = ref('')
watch(newResourceLabel, (value) => {
  const namespace = graphId.value
  if (type.value === TreeType.Classes || type.value === TreeType.Individuals) {
    newResourceUri.value = `${namespace}${value.replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).replace(/\s/g, '')}`
  } else {
    newResourceUri.value = `${namespace}${value.replace(/\s(.)/g, (match, group1) => group1.toUpperCase()).replace(/\s/g, '').replace(/^(.)/, (match, group1) => group1.toLowerCase())}`
  }
})
// TODO: add validation to make sure the uri doesn't exist yet


const confirmCreation = async () => {
  if (!type.value || !graphId.value || !scopeId.value) return

  const typeUri = type.value === TreeType.Individuals
    ? vocab.owl.NamedIndividual
    : type.value === TreeType.Classes
      ? (graphDetails.value?.defaults?.class || vocab.owl.Class)
      : (graphDetails.value?.defaults?.property || vocab.owl.ObjectProperty)

  await addQuad(quad(
    namedNode(newResourceUri.value),
    vocab.rdf.type,
    namedNode(typeUri.value),
    namedNode(graphId.value)
  ), scopeId.value)

  if (parentUri.value) {
    await addQuad(quad(
      namedNode(newResourceUri.value),
      type.value === TreeType.Individuals
        ? vocab.rdf.type
        : type.value === TreeType.Classes
          ? vocab.rdfs.subClassOf
          : vocab.rdfs.subPropertyOf,
      namedNode(parentUri.value),
      namedNode(graphId.value)
    ), scopeId.value)
  }

  // TODO: find most appropriate label predicate
  // If skos:prefLabel is used more than rdfs:label, then use skos:prefLabel

  await addQuad(quad(
    namedNode(newResourceUri.value),
    (graphDetails.value?.defaults?.label || vocab.rdfs.label),
    literal(newResourceLabel.value, 'en'),
    namedNode(graphId.value)
  ), scopeId.value)

  reloadTrigger.value++

  dialogRef?.value.close()
}

const text = computed(() => {
  const typeText = type.value === TreeType.Classes
    ? 'subclass'
    : type.value === TreeType.Properties
      ? 'subproperty'
      : 'individual'
  const parentText = parentUri.value ? ` of ${parentUri.value}` : ''
  return `Provide label and URI for new ${typeText}${parentText}.`
})

const cancelCreation = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <span class="text-surface-500 dark:text-surface-400 block mb-8">{{ text }}</span>
    <div class="flex items-center gap-4 mb-8">
      <label
        for="label"
        class="font-semibold w-24"
      >Label</label>
      <InputText
        id="label"
        v-model="newResourceLabel"
        class="flex-auto"
        autocomplete="off"
      />
    </div>
    <div class="flex items-center gap-4 mb-8">
      <label
        for="uri"
        class="font-semibold w-24"
      >Uri</label>
      <InputText
        id="uri"
        v-model="newResourceUri"
        class="flex-auto"
        autocomplete="off"
      />
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        text
        @click="cancelCreation"
      />
      <Button
        type="button"
        label="Confirm"
        severity="secondary"
        outlined
        @click="confirmCreation"
      />
    </div>
  </div>
</template>