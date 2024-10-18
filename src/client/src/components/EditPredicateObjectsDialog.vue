<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { useGraphStore, commonDataTypes } from '@/stores/graph'
import { NamedNode, Literal, DataFactory, Quad } from 'n3'
import Dialog from 'primevue/dialog'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import TermValue from './TermValue.vue'

const { namedNode, literal } = DataFactory

const dialogRef = inject<Ref<{
  data: { subject: string, predicate: string, graphId: string }
}>>('dialogRef')

const subject = computed(() => dialogRef?.value.data?.subject)
const predicate = computed(() => dialogRef?.value.data.predicate)
const graphId = computed(() => dialogRef?.value.data.graphId)

const { getQuads, getLabel, getAllNamedNodes } = useGraphStore()

const originalQuads: Quad[] = []
const quads = ref<Quad[]>([])
const namedNodeSuggestions = ref<string[]>([])

// Language options
const languageOptions = ['en', 'fr', 'de', 'nl', 'es', 'it']

// Get quads on mount
onMounted(() => {
  if (!subject.value || !predicate.value || !graphId.value) return
  const qs = getQuads(namedNode(subject.value), namedNode(predicate.value), null, literal(graphId.value))
  originalQuads.push(...qs)
  quads.value = [...qs]
})

// Fetch suggestions for NamedNode URIs
const fetchNamedNodeSuggestions = (event: AutoCompleteCompleteEvent) => {
  namedNodeSuggestions.value = getAllNamedNodes().filter(node =>
    node.value.includes(event.query)
  ).map(node => node.value)
}

const addObject = (type: 'NamedNode' | 'Literal') => {
  if (!subject.value || !predicate.value || !graphId.value) return
  if (type === 'NamedNode') {
    quads.value.push(new Quad(namedNode(subject.value), namedNode(predicate.value), namedNode(''), literal(graphId.value)))
  } else {
    quads.value.push(new Quad(namedNode(subject.value), namedNode(predicate.value), literal(''), literal(graphId.value)))
  }
}

const removeObject = (index: number) => {
  quads.value.splice(index, 1)
}

const confirmChanges = () => {
  // Handle saving changes back to the store
}

const cancelChanges = () => {
  dialogRef.value.close()
}
</script>

<template>
  <div>
    <h3>{{ predicate && getLabel(predicate) }}</h3>

    <div
      v-for="(quad, index) in quads"
      :key="index"
      class="flex items-center space-x-4"
    >
      <!-- Named Node URI with AutoComplete -->
      <AutoComplete
        v-if="quad.object.termType === 'NamedNode'"
        v-model="quad.object.value"
        :suggestions="namedNodeSuggestions"
        @complete="fetchNamedNodeSuggestions"
        placeholder="Edit URI"
        class="w-full"
      />

      <!-- Literal Value -->
      <div
        v-if="quad.object.termType === 'Literal'"
        class="flex items-center space-x-2 w-full"
      >
        <InputText
          v-model="quad.object.value"
          placeholder="Edit literal value"
          class="w-1/3"
        />

        <!-- Language and Datatype fields for literals -->
        <Select
          v-model="quad.object.language"
          :options="languageOptions"
          placeholder="Select Language"
          class="w-1/3"
          editable
        />

        <Select
          v-model="quad.object.datatype.value"
          :options="commonDataTypes.map(type => ({ label: getLabel(type.value), value: type }))"
          placeholder="Select Datatype"
          class="w-1/3"
        />
      </div>

      <!-- Remove Button -->
      <Button
        icon="pi pi-trash"
        class="p-button-danger text"
        @click="removeObject(index)"
      />
    </div>

    <!-- Add New Named Node or Literal -->
    <div class="flex space-x-4 mt-4">
      <Button
        label="Add Named Node"
        icon="pi pi-plus"
        class="text"
        @click="addObject('NamedNode')"
      />
      <Button
        label="Add Literal"
        icon="pi pi-plus"
        class="text"
        @click="addObject('Literal')"
      />
    </div>

    <!-- Confirm and Cancel Buttons -->
    <div class="flex justify-end space-x-4 mt-4">
      <Button
        label="Cancel"
        class="p-button-secondary text"
        @click="cancelChanges"
      />
      <Button
        label="Confirm"
        class="p-button-success text"
        @click="confirmChanges"
      />
    </div>
  </div>
</template>