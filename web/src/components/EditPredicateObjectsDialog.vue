<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, Literal, Quad } from 'n3'
import { Button } from '@/components/ui/button'
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
import { Plus, Trash2, Link as LinkIcon, FileText } from 'lucide-vue-next'
import { useGraphStore, commonDataTypes } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'

const { namedNode, literal, quad } = DataFactory

interface Props {
    subjectUri: string
    predicateUri?: string
    graphUri: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const predicateLabel = ref<string>('')
const scopeId = computed(
    () => userGraphs.value.find((g) => g.node?.value === props.graphUri)?.scopeId
)

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, editQuad, removeQuad } = useGraphStore()

const existingPredicates = ref<string[]>([])
const fetchExistingPredicates = async (subjUri: string) => {
    existingPredicates.value = (await graphStoreService.getSubjectQuads(subjUri))
        .map((q) => q.predicate.value)
        .filter((value, index, self) => self.indexOf(value) === index)
}

const predicateNodeSuggestions = ref<string[]>([])
const fetchPredicateNodeSuggestions = async (_searchValue: string = '') => {
    predicateNodeSuggestions.value = await graphStoreService.getPredicateNodeSuggestions(
        existingPredicates.value,
        _searchValue
    )
}

const newPredicateUri = ref<string>()
const currentPredicateUri = computed(() => props.predicateUri || newPredicateUri.value)

watch(
    () => newPredicateUri.value,
    () => {
        if (newPredicateUri.value) {
            fetchNamedNodeSuggestions('')
        }
    }
)

const originalQuads: Quad[] = []
interface EditableObject {
    termType: string
    value: string
    language?: string
    datatype?: string
}
const objects = ref<EditableObject[]>([])
const namedNodeSuggestions = ref<string[]>([])

// Fetch suggestions for NamedNode URIs
const fetchNamedNodeSuggestions = async (searchValue: string = '') => {
    if (!currentPredicateUri.value) return
    namedNodeSuggestions.value = await graphStoreService.getNamedNodeSuggestions(searchValue)
}

// Language options
const languageOptions = ['en', 'fr', 'de', 'nl', 'es', 'it', 'pt']

// Get quads on mount
onMounted(async () => {
    if (props.subjectUri && props.graphUri && !props.predicateUri) {
        await fetchExistingPredicates(props.subjectUri)
        predicateNodeSuggestions.value = await graphStoreService.getPredicateNodeSuggestions(
            existingPredicates.value,
            ''
        )
    }
    if (!props.subjectUri || !props.predicateUri || !props.graphUri) return
    predicateLabel.value = await graphStoreService.getLabel(props.predicateUri)
    const qs = await graphStoreService.getSubjectQuads(
        props.subjectUri,
        props.predicateUri,
        props.graphUri
    )
    originalQuads.push(...qs)
    objects.value = qs
        .filter((q) => q.object.termType === 'NamedNode' || q.object.termType === 'Literal')
        .reduce<EditableObject[]>((acc, q) => {
            if (q.object.termType === 'NamedNode') {
                acc.push({
                    termType: 'NamedNode',
                    value: q.object.value
                } as EditableObject)
            } else if (q.object.termType === 'Literal') {
                acc.push({
                    termType: 'Literal',
                    value: q.object.value,
                    language: (q.object as Literal).language,
                    datatype: (q.object as Literal).datatype.value
                } as EditableObject)
            } else if (q.object.termType === 'BlankNode') {
                acc.push({
                    termType: 'BlankNode',
                    value: q.object.value
                } as EditableObject)
            }
            return acc
        }, [] as EditableObject[])
})

const addObject = (type: 'NamedNode' | 'Literal') => {
    if (!props.subjectUri || !currentPredicateUri.value || !props.graphUri) return
    if (type === 'NamedNode') {
        objects.value.push({
            termType: 'NamedNode',
            value: ''
        })
    } else {
        objects.value.push({
            termType: 'Literal',
            value: ''
        })
    }
}

const removeObject = (index: number) => {
    objects.value.splice(index, 1)
}

const confirmChanges = async () => {
    if (!currentPredicateUri.value || !props.subjectUri || !props.graphUri || !scopeId.value) return

    const newQuads = objects.value.map<Quad>((obj) => {
        if (!currentPredicateUri.value) throw new Error('Predicate URI is required')
        if (obj.termType === 'NamedNode') {
            return quad(
                namedNode(props.subjectUri),
                namedNode(currentPredicateUri.value),
                namedNode(obj.value),
                namedNode(props.graphUri)
            )
        } else {
            return quad(
                namedNode(props.subjectUri),
                namedNode(currentPredicateUri.value),
                literal(obj.value, obj.language || obj.datatype),
                namedNode(props.graphUri)
            )
        }
    })

    // Remove original quads that are no longer present
    for (const originalQuad of originalQuads) {
        if (
            !newQuads.some(
                (newQuad) =>
                    newQuad.subject.equals(originalQuad.subject) &&
                    newQuad.predicate.equals(originalQuad.predicate) &&
                    newQuad.object.equals(originalQuad.object) &&
                    newQuad.graph.equals(originalQuad.graph)
            )
        ) {
            await removeQuad(originalQuad, scopeId.value)
        }
    }

    // Add or edit new quads
    for (const newQuad of newQuads) {
        const existingQuad = originalQuads.find(
            (originalQuad) =>
                originalQuad.subject.equals(newQuad.subject) &&
                originalQuad.predicate.equals(newQuad.predicate) &&
                originalQuad.object.equals(newQuad.object) &&
                originalQuad.graph.equals(newQuad.graph)
        )
        if (existingQuad) {
            await editQuad(existingQuad, newQuad, scopeId.value)
        } else {
            await addQuad(newQuad, scopeId.value)
        }
    }

    reloadTrigger.value++
    emit('confirm')
}
</script>

<template>
    <DialogContent class="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{{ predicateUri ? 'Edit Objects' : 'New Annotation' }}</DialogTitle>
            <DialogDescription v-if="predicateUri">
                Edit objects for predicate: {{ predicateLabel || predicateUri }}
            </DialogDescription>
            <DialogDescription v-else> Add a new annotation to this resource. </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
            <!-- Predicate Selection (only if new annotation) -->
            <div v-if="!predicateUri">
                <label class="text-sm font-medium mb-2 block">Predicate</label>
                <Select v-model="newPredicateUri">
                    <SelectTrigger>
                        <SelectValue placeholder="Select predicate" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="pred in predicateNodeSuggestions"
                            :key="pred"
                            :value="pred"
                        >
                            {{ pred }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Separator v-if="currentPredicateUri" />

            <!-- Objects List -->
            <div
                v-if="currentPredicateUri"
                class="space-y-3"
            >
                <div
                    v-for="(object, index) in objects"
                    :key="index"
                    class="space-y-2"
                >
                    <!-- Named Node URI -->
                    <div
                        v-if="object.termType === 'NamedNode'"
                        class="flex items-start gap-2"
                    >
                        <div class="flex-1 space-y-2">
                            <label class="text-sm font-medium flex items-center gap-1">
                                <LinkIcon class="h-3 w-3" />
                                Named Node URI
                            </label>
                            <Select v-model="object.value">
                                <SelectTrigger>
                                    <SelectValue placeholder="Enter or select URI" />
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
                        <Button
                            variant="ghost"
                            size="icon"
                            class="mt-6 text-destructive hover:text-destructive"
                            @click="removeObject(index)"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>

                    <!-- Literal Value -->
                    <div
                        v-if="object.termType === 'Literal'"
                        class="flex items-start gap-2"
                    >
                        <div class="flex-1 space-y-2">
                            <label class="text-sm font-medium flex items-center gap-1">
                                <FileText class="h-3 w-3" />
                                Literal Value
                            </label>
                            <Textarea
                                v-model="object.value"
                                placeholder="Enter literal value"
                                rows="2"
                            />

                            <div class="grid grid-cols-2 gap-2">
                                <div v-if="!object.datatype || object.language">
                                    <label class="text-xs text-muted-foreground">Language</label>
                                    <Select v-model="object.language">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="lang in languageOptions"
                                                :key="lang"
                                                :value="lang"
                                            >
                                                {{ lang }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div v-if="!object.language">
                                    <label class="text-xs text-muted-foreground">Datatype</label>
                                    <Select v-model="object.datatype">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select datatype" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="datatype in commonDataTypes"
                                                :key="datatype.uri"
                                                :value="datatype.uri"
                                            >
                                                {{ datatype.label }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="mt-6 text-destructive hover:text-destructive"
                            @click="removeObject(index)"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>

                    <!-- Blank Node (read-only) -->
                    <div
                        v-else-if="object.termType === 'BlankNode'"
                        class="flex items-center gap-2"
                    >
                        <p class="text-sm text-muted-foreground">Blank Node: {{ object.value }}</p>
                    </div>

                    <Separator v-if="index < objects.length - 1" />
                </div>
            </div>

            <!-- Add Object Buttons -->
            <div
                v-if="currentPredicateUri"
                class="flex gap-2"
            >
                <Button
                    variant="outline"
                    size="sm"
                    @click="addObject('NamedNode')"
                >
                    <Plus class="mr-2 h-4 w-4" />
                    Add Named Node
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    @click="addObject('Literal')"
                >
                    <Plus class="mr-2 h-4 w-4" />
                    Add Literal
                </Button>
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
                :disabled="!currentPredicateUri"
                @click="confirmChanges"
            >
                Confirm
            </Button>
        </DialogFooter>
    </DialogContent>
</template>
