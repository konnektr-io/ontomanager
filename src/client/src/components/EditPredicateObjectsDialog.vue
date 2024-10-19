<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { useGraphStore, commonDataTypes } from '@/stores/graph'
import { DataFactory, Literal, Quad } from 'n3'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: { subject: string, predicate: string, graphId: string }
}>>('dialogRef')

const subject = computed(() => dialogRef?.value.data?.subject)
const predicate = computed(() => dialogRef?.value.data.predicate)
const graphId = computed(() => dialogRef?.value.data.graphId)

const { getQuads, getLabel, getAllNamedNodes, addQuad, editQuad, removeQuad } = useGraphStore()

const originalQuads: Quad[] = []
interface EditableObject {
  termType: string;
  value: string;
  language?: string;
  datatype?: string;
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
    .filter((q) => q.object.termType === 'NamedNode' || q.object.termType === 'Literal')
    .reduce<EditableObject[]>((acc, q) => {
      if (q.object.termType === 'NamedNode') {
        acc.push({
          termType: 'NamedNode',
          value: q.object.value
        } as EditableObject)
      } else if (q.object.termType === 'Literal') {
        acc.push({
          termType: 'Literal',
          value: q.object.value,
          language: (q.object as Literal).language,
          datatype: (q.object as Literal).datatype.value
        } as EditableObject)
      }
      return acc
    }, [] as EditableObject[])
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
      value: ''
    })
  }
}

const removeObject = (index: number) => {
  objects.value.splice(index, 1)
}

const confirmChanges = () => {
  // Handle saving changes back to the store
  const newQuads = objects.value.map<Quad>(obj => {
    if (obj.termType === 'NamedNode') {
      return quad(namedNode(subject.value), namedNode(predicate.value), namedNode(obj.value), namedNode(graphId.value))
    } else {
      return quad(namedNode(subject.value), namedNode(predicate.value), literal(obj.value, obj.language || obj.datatype), namedNode(graphId.value))
    }
  })

  // Remove original quads that are no longer present
  originalQuads.forEach(originalQuad => {
    if (!newQuads.some(newQuad => newQuad.subject.equals(originalQuad.subject) &&
      newQuad.predicate.equals(originalQuad.predicate) &&
      newQuad.object.equals(originalQuad.object) &&
      newQuad.graph.equals(originalQuad.graph))) {
      removeQuad(originalQuad)
    }
  })

  // Add or edit new quads
  newQuads.forEach(newQuad => {
    const existingQuad = originalQuads.find(originalQuad => originalQuad.subject.equals(newQuad.subject) &&
      originalQuad.predicate.equals(newQuad.predicate) &&
      originalQuad.object.equals(newQuad.object) &&
      originalQuad.graph.equals(newQuad.graph))
    if (existingQuad) {
      editQuad(existingQuad, newQuad)
    } else {
      addQuad(newQuad)
    }
  })

  dialogRef?.value.close()
}

const cancelChanges = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div class="font-medium mb-4">{{ predicate && getLabel(predicate) }}</div>
    <div
      v-for="(object, index) in objects"
      :key="index"
      class="flex items-center gap-2 w-full"
    >
      <!-- Named Node URI with AutoComplete -->
      <AutoComplete
        v-if="object.termType === 'NamedNode'"
        v-model="object.value"
        :suggestions="namedNodeSuggestions"
        @complete="fetchNamedNodeSuggestions"
        placeholder="Edit URI"
        fluid
        class="grow"
        showClear
      />

      <!-- Literal Value -->
      <div
        v-if="object.termType === 'Literal'"
        class="grow flex items-center gap-2"
      >
        <Textarea
          v-model="object.value"
          placeholder="Edit literal value"
          autogrow
          showClear
          class="w-2/3"
        />

        <!-- Language and Datatype fields for literals -->
        <div class="flex flex-col gap-2 w-1/3">
          <Select
            v-if="!object.datatype || object.language"
            v-model="object.language"
            :options="languageOptions"
            placeholder="Select Language"
            editable
            showClear
          />

          <Select
            v-if="!object.language"
            v-model="object.datatype"
            :options="commonDataTypes"
            :option-label="type => getLabel(type.value)"
            :option-value="type => type.value"
            placeholder="Select Datatype"
            showClear
          />
        </div>
      </div>

      <!-- Remove Button -->
      <Button
        icon="pi pi-trash"
        text
        rounded
        @click="removeObject(index)"
      />
    </div>

    <!-- Add New Named Node or Literal -->
    <div class="flex gap-2 mt-4">
      <Button
        label="Add Named Node"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addObject('NamedNode')"
      />
      <Button
        label="Add Literal"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addObject('Literal')"
      />
    </div>

    <!-- Confirm and Cancel Buttons -->
    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        text
        @click="cancelChanges"
      />
      <Button
        type="button"
        label="Confirm"
        severity="secondary"
        outlined
        @click="confirmChanges"
      />
    </div>
  </div>
</template>