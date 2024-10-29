<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, Literal, Quad } from 'n3'
import { useDebounceFn } from '@vueuse/core'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useGraphStore, commonDataTypes } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: { subject: string, predicate: string, graphId: string }
}>>('dialogRef')

const predicateLabel = ref<string>('')
const subjectUri = computed<string>(() => dialogRef?.value.data?.subjectUri)
const existingPredicateUri = computed<string>(() => dialogRef?.value.data.predicateUri)
const graphUri = computed<string>(() => dialogRef?.value.data.graphUri)

const { reloadTrigger } = storeToRefs(useGraphStore())
const { addQuad, editQuad, removeQuad } = useGraphStore()

const existingPredicates = ref<string[]>([])
const fetchExistingPredicates = async (subjUri: string) => {
  existingPredicates.value = (await graphStoreService.getSubjectQuads(subjUri))
    .map(q => q.predicate.value).filter((value, index, self) => self.indexOf(value) === index)
}
const predicateNodeSuggestions = ref<string[]>([])
const fetchPredicateNodeSuggestions = useDebounceFn(async (event: AutoCompleteCompleteEvent) => {
  predicateNodeSuggestions.value = await graphStoreService.getPredicateNodeSuggestions(existingPredicates.value, event.query)
}, 250, { maxWait: 1000 })

const predicateUri = ref<string>()
const currentPredicateUri = computed(() => existingPredicateUri.value || predicateUri.value)

const originalQuads: Quad[] = []
interface EditableObject {
  termType: string;
  value: string;
  language?: string;
  datatype?: string;
}
const objects = ref<EditableObject[]>([])
const namedNodeSuggestions = ref<string[]>([])
// Fetch suggestions for NamedNode URIs
const fetchNamedNodeSuggestions = useDebounceFn(async (event: AutoCompleteCompleteEvent) => {
  if (!currentPredicateUri.value) return
  namedNodeSuggestions.value = await graphStoreService.getObjectNamedNodeSuggestions(currentPredicateUri.value, event.query)
}, 250, { maxWait: 1000 })

// Language options
const languageOptions = ['en', 'fr', 'de', 'nl', 'es', 'it', 'pt']

// Get quads on mount (if predicate defined, otherwise it's a new predicate with all new objects)
onMounted(async () => {
  if (subjectUri.value && graphUri.value && !existingPredicateUri.value) {
    await fetchExistingPredicates(subjectUri.value)
  }
  if (!subjectUri.value || !existingPredicateUri.value || !graphUri.value) return
  predicateLabel.value = await graphStoreService.getLabel(existingPredicateUri.value)
  const qs = await graphStoreService.getSubjectQuads(subjectUri.value, existingPredicateUri.value, graphUri.value)
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



const addObject = (type: 'NamedNode' | 'Literal') => {
  if (!subjectUri.value || !predicateUri.value || !graphUri.value) return
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

const confirmChanges = async () => {
  if (!currentPredicateUri.value || !subjectUri.value || !graphUri.value) return
  // Handle saving changes back to the store
  const newQuads = objects.value.map<Quad>(obj => {
    if (!currentPredicateUri.value) throw new Error('Predicate URI is required')
    if (obj.termType === 'NamedNode') {
      return quad(namedNode(subjectUri.value), namedNode(currentPredicateUri.value), namedNode(obj.value), namedNode(graphUri.value))
    } else {
      return quad(namedNode(subjectUri.value), namedNode(currentPredicateUri.value), literal(obj.value, obj.language || obj.datatype), namedNode(graphUri.value))
    }
  })

  // Remove original quads that are no longer present
  for (const originalQuad of originalQuads) {
    if (!newQuads.some(newQuad => newQuad.subject.equals(originalQuad.subject) &&
      newQuad.predicate.equals(originalQuad.predicate) &&
      newQuad.object.equals(originalQuad.object) &&
      newQuad.graph.equals(originalQuad.graph))) {
      await removeQuad(originalQuad)
    }
  }

  // Add or edit new quads
  for (const newQuad of newQuads) {
    const existingQuad = originalQuads.find(originalQuad => originalQuad.subject.equals(newQuad.subject) &&
      originalQuad.predicate.equals(newQuad.predicate) &&
      originalQuad.object.equals(newQuad.object) &&
      originalQuad.graph.equals(newQuad.graph))
    if (existingQuad) {
      await editQuad(existingQuad, newQuad)
    } else {
      await addQuad(newQuad)
    }
  }

  // When changing labels, subClassOf etc. need to update the tree (the trigger is watched in ResourceTree.vue)
  if (currentPredicateUri.value === vocab.rdfs.label.value ||
    currentPredicateUri.value === vocab.skos.prefLabel.value ||
    currentPredicateUri.value === vocab.rdfs.subClassOf.value ||
    currentPredicateUri.value === vocab.rdfs.subPropertyOf.value) {
    reloadTrigger.value++
  }

  dialogRef?.value.close()
}

const cancelChanges = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div
      v-if="existingPredicateUri"
      class="font-medium mb-4"
    >{{ predicateLabel || existingPredicateUri }}</div>
    <AutoComplete
      v-else
      v-model="predicateUri"
      :suggestions="predicateNodeSuggestions"
      @complete="fetchPredicateNodeSuggestions"
      placeholder="Edit Predicate"
      fluid
      class="grow"
      showClear
    />
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
            option-value="uri"
            option-label="label"
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
        :disabled="!currentPredicateUri"
        @click="confirmChanges"
      />
    </div>
  </div>
</template>