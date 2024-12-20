import { DataFactory } from 'n3'

const { namedNode } = DataFactory

export const vocab = {
  xsd: {
    string: namedNode('http://www.w3.org/2001/XMLSchema#string'),
    integer: namedNode('http://www.w3.org/2001/XMLSchema#integer'),
    decimal: namedNode('http://www.w3.org/2001/XMLSchema#decimal'),
    boolean: namedNode('http://www.w3.org/2001/XMLSchema#boolean'),
    dateTime: namedNode('http://www.w3.org/2001/XMLSchema#dateTime'),
    date: namedNode('http://www.w3.org/2001/XMLSchema#date'),
    time: namedNode('http://www.w3.org/2001/XMLSchema#time')
  },
  rdf: {
    Property: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property'),
    List: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#List'),
    type: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    value: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
    first: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
    rest: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
    nil: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'),
    langString: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')
  },
  rdfs: {
    Class: namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
    Datatype: namedNode('http://www.w3.org/2000/01/rdf-schema#Datatype'),
    label: namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
    domain: namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
    range: namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
    subClassOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
    subPropertyOf: namedNode('http://www.w3.org/2000/01/rdf-schema#subPropertyOf')
  },
  owl: {
    Class: namedNode('http://www.w3.org/2002/07/owl#Class'),
    Thing: namedNode('http://www.w3.org/2002/07/owl#Thing'),
    ObjectProperty: namedNode('http://www.w3.org/2002/07/owl#ObjectProperty'),
    DatatypeProperty: namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty'),
    AnnotationProperty: namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty'),
    TransitiveProperty: namedNode('http://www.w3.org/2002/07/owl#TransitiveProperty'),
    FunctionalProperty: namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty'),
    InverseFunctionalProperty: namedNode('http://www.w3.org/2002/07/owl#InverseFunctionalProperty'),
    AsymmetricProperty: namedNode('http://www.w3.org/2002/07/owl#AsymmetricProperty'),
    SymmetricProperty: namedNode('http://www.w3.org/2002/07/owl#SymmetricProperty'),
    ReflexiveProperty: namedNode('http://www.w3.org/2002/07/owl#ReflexiveProperty'),
    IrreflexiveProperty: namedNode('http://www.w3.org/2002/07/owl#IrreflexiveProperty'),
    NamedIndividual: namedNode('http://www.w3.org/2002/07/owl#NamedIndividual'),
    Ontology: namedNode('http://www.w3.org/2002/07/owl#Ontology'),
    Restriction: namedNode('http://www.w3.org/2002/07/owl#Restriction'),
    equivalentClass: namedNode('http://www.w3.org/2002/07/owl#equivalentClass'),
    intersectionOf: namedNode('http://www.w3.org/2002/07/owl#intersectionOf'),
    unionOf: namedNode('http://www.w3.org/2002/07/owl#unionOf'),
    complementOf: namedNode('http://www.w3.org/2002/07/owl#complementOf'),
    onClass: namedNode('http://www.w3.org/2002/07/owl#onClass'),
    onProperty: namedNode('http://www.w3.org/2002/07/owl#onProperty'),
    allValuesFrom: namedNode('http://www.w3.org/2002/07/owl#allValuesFrom'),
    someValuesFrom: namedNode('http://www.w3.org/2002/07/owl#someValuesFrom'),
    hasValue: namedNode('http://www.w3.org/2002/07/owl#hasValue'),
    minCardinality: namedNode('http://www.w3.org/2002/07/owl#minCardinality'),
    maxCardinality: namedNode('http://www.w3.org/2002/07/owl#maxCardinality')
  },
  skos: {
    prefLabel: namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
    ConceptScheme: namedNode('http://www.w3.org/2004/02/skos/core#ConceptScheme')
  },
  sh: {
    name: namedNode('http://www.w3.org/ns/shacl#name'),
    property: namedNode('http://www.w3.org/ns/shacl#property'),
    path: namedNode('http://www.w3.org/ns/shacl#path'),
    class: namedNode('http://www.w3.org/ns/shacl#class'),
    datatype: namedNode('http://www.w3.org/ns/shacl#datatype'),
    node: namedNode('http://www.w3.org/ns/shacl#node'),
    nodeKind: namedNode('http://www.w3.org/ns/shacl#nodeKind'),
    IRI: namedNode('http://www.w3.org/ns/shacl#IRI'),
    minCount: namedNode('http://www.w3.org/ns/shacl#minCount'),
    maxCount: namedNode('http://www.w3.org/ns/shacl#maxCount'),
    rule: namedNode('http://www.w3.org/ns/shacl#rule'),
    or: namedNode('http://www.w3.org/ns/shacl#or'),
    NodeShape: namedNode('http://www.w3.org/ns/shacl#NodeShape'),
    PropertyShape: namedNode('http://www.w3.org/ns/shacl#PropertyShape')
  },
  voaf: {
    Vocabulary: namedNode('http://purl.org/vocommons/voaf#Vocabulary')
  },
  vann: {
    preferredNamespacePrefix: namedNode('http://purl.org/vocab/vann/preferredNamespacePrefix'),
    preferredNamespaceUri: namedNode('http://purl.org/vocab/vann/preferredNamespaceUri')
  },
  dc: {
    title: namedNode('http://purl.org/dc/elements/1.1/title'),
    description: namedNode('http://purl.org/dc/elements/1.1/description'),
    creator: namedNode('http://purl.org/dc/elements/1.1/creator'),
    publisher: namedNode('http://purl.org/dc/elements/1.1/publisher'),
    created: namedNode('http://purl.org/dc/elements/1.1/created'),
    modified: namedNode('http://purl.org/dc/elements/1.1/modified')
  }
}
