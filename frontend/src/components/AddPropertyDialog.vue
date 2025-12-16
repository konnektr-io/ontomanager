<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DataFactory } from 'n3'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { vocab } from '@/utils/vocab'

const { namedNode, quad } = DataFactory

interface Props {
    existingPropertyNodes: string[]
    domain: string
    graphId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad } = useGraphStore()

const scopeId = computed(() => userGraphs.value.find((g) => g.node?.value === props.graphId)?.scopeId)

const propertyNodeSuggestions = ref<string[]>([])
const fetchPropertyNodeSuggestions = async (searchValue: string = '') => {
    propertyNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions(
        props.existingPropertyNodes || [],
        searchValue
    )
}

onMounted(() => {
    fetchPropertyNodeSuggestions()
})

const propertyNodeUri = ref<string>()

const confirmCreation = async () => {
    if (!propertyNodeUri.value || !props.domain || !scopeId.value) return

    // Add current object as domain of the property node
    await addQuad(
        quad(
            namedNode(propertyNodeUri.value),
            vocab.rdfs.domain,
            namedNode(props.domain),
            namedNode(props.graphId)
        ),
        scopeId.value
    )

    reloadTrigger.value++
    emit('confirm')
}
</script>

<template>
    <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription> Select a property to add to this class. </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
            <Select v-model="propertyNodeUri">
                <SelectTrigger>
                    <SelectValue placeholder="Choose property" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem
                        v-for="prop in propertyNodeSuggestions"
                        :key="prop"
                        :value="prop"
                    >
                        {{ prop }}
                    </SelectItem>
                </SelectContent>
            </Select>
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
                :disabled="!propertyNodeUri"
                @click="confirmCreation"
            >
                Confirm
            </Button>
        </DialogFooter>
    </DialogContent>
</template>
