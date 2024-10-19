<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { useGraphStore, commonDataTypes } from '@/stores/graph'
import { DataFactory, Literal, Quad } from 'n3'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'

const { namedNode, literal } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: { subject: string, predicate: string, graphId: string }
}>>('dialogRef')

const subject = computed(() => dialogRef?.value.data?.subject)
const predicate = computed(() => dialogRef?.value.data.predicate)
const graphId = computed(() => dialogRef?.value.data.graphId)

const { getQuads, getLabel, getAllNamedNodes } = useGraphStore()

const originalQuads: Quad[] = []
interface EditableObject {
  termType: string;
  value: string;
  language?: string;
  datatype?: { value: string };
}
const objects = ref<EditableObject[]>([])
const namedNodeSuggestions = ref<string[]>([])

// Language options
const languageOptions = ['en', 'fr', 'de', 'nl', 'es', 'it', 'pt']

// Get quads on mount
onMounted(() => {
  if (!subject.value || !predicate.value || !graphId.value) return
  const qs = getQuads(namedNode(subject.value), namedNode(predicate.value), null, literal(graphId.value))
  originalQuads.push(...qs)
  objects.value = qs
    .filter(q => q.object.termType === 'NamedNode' || q.object.termType === 'Literal')
    .map<EditableObject>(q => {
      if (q.object.termType === 'NamedNode') {
        return {
          termType: 'NamedNode',
          value: q.object.value
        } as EditableObject
      } else {
        return {
          termType: 'Literal',
          value: q.object.value,
          language: (q.object as Literal).language,
          datatype: { value: (q.object as Literal).datatype.value }
        } as EditableObject
      }
    })
})

// Fetch suggestions for NamedNode URIs
const fetchNamedNodeSuggestions = (event: AutoCompleteCompleteEvent) => {
  const allNamedNodes = getAllNamedNodes().map(node => node.value)
  namedNodeSuggestions.value = [...new Set(allNamedNodes.filter(value =>
    value.includes(event.query)
  ))]
}

const addObject = (type: 'NamedNode' | 'Literal') => {
  if (!subject.value || !predicate.value || !graphId.value) return
  if (type === 'NamedNode') {
    objects.value.push({
      termType: 'NamedNode',
      value: ''
    })
  } else {
    objects.value.push({
      termType: 'Literal',
      value: '',
      language: languageOptions.find(lang => !objects.value.some(obj => obj.language === lang)) || '',
      datatype: commonDataTypes[0],
    })
  }
}

const removeObject = (index: number) => {
  objects.value.splice(index, 1)
}

const confirmChanges = () => {
  // Handle saving changes back to the store
}

const cancelChanges = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div>
    <div class="font-medium mb-4">{{ predicate && getLabel(predicate) }}</div>
    <div
      v-for="(object, index) in objects"
      :key="index"
      class="flex items-center space-x-4"
    >
      <!-- Named Node URI with AutoComplete -->
      <AutoComplete
        v-if="object.termType === 'NamedNode'"
        v-model="object.value"
        :suggestions="namedNodeSuggestions"
        @complete="fetchNamedNodeSuggestions"
        placeholder="Edit URI"
        class="w-full"
      />

      <!-- Literal Value -->
      <div
        v-if="object.termType === 'Literal'"
        class="flex items-center space-x-2 w-full"
      >
        <InputText
          v-model="object.value"
          placeholder="Edit literal value"
          class="w-1/3"
        />

        <!-- Language and Datatype fields for literals -->
        <Select
          v-model="object.language"
          :options="languageOptions"
          placeholder="Select Language"
          class="w-1/3"
          editable
        />

        <Select
          v-if="object.termType === 'Literal' && object.datatype"
          v-model="object.datatype.value"
          :options="commonDataTypes"
          :option-label="type => getLabel(type.value)"
          :option-value="type => type.value"
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
    <div class="flex justify-end gap-2 space-x-4 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        @click="cancelChanges"
      />
      <Button
        type="button"
        label="Confirm"
        @click="confirmChanges"
      />
    </div>
  </div>
</template>