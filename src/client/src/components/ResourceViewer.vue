<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import PropertyValues from './PropertyValues.vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import type { BlankNode, NamedNode, Term } from 'n3'
import TermValue from './TermValue.vue'

const {
  editMode,
  selectedResource,
  userGraphs } = storeToRefs(useGraphStore())
const {
  // getProperties,
  // getIndividuals,
  // getLabel,
  getPrefixedUri,
  // getRanges
} = useGraphStore()

const label = ref<string>('')
const properties = ref<{
  label: string,
  node: NamedNode,
  ranges: Term[]
}[]>([])
const restrictions = ref<{
  label: string
  propertyNode: NamedNode
  blankNode: BlankNode
  valueNodes: Term[]
}[]>([])
const individuals = ref<{ label: string, node: NamedNode }[]>([])
watch([
  selectedResource,
  userGraphs
], async () => {
  if (!selectedResource.value) {
    label.value = ''
    properties.value = []
    restrictions.value = []
    individuals.value = []
  } else {
    label.value = await graphStoreService.getLabel(selectedResource.value)
    properties.value = await graphStoreService.getProperties(selectedResource.value)
    restrictions.value = await graphStoreService.getRestrictions(selectedResource.value)
    individuals.value = await graphStoreService.getIndividuals(selectedResource.value)
  }
}, { immediate: true, deep: true })


</script>

<template>
  <div
    v-if="selectedResource"
    class="w-full p-4"
  >
    <div class="flex items-center gap-2 mb-4">
      <p class="text-lg font-semibold">{{ label }}</p>
      <div class="flex flex-wrap gap-1">
        <Tag
          v-tooltip="selectedResource"
          :value="getPrefixedUri(selectedResource)"
        ></Tag>
      </div>
    </div>
    <div>
      <div class="mb-6">
        <PropertyValues :subject="selectedResource" />
      </div>
      <div class="space-y-6">
        <div v-if="properties.length || editMode">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Properties</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
            />
          </div>
          <p
            v-if="!properties.length"
            class="text-slate-500"
          >No properties defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in properties"
              :key="property.node.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(property.node.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = property.node.value"
                  >{{ property.label }}</div>
                  <TermValue
                    v-for="range of property.ranges"
                    :key="range.id"
                    :term="range"
                    class="text-sm"
                    @click-uri="selectedResource = range.value"
                  />
                </div>

              </template>
              <PropertyValues :subject="property.node.value" />
            </Panel>
          </div>
        </div>

        <div v-if="restrictions.length || editMode">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Restrictions</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
            />
          </div>
          <p
            v-if="!restrictions.length"
            class="text-slate-500"
          >No restrictions defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="restriction in restrictions"
              :key="restriction.blankNode.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(restriction.propertyNode.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = restriction.propertyNode.value"
                  >{{ restriction.label }}</div>
                  <TermValue
                    v-for="valueNode of restriction.valueNodes"
                    :key="valueNode.id"
                    :term="valueNode"
                    class="text-sm"
                    @click-uri="selectedResource = valueNode.value"
                  />
                </div>
                <!-- TODO: add value here -->
              </template>
              <PropertyValues :subject="restriction.blankNode.value" />
            </Panel>
          </div>
        </div>

        <div v-if="individuals.length || editMode">
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold">Individuals</h3>
            <Button
              v-if="editMode"
              icon="pi pi-plus"
              size="small"
              text
              label="Add"
            />
          </div>
          <p
            v-if="!individuals.length"
            class="text-slate-500"
          >No individuals defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="individual in individuals"
              :key="individual.node.value"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(individual.node.value)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = individual.node.value"
                  >{{ individual.label }}</div>
                </div>
              </template>
              <PropertyValues :subject="individual.node.value" />
            </Panel>
          </div>
        </div>

        <!-- <div>
          <h3 class="text-lg font-semibold mb-4">SHACL Properties</h3>
          <p
            v-if="!shaclPropertyQuads.length"
            class="text-muted-foreground"
          >No properties defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="shaclPropertyQuad in shaclPropertyQuads"
              :key="shaclPropertyQuad"
              toggleable
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <div
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = shaclPropertyQuad.object.value"
                  >{{ shaclPropertyQuad.object.value }}</div>
                </div>
              </template>
              <AnnotationPropertyList :subject="shaclPropertyQuad.object.value" />
            </Panel>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">Restrictions</h3>
          <p
            v-if="!restrictions.length"
            class="text-muted-foreground"
          >No restrictions defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in restrictions"
              :key="property"
              toggleable
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <div
                    v-tooltip="getPrefixedUri(property)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = property"
                  >{{ getLabel(property) }}</div>
                </div>
              </template>
              <AnnotationPropertyList
                :subject="property"
                all-literals
              />
            </Panel>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">Individuals</h3>
          <p class="text-muted-foreground">No individuals listed.</p>
        </div> -->
      </div>
    </div>
  </div>
</template>