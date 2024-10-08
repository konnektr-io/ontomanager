import axios from 'axios'
import {
  Store,
  Parser,
  DataFactory,
  NamedNode,
  type Quad_Subject,
  type Quad_Object,
  Literal,
  Quad
} from 'n3'

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

class GraphStoreService {
  private store: Store
  private parser: Parser
  private graphs: Literal[] = []
  private graphPrefixes: { [graphId: string]: { [prefix: string]: NamedNode<string> } } = {}
  private visibleGraphs = ['bot.ttl']

  public constructor() {
    this.store = new Store()
    this.parser = new Parser()
    this.loadDefaultVocabularies()
  }

  public loadDefaultVocabularies(): void {
    builtinVocabularies.forEach(async (vocabulary) => {
      const response = await axios.get(`../vocab/${vocabulary}`)
      this.loadOntology(response.data, vocabulary)
    })
  }

  public async loadOntology(ontologyContent: string, graphId: string): Promise<void> {
    const graph = literal(graphId)
    this.graphs.push(graph)
    this.graphPrefixes[graphId] = {}
    const quads = this.parser.parse(ontologyContent, null, (prefix, ns) => {
      this.graphPrefixes[graphId][prefix] = ns as NamedNode<string>
    })
    this.store.addQuads(
      quads.map((quad) => new Quad(quad.subject, quad.predicate, quad.object, graph))
    )
  }

  public getClasses(): string[] {
    const classes = new Set<string>()
    this.graphs
      .filter((graph) => this.visibleGraphs.includes(graph.value))
      .forEach((graphId) => {
        classObjectNodes.forEach((classNode) => {
          this.store.getSubjects(vocab.rdf.type, classNode, graphId).forEach((subject) => {
            classes.add(subject.value)
          })
        })
      })

    return Array.from(classes)
  }

  /**
   * Get all root classes
   * @returns {string[]} - Array of root classes
   */
  public getRootClasses(): string[] {
    const classes = new Set<string>()
    const allClasses = this.getClasses()
    const subClasses = new Set<string>()

    allClasses.forEach((classUri) => {
      const subs = this.getSubClasses(classUri)
      subs.forEach((sub) => subClasses.add(sub))
    })

    allClasses.forEach((classUri) => {
      if (!subClasses.has(classUri)) {
        classes.add(classUri)
      }
    })

    return Array.from(classes)
  }

  /**
   * Get all sub classes of a class
   * @param {string} classUri - URI of the class
   * @returns {string[]} - Array of sub classes
   */
  public getSubClasses(classUri: string): string[] {
    const subClasses = new Set<string>()
    this.store.getSubjects(vocab.rdfs.subClassOf, namedNode(classUri), null).forEach((subject) => {
      subClasses.add(subject.value)
    })
    return Array.from(subClasses)
  }

  public getProperties(classUri: string): string[] {
    const properties = new Set<string>()
    this.store.getSubjects(vocab.rdfs.domain, namedNode(classUri), null).forEach((subject) => {
      properties.add(subject.value)
    })
    return Array.from(properties)
  }

  public getRanges(propertyUri: string): string[] {
    const ranges = new Set<string>()
    this.store.getObjects(namedNode(propertyUri), vocab.rdfs.range, null).forEach((object) => {
      ranges.add(object.value)
    })
    return Array.from(ranges)
  }

  public getRestrictions(classUri: string): string[] {
    const restrictions = new Set<string>()
    this.store.getQuads(namedNode(classUri), vocab.rdfs.subClassOf, null, null).forEach((quad) => {
      if (quad.object.termType === 'BlankNode') {
        const restrictionNode = quad.object.value
        const property = this.getObjectValue(
          restrictionNode,
          'http://www.w3.org/2002/07/owl#onProperty'
        )
        if (property) {
          restrictions.add(property)
        }
      }
    })
    // TODO: also return the type and value of the restriction
    /* this.store.getQuads(namedNode(vocab.rdfs.subClassOf), (quad) => {
      if (
        quad.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#subClassOf' &&
        quad.object.termType === 'BlankNode'
      ) {
        const restrictionNode = quad.object.value
        const property = this.getObjectValue(
          restrictionNode,
          'http://www.w3.org/2002/07/owl#onProperty'
        )
        const type = this.getRestrictionType(restrictionNode)
        const value = this.getRestrictionValue(restrictionNode, type)
        if (property && type && value) {
          restrictions.push({ property, type, value })
        }
      }
    }) */
    return Array.from(restrictions)
  }

  public getLabel(uri: string): string {
    for (const labelNode of labelNodes) {
      const label = this.getObjectValue(uri, labelNode.value)
      if (label) {
        return label
      }
    }
    return uri.split('/').pop()?.split('#').pop() || uri
  }

  /** Gets all annotation properties */
  public getAnnotationProperties(): string[] {
    const properties = new Set<string>()
    const quads = this.store.getQuads(
      null,
      vocab.rdf.type,
      namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
      null
    )
    quads.forEach((quad) => {
      properties.add(quad.subject.value)
    })
    return Array.from(properties)
  }

  public getSubjectQuads(uri: string): Quad[] {
    // const annotationProperties = this.getAnnotationProperties();
    return this.store
      .getQuads(namedNode(uri), null, null, null)
      .filter(
        (quad) =>
          quad.object.termType !== 'Literal' ||
          languages.includes((quad.object as Literal).language)
      )
  }

  public getObjectValue(subject: string, predicate: string): string | null {
    const quads = this.store.getQuads(namedNode(subject), namedNode(predicate), null, null)
    const quad =
      quads.find(
        (q) => q.object.termType !== 'Literal' || languages.includes((q.object as Literal).language)
      ) || quads[0]
    return quad ? quad.object.value : null
  }

  public getPrefixedUri(uri: string): string {
    for (const graphId in this.graphPrefixes) {
      const prefixes = this.graphPrefixes[graphId]
      for (const prefix in prefixes) {
        const ns = prefixes[prefix].value
        if (uri.startsWith(ns)) {
          return `${prefix}:${uri.slice(ns.length)}`
        }
      }
    }
    return uri
  }

  private getRestrictionType(restrictionNode: string): string {
    const types = [
      'http://www.w3.org/2002/07/owl#someValuesFrom',
      'http://www.w3.org/2002/07/owl#allValuesFrom',
      'http://www.w3.org/2002/07/owl#hasValue',
      'http://www.w3.org/2002/07/owl#minCardinality',
      'http://www.w3.org/2002/07/owl#maxCardinality',
      'http://www.w3.org/2002/07/owl#cardinality'
    ]
    for (const type of types) {
      if (this.store.getQuads(namedNode(restrictionNode), namedNode(type), null, null).length > 0) {
        return type
      }
    }
    return ''
  }

  private getRestrictionValue(restrictionNode: string, type: string): string {
    const quad = this.store.getQuads(namedNode(restrictionNode), namedNode(type), null, null)[0]
    return quad ? quad.object.value : ''
  }

  addProperty(classUri: string, propertyUri: string, label: string, range: string): void {
    this.store.addQuad(
      namedNode(propertyUri),
      vocab.rdf.type,
      namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty')
    )
    this.store.addQuad(
      namedNode(propertyUri),
      namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
      namedNode(classUri)
    )
    this.store.addQuad(
      namedNode(propertyUri),
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal(label)
    )
    this.store.addQuad(
      namedNode(propertyUri),
      namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
      namedNode(range)
    )
  }

  updateProperty(propertyUri: string, label: string, range: string): void {
    this.updateTriple(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#label', label)
    this.updateTriple(propertyUri, 'http://www.w3.org/2000/01/rdf-schema#range', range)
  }

  deleteProperty(propertyUri: string): void {
    this.store.removeQuads(this.store.getQuads(namedNode(propertyUri), null, null, null))
  }

  addRestriction(classUri: string, property: string, type: string, value: string): void {
    const restrictionNode = blankNode()
    this.store.addQuad(
      namedNode(classUri),
      namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
      restrictionNode
    )
    this.store.addQuad(
      restrictionNode,
      vocab.rdf.type,
      namedNode('http://www.w3.org/2002/07/owl#Restriction')
    )
    this.store.addQuad(
      restrictionNode,
      namedNode('http://www.w3.org/2002/07/owl#onProperty'),
      namedNode(property)
    )
    this.store.addQuad(restrictionNode, namedNode(type), this.getValueNode(type, value))
  }

  updateRestriction(
    classUri: string,
    oldProperty: string,
    oldType: string,
    oldValue: string,
    newProperty: string,
    newType: string,
    newValue: string
  ): void {
    const restrictionNode = this.findRestrictionNode(classUri, oldProperty, oldType, oldValue)
    if (restrictionNode) {
      this.store.removeQuads(this.store.getQuads(restrictionNode, null, null, null))
      this.addRestriction(classUri, newProperty, newType, newValue)
    }
  }

  deleteRestriction(classUri: string, property: string, type: string, value: string): void {
    const restrictionNode = this.findRestrictionNode(classUri, property, type, value)
    if (restrictionNode) {
      this.store.removeQuads(this.store.getQuads(restrictionNode, null, null, null))
      this.store.removeQuads(
        this.store.getQuads(
          namedNode(classUri),
          namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
          restrictionNode,
          null
        )
      )
    }
  }

  private updateTriple(subject: string, predicate: string, object: string): void {
    this.store.removeQuads(
      this.store.getQuads(namedNode(subject), namedNode(predicate), null, null)
    )
    this.store.addQuad(namedNode(subject), namedNode(predicate), literal(object))
  }

  private getValueNode(type: string, value: string): NamedNode | Quad_Object {
    if (type.includes('Cardinality')) {
      return literal(parseInt(value, 10))
    } else {
      return namedNode(value)
    }
  }

  private findRestrictionNode(
    classUri: string,
    property: string,
    type: string,
    value: string
  ): Quad_Subject | null {
    const quads = this.store.getQuads(
      namedNode(classUri),
      namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
      null,
      null
    )
    for (const quad of quads) {
      if (quad.object.termType === 'BlankNode') {
        const restrictionNode = quad.object
        const propertyQuad = this.store.getQuads(
          restrictionNode,
          namedNode('http://www.w3.org/2002/07/owl#onProperty'),
          namedNode(property),
          null
        )[0]
        const typeQuad = this.store.getQuads(restrictionNode, namedNode(type), null, null)[0]
        if (propertyQuad && typeQuad && typeQuad.object.value === value) {
          return restrictionNode
        }
      }
    }
    return null
  }
}

export default new GraphStoreService()
