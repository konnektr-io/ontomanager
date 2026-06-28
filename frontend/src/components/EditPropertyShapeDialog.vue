<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, BlankNode } from 'n3'
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
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, blankNode, quad } = DataFactory

interface Props {
    subject: string
    graphId: string
    shapeNode?: BlankNode
}

const props = defineProps<Props>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, removeQuad } = useGraphStore()

const shapeNodeRef = ref<BlankNode | null>(props.shapeNode || null)
const scopeId = computed<string | undefined>(
    () => userGraphs.value.find((g) => g.node?.value === props.graphId)?.scopeId
)

const path = ref<string>('')
const classOrDatatype = ref<string>('')
const namedNodeSuggestions = ref<string[]>([])

onMounted(async () => {
    if (shapeNodeRef.value) {
        const quads = await graphStoreService.getSubjectQuads(
            shapeNodeRef.value.value,
            undefined,
            props.graphId
        )
        const pathQuad = quads.find((q) => q.predicate.value === vocab.sh.path.value)
        const classQuad = quads.find((q) => q.predicate.value === vocab.sh.class.value)
        const datatypeQuad = quads.find((q) => q.predicate.value === vocab.sh.datatype.value)

        if (pathQuad) path.value = pathQuad.object.value
        if (classQuad) classOrDatatype.value = classQuad.object.value
        if (datatypeQuad) classOrDatatype.value = datatypeQuad.object.value
    } else {
        namedNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions(
            [],
            props.graphId
        )
        shapeNodeRef.value = blankNode()
    }
})

const handlePathChange = async (newPath: any) => {
    if (!newPath || typeof newPath !== 'string') return
    path.value = newPath
    const range = await graphStoreService.getRangeForProperty(newPath)
    if (range) {
        classOrDatatype.value = range
    } else {
        classOrDatatype.value = ''
    }
}

const confirmChanges = async () => {
    if (!props.subject || !props.graphId || !shapeNodeRef.value || !scopeId.value) return

    const newQuads = [
        quad(
            shapeNodeRef.value,
            namedNode(vocab.sh.path.value),
            namedNode(path.value),
            namedNode(props.graphId)
        ),
        quad(
            shapeNodeRef.value,
            namedNode(vocab.sh.class.value),
            namedNode(classOrDatatype.value),
            namedNode(props.graphId)
        )
    ]

    if (!props.shapeNode) {
        const subClassQuad = quad(
            namedNode(props.subject),
            namedNode(vocab.sh.property.value),
            shapeNodeRef.value,
            namedNode(props.graphId)
        )
        newQuads.push(subClassQuad)
    } else {
        const originalQuads = await graphStoreService.getSubjectQuads(
            shapeNodeRef.value.value,
            undefined,
            props.graphId
        )
        for (const originalQuad of originalQuads) {
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
    <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle>{{ shapeNode ? 'Edit Property Shape' : 'New Property Shape' }}</DialogTitle>
            <DialogDescription>
                {{
                    shapeNode
                        ? 'Modify SHACL property shape constraints'
                        : 'Create a new SHACL property shape'
                }}
            </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
            <div class="space-y-2">
                <label class="text-sm font-medium">Path</label>
                <Select
                    :model-value="path"
                    @update:model-value="handlePathChange"
                >
                    <SelectTrigger>
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
            </div>

            <div class="space-y-2">
                <label class="text-sm font-medium">Class/Datatype</label>
                <Select v-model="classOrDatatype">
                    <SelectTrigger>
                        <SelectValue placeholder="Select Class/Datatype" />
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
