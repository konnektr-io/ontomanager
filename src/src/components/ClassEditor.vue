<script setup lang="ts">
import { computed } from 'vue';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import AnnotationPropertyList from './AnnotationPropertyList.vue';
import { useMainStore } from '@/stores/main';
import { storeToRefs } from 'pinia';
import { useGraphStore } from '@/stores/graph-store'; import TermValue from './TermValue.vue';


const { selected } = storeToRefs(useMainStore());
const {
  getProperties,
  getShaclPropertyQuads,
  getRestrictions,
  getLabel,
  getPrefixedUri,
  getRanges
} = useGraphStore();

const properties = computed(() => {
  if (!selected.value) return [];
  return getProperties(selected.value);
});
const shaclPropertyQuads = computed(() => {
  if (!selected.value) return [];
  return getShaclPropertyQuads(selected.value);
});
const restrictions = computed(() => {
  if (!selected.value) return [];
  return getRestrictions(selected.value);
});

</script>

<template>
  <div
    v-if="selected"
    class="w-full p-4"
  >
    <div class="flex items-center gap-2 mb-4">
      <p class="text-lg font-semibold">{{ getLabel(selected) }}</p>
      <div class="flex flex-wrap gap-1">
        <Tag
          v-tooltip="selected"
          :value="getPrefixedUri(selected)"
        ></Tag>
      </div>
    </div>
    <div>
      <div class="mb-6">
        <AnnotationPropertyList :subject="selected" />
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
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    v-tooltip="getPrefixedUri(property)"
                    class="font-semibold cursor-pointer"
                    @click="selected = property"
                  >{{ getLabel(property) }}</div>
                  <TermValue
                    v-for="object of getRanges(property)"
                    :key="object.value"
                    :term="object"
                    class="text-sm"
                    @click-uri="selected = object.value"
                  >
                  </TermValue>
                </div>
              </template>
              <AnnotationPropertyList :subject="property" />
            </Panel>
          </div>
        </div>

        <div>
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
                    @click="selected = shaclPropertyQuad.object.value"
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
                    @click="selected = property"
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
        </div>
      </div>
    </div>
  </div>
</template>