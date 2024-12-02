import { BrowserLevel } from 'browser-level'
import {
  BlankNode,
  DataFactory,
  NamedNode,
  Parser,
  // Writer,
  Quad,
  type DataFactoryInterface,
  type Quad_Object,
  type Quad_Predicate,
  type Quad_Subject,
  type Term
} from 'n3'
import { Quadstore, type Pattern } from 'quadstore'
// import { Engine } from 'quadstore-comunica'
import { vocab } from '@/utils/vocab'
import type { ResourceTreeNode } from '@/stores/graph'
import type { Scope } from 'node_modules/quadstore/dist/esm/scope'
import Serializer, { type SerializerOptions } from '@rdfjs/serializer-turtle'

export const classObjectNodes = [vocab.rdfs.Class, vocab.owl.Class]
export const propertyObjectNodes = [
  vocab.rdf.Property,
  vocab.owl.ObjectProperty,
  vocab.owl.DatatypeProperty,
  vocab.owl.AnnotationProperty
]
export const labelNodes = [vocab.rdfs.label, vocab.skos.prefLabel]

const prefixes = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dc: 'http://purl.org/dc/elements/1.1/',
  shacl: 'http://www.w3.org/ns/shacl#'
}

class GraphStoreService {
  public constructor() {
    this._datafactory = DataFactory
    this._levelDb = new BrowserLevel('quadstore')
    this._store = new Quadstore({
      dataFactory: this._datafactory,
      backend: this._levelDb
      /* prefixes: {
        expandTerm: (term: string) => {
          const [prefix, localName] = term.split(':')
          return prefixes[prefix] ? prefixes[prefix] + localName : term
        },
        compactIri: (iri: string) => {
          for (const [prefix, namespace] of Object.entries(prefixes)) {
            if (iri.startsWith(namespace)) {
              return iri.replace(namespace, `${prefix}:`)
            }
          }
          return iri
        }
      } */
    })
    this._parser = new Parser()
    // this._engine = new Engine(this._store)
  }

  private _datafactory: DataFactoryInterface
  private _levelDb: BrowserLevel
  private _store: Quadstore
  private _parser: Parser

  private _scopeMap: Map<string, Scope> = new Map()
  private _cache: Map<string, string[]> = new Map()

  public async init() {
    await this._store.open()
  }

  public async close() {
    await this._store.close()
  }

  public async clear() {
    // await this._store.clear()
    await this._store.close()
    await BrowserLevel.destroy('quadstore')
    await this._store.open()
  }

  public async getAllGraphNodes() {
    await this.init()

    const graphNodeUris: string[] = []
    for await (const quad of (await this._store.getStream({})).iterator) {
      if (quad.graph.termType === 'NamedNode' && !graphNodeUris.includes(quad.graph.value))
        graphNodeUris.push(quad.graph.value)
    }

    return graphNodeUris.map((uri) => this._datafactory.namedNode(uri))
  }

  public async isGraphLoaded(graph: NamedNode) {
    await this.init()
    const { items } = await this._store.get({ graph }, { limit: 1 })
    return items.length > 0
  }

  public async loadGraph(ontologyContent: string, scopeId?: string) {
    // console.log('Init DB', new Date().toISOString())
    await this.init()

    let scope: Scope | undefined
    if (scopeId) {
      scope = await this._store.loadScope(scopeId)
    } else if (!scopeId) {
      scope = await this._store.initScope()
      scopeId = scope.id
      this._scopeMap.set(scopeId, scope)
    }

    const graphPrefixes: { [prefix: string]: NamedNode<string> } = {}

    // console.log('Parsing graph', new Date().toISOString())
    const quads = this._parser.parse(ontologyContent, null, (prefix, ns) => {
      if (prefix && ns) graphPrefixes[prefix] = ns as NamedNode<string>
    })
    // console.log('Graph parsed', quads.length, new Date().toISOString())

    // Find the owl:Ontology data, which we will use the graph node
    const ontologySubject = quads.find(
      (quad) =>
        quad.object.value === vocab.owl.Ontology.value ||
        quad.object.value === vocab.skos.ConceptScheme.value ||
        quad.object.value === vocab.voaf.Vocabulary.value
    )?.subject

    if (!ontologySubject || ontologySubject.termType !== 'NamedNode') {
      throw new Error('Ontology subject not found')
    }

    // console.log('Delete existing graph', new Date().toISOString())
    // Delete existing graph in case it exists in the store
    /* await new Promise((resolve, reject) =>
      this._store.deleteGraph(ontologySubject).on('end', resolve).on('error', reject)
    ) */

    // console.log('Get prefix', new Date().toISOString())
    // Make sure that the preferred prefix is stored in the graph prefixes
    const preferredPrefixObject = quads.find(
      (quad) =>
        quad.subject.value === ontologySubject.value &&
        quad.predicate.value === vocab.vann.preferredNamespacePrefix.value
    )?.object
    // console.log('Found prefix', new Date().toISOString())
    // Store the preferred prefix for the ontology
    if (preferredPrefixObject && preferredPrefixObject.termType === 'Literal') {
      // console.log('Find namespace uri prefix', new Date().toISOString())
      const preferredNamespaceUri =
        (quads.find(
          (quad) =>
            quad.subject.value === ontologySubject.value &&
            quad.predicate.value === vocab.vann.preferredNamespaceUri.value &&
            quad.object.termType === 'NamedNode'
        )?.object as NamedNode<string>) || undefined

      let prefixValue = (preferredNamespaceUri || ontologySubject)?.value
      if (!prefixValue.endsWith('/') && !prefixValue.endsWith('#')) {
        prefixValue += '#'
      }

      graphPrefixes[preferredPrefixObject.value] = this._datafactory.namedNode(prefixValue)
      /* console.log(
        'Found namespace stuff',
        preferredPrefixObject.value,
        prefixValue,
        new Date().toISOString()
      ) */
    }

    // console.log('Put quads', new Date().toISOString())

    const ontologyQuads = quads.map((quad) =>
      this._datafactory.quad(quad.subject, quad.predicate, quad.object, ontologySubject)
    )

    await this._store.multiPut(ontologyQuads, { scope })

    console.log(`Import of ${ontologySubject.value} done`, new Date().toISOString())

    return {
      node: ontologySubject,
      prefixes: graphPrefixes,
      scopeId
    }
  }

  public async deleteGraph(graph: NamedNode, scopeId?: string) {
    await this.init()
    if (scopeId) {
      this._store.deleteScope(scopeId)
      this._scopeMap.delete(scopeId)
    }
    return await new Promise((resolve, reject) =>
      this._store.deleteGraph(graph).on('end', resolve).on('error', reject)
    )
  }

  public async writeGraph(graph: NamedNode, prefixes?: { [prefix: string]: NamedNode<string> }) {
    const serializerOptions: SerializerOptions = {
      // baseIRI: graph.value,
      prefixes: Object.entries(prefixes || {}) as unknown as SerializerOptions['prefixes']
    }
    const serializer = new Serializer(serializerOptions)
    // const writer = new Writer({ prefixes })

    let count = 0

    const input: Quad[] = []

    const { iterator } = await this._store.getStream({ graph })
    for await (const quad of iterator) {
      input.push(
        this._datafactory.quad(
          quad.subject as Quad_Subject,
          quad.predicate as Quad_Predicate,
          quad.object as Quad_Object
        )
      )
      // writer.addQuad(this._datafactory.quad(quad.subject, quad.predicate, quad.object))
      count++
    }
    // console.log('Written graph with ' + count + ' quads')
    // return await new Promise<string>((resolve, reject) => {
    //   writer.end((error, result) => (error ? reject(error) : resolve(result)))
    // })

    console.log('Writing graph with ' + count + ' quads')

    return serializer.transform(input) + '\n\n ### Generated by ontomanager.konnektr.io ###'
  }

  public async isClass(uri: string) {
    await this.init()
    for (const classNode of classObjectNodes) {
      const { items } = await this._store.get(
        {
          subject: this._datafactory.namedNode(uri),
          predicate: vocab.rdf.type,
          object: classNode
        },
        { limit: 1 }
      )
      if (items.length) return true
    }
    return false
  }

  public async isShaclNodeShape(uri: string) {
    await this.init()
    const { items } = await this._store.get(
      {
        subject: this._datafactory.namedNode(uri),
        predicate: vocab.rdf.type,
        object: vocab.sh.NodeShape
      },
      { limit: 1 }
    )
    if (items.length) return true
    return false
  }

  public async getOntologies(graphs: NamedNode[]) {
    await this.init()
    const ontologies: ResourceTreeNode[] = []
    for await (const quad of (
      await this._store.getStream({
        predicate: vocab.rdf.type
      })
    ).iterator) {
      if (
        graphs.map((g) => g.value).includes(quad.graph.value) &&
        (quad.object.value === vocab.owl.Ontology.value ||
          quad.object.value === vocab.skos.ConceptScheme.value ||
          quad.object.value === vocab.voaf.Vocabulary.value)
      ) {
        ontologies.push({
          key: quad.subject.value,
          label: quad.subject.value,
          data: {
            graph: quad.graph.value
          },
          children: []
        })
      }
    }
    return ontologies
  }

  public async getClassesTree(graphs: NamedNode[]) {
    await this.init()

    if (!graphs.length) return []

    const allClassTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allClassTypeQuads: Quad[] = []
    for (const classNode of classObjectNodes) {
      const { items: quads } = await this._store.get({
        predicate: vocab.rdf.type,
        object: classNode
      })
      quads.forEach((quad) => {
        if (
          quad.subject.termType === 'NamedNode' &&
          graphs.map((g) => g.value).includes(quad.graph.value)
        ) {
          allClassTypeQuads.push(quad as Quad)
        }
      })
    }
    // Holds the class uris for all classes that are a subclass of another class (to filter the root classes)
    const allSubClasses = new Set<string>()

    const createClassTreeNodeRecursive = async (classTypeQuad: Quad): Promise<ResourceTreeNode> => {
      const classUri = classTypeQuad.subject.value
      // Get all subclasses
      // for (const graph of graphs) {
      const { items: subClassQuads } = await this._store.get({
        predicate: vocab.rdfs.subClassOf,
        object: classTypeQuad.subject
      })
      const children: ResourceTreeNode[] = []
      for (const subClassQuad of subClassQuads.filter<Quad>(
        (quad): quad is Quad =>
          graphs.map((g) => g.value).includes(quad.graph.value) &&
          // Make sure it's a class
          allClassTypeQuads.some((q) => q.subject.value === quad.subject.value)
      )) {
        const subClassUri = subClassQuad.subject.value
        allSubClasses.add(subClassUri)
        if (allClassTreeNodesMap[subClassUri]) {
          children.push(allClassTreeNodesMap[subClassUri])
        } else {
          allClassTreeNodesMap[subClassUri] = await createClassTreeNodeRecursive(subClassQuad)
          children.push(allClassTreeNodesMap[subClassUri])
        }
      }
      return {
        key: classUri,
        label: await this.getLabel(classUri),
        data: {
          parentUri: classTypeQuad.object.value,
          graph: classTypeQuad.graph.value
        },
        children
      }
    }

    await Promise.all(
      allClassTypeQuads.map(async (quad) => {
        if (!allClassTreeNodesMap[quad.subject.value]) {
          allClassTreeNodesMap[quad.subject.value] = await createClassTreeNodeRecursive(quad)
        }
      })
    )

    return Object.values(allClassTreeNodesMap)
      .filter((node) => !allSubClasses.has(node.key))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  public async getDecompositionTree(graphs: NamedNode[]) {
    await this.init()

    if (!graphs.length) return []
    // A decomposition tree is a tree of all classes that are defined in a restriction on property 'hasPart'
    // Different ontologies will have a different uri for this, so we try to make an educated guess
    // In the future we will make this configurable

    // Find a named node, which has 'hasPart' in the uri, which is of type owl:ObjectProperty or rdfs:Property,
    // and which has a restriction on it
    // It would be better to store this in the configuration instead of having to find them
    const hasPartPropertyUris: string[] = []
    for await (const quad of (
      await this._store.getStream({
        predicate: vocab.rdf.type
      })
    ).iterator) {
      if (
        (quad.object.equals(vocab.owl.ObjectProperty) || quad.object.equals(vocab.rdf.Property)) &&
        quad.subject.value.includes('has') &&
        !hasPartPropertyUris.includes(quad.subject.value)
      ) {
        hasPartPropertyUris.push(quad.subject.value)
      }
    }

    const allDecompositionTreeNodesMap: { [classUri: string]: ResourceTreeNode } = {}
    const allChildClassUris: string[] = []

    // Get 'parts' and parent classes from restrictions
    for (const propertyUri of hasPartPropertyUris) {
      // await Promise.all(
      //   hasPartPropertyUris.map(async (propertyUri) => {
      const { items: onPropertyQuads } = await this._store.get({
        predicate: vocab.owl.onProperty,
        object: this._datafactory.namedNode(propertyUri)
      })
      // for (const quad of onPropertyQuads) {
      await Promise.all(
        onPropertyQuads.map(async (quad) => {
          const blankNode = quad.subject
          if (quad.subject.termType !== 'BlankNode') return // continue // must be something weird ...
          const { items: partQuads } = await this._store.get({
            subject: blankNode,
            predicate: vocab.owl.someValuesFrom
          })
          const { items: parentClassQuads } = await this._store.get(
            {
              predicate: vocab.rdfs.subClassOf,
              object: blankNode
            },
            { limit: 1 }
          )
          const parentClass = parentClassQuads.filter((q) =>
            graphs.map((q) => q.value).includes(q.graph.value)
          )[0]?.subject
          if (!parentClass || parentClass.termType !== 'NamedNode') return // continue
          if (!allDecompositionTreeNodesMap[parentClass.value]) {
            allDecompositionTreeNodesMap[parentClass.value] = {
              key: parentClass.value,
              label: await this.getLabel(parentClass.value),
              data: {
                // prefixedUri: parentClass.value,
                graph: quad.graph.value
              },
              children: []
            }
          }
          await Promise.all(
            partQuads.map(async (partQuad) => {
              const part = partQuad.object
              if (!allChildClassUris.find((value) => value === part.value)) {
                allChildClassUris.push(part.value)
              }

              if (!allDecompositionTreeNodesMap[part.value]) {
                allDecompositionTreeNodesMap[part.value] = {
                  key: part.value,
                  label: await this.getLabel(part.value),
                  data: {
                    // prefixedUri: part.value,
                    graph: quad.graph.value
                  },
                  children: []
                }
              }
              if (
                !allDecompositionTreeNodesMap[parentClass.value].children.find(
                  (child) => child.key === part.value
                )
              ) {
                allDecompositionTreeNodesMap[parentClass.value].children.push(
                  allDecompositionTreeNodesMap[part.value]
                )
              }
            })
          )
        })
      )

      // Now do the same thing for shacl property shapes
      const { items: pathQuads } = await this._store.get({
        predicate: vocab.sh.path,
        object: this._datafactory.namedNode(propertyUri)
      })
      await Promise.all(
        pathQuads.map(async (quad) => {
          const blankNode = quad.subject
          if (quad.subject.termType !== 'BlankNode') return // continue // must be something weird ...
          const { items: partQuads } = await this._store.get({
            subject: blankNode,
            predicate: vocab.sh.class
          })
          const { items: parentClassQuads } = await this._store.get(
            {
              predicate: vocab.sh.property,
              object: blankNode
            },
            { limit: 1 }
          )
          const parentClass = parentClassQuads.filter((q) =>
            graphs.map((q) => q.value).includes(q.graph.value)
          )[0]?.subject
          if (!parentClass || parentClass.termType !== 'NamedNode') return // continue
          if (!allDecompositionTreeNodesMap[parentClass.value]) {
            allDecompositionTreeNodesMap[parentClass.value] = {
              key: parentClass.value,
              label: await this.getLabel(parentClass.value),
              data: {
                // prefixedUri: parentClass.value,
                graph: quad.graph.value
              },
              children: []
            }
          }
          await Promise.all(
            partQuads.map(async (partQuad) => {
              const part = partQuad.object
              if (!allChildClassUris.find((value) => value === part.value)) {
                allChildClassUris.push(part.value)
              }

              if (!allDecompositionTreeNodesMap[part.value]) {
                allDecompositionTreeNodesMap[part.value] = {
                  key: part.value,
                  label: await this.getLabel(part.value),
                  data: {
                    // prefixedUri: part.value,
                    graph: quad.graph.value
                  },
                  children: []
                }
              }
              if (
                !allDecompositionTreeNodesMap[parentClass.value].children.find(
                  (child) => child.key === part.value
                )
              ) {
                allDecompositionTreeNodesMap[parentClass.value].children.push(
                  allDecompositionTreeNodesMap[part.value]
                )
              }
            })
          )
        })
      )
    }

    // Now return the root nodes
    return Object.values(allDecompositionTreeNodesMap).filter(
      (t) => t.children.length && !allChildClassUris.find((u) => u === t.key)
    )
  }

  public async getPropertiesTree(graphs: NamedNode[]) {
    await this.init()

    if (!graphs.length) return []

    const allPropertyTreeNodesMap: { [propertyUri: string]: ResourceTreeNode } = {}
    const allPropertyTypeQuads: Quad[] = []
    for (const graph of graphs) {
      for (const propertyNode of propertyObjectNodes) {
        const { items } = await this._store.get({
          predicate: vocab.rdf.type,
          object: propertyNode,
          graph
        })
        items.forEach((quad) => {
          if (quad.subject.termType === 'NamedNode') {
            allPropertyTypeQuads.push(quad as Quad)
          }
        })
      }
    }

    const allSubProperties = new Set<string>()

    const createPropertyTreeNodeRecursive = async (
      propertyTypeQuad: Quad
    ): Promise<ResourceTreeNode> => {
      const propertyNode = propertyTypeQuad.subject
      const subPropertyQuads: Quad[] = []
      for (const graph of graphs) {
        const { items } = await this._store.get({
          predicate: vocab.rdfs.subPropertyOf,
          object: propertyNode,
          graph
        })
        items.forEach((quad) => {
          if (
            // Make sure it's a property
            allPropertyTypeQuads.find((q) => q.subject.value === quad.subject.value)
          ) {
            subPropertyQuads.push(quad as Quad)
          }
        })
      }

      const children: ResourceTreeNode[] = []
      for (const subPropertyQuad of subPropertyQuads) {
        const subProperty = subPropertyQuad.subject.value
        allSubProperties.add(subProperty)
        if (allPropertyTreeNodesMap[subProperty]) {
          children.push(allPropertyTreeNodesMap[subProperty])
        } else {
          allPropertyTreeNodesMap[subProperty] =
            await createPropertyTreeNodeRecursive(subPropertyQuad)
          children.push(allPropertyTreeNodesMap[subProperty])
        }
      }

      return {
        key: propertyNode.value,
        label: await this.getLabel(propertyNode.value),
        data: {
          parentUri: propertyTypeQuad.object.value,
          graph: propertyTypeQuad.graph.value
        },
        children
      }
    }

    await Promise.all(
      allPropertyTypeQuads.map(async (quad) => {
        if (!allPropertyTreeNodesMap[quad.subject.value]) {
          allPropertyTreeNodesMap[quad.subject.value] = await createPropertyTreeNodeRecursive(quad)
        }
      })
    )

    return Object.values(allPropertyTreeNodesMap).filter((node) => !allSubProperties.has(node.key))
  }

  public async getIndividualsTree(graphs: NamedNode[]) {
    await this.init()

    if (!graphs.length) return []
    // Construct the tree of individuals by class
    const treeNodesMap: { [classUri: string]: ResourceTreeNode } = {}

    for (const graph of graphs) {
      for await (const quad of (await this._store.getStream({ predicate: vocab.rdf.type, graph }))
        .iterator) {
        if (
          quad.subject.termType === 'NamedNode' &&
          quad.object.termType === 'NamedNode' &&
          quad.object.value !== vocab.rdfs.Class.value &&
          quad.object.value !== vocab.rdf.List.value &&
          quad.object.value !== vocab.owl.Class.value &&
          quad.object.value !== vocab.owl.Thing.value &&
          quad.object.value !== vocab.rdf.Property.value &&
          quad.object.value !== vocab.owl.ObjectProperty.value &&
          quad.object.value !== vocab.owl.DatatypeProperty.value &&
          quad.object.value !== vocab.owl.AnnotationProperty.value &&
          quad.object.value !== vocab.owl.TransitiveProperty.value &&
          quad.object.value !== vocab.owl.FunctionalProperty.value &&
          quad.object.value !== vocab.owl.AsymmetricProperty.value &&
          quad.object.value !== vocab.owl.SymmetricProperty.value &&
          quad.object.value !== vocab.owl.ReflexiveProperty.value &&
          quad.object.value !== vocab.owl.IrreflexiveProperty.value &&
          quad.object.value !== vocab.owl.InverseFunctionalProperty.value &&
          quad.object.value !== vocab.rdfs.Datatype.value &&
          quad.object.value !== vocab.owl.Restriction.value &&
          quad.object.value !== vocab.owl.Ontology.value &&
          quad.object.value !== vocab.skos.ConceptScheme.value &&
          quad.object.value !== vocab.owl.NamedIndividual.value &&
          quad.object.value !== vocab.sh.NodeShape.value &&
          quad.object.value !== vocab.sh.PropertyShape.value
        ) {
          const classUri = quad.object.value
          if (!treeNodesMap[classUri])
            treeNodesMap[classUri] = {
              key: classUri,
              label: await this.getLabel(classUri),
              data: {
                graph: quad.graph.value
              },
              children: []
            }
          if (!treeNodesMap[classUri].children.find((c) => c.key === quad.subject.value)) {
            treeNodesMap[classUri].children.push({
              key: quad.subject.value,
              label: await this.getLabel(quad.subject.value),
              data: {
                graph: quad.graph.value
              },
              children: []
            })
          }
        }
      }
    }

    return Object.values(treeNodesMap)
  }

  public async getSubjectQuads(
    subjectUri: string,
    predicateUri?: string,
    graphUri?: string
  ): Promise<Quad[]> {
    await this.init()
    const { items } = await this._store.get({
      subject: this._datafactory.namedNode(subjectUri),
      ...(predicateUri && { predicate: this._datafactory.namedNode(predicateUri) }),
      ...(graphUri && { graph: this._datafactory.namedNode(graphUri) })
    })
    return items as Quad[]
  }

  public async getProperties(
    uri: string
  ): Promise<{ label: string; node: NamedNode; ranges: Term[] }[]> {
    await this.init()
    const { items } = await this._store.get({
      predicate: vocab.rdfs.domain,
      object: DataFactory.namedNode(uri)
    })
    return await Promise.all(
      items.map(async (quad) => {
        const label = await this.getLabel(quad.subject.value)
        const { items: rangeQuads } = await this._store.get({
          subject: quad.subject,
          predicate: vocab.rdfs.range
        })
        const ranges = rangeQuads.map((q) => q.object as Term)
        return {
          label,
          node: quad.subject as NamedNode,
          ranges
        }
      })
    )
  }

  public async getRestrictions(uri: string): Promise<
    {
      label: string
      propertyNode: NamedNode
      blankNode: BlankNode
      valueNodes: Term[]
    }[]
  > {
    await this.init()
    const { items } = await this._store.get({
      predicate: vocab.rdfs.subClassOf,
      subject: DataFactory.namedNode(uri)
    })

    const restrictions = items.filter((quad) => quad.object.termType === 'BlankNode')

    const nodeRestrictions = await Promise.all(
      restrictions.map(async (quad) => {
        const blankNode = quad.object as BlankNode
        const { items: propertyQuads } = await this._store.get({
          predicate: vocab.owl.onProperty,
          subject: blankNode
        })
        const propertyNode = propertyQuads[0]?.object as NamedNode
        if (!propertyNode) return null
        const propertyUri = propertyNode.value
        const label = propertyUri ? await this.getLabel(propertyUri) : ''

        // This is just to display the value in the UI
        const valueNodes: Term[] = []
        const { items: someValuesQuads } = await this._store.get({
          subject: blankNode,
          predicate: vocab.owl.someValuesFrom
        })
        if (someValuesQuads.length) {
          valueNodes.push(...someValuesQuads.map((q) => q.object as Term))
        }
        if (!valueNodes.length) {
          const { items: hasValueQuads } = await this._store.get({
            subject: blankNode,
            predicate: vocab.owl.hasValue
          })
          if (hasValueQuads.length) {
            valueNodes.push(...hasValueQuads.map((q) => q.object as Term))
          }
        }
        if (!valueNodes.length) {
          const { items: allValuesQuads } = await this._store.get({
            subject: blankNode,
            predicate: vocab.owl.allValuesFrom
          })
          if (allValuesQuads.length) {
            for (const q of allValuesQuads) {
              if (q.object.termType === 'NamedNode') {
                valueNodes.push(q.object as Term)
              } else if (q.object.termType === 'BlankNode') {
                const { items: vQuads } = await this._store.get({
                  subject: q.object as BlankNode
                })
                for (const vQuad of vQuads) {
                  if (vQuad.object.termType === 'NamedNode') {
                    valueNodes.push(vQuad.object as Term)
                  } else if (vQuad.object.termType === 'BlankNode') {
                    const { items: vvQuads } = await this._store.get({
                      subject: vQuad.object as BlankNode
                    })
                    valueNodes.push(
                      ...vvQuads
                        .filter((q) => q.object.termType !== 'BlankNode')
                        .map((q) => q.object as Term)
                    )
                  }
                }
              }
            }
          }
        }
        return {
          label,
          propertyNode,
          blankNode,
          valueNodes
        }
      })
    )

    return nodeRestrictions.filter(
      (
        r
      ): r is {
        label: string
        propertyNode: NamedNode
        blankNode: BlankNode
        valueNodes: Term[]
      } => !!r
    )
  }

  public async getShaclPropertyShapes(uri: string): Promise<
    {
      label: string
      propertyNode: NamedNode
      blankNode: BlankNode
      valueNodes: Term[]
    }[]
  > {
    await this.init()
    const { items } = await this._store.get({
      subject: DataFactory.namedNode(uri),
      predicate: vocab.sh.property
    })

    const propertyShapes = items.filter((quad) => quad.object.termType === 'BlankNode')

    return await Promise.all(
      propertyShapes.map(async (quad) => {
        const blankNode = quad.object as BlankNode
        const { items: propertyQuads } = await this._store.get({
          subject: blankNode,
          predicate: vocab.sh.path
        })
        const propertyNode = propertyQuads[0]?.object as NamedNode
        const propertyUri = propertyNode.value
        const label = propertyUri ? await this.getLabel(propertyUri) : ''

        // This is just to display the value in the UI
        const valueNodes: Term[] = []
        const { items: datatypeQuads } = await this._store.get({
          subject: blankNode,
          predicate: vocab.sh.datatype
        })
        if (datatypeQuads.length) {
          valueNodes.push(...datatypeQuads.map((q) => q.object as Term))
        }
        if (!valueNodes.length) {
          const { items: classQuads } = await this._store.get({
            subject: blankNode,
            predicate: vocab.sh.class
          })
          if (classQuads.length) {
            valueNodes.push(...classQuads.map((q) => q.object as Term))
          }
        }
        return {
          label,
          propertyNode,
          blankNode,
          valueNodes
        }
      })
    )
  }

  public async getIndividuals(uri: string): Promise<{ label: string; node: NamedNode }[]> {
    await this.init()
    const { items } = await this._store.get({
      predicate: vocab.rdf.type,
      object: DataFactory.namedNode(uri)
    })
    return await Promise.all(
      items.map(async (quad) => {
        const label = await this.getLabel(quad.subject.value)
        return {
          label,
          node: quad.subject as NamedNode
        }
      })
    )
  }

  private async _getCachedResults(
    key: string,
    fetchFunction: () => Promise<string[]>
  ): Promise<string[]> {
    if (this._cache.has(key)) {
      return this._cache.get(key)!
    }
    const results = await fetchFunction()
    this._cache.set(key, results)
    return results
  }

  private _expandPrefix(term: string): string {
    const [prefix, localName] = term.split(':')
    return prefixes[prefix] ? prefixes[prefix] + localName : term
  }

  public async getPredicateNodeSuggestions(existingPredicates: string[], search: string) {
    await this.init()
    const cacheKey = `predicateNodeSuggestions:${search}`
    return this._getCachedResults(cacheKey, async () => {
      const nodeMap = new Set<string>()
      for await (const quad of (await this._store.getStream({})).iterator) {
        if (
          !existingPredicates.includes(quad.predicate.value) &&
          quad.predicate.termType === 'NamedNode' &&
          (quad.predicate.value.toLowerCase().includes(search.toLowerCase()) ||
            quad.predicate.value.toLowerCase().includes(this._expandPrefix(search).toLowerCase()))
        ) {
          nodeMap.add(quad.predicate.value)
        }
        if (nodeMap.size > 20) break
      }
      return Array.from(nodeMap)
    })
  }

  public async getObjectNamedNodeSuggestions(predicateUri: string, search: string) {
    await this.init()
    const cacheKey = `objectNamedNodeSuggestions:${predicateUri}:${search}`
    return this._getCachedResults(cacheKey, async () => {
      const namedNodeMap = new Set<string>()
      for await (const quad of (await this._store.getStream({})).iterator) {
        if (
          quad.predicate.value === predicateUri &&
          quad.object.termType === 'NamedNode' &&
          (quad.object.value.toLowerCase().includes(search.toLowerCase()) ||
            quad.object.value.toLowerCase().includes(this._expandPrefix(search).toLowerCase()))
        ) {
          namedNodeMap.add(quad.object.value)
        }
        if (namedNodeMap.size > 20) break
      }
      return Array.from(namedNodeMap)
    })
  }

  public async getPropertyNodeSuggestions(existingPropertyNodes: string[], search: string) {
    await this.init()
    const cacheKey = `propertyNodeSuggestions:${search}`
    return this._getCachedResults(cacheKey, async () => {
      const namedNodeMap = new Set<string>()
      await Promise.all(
        propertyObjectNodes.map(async (propertyNode) => {
          for await (const quad of (
            await this._store.getStream({
              predicate: vocab.rdf.type,
              object: propertyNode
            })
          ).iterator) {
            if (
              quad.subject.termType === 'NamedNode' &&
              !existingPropertyNodes.includes(quad.subject.value) &&
              (quad.subject.value.toLowerCase().includes(search.toLowerCase()) ||
                quad.subject.value.toLowerCase().includes(this._expandPrefix(search).toLowerCase()))
            ) {
              namedNodeMap.add(quad.subject.value)
            }
            if (namedNodeMap.size > 20) break
          }
        })
      )
      return Array.from(namedNodeMap)
    })
  }

  public async getNamedNodeSuggestions(search: string) {
    await this.init()
    const cacheKey = `namedNodeSuggestions:${search}`
    return this._getCachedResults(cacheKey, async () => {
      const namedNodeMap = new Set<string>()
      for await (const quad of (await this._store.getStream({})).iterator) {
        if (
          quad.object.termType === 'NamedNode' &&
          (quad.object.value.toLowerCase().includes(search.toLowerCase()) ||
            quad.object.value.toLowerCase().includes(this._expandPrefix(search).toLowerCase()))
        ) {
          namedNodeMap.add(quad.object.value)
        }
        if (namedNodeMap.size > 20) break
      }
      return Array.from(namedNodeMap)
    })
  }

  public async getLabel(uri: string) {
    await this.init()
    for (const labelNode of labelNodes) {
      for await (const quad of (
        await this._store.getStream({
          subject: this._datafactory.namedNode(uri),
          predicate: labelNode
        })
      ).iterator) {
        const label = quad.object.value
        if (
          label &&
          label.length > 0 &&
          quad.object.termType === 'Literal' &&
          quad.object.language &&
          quad.object.language === 'en'
        ) {
          return label
        }
      }
    }
    return uri?.split('/').pop()?.split('#').pop() || uri
  }

  public async getStream(pattern: Pattern) {
    await this.init()
    return await this._store.getStream(pattern)
  }

  public async get(pattern: Pattern) {
    return await this._store.get(pattern)
  }

  public async put(quad: Quad, scopeId: string) {
    let scope = this._scopeMap[scopeId]
    if (!scope) {
      scope = await this._store.loadScope(scopeId)
      this._scopeMap.set(scopeId, scope)
    }
    return await this._store.put(quad, { scope })
  }

  public async del(quad: Quad, scopeId: string) {
    let scope = this._scopeMap[scopeId]
    if (!scope) {
      scope = await this._store.loadScope(scopeId)
      this._scopeMap.set(scopeId, scope)
    }
    return await this._store.del(quad, { scope })
  }
}

export default new GraphStoreService()
