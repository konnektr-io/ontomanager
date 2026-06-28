<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DataFactory } from 'n3'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { TreeType, useGraphStore } from '@/stores/graph'
import { vocab } from '@/utils/vocab'

const { namedNode, literal, quad } = DataFactory

interface Props {
  parentUri?: string
  type: TreeType
  graphId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad } = useGraphStore()

const graphDetails = computed(() => userGraphs.value.find(g => g.node?.value === props.graphId))
const scopeId = computed(() => graphDetails.value?.scopeId)

const newResourceLabel = ref('')
const newResourceUri = ref('')

watch(newResourceLabel, (value) => {
  const namespace = props.graphId
  if (props.type === TreeType.Classes || props.type === TreeType.Individuals) {
    newResourceUri.value = `${namespace}${value.replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).replace(/\s/g, '')}`
  } else {
    newResourceUri.value = `${namespace}${value.replace(/\s(.)/g, (_match, group1) => group1.toUpperCase()).replace(/\s/g, '').replace(/^(.)/, (_match, group1) => group1.toLowerCase())}`
  }
})

const confirmCreation = async () => {
  if (!props.type || !props.graphId || !scopeId.value) return

  const typeUri = props.type === TreeType.Individuals
    ? vocab.owl.NamedIndividual
    : props.type === TreeType.Classes
      ? (graphDetails.value?.defaults?.class || vocab.owl.Class)
      : (graphDetails.value?.defaults?.property || vocab.owl.ObjectProperty)

  await addQuad(
    quad(
      namedNode(newResourceUri.value),
      vocab.rdf.type,
      namedNode(typeUri.value),
      namedNode(props.graphId)
    ),
    scopeId.value
  )

  if (props.parentUri) {
    await addQuad(
      quad(
        namedNode(newResourceUri.value),
        props.type === TreeType.Individuals
          ? vocab.rdf.type
          : props.type === TreeType.Classes
            ? vocab.rdfs.subClassOf
            : vocab.rdfs.subPropertyOf,
        namedNode(props.parentUri),
        namedNode(props.graphId)
      ),
      scopeId.value
    )
  }

  await addQuad(
    quad(
      namedNode(newResourceUri.value),
      graphDetails.value?.defaults?.label || vocab.rdfs.label,
      literal(newResourceLabel.value, 'en'),
      namedNode(props.graphId)
    ),
    scopeId.value
  )

  reloadTrigger.value++
  emit('confirm')
}

const text = computed(() => {
  const typeText =
    props.type === TreeType.Classes
      ? 'subclass'
      : props.type === TreeType.Properties
        ? 'subproperty'
        : 'individual'
  const parentText = props.parentUri ? ` of ${props.parentUri}` : ''
  return `Provide label and URI for new ${typeText}${parentText}.`
})
</script>

<template>
  <DialogContent class="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Create New Resource</DialogTitle>
      <DialogDescription>
        {{ text }}
      </DialogDescription>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <label
          for="label"
          class="text-right font-semibold"
        >Label</label>
        <Input
          id="label"
          v-model="newResourceLabel"
          class="col-span-3"
          autocomplete="off"
        />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <label
          for="uri"
          class="text-right font-semibold"
        >URI</label>
        <Input
          id="uri"
          v-model="newResourceUri"
          class="col-span-3"
          autocomplete="off"
        />
      </div>
    </div>
    <DialogFooter>
      <Button
        type="button"
        variant="ghost"
        @click="emit('cancel')"
      >Cancel</Button>
      <Button
        type="button"
        variant="outline"
        @click="confirmCreation"
      >Confirm</Button>
    </DialogFooter>
  </DialogContent>
</template>
