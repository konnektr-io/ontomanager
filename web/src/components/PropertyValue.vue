<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Pencil } from 'lucide-vue-next'
import graphStoreService from '@/services/GraphStoreService'
import { useGraphStore } from '@/stores/graph'
import { vocab } from '@/utils/vocab'
// import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'
import TermValue from './TermValue.vue'
import PropertyValues from './PropertyValues.vue'

const props = defineProps<{
  subject: string
  predicate: string
  predicateObjects: {
    editable: boolean
    objects: Quad_Object[]
  }
}>()

const { selectedOntology, selectedResource, editMode } = storeToRefs(useGraphStore())
const predicateLabel = ref<string>('')
watch(
  () => props.predicate,
  async () => {
    predicateLabel.value = await graphStoreService.getLabel(props.predicate)
  },
  { immediate: true }
)

// TODO: Implement dialog pattern when EditPredicateObjectsDialog is migrated
const openDialog = (_predicate: string) => {
  if (!selectedOntology.value) return
  console.log('Open edit predicate objects dialog - to be implemented')
  // Will need to use Dialog + DialogTrigger pattern with EditPredicateObjectsDialog
}
</script>

<template>
  <div
    v-if="
      predicate !== vocab.rdf.first.value && predicate !== vocab.rdf.rest.value
    "
    class="flex items-center gap-2"
  >
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
            @click="selectedResource = predicate"
          >
            {{ predicateLabel }}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ predicate }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <Button
      v-if="editMode && predicateObjects.editable"
      variant="ghost"
      size="icon"
      class="h-6 w-6"
      @click="() => openDialog(predicate)"
    >
      <Pencil class="h-3 w-3" />
    </Button>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <TermValue
      v-for="object of predicateObjects.objects.filter(
        (object) =>
          object.termType === 'NamedNode' && object.value !== vocab.rdf.nil.value
      )"
      :key="object.id"
      :term="object"
      class="text-sm"
      @click-uri="selectedResource = object.value"
    />
  </div>
  <div class="gap-1">
    <TermValue
      v-for="object of predicateObjects.objects.filter(
        (object) => object.termType === 'Literal'
      )"
      :key="object.id"
      :term="object"
      class="text-sm"
      @click-uri="selectedResource = object.value"
    />
  </div>
  <div
    v-if="
      predicate !== vocab.rdfs.subClassOf.value &&
      predicate !== vocab.rdf.first.value &&
      predicate !== vocab.rdf.rest.value
    "
    class="pl-6 pt-1 flex flex-col gap-1"
  >
    <Card
      v-for="object of predicateObjects.objects.filter(
        (object) => object.termType === 'BlankNode'
      )"
      :key="object.id"
      class="py-2 px-3"
    >
      <PropertyValues :subject="object.value" />
    </Card>
  </div>
  <div
    v-else-if="
      predicate === vocab.rdf.first.value || predicate === vocab.rdf.rest.value
    "
    class="flex flex-col"
  >
    <PropertyValues
      v-for="object of predicateObjects.objects.filter(
        (object) => object.termType === 'BlankNode'
      )"
      :key="object.id"
      :subject="object.value"
    />
    <Separator
      v-if="predicate === vocab.rdf.first.value"
      class="my-2"
    />
  </div>
</template>
