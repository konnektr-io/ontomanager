<script setup lang="ts">
import type { Term } from 'n3'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useGraphStore } from '@/stores/graph'
import { vocab } from '@/utils/vocab'

defineProps<{
  term: Term
}>()

const emit = defineEmits<{
  (e: 'clickUri', value: string): void
}>()

const { getPrefixedUri } = useGraphStore()
</script>

<template>
  <div>
    <TooltipProvider v-if="term.termType === 'NamedNode'">
      <Tooltip>
        <TooltipTrigger as-child>
          <Badge
            variant="secondary"
            class="cursor-pointer"
            @click="emit('clickUri', term.value)"
          >
            {{ getPrefixedUri(term.value) }}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ term.value }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div
      v-else-if="term.termType === 'Literal'"
      class="flex items-center gap-2"
    >
      {{ term.value }}
      <Badge
        v-if="term.language"
        variant="secondary"
        class="text-xs"
      >
        {{ term.language }}
      </Badge>
      <TooltipProvider v-if="term.datatypeString && !term.datatype.equals(vocab.rdf.langString)">
        <Tooltip>
          <TooltipTrigger as-child>
            <Badge
              variant="secondary"
              class="text-xs"
            >
              {{ getPrefixedUri(term.datatypeString) }}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ term.datatypeString }}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <!-- <div v-else-if="term.termType === 'BlankNode'">
      <div
        v-for="restrictionRangeValue of restrictionRangeValues"
        :key="`${restrictionRangeValue.predicate.value}_${restrictionRangeValue.object.value}`"
        class="flex items-center gap-2"
      >
        <Badge
          variant="secondary"
          :value="getPrefixedUri(restrictionRangeValue.predicate.value)"
          class="text-xs"
        />
        <Badge
          variant="secondary"
          :value="getPrefixedUri(restrictionRangeValue.object.value)"
        />
      </div>
    </div> -->
    <div v-else>
      {{ term.value }}
    </div>
  </div>
</template>
