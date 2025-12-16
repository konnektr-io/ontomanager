<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, BlankNode, Quad } from 'n3'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Separator } from '@/components/ui/separator'
import { Trash2 } from 'lucide-vue-next'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, blankNode, literal, quad } = DataFactory

interface Props {
    subject: string
    graphId: string
    restrictionNode?: BlankNode
}

const props = defineProps<Props>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, removeQuad } = useGraphStore()

const restrictionNodeRef = ref<BlankNode | null>(props.restrictionNode || null)
const scopeId = computed<string | undefined>(
    () => userGraphs.value.find((g) => g.node?.value === props.graphId)?.scopeId
)

const valuePredicates = ref<{ label: string; value: string }[]>([
    { label: 'Has Value', value: vocab.owl.hasValue.value },
    { label: 'Some Values From', value: vocab.owl.someValuesFrom.value },
    { label: 'All Values From', value: vocab.owl.allValuesFrom.value }
])

const objects = ref<{ predicate: string; value: string; termType: 'NamedNode' | 'Literal' }[]>([])
const namedNodeSuggestions = ref<string[]>([])

const fetchNamedNodeSuggestions = async (_searchValue: string = '') => {
    namedNodeSuggestions.value = await graphStoreService.getNamedNodeSuggestions(_searchValue)
}

const originalQuads = ref<Quad[]>([])

onMounted(async () => {
    if (restrictionNodeRef.value) {
        originalQuads.value = await graphStoreService.getSubjectQuads(
            restrictionNodeRef.value.value,
            undefined,
            props.graphId
        )
        objects.value = originalQuads.value.map((q) => ({
            predicate: q.predicate.value,
            value: q.object.value,
            termType: q.object.termType as 'NamedNode' | 'Literal'
        }))
    } else {
        namedNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions(
            [],
            props.graphId
        )
        restrictionNodeRef.value = blankNode()
        objects.value.push({
            predicate: vocab.rdf.type.value,
            value: vocab.owl.Restriction.value,
            termType: 'NamedNode'
        })
        objects.value.push({
            predicate: vocab.owl.onProperty.value,
            value: '',
            termType: 'NamedNode'
        })
        objects.value.push({
            predicate: vocab.owl.someValuesFrom.value,
            value: '',
            termType: 'NamedNode'
        })
    }
})

const removeObject = (index: number) => {
    objects.value.splice(index, 1)
}

const confirmChanges = async () => {
    if (!props.subject || !props.graphId || !restrictionNodeRef.value || !scopeId.value) return

    const newQuads = objects.value.map<Quad>((obj) => {
        return quad(
            restrictionNodeRef.value!,
            namedNode(obj.predicate),
            obj.termType === 'NamedNode' ? namedNode(obj.value) : literal(obj.value),
            namedNode(props.graphId)
        )
    })

    if (!props.restrictionNode) {
        const subClassQuad = quad(
            namedNode(props.subject),
            namedNode(vocab.rdfs.subClassOf.value),
            restrictionNodeRef.value,
            namedNode(props.graphId)
        )
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
    emit('confirm')
}
</script>

<template>
    <DialogContent class="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{{ restrictionNode ? 'Edit Restriction' : 'New Restriction' }}</DialogTitle>
            <DialogDescription>
                {{ restrictionNode ? 'Modify OWL restriction properties' : 'Create a new OWL restriction' }}
            </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
            <div
                v-for="(object, index) in objects"
                :key="index"
                class="space-y-2"
            >
                <!-- Type or OnProperty (read-only or editable) -->
                <div
                    v-if="
                        object.predicate === vocab.rdf.type.value ||
                        object.predicate === vocab.owl.onProperty.value
                    "
                    class="flex items-center gap-2"
                >
                    <label class="text-sm font-medium w-32">{{
                        object.predicate === vocab.rdf.type.value ? 'Type' : 'On Property'
                        }}</label>
                    <Select
                        v-if="object.predicate === vocab.owl.onProperty.value"
                        v-model="object.value"
                    >
                        <SelectTrigger class="flex-1">
                            <SelectValue placeholder="Select Property" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="uri in namedNodeSuggestions"
                                :key="uri"
                                :value="uri"
                            >
                                {{ uri }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p
                        v-else
                        class="text-sm"
                    >{{ object.value }}</p>
                </div>

                <!-- Value predicates (someValuesFrom, allValuesFrom, hasValue) -->
                <div
                    v-else-if="valuePredicates.some((vp) => vp.value === object.predicate)"
                    class="flex items-start gap-2"
                >
                    <div class="flex-1 space-y-2">
                        <Select v-model="object.predicate">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Predicate" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="pred in valuePredicates"
                                    :key="pred.value"
                                    :value="pred.value"
                                >
                                    {{ pred.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            v-if="object.predicate === vocab.owl.hasValue.value"
                            v-model="object.value"
                            placeholder="Enter literal value"
                        />
                        <Select
                            v-else
                            v-model="object.value"
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Value" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="uri in namedNodeSuggestions"
                                    :key="uri"
                                    :value="uri"
                                >
                                    {{ uri }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <!-- Other predicates (editable) -->
                <div
                    v-else
                    class="flex items-start gap-2"
                >
                    <div class="flex-1 space-y-2">
                        <Select v-model="object.predicate">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Predicate" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="pred in valuePredicates"
                                    :key="pred.value"
                                    :value="pred.value"
                                >
                                    {{ pred.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            v-if="object.termType === 'NamedNode'"
                            v-model="object.value"
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Value" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="uri in namedNodeSuggestions"
                                    :key="uri"
                                    :value="uri"
                                >
                                    {{ uri }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            v-else
                            v-model="object.value"
                            placeholder="Enter literal value"
                            rows="2"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="mt-0 text-destructive hover:text-destructive"
                        @click="removeObject(index)"
                    >
                        <Trash2 class="h-4 w-4" />
                    </Button>
                </div>

                <Separator v-if="index < objects.length - 1" />
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
                @click="confirmChanges"
            >Confirm</Button>
        </DialogFooter>
    </DialogContent>
</template>
