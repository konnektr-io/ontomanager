<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, BlankNode, Quad } from 'n3'
import { useDebounceFn } from '@vueuse/core'
import Select, { type SelectFilterEvent } from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/InputText'
import Textarea from 'primevue/textarea'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, blankNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    subject: string,
    graphId: string,
    restrictionNode?: BlankNode
  }
}>>('dialogRef')

const restrictionNode = ref<BlankNode | null>(dialogRef?.value.data.restrictionNode || null)
const subjectUri = computed<string>(() => dialogRef?.value.data.subject)
const graphUri = computed<string>(() => dialogRef?.value.data.graphId)

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, editQuad, removeQuad } = useGraphStore()

const valuePredicates = ref<{ label: string, value: string }[]>([
  { label: 'Has Value', value: vocab.owl.hasValue.value },
  { label: 'Some Values From', value: vocab.owl.someValuesFrom.value },
  { label: 'All Values From', value: vocab.owl.allValuesFrom.value }
])

const cardinalityPredicates = ref<{ label: string, value: string }[]>([
  { label: 'Min Cardinality', value: vocab.owl.minCardinality.value },
  { label: 'Max Cardinality', value: vocab.owl.maxCardinality.value }
])

const objects = ref<{ predicate: string, value: string, termType: 'NamedNode' | 'Literal' }[]>([])
const namedNodeSuggestions = ref<string[]>([])

const fetchNamedNodeSuggestions = useDebounceFn(async (event: SelectFilterEvent | { value: string }) => {
  namedNodeSuggestions.value = await graphStoreService.getNamedNodeSuggestions(event.value)
}, 250, { maxWait: 1000 })

onMounted(async () => {

  if (restrictionNode.value) {
    const quads = await graphStoreService.getSubjectQuads(restrictionNode.value.value, undefined, graphUri.value)
    objects.value = quads.map(q => ({ predicate: q.predicate.value, value: q.object.value, termType: q.object.termType as 'NamedNode' | 'Literal' }))
  } else {
    namedNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions([], graphUri.value)
    restrictionNode.value = blankNode()
    objects.value.push({ predicate: vocab.rdf.type.value, value: vocab.owl.Restriction.value, termType: 'NamedNode' })
    objects.value.push({ predicate: vocab.owl.onProperty.value, value: '', termType: 'NamedNode' })
    objects.value.push({ predicate: vocab.owl.someValuesFrom.value, value: '', termType: 'NamedNode' })
  }
})


const addCardinality = (type: 'min' | 'max') => {
  const predicate = type === 'min' ? vocab.owl.minCardinality.value : vocab.owl.maxCardinality.value
  objects.value.push({ predicate, value: '', termType: 'Literal' })
}

const removeObject = (index: number) => {
  objects.value.splice(index, 1)
}

const confirmChanges = async () => {
  if (!subjectUri.value || !graphUri.value || !restrictionNode.value) return

  const newQuads = objects.value.map<Quad>(obj => {
    return quad(restrictionNode.value!, namedNode(obj.predicate), obj.termType === 'NamedNode' ? namedNode(obj.value) : literal(obj.value), namedNode(graphUri.value))
  })

  if (!dialogRef?.value.data.restrictionNode) {
    const subClassQuad = quad(namedNode(subjectUri.value), namedNode(vocab.rdfs.subClassOf.value), restrictionNode.value, namedNode(graphUri.value))
    newQuads.push(subClassQuad)
  }

  for (const newQuad of newQuads) {
    await addQuad(newQuad, graphUri.value)
  }

  reloadTrigger.value++

  dialogRef?.value.close()
}

const cancelChanges = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div
      v-for="(object, index) in objects"
      :key="index"
      class="flex items-center gap-2 w-full"
    >
      <div
        v-if="object.predicate === vocab.rdf.type.value || object.predicate === vocab.owl.onProperty.value"
        class="grow flex items-center gap-2"
      >
        <p class="font-semibold">{{ object.predicate === vocab.rdf.type.value ? 'Type' : 'On Property' }}</p>
        <Select
          v-if="object.predicate === vocab.owl.onProperty.value"
          v-model="object.value"
          :options="namedNodeSuggestions"
          placeholder="Select Property"
          fluid
          class="grow"
          showClear
          editable
          filter
          @filter="fetchNamedNodeSuggestions"
        />
        <p v-else>{{ object.value }}</p>
      </div>
      <div
        v-else-if="valuePredicates.some(vp => vp.value === object.predicate)"
        class="grow flex items-center gap-2"
      >
        <Select
          v-model="object.predicate"
          :options="valuePredicates"
          option-value="value"
          option-label="label"
          placeholder="Select Predicate"
          fluid
          class="grow"
          showClear
          editable
          filter
        />
        <InputText
          v-if="object.predicate === vocab.owl.hasValue.value"
          v-model="object.value"
          placeholder="Edit literal value"
          showClear
          class="grow"
        />
        <Select
          v-else
          v-model="object.value"
          :options="namedNodeSuggestions"
          placeholder="Select Value"
          fluid
          class="grow"
          showClear
          editable
          filter
          @filter="fetchNamedNodeSuggestions"
        />
      </div>
      <div
        v-else
        class="grow flex items-center gap-2"
      >
        <Select
          v-model="object.predicate"
          :options="valuePredicates"
          option-value="value"
          option-label="label"
          placeholder="Select Predicate"
          fluid
          class="grow"
          showClear
          editable
          filter
        />
        <Select
          v-if="object.termType === 'NamedNode'"
          v-model="object.value"
          :options="namedNodeSuggestions"
          placeholder="Select Value"
          fluid
          class="grow"
          showClear
          editable
          filter
          @filter="fetchNamedNodeSuggestions"
        />
        <Textarea
          v-else
          v-model="object.value"
          placeholder="Edit literal value"
          autogrow
          showClear
          class="grow"
        />
        <Button
          icon="pi pi-trash"
          text
          rounded
          @click="removeObject(index)"
        />
      </div>
    </div>

    <!-- <div class="flex gap-2">
      <Button
        v-if="!objects.some(obj => obj.predicate === vocab.owl.minCardinality.value)"
        label="Add Min Cardinality"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addCardinality('min')"
      />
      <Button
        v-if="!objects.some(obj => obj.predicate === vocab.owl.maxCardinality.value)"
        label="Add Max Cardinality"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addCardinality('max')"
      />
    </div> -->

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