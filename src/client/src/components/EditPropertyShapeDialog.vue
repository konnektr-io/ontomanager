<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, BlankNode, Quad } from 'n3'
import { useDebounceFn } from '@vueuse/core'
import Select, { type SelectFilterEvent } from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, blankNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    subject: string,
    graphId: string,
    shapeNode?: BlankNode
  }
}>>('dialogRef')

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, removeQuad } = useGraphStore()

const shapeNode = ref<BlankNode | null>(dialogRef?.value.data.shapeNode || null)
const subjectUri = computed<string>(() => dialogRef?.value.data.subject)
const graphUri = computed<string>(() => dialogRef?.value.data.graphId)
const scopeId = computed<string | undefined>(() => userGraphs.value.find(g => g.node?.value === graphUri.value)?.scopeId)

const valuePredicates = ref<{ label: string, value: string }[]>([
  { label: 'Datatype', value: vocab.sh.datatype.value },
  { label: 'Class', value: vocab.sh.class.value }
])

const cardinalityPredicates = ref<{ label: string, value: string }[]>([
  { label: 'Min Count', value: vocab.sh.minCount.value },
  { label: 'Max Count', value: vocab.sh.maxCount.value }
])

const objects = ref<{ predicate: string, value: string, termType: 'NamedNode' | 'Literal' }[]>([])
const namedNodeSuggestions = ref<string[]>([])

const fetchNamedNodeSuggestions = useDebounceFn(async (event: SelectFilterEvent | { value: string }) => {
  namedNodeSuggestions.value = await graphStoreService.getNamedNodeSuggestions(event.value)
}, 250, { maxWait: 1000 })

const originalQuads = ref<Quad[]>([])

onMounted(async () => {
  if (shapeNode.value) {
    originalQuads.value = await graphStoreService.getSubjectQuads(shapeNode.value.value, undefined, graphUri.value)
    objects.value = originalQuads.value.map(q => ({ predicate: q.predicate.value, value: q.object.value, termType: q.object.termType as 'NamedNode' | 'Literal' }))
  } else {
    namedNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions([], graphUri.value)
    shapeNode.value = blankNode()
    objects.value.push({ predicate: vocab.sh.path.value, value: '', termType: 'NamedNode' })
  }
})

const addCardinality = (type: 'min' | 'max') => {
  const predicate = type === 'min' ? vocab.sh.minCount.value : vocab.sh.maxCount.value
  objects.value.push({ predicate, value: '', termType: 'Literal' })
}

const removeObject = (index: number) => {
  objects.value.splice(index, 1)
}

const confirmChanges = async () => {
  if (!subjectUri.value || !graphUri.value || !shapeNode.value || !scopeId.value) return

  const newQuads = objects.value.map<Quad>(obj => {
    return quad(shapeNode.value!, namedNode(obj.predicate), obj.termType === 'NamedNode' ? namedNode(obj.value) : literal(obj.value), namedNode(graphUri.value))
  })

  if (!dialogRef?.value.data.shapeNode) {
    const subClassQuad = quad(namedNode(subjectUri.value), namedNode(vocab.sh.property.value), shapeNode.value, namedNode(graphUri.value))
    newQuads.push(subClassQuad)
  } else {
    for (const originalQuad of originalQuads.value) {
      await removeQuad(originalQuad, scopeId.value)
    }
  }

  for (const newQuad of newQuads) {
    await addQuad(newQuad, scopeId.value)
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
        v-if="object.predicate === vocab.rdf.type.value || object.predicate === vocab.sh.path.value"
        class="grow flex items-center gap-2"
      >
        <p class="font-semibold">{{ object.predicate === vocab.rdf.type.value ? 'Type' : 'Path' }}</p>
        <Select
          v-if="object.predicate === vocab.sh.path.value"
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
        <Select
          v-if="object.predicate === vocab.sh.class.value"
          v-model="object.value"
          :options="namedNodeSuggestions"
          placeholder="Select Class"
          fluid
          class="grow"
          showClear
          editable
          filter
          @filter="fetchNamedNodeSuggestions"
        />
        <Select
          v-else
          v-model="object.value"
          :options="namedNodeSuggestions"
          placeholder="Select Datatype"
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
          :options="[...valuePredicates, ...cardinalityPredicates]"
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
          v-if="object.termType === 'Literal'"
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
        <Button
          icon="pi pi-trash"
          text
          rounded
          @click="removeObject(index)"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <Button
        v-if="!objects.some(obj => obj.predicate === vocab.sh.minCount.value)"
        label="Add Min Count"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addCardinality('min')"
      />
      <Button
        v-if="!objects.some(obj => obj.predicate === vocab.sh.maxCount.value)"
        label="Add Max Count"
        icon="pi pi-plus"
        text
        severity="secondary"
        @click="addCardinality('max')"
      />
    </div>

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