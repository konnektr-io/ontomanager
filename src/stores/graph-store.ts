import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { Store, Parser, DataFactory, NamedNode, Literal, Quad } from 'n3'

const { namedNode, literal, blankNode } = DataFactory

const builtinVocabularies = ['rdf.ttl', 'rdfs.ttl', 'owl.ttl', 'skos.ttl']

const vocab = {
  rdf: {
    type: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
  },
  rdfs: {
    subClassOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
    domain: namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
    range: namedNode('http://www.w3.org/2000/01/rdf-schema#range')
  }
}
const classObjectNodes = [
  namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
  namedNode('http://www.w3.org/2002/07/owl#Class')
]
const labelNodes = [
  namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
  namedNode('http://www.w3.org/2004/02/skos/core#prefLabel')
]
const languages = ['en']

export interface ClassTreeNode {
  key: string
  label: string
  data?: unknown
  icon?: string
  children?: ClassTreeNode[]
}

export interface UserGraph {
  url: string
  githubUrl?: string
  visible: boolean
  loaded?: boolean
}

export const useGraphStore = defineStore('graph', () => {
  const store = ref<Store>(new Store())
  const parser = new Parser()
  const allGraphIds: Literal[] = []
  const graphPrefixes: { [graphId: string]: { [prefix: string]: NamedNode<string> } } = {}
  const userGraphs = ref<UserGraph[]>([])

  const initialize = async () => {
    // TODO: Get config from local storage
    await loadDefaultVocabularies()
    getUserGraphsFromLocalStorage()
    await loadUserGraphs()
  }

  const getUserGraphsFromLocalStorage = () => {
    const storedGraphs = localStorage.getItem('userGraphs')
    if (storedGraphs) {
      userGraphs.value.push(...JSON.parse(storedGraphs))
    }
  }

  const saveUserGraphsToLocalStorage = () => {
    localStorage.setItem('userGraphs', JSON.stringify(userGraphs.value))
  }

  const loadDefaultVocabularies = async () => {
    for (const vocabulary of builtinVocabularies) {
      try {
        const response = await axios.get(`../vocab/${vocabulary}`)
        loadOntology(response.data, vocabulary)
      } catch (error) {
        console.error(`Failed to load ${vocabulary}: ${error}`)
      }
    }
  }

  const loadUserGraphs = async () => {
    for (const graph of userGraphs.value) {
      graph.loaded = false
      try {
        const response = await axios.get(graph.url)
        loadOntology(response.data, graph.url)
        graph.loaded = true
      } catch (error) {
        console.error(`Failed to load ${graph.url}: ${error}`)
      }
    }
  }

  const loadOntology = (ontologyContent: string, graphId: string) => {
    const graphIdIndex = allGraphIds.findIndex((gIdLiteral) => gIdLiteral.value === graphId)
    if (graphIdIndex === -1) {
      allGraphIds.splice(graphIdIndex, 1)
    }
    store.value.deleteGraph(graphId)

    const graph = literal(graphId)
    allGraphIds.push(graph)
    graphPrefixes[graphId] = {}
    const quads = parser.parse(ontologyContent, null, (prefix, ns) => {
      graphPrefixes[graphId][prefix] = ns as NamedNode<string>
    })
    store.value.addQuads(
      quads.map((quad) => new Quad(quad.subject, quad.predicate, quad.object, graph))
    )
  }

  const toggleOntologyVisibility = (url: string): void => {
    const ontologyIndex = userGraphs.value.findIndex((graph) => graph.url === url)
    if (ontologyIndex !== -1) {
      userGraphs.value[ontologyIndex] = {
        ...userGraphs.value[ontologyIndex],
        visible: !userGraphs.value[ontologyIndex].visible
      }
      saveUserGraphsToLocalStorage()
    }
  }

  const addOntology = (url: string): void => {
    const existingUserGraphIndex = userGraphs.value.findIndex((g) => g.url === url)
    if (existingUserGraphIndex !== -1) {
      userGraphs.value.splice(existingUserGraphIndex, 1)
    }

    const githubUrl = url.includes('github') ? url : undefined
    userGraphs.value.push({ url, githubUrl, visible: true, loaded: false })
    saveUserGraphsToLocalStorage()
    loadUserGraphs() // Reload user graphs to include the new one
  }

  const getClasses = (): string[] => {
    const classes = new Set<string>()
    allGraphIds
      .filter((graph) => userGraphs.value.find((visibleGraph) => visibleGraph.url === graph.value))
      .forEach((graphId) => {
        classObjectNodes.forEach((classNode) => {
          store.value.getSubjects(vocab.rdf.type, classNode, graphId).forEach((subject) => {
            classes.add(subject.value)
          })
        })
      })

    return Array.from(classes)
  }

  const createClassTreeNode = (classUri: string): ClassTreeNode => {
    const subClasses = getSubClasses(classUri)
    const children: ClassTreeNode[] = []
    subClasses.forEach((subClass) => {
      children.push(createClassTreeNode(subClass))
    })
    return {
      key: classUri,
      label: getLabel(classUri),
      data: getPrefixedUri(classUri),
      children
    }
  }

  const classesTree = computed<ClassTreeNode[]>(() => {
    const rootClasses = getRootClasses()
    const tree: ClassTreeNode[] = []

    rootClasses.forEach((rootClass) => {
      tree.push(createClassTreeNode(rootClass))
    })

    return tree
  })

  const getRootClasses = (): string[] => {
    const classes = new Set<string>()
    const allClasses = getClasses()
    const subClasses = new Set<string>()

    allClasses.forEach((classUri) => {
      const subs = getSubClasses(classUri)
      subs.forEach((sub) => subClasses.add(sub))
    })

    allClasses.forEach((classUri) => {
      if (!subClasses.has(classUri)) {
        classes.add(classUri)
      }
    })

    return Array.from(classes)
  }

  const getSubClasses = (classUri: string): string[] => {
    const subClasses = new Set<string>()
    store.value.getSubjects(vocab.rdfs.subClassOf, namedNode(classUri), null).forEach((subject) => {
      subClasses.add(subject.value)
    })
    return Array.from(subClasses)
  }

  const getProperties = (classUri: string): string[] => {
    const properties = new Set<string>()
    store.value.getSubjects(vocab.rdfs.domain, namedNode(classUri), null).forEach((subject) => {
      properties.add(subject.value)
    })
    return Array.from(properties)
  }

  const getRanges = (propertyUri: string): string[] => {
    const ranges = new Set<string>()
    store.value.getObjects(namedNode(propertyUri), vocab.rdfs.range, null).forEach((object) => {
      ranges.add(object.value)
    })
    return Array.from(ranges)
  }

  const getRestrictions = (classUri: string): string[] => {
    const restrictions = new Set<string>()
    store.value.getQuads(namedNode(classUri), vocab.rdfs.subClassOf, null, null).forEach((quad) => {
      if (quad.object.termType === 'BlankNode') {
        const restrictionNode = quad.object.value
        const property = getObjectValue(restrictionNode, 'http://www.w3.org/2002/07/owl#onProperty')
        if (property) {
          restrictions.add(property)
        }
      }
    })
    return Array.from(restrictions)
  }

  const getLabel = (uri: string): string => {
    for (const labelNode of labelNodes) {
      const label = getObjectValue(uri, labelNode.value)
      if (label) {
        return label
      }
    }
    return uri?.split('/').pop()?.split('#').pop() || uri
  }

  /*   const getAnnotationProperties = (): string[] => {
    const properties = new Set<string>()
    const quads = store.value.getQuads(
      null,
      vocab.rdf.type,
      namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
      null
    )
    quads.forEach((quad) => {
      properties.add(quad.subject.value)
    })
    return Array.from(properties)
  } */

  const getSubjectQuads = (uri: string): Quad[] => {
    return store.value
      .getQuads(namedNode(uri), null, null, null)
      .filter(
        (quad) =>
          quad.object.termType !== 'Literal' ||
          languages.includes((quad.object as Literal).language)
      )
  }

  const getObjectValue = (subject: string, predicate: string): string | null => {
    const quads = store.value.getQuads(namedNode(subject), namedNode(predicate), null, null)
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || languages.includes((q.object as Literal).language)
      ) || quads[0]
    return quad ? quad.object.value : null
  }

  const getPrefixedUri = (uri: string): string => {
    for (const graphId in graphPrefixes) {
      const prefixes = graphPrefixes[graphId]
      for (const prefix in prefixes) {
        const ns = prefixes[prefix].value
        if (uri.startsWith(ns)) {
          return `${prefix}:${uri.slice(ns.length)}`
        }
      }
    }
    return uri
  }

  return {
    userGraphs,
    initialize,
    toggleOntologyVisibility,
    addOntology,
    classesTree,

    getProperties,
    getRanges,
    getRestrictions,
    getLabel,
    getSubjectQuads,
    getPrefixedUri
  }
})
