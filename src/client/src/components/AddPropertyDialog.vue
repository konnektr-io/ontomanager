<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { DataFactory, type Quad } from 'n3'
import { storeToRefs } from 'pinia'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { vocab } from '@/utils/vocab'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    existingPropertyNodes: string[];
    object: string;
    graphId: string;
  }
}>>('dialogRef')

const { reloadTrigger } = storeToRefs(useGraphStore())
const { addQuad } = useGraphStore()

const existingPropertyNodes = computed(() => dialogRef?.value.data.existingPropertyNodes)
const object = computed(() => dialogRef?.value.data.domain)
const graphId = computed(() => dialogRef?.value.data.graphId)

const propertyNodeSuggestions = ref<string[]>([])
const fetchPropertyNodeSuggestions = async (event: { value: string }) => {
  propertyNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions(existingPropertyNodes.value || [], event.value)
}
onMounted(() => {
  fetchPropertyNodeSuggestions({ value: '' })
})

const propertyNodeUri = ref<string>()

const confirmCreation = async () => {
  if (!propertyNodeUri.value || !object.value) return

  // Add current object as domain of the property node
  await addQuad(quad(
    namedNode(propertyNodeUri.value),
    namedNode(vocab.rdfs.domain.value),
    namedNode(object.value),
    namedNode(graphId.value)
  ))

  reloadTrigger.value++

  dialogRef?.value.close()
}

const cancelCreation = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <Select
      v-model="propertyNodeUri"
      :options="propertyNodeSuggestions"
      placeholder="Choose property"
      fluid
      class="grow"
      showClear
      editable
      filter
      @filter="fetchPropertyNodeSuggestions"
    />

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