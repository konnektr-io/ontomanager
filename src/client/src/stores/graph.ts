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

export enum TreeType {
  Classes = 'classes',
  Decomposition = 'decomposition',
  Properties = 'properties',
  Individuals = 'individuals'
}

export interface ResourceTreeNode {
  key: string
  label: string
  data?: {
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
  branches?: string[]
  branch?: string
  path?: string
  visible?: boolean
  loaded?: boolean
  namespace?: string
  node?: NamedNode<string>
  prefixes?: { [prefix: string]: NamedNode<string> }
  error?: string
  sha?: string
}

interface BuiltinGraphDetails extends GraphDetails {
  content: string
}

const builtinGraphs: BuiltinGraphDetails[] = [
  {
    content: owlVocab,
    url: 'https://www.w3.org/2002/07/owl',
    namespace: 'https://www.w3.org/2002/07/owl#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('https://www.w3.org/2002/07/owl')
  },
  {
    content: rdfVocab,
    url: 'https://www.w3.org/2000/01/rdf-schema',
    namespace: 'https://www.w3.org/2000/01/rdf-schema#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('https://www.w3.org/2000/01/rdf-schema#')
  },
  {
    content: rdfsVocab,
    url: 'https://www.w3.org/1999/02/22-rdf-syntax-ns',
    namespace: 'https://www.w3.org/2002/07/owl#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('https://www.w3.org/2002/07/owl')
  },
  {
    content: skosVocab,
    url: 'http://www.w3.org/2004/02/skos/core',
    namespace: 'http://www.w3.org/2004/02/skos/core#',
    visible: false,
    loaded: false,
    prefixes: {},
    node: DataFactory.namedNode('http://www.w3.org/2004/02/skos/core')
  }
]

export const commonDataTypes = [
  vocab.xsd.string,
  vocab.xsd.integer,
  vocab.xsd.decimal,
  vocab.xsd.boolean,
  vocab.xsd.dateTime,
  vocab.xsd.date,
  vocab.xsd.time
  // vocab.rdf.langString
]

interface QuadChange {
  action: 'add' | 'remove'
  quad: Quad
}

export const useGraphStore = defineStore('graph', () => {
  const userGraphs = ref<GraphDetails[]>([])

  const visibleGraphs = computed<NamedNode[]>(() =>
    userGraphs.value
      .filter((graph) => graph.visible && graph.node && graph.loaded)
      .map<NamedNode>((graph) => graph.node as NamedNode)
  )

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
    await graphStoreService.store.open()

    await Promise.all(
      builtinGraphs.map(async (graph) => {
        const { items } = await graphStoreService.store.get({ graph: graph.node }, { limit: 1 })
        if (items.length > 0) return // already loaded
        const { node, prefixes } = await graphStoreService.loadGraph(graph.content)
        graph.node = node
        graph.prefixes = prefixes
      })
    )

    getUserGraphsFromLocalStorage()
    await Promise.all(
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
              await loadGraph(graph)
              return
            }
          }
        } catch (error) {
          console.error(`Failed to load ${graph.url}: ${error}`)
        }

        if (graph.node) {
          const { items } = await graphStoreService.store.get({ graph: graph.node }, { limit: 1 })
          if (items.length > 0) {
            graph.loaded = true
            return // already loaded
          }
        }
        await loadGraph(graph)
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

  const loadGraph = async (graph: GraphDetails) => {
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
      const { node, prefixes } = await graphStoreService.loadGraph(content)
      graph.node = node
      graph.prefixes = prefixes

      graph.loaded = true
      graph.error = undefined
      saveUserGraphsToLocalStorage
    } catch (error) {
      graph.loaded = false
      graph.sha = undefined
      graph.error = `Failed to load ${graph.url}`
      console.error(`Failed to load ${graph.url}: ${error}`)
      saveUserGraphsToLocalStorage
    }
  }

  const toggleGraphVisibility = async (graph: GraphDetails): Promise<void> => {
    graph.visible = !graph.visible
    saveUserGraphsToLocalStorage()
  }

  const addGraph = async (url: string): Promise<void> => {
    const existingUserGraphIndex = userGraphs.value.findIndex((g) => g?.url === url)
    if (existingUserGraphIndex !== -1) {
      const g = userGraphs.value[existingUserGraphIndex]
      if (g.node) graphStoreService.store.deleteGraph(g.node)
      userGraphs.value.splice(existingUserGraphIndex, 1)
    }

    const graph: GraphDetails = {
      url,
      visible: true,
      loaded: false,
      prefixes: {},
      ...(url.includes('github.com') && { gitHubUrl: url })
    }

    await loadGraph(graph)
    userGraphs.value.push(graph)
    saveUserGraphsToLocalStorage()
  }

  const removeGraph = async (g: GraphDetails): Promise<void> => {
    const graphIndex = userGraphs.value.findIndex((graph) => graph.node?.value === g.node?.value)
    if (graphIndex !== -1) {
      userGraphs.value.splice(graphIndex, 1)
      saveUserGraphsToLocalStorage()
      if (g.node?.value) {
        graphStoreService.store.deleteGraph(g.node)
      }
    }
  }

  /* const getProperties = async (classUri: string): Promise<string[]> => {
    const set = new Set<string>()
    const { items } = await graphStoreService.store
      .get({
        predicate: vocab.rdfs.domain,
        object: DataFactory.namedNode(classUri)
      })
    items.forEach((item) => {
      set.add(item.subject.value)
    })
    return Array.from(set)
  } */

  /* const getIndividuals = (classUri: string): string[] => {
    const set = new Set<string>()
    graphStoreService.store
      .getSubjects(vocab.rdf.type, namedNode(classUri), null)
      .forEach((subject) => {
        set.add(subject.value)
      })
    return Array.from(set)
  } */

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

  const undoStack = ref<QuadChange[]>([])
  const redoStack = ref<QuadChange[]>([])

  const addQuad = (quad: Quad) => {
    graphStoreService.store.put(quad)
    undoStack.value.push({ action: 'add', quad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const editQuad = (oldQuad: Quad, newQuad: Quad) => {
    graphStoreService.store.del(oldQuad)
    graphStoreService.store.put(newQuad)
    undoStack.value.push({ action: 'remove', quad: oldQuad })
    undoStack.value.push({ action: 'add', quad: newQuad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const removeQuad = (quad: Quad) => {
    graphStoreService.store.del(quad)
    undoStack.value.push({ action: 'remove', quad })
    redoStack.value = [] // Clear redo stack on new action
  }

  const undo = () => {
    const lastChange = undoStack.value.pop()
    if (!lastChange) return

    const { action, quad } = lastChange
    if (action === 'add') {
      graphStoreService.store.del(quad)
      redoStack.value.push({ action: 'remove', quad })
    } else if (action === 'remove') {
      graphStoreService.store.put(quad)
      redoStack.value.push({ action: 'add', quad })
    }
  }

  const redo = () => {
    const lastUndo = redoStack.value.pop()
    if (!lastUndo) return

    const { action, quad } = lastUndo
    if (action === 'add') {
      graphStoreService.store.put(quad)
      undoStack.value.push({ action: 'add', quad })
    } else if (action === 'remove') {
      graphStoreService.store.del(quad)
      undoStack.value.push({ action: 'remove', quad })
    }
  }

  const undoStackSize = computed(() => undoStack.value.length)

  const clearUndoRedoStacks = () => {
    undoStack.value = []
    redoStack.value = []
  }

  const writeGraph = async (graph: GraphDetails) => {
    if (!graph.node) return
    return graphStoreService.writeGraph(graph.node as NamedNode, graph.prefixes)
  }

  return {
    userGraphs,
    selectedOntology,
    selectedResource,
    visibleGraphs,
    editMode,

    initialize,
    toggleGraphVisibility,

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
    addQuad,
    editQuad,
    removeQuad,
    undoStackSize,
    undo,
    redo,
    clearUndoRedoStacks
  }
})
