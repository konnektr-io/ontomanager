<script setup lang="ts">
import { ref, computed } from 'vue'
import { DataFactory, type Quad } from 'n3'
import { storeToRefs } from 'pinia'
import { hexoid } from 'hexoid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import { vocab } from '@/utils/vocab'
import gitHubService from '@/services/GitHubService'
import { useGitHubStore } from '@/stores/github'

const { namedNode, literal, quad } = DataFactory

interface Props {
    repository: string
    filePath: string
    branch: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const { userGraphs, selectedOntology } = storeToRefs(useGraphStore())
const { addQuad, saveUserGraphsToLocalStorage, writeGraph, clearUndoRedoStacks } = useGraphStore()
const reloadTrigger = ref(0)
const { name } = storeToRefs(useGitHubStore())

interface EditableObject {
    predicate: string
    label: string
    value: string
}

const predicates = ref<EditableObject[]>([
    {
        predicate: vocab.vann.preferredNamespacePrefix.value,
        label: 'Prefix',
        value: 'ex'
    },
    {
        predicate: vocab.vann.preferredNamespaceUri.value,
        label: 'Namespace URI',
        value: 'https://ontologies.yourdomain.com/example#'
    },
    {
        predicate: vocab.dc.title.value,
        label: 'Title',
        value: 'Example'
    },
    {
        predicate: vocab.dc.description.value,
        label: 'Description',
        value: 'Example ontology description'
    },
    {
        predicate: vocab.dc.creator.value,
        label: 'Creator',
        value: name.value || ''
    }
])

const quads = ref<Quad[]>([])

const confirmCreation = async () => {
    if (!props.repository || !props.filePath || !props.branch) return

    const preferredNamespaceUri = predicates.value.find(
        (p) => p.predicate === vocab.vann.preferredNamespaceUri.value
    )?.value
    if (!preferredNamespaceUri) return

    const preferredNamespacePrefix = predicates.value.find(
        (p) => p.predicate === vocab.vann.preferredNamespacePrefix.value
    )?.value

    const graphNode = namedNode(preferredNamespaceUri)

    // Add predicates
    predicates.value.forEach(({ predicate, value }) => {
        if (value) {
            quads.value.push(
                quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value, 'en'), graphNode)
            )
        }
    })

    // Add rdf:type owl:Ontology
    quads.value.push(
        quad(
            namedNode(preferredNamespaceUri),
            namedNode(vocab.rdf.type.value),
            namedNode(vocab.owl.Ontology.value),
            graphNode
        )
    )

    // Add dc:created
    quads.value.push(
        quad(
            namedNode(preferredNamespaceUri),
            namedNode(vocab.dc.created.value),
            literal(new Date().toISOString(), vocab.xsd.dateTime),
            graphNode
        )
    )

    const scopeId = hexoid(11)()

    // Prepare and load UserGraphs
    const graphDetails: GraphDetails = {
        url: `https://github.com/${props.repository}/blob/${props.branch}/${props.filePath}`,
        owner: props.repository.split('/')[0],
        repo: props.repository.split('/')[1],
        branch: props.branch,
        path: props.filePath,
        visible: true,
        loaded: true,
        namespace: preferredNamespaceUri,
        node: graphNode,
        prefixes: {
            ...(preferredNamespacePrefix && { [preferredNamespacePrefix]: graphNode }),
            rdf: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
            rdfs: namedNode('http://www.w3.org/2000/01/rdf-schema#'),
            owl: namedNode('http://www.w3.org/2002/07/owl#'),
            dc: namedNode('http://purl.org/dc/elements/1.1/'),
            vann: namedNode('http://purl.org/vocab/vann/'),
            xsd: namedNode('http://www.w3.org/2001/XMLSchema#'),
            skos: namedNode('http://www.w3.org/2004/02/skos/core#')
        },
        scopeId
    }

    userGraphs.value.push(graphDetails)
    saveUserGraphsToLocalStorage()

    selectedOntology.value = graphDetails

    // Save quads to the store
    for (const q of quads.value) {
        await addQuad(q, scopeId)
    }

    const commitMessage = `Create new ontology ${preferredNamespaceUri}`
    const content = await writeGraph(selectedOntology.value)
    if (
        !content ||
        !selectedOntology.value.owner ||
        !selectedOntology.value.repo ||
        !selectedOntology.value.path ||
        !selectedOntology.value.branch ||
        !commitMessage
    )
        return
    await gitHubService.commitFile(
        selectedOntology.value.owner,
        selectedOntology.value.repo,
        selectedOntology.value.path,
        content,
        commitMessage,
        selectedOntology.value.branch
    )
    clearUndoRedoStacks()

    reloadTrigger.value++
    emit('confirm')
}
</script>

<template>
    <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle>Create New Ontology</DialogTitle>
            <DialogDescription> Define the basic metadata for your new ontology. </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
            <div
                v-for="(predicate, index) in predicates"
                :key="index"
                class="grid grid-cols-4 items-center gap-4"
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <label class="text-sm font-medium text-right">{{ predicate.label }}</label>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{{ predicate.predicate }}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Input
                    v-if="predicate.predicate !== vocab.dc.description.value"
                    v-model="predicate.value"
                    class="col-span-3"
                />
                <Textarea
                    v-else
                    v-model="predicate.value"
                    rows="3"
                    class="col-span-3"
                />
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
                @click="confirmCreation"
            >Confirm</Button>
        </DialogFooter>
    </DialogContent>
</template>
