<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import AnnotationPropertyList from './PropertyValueList.vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import TermValue from './TermValue.vue'


const { selectedResource, userGraphs } = storeToRefs(useGraphStore())
const {
  getProperties,
  getIndividuals,
  getLabel,
  getPrefixedUri,
  getRanges
} = useGraphStore()

const properties = ref<string[]>([])
const individuals = ref<string[]>([])
watch([selectedResource, userGraphs], async () => {
  if (!selectedResource.value) return
  properties.value = await getProperties(selectedResource.value)
  individuals.value = getIndividuals(selectedResource.value)
}, { immediate: true, deep: true })



</script>

<template>
  <div
    v-if="selectedResource"
    class="w-full p-4"
  >
    <div class="flex items-center gap-2 mb-4">
      <p class="text-lg font-semibold">{{ getLabel(selectedResource) }}</p>
      <div class="flex flex-wrap gap-1">
        <Tag
          v-tooltip="selectedResource"
          :value="getPrefixedUri(selectedResource)"
        ></Tag>
      </div>
    </div>
    <div>
      <div class="mb-6">
        <AnnotationPropertyList :subject="selectedResource" />
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
              :key="property"
              toggleable
              collapsed
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(property)"
                    class="font-semibold cursor-pointer"
                    @click="selectedResource = property"
                  >{{ getLabel(property) }}</div>
                  <TermValue
                    v-for="object of getRanges(property)"
                    :key="object.value"
                    :term="object"
                    class="text-sm"
                    @click-uri="selectedResource = object.value"
                  >
                  </TermValue>
                </div>
              </template>
              <AnnotationPropertyList :subject="property" />
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
                  <div
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
                  </TermValue>
                </div>
              </template>
              <AnnotationPropertyList :subject="individual" />
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