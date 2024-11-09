import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { NamedNode, Quad, DataFactory } from 'n3'
import gitHubService from '@/services/GitHubService'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '../utils/vocab'
import rdfVocab from '../assets/vocab/rdf.ttl?raw'
import rdfsVocab from '../assets/vocab/rdfs.ttl?raw'
import owlVocab from '../assets/vocab/owl.ttl?raw'
import skosVocab from '../assets/vocab/skos.ttl?raw'
import shaclVocab from '../assets/vocab/shacl.ttl?raw'
import type { Pattern } from 'quadstore'

export enum TreeType {
  Classes = 'classes',
  Decomposition = 'decomposition',
  Properties = 'properties',
  Individuals = 'individuals',
  Ontologies = 'ontologies'
}

export interface ResourceTreeNode {
  key: string
  label: string
  data: {
    parentUri?: string
    graph: string
    // prefixedUri: string
  }
  icon?: string
  children: ResourceTreeNode[]
}

export interface GraphDetails {
  url: string
  owner?: string
  repo?: string
  branches?: Awaited<ReturnType<typeof gitHubService.getBranches>>
  branch?: string
  path?: string
  visible?: boolean
  loaded?: boolean
  namespace?: string
  node?: NamedNode<string>
  prefixes?: { [prefix: string]: NamedNode<string> }
  error?: string
  sha?: string
  scopeId?: string
}

interface BuiltinGraphDetails extends GraphDetails {
  content: string
}

const builtinGraphs: BuiltinGraphDetails[] = [
  {
    content: rdfVocab,
    url: 'http://www.w3.org/1999/02/22-rdf-syntax-ns',
    namespace: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
  },
  {
    content: owlVocab,
    url: 'http://www.w3.org/2002/07/owl',
    namespace: 'http://www.w3.org/2002/07/owl#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/2002/07/owl')
  },
  {
    content: rdfsVocab,
    url: 'http://www.w3.org/2000/01/rdf-schema',
    namespace: 'http://www.w3.org/2000/01/rdf-schema#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#')
  },
  {
    content: skosVocab,
    url: 'http://www.w3.org/2004/02/skos/core',
    namespace: 'http://www.w3.org/2004/02/skos/core#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/2004/02/skos/core')
  },
  {
    content: shaclVocab,
    url: 'http://www.w3.org/ns/shacl',
    namespace: 'http://www.w3.org/ns/shacl#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/ns/shacl#')
  }
]

export const commonDataTypes = [
  { label: 'String', uri: vocab.xsd.string.value },
  { label: 'Integer', uri: vocab.xsd.integer.value },
  { label: 'Decimal', uri: vocab.xsd.decimal.value },
  { label: 'Boolean', uri: vocab.xsd.boolean.value },
  { label: 'DateTime', uri: vocab.xsd.dateTime.value },
  { label: 'Date', uri: vocab.xsd.date.value },
  { label: 'Time', uri: vocab.xsd.time.value }
]

interface QuadChange {
  action: 'add' | 'remove'
  quad: Quad
  scopeId: string
}

export const useGraphStore = defineStore('graph', () => {
  const userGraphs = ref<GraphDetails[]>([])

  const visibleGraphs = computed<NamedNode[]>(() =>
    userGraphs.value
      .filter((graph) => graph.visible && graph.node && graph.loaded)
      .map<NamedNode>((graph) => graph.node as NamedNode)
  )

  const reloadTrigger = ref<number>(0)

  const selectedOntology = ref<GraphDetails | null>(null)
  const selectedResource = ref<string | null>(null)

  const editMode = computed(() =>
    selectedOntology.value?.loaded &&
    selectedOntology.value.visible &&
    selectedOntology.value.repo &&
    selectedOntology.value.owner &&
    selectedOntology.value.branch
      ? true
      : false
  )

  const initialize = async () => {
    getUserGraphsFromLocalStorage()

    await graphStoreService.init()

    // Get all graphs in the database
    const graphs = await graphStoreService.getAllGraphNodes()

    // Start deletion of all graphs that are no longer defined in the user graphs
    const graphsToDelete = graphs.filter(
      (graph) =>
        !userGraphs.value.find((g) => g.node?.value === graph.value) &&
        !builtinGraphs.find((g) => g.node?.value === graph.value)
    )
    // console.log('Deleting graphs:', graphsToDelete)
    // Don't wait for deletion to finish
    graphsToDelete.forEach(async (graph) => {
      graphStoreService.deleteGraph(graph)
    })

    // Load all builtin graphs
    initBuiltinGraphs()

    userGraphs.value = await Promise.all(
      userGraphs.value.map(async (graph) => {
        try {
          if (graph.owner && graph.repo && graph.branch && graph.path) {
            const latestSha = await gitHubService.getLatestFileSha(
              graph.owner,
              graph.repo,
              graph.path,
              graph.branch
            )
            if (latestSha !== graph.sha) {
              graph.sha = latestSha
              return await loadGraph(graph)
            }
          }
        } catch (error) {
          console.error(`Failed to load ${graph.url}: ${error}`)
        }

        if (graph.node) {
          if (await graphStoreService.isGraphLoaded(graph.node)) {
            graph.loaded = true
            return graph // already loaded
          }
        }
        return await loadGraph(graph)
      })
    )

    saveUserGraphsToLocalStorage()
  }

  const initBuiltinGraphs = async () => {
    await Promise.all(
      builtinGraphs.map(async (graph) => {
        if (graph.node) {
          const isLoaded = await graphStoreService.isGraphLoaded(graph.node)
          if (isLoaded) {
            graph.loaded = true
            return // already loaded
          }
        }
        const { node, prefixes, scopeId } = await graphStoreService.loadGraph(graph.content)
        graph.loaded = true
        graph.node = node
        graph.prefixes = prefixes
        graph.scopeId = scopeId
      })
    )
  }

  const getUserGraphsFromLocalStorage = () => {
    const storedGraphs = localStorage.getItem('userGraphs')
    if (storedGraphs) {
      userGraphs.value = JSON.parse(storedGraphs)
    }
  }

  const saveUserGraphsToLocalStorage = () => {
    localStorage.setItem('userGraphs', JSON.stringify(userGraphs.value))
  }

  const graphsLoading = ref<{ [graphUrl: string]: boolean }>({})
  const loadGraph = async (graph: GraphDetails) => {
    graphsLoading.value[graph.url] = true
    graph.loaded = false
    try {
      let content: string
      if (graph.url.includes('github.com')) {
        const urlParts = graph.url.split('/')
        const owner = urlParts[3]
        const repo = urlParts[4]
        const ref = urlParts[6] || 'main'
        const path = urlParts.slice(7).join('/')
        content = await gitHubService.getFileContent(owner, repo, path, ref)

        graph.owner = owner
        graph.repo = repo
        graph.branch = ref
        graph.path = path
      } else {
        const response = await axios.get(graph.url)
        content = response.data
      }
      const { node, prefixes, scopeId } = await graphStoreService.loadGraph(content)
      graph.node = node
      graph.prefixes = prefixes
      graph.scopeId = scopeId
      graph.loaded = true
      graph.error = undefined
    } catch (error) {
      graph.loaded = false
      graph.sha = undefined
      graph.error = `Failed to load ${graph.url}`
      console.error(`Failed to load ${graph.url}: ${error}`)
    }
    graphsLoading.value[graph.url] = false
    return graph
  }

  const toggleGraphVisibility = async (graph: GraphDetails): Promise<void> => {
    graph.visible = !graph.visible
    saveUserGraphsToLocalStorage()
  }

  const addGraph = async (url: string | string[]): Promise<void> => {
    const urls = Array.isArray(url) ? url : [url]

    // Adding and retrieving the graphs may cause a redirect to login to Github.
    // Therefor, we need to make sure to load the graph details, so that it's automatically loaded on reload.

    const graphsToAdd: GraphDetails[] = urls.map((url) => {
      return {
        url,
        loaded: false,
        visible: true,
        prefixes: {},
        ...(url.includes('github.com') && { gitHubUrl: url })
      }
    })

    userGraphs.value = userGraphs.value.filter((g) => !urls.includes(g.url)).concat(graphsToAdd)
    saveUserGraphsToLocalStorage()

    const addedGraphs = await Promise.all(
      urls.map(async (url) => {
        const existingUserGraphIndex = userGraphs.value.findIndex((g) => g?.url === url)
        if (existingUserGraphIndex !== -1) {
          const g = userGraphs.value[existingUserGraphIndex]
          if (g.node) await graphStoreService.deleteGraph(g.node, g.scopeId)
          userGraphs.value.splice(existingUserGraphIndex, 1)
        }

        let graph: GraphDetails = {
          url,
          loaded: false,
          visible: false,
          prefixes: {},
          ...(url.includes('github.com') && { gitHubUrl: url })
        }

        graph = await loadGraph(graph)
        graph.visible = true
        // Avoid duplicates
        const existingUserGraphIndex2 = userGraphs.value.findIndex(
          (g) => g.node?.value === graph.node?.value
        )
        if (existingUserGraphIndex2 !== -1) {
          userGraphs.value.splice(existingUserGraphIndex2, 1)
        }
        return graph
      })
    )

    // Dupliaces should have already been removed
    userGraphs.value.push(...addedGraphs)

    saveUserGraphsToLocalStorage()
  }

  const removeGraph = async (g: GraphDetails): Promise<void> => {
    if (selectedOntology.value?.node?.value === g.node?.value) {
      undoStack.value = []
      redoStack.value = []
      selectedOntology.value = null
    }
    const graphIndex = userGraphs.value.findIndex((graph) => graph.node?.value === g.node?.value)
    if (graphIndex !== -1) {
      userGraphs.value.splice(graphIndex, 1)
      saveUserGraphsToLocalStorage()
      if (g.node?.value) {
        await graphStoreService.deleteGraph(g.node, g.scopeId)
      }
    }

    if (userGraphs.value.length === 0) {
      // clear all data if no graphs are loaded
      await graphStoreService.clear()
      await initBuiltinGraphs()
    }
  }

  /* const getAllNamedNodes = (): NamedNode<string>[] => {
    const namedNodeMap = graphStoreService.store
      .getQuads(null, null, null, null)
      .reduce((acc, quad) => {
        if (quad.subject.termType === 'NamedNode') acc.set(quad.subject.value, quad.subject)
        if (quad.object.termType === 'NamedNode') acc.set(quad.object.value, quad.object)
        return acc
      }, new Map<string, NamedNode<string>>())
    return Array.from(namedNodeMap.values())
  } */

  /* const getSubjectQuads = (uri: string): Quad[] => {
    const quads: Quad[] = []
    for (const graph of [...builtinGraphs, ...userGraphs.value]) {
      if (!graph.node) continue
      graphStoreService.store
        .getQuads(namedNode(uri), null, null, namedNode(graph.node.value))
        .forEach((quad) => {
          quads.push(quad)
        })
    }
    console.log(quads)
    return quads
  } */

  /* const getShaclPropertyQuads = (uri: string): Quad[] => {
    return graphStoreService.store.getQuads(namedNode(uri), vocab.sh.property, null, null)
  } */

  /* const getObjectValue = (subject: string, predicate: string): string | null => {
    const quads = graphStoreService.store.getQuads(
      namedNode(subject),
      namedNode(predicate),
      null,
      null
    )
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || ['en'].includes((q.object as Literal).language)
      ) || quads[0]
    return quad ? quad.object.value : null
  } */

  /* const getRdfTypes = (uri: string): string[] => {
    const quads = graphStoreService.store.getQuads(namedNode(uri), vocab.rdf.type, null, null)
    return quads.map((quad) => getPrefixedUri(quad.object.value))
  } */

  /* const getQuads = (subject: OTerm, predicate: OTerm, object: OTerm | OTerm[], graph: OTerm) => {
    return graphStoreService.store.getQuads(subject, predicate, object, graph)
  } */

  const getPrefixedUri = (uri: string): string => {
    for (const graph of [...builtinGraphs, ...userGraphs.value]) {
      if (!graph.prefixes) continue
      const prefixes = Object.entries(graph.prefixes).filter(
        ([prefix]) => prefix !== '_' && prefix !== ':'
      )
      for (const [prefix, namespace] of prefixes) {
        if (uri.startsWith(namespace.value)) {
          return `${prefix}:${uri.slice(namespace.value.length)}`
        }
      }
    }
    return uri
  }

  const removeClass = async (classUri: string, graph: NamedNode, scopeId: string) => {
    const patterns: Pattern[] = [
      { subject: DataFactory.namedNode(classUri), graph },
      { object: DataFactory.namedNode(classUri), graph }
    ]
    await Promise.all(
      patterns.map(async (pattern) => {
        for await (const quad of (await graphStoreService.getStream(pattern)).iterator) {
          await graphStoreService.del(quad as Quad, scopeId)
        }
      })
    )
  }

  const undoStack = ref<QuadChange[]>([])
  const redoStack = ref<QuadChange[]>([])

  const addQuad = async (quad: Quad, scopeId: string) => {
    await graphStoreService.put(quad, scopeId)
    undoStack.value.push({ action: 'add', quad, scopeId })
    redoStack.value = [] // Clear redo stack on new action
  }

  const editQuad = async (oldQuad: Quad, newQuad: Quad, scopeId: string) => {
    await graphStoreService.del(oldQuad, scopeId)
    await graphStoreService.put(newQuad, scopeId)
    undoStack.value.push({ action: 'remove', quad: oldQuad, scopeId })
    undoStack.value.push({ action: 'add', quad: newQuad, scopeId })
    redoStack.value = [] // Clear redo stack on new action
  }

  const removeQuad = async (quad: Quad, scopeId: string) => {
    await graphStoreService.del(quad, scopeId)
    undoStack.value.push({ action: 'remove', quad, scopeId })
    redoStack.value = [] // Clear redo stack on new action
  }

  const undo = () => {
    const lastChange = undoStack.value.pop()
    if (!lastChange) return

    const { action, quad, scopeId } = lastChange
    if (action === 'add') {
      graphStoreService.del(quad, scopeId)
      redoStack.value.push({ action: 'remove', quad, scopeId })
    } else if (action === 'remove') {
      graphStoreService.put(quad, scopeId)
      redoStack.value.push({ action: 'add', quad, scopeId })
    }
  }

  const redo = () => {
    const lastUndo = redoStack.value.pop()
    if (!lastUndo) return

    const { action, quad, scopeId } = lastUndo
    if (action === 'add') {
      graphStoreService.put(quad, scopeId)
      undoStack.value.push({ action: 'add', quad, scopeId })
    } else if (action === 'remove') {
      graphStoreService.del(quad, scopeId)
      undoStack.value.push({ action: 'remove', quad, scopeId })
    }
  }

  const undoStackSize = computed(() => undoStack.value.length)

  const clearUndoRedoStacks = () => {
    undoStack.value = []
    redoStack.value = []
  }

  const writeGraph = async (graph: GraphDetails) => {
    if (!graph.node) return
    const prefixes = {
      '': graph.node,
      ...graph.prefixes
    }
    return graphStoreService.writeGraph(graph.node as NamedNode, prefixes)
  }

  return {
    reloadTrigger,

    userGraphs,
    saveUserGraphsToLocalStorage,
    selectedOntology,
    selectedResource,
    visibleGraphs,
    editMode,

    initialize,
    toggleGraphVisibility,

    graphsLoading,
    addGraph,
    loadGraph,
    writeGraph,
    removeGraph,

    // getProperties,
    // getIndividuals,
    // getRanges,
    // getAllNamedNodes,
    // getPropertyRangeValueRestrictions,
    // getRestrictions,
    // getLabel,
    // getSubjectQuads,
    // getShaclPropertyQuads,
    getPrefixedUri,

    // getRdfTypes,

    // getQuads,

    removeClass,

    addQuad,
    editQuad,
    removeQuad,
    undoStackSize,
    undo,
    redo,
    clearUndoRedoStacks
  }
})
