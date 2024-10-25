<script setup lang="ts">
import { ref, watch } from 'vue'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import PropertyValues from './PropertyValues.vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'

const { selectedResource, userGraphs } = storeToRefs(useGraphStore())
const {
  // getProperties,
  // getIndividuals,
  // getLabel,
  getPrefixedUri,
  // getRanges
} = useGraphStore()

const label = ref<string>('')
const properties = ref<{ label: string, uri: string }[]>([])
const individuals = ref<string[]>([])
watch([
  selectedResource,
  userGraphs
], async () => {
  if (!selectedResource.value) {
    label.value = ''
    properties.value = []
    individuals.value = []
  } else {
    label.value = await graphStoreService.getLabel(selectedResource.value)
    properties.value = await graphStoreService.getProperties(selectedResource.value)
    // individuals.value = getIndividuals(selectedResource.value)
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
        <div>
          <h3 class="text-lg font-semibold mb-4">Properties</h3>
          <p
            v-if="!properties.length"
            class="text-muted-foreground"
          >No properties defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="property in properties"
              :key="property.uri"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(property.uri)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = property.uri"
                  >{{ property.label }}</div>
                  <!-- <TermValue
                    v-for="object of getRanges(property)"
                    :key="object.value"
                    :term="object"
                    class="text-sm"
                    @click-uri="selectedResource = object.value"
                  >
                  </TermValue> -->
                </div>
              </template>
              <PropertyValues :subject="property.uri" />
            </Panel>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4">Individuals</h3>
          <p
            v-if="!individuals.length"
            class="text-muted-foreground"
          >No individuals defined.</p>
          <div
            v-else
            class="space-y-4"
          >
            <Panel
              v-for="individual in individuals"
              :key="individual"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <!-- <div
                    v-tooltip="getPrefixedUri(individual)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = individual"
                  >{{ getLabel(individual) }}</div>
                  <TermValue
                    v-for="object of getRanges(individual)"
                    :key="object.value"
                    :term="object"
                    class="text-sm"
                    @click-uri="selectedResource = object.value"
                  >
                  </TermValue> -->
                </div>
              </template>
              <!-- <PropertyValueList :subject="individual" /> -->
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