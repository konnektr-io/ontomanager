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
    type: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    value: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
    first: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
    rest: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
    nil: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'),
    langString: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')
  },
  rdfs: {
    Class: namedNode('http://www.w3.org/2000/01/rdf-schema#Class'),
    Property: namedNode('http://www.w3.org/2000/01/rdf-schema#Property'),
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
    NamedIndividual: namedNode('http://www.w3.org/2002/07/owl#NamedIndividual'),
    Ontology: namedNode('http://www.w3.org/2002/07/owl#Ontology'),
    Restriction: namedNode('http://www.w3.org/2002/07/owl#Restriction'),
    intersectionOf: namedNode('http://www.w3.org/2002/07/owl#intersectionOf'),
    unionOf: namedNode('http://www.w3.org/2002/07/owl#unionOf'),
    complementOf: namedNode('http://www.w3.org/2002/07/owl#complementOf'),
    onClass: namedNode('http://www.w3.org/2002/07/owl#onClass'),
    onProperty: namedNode('http://www.w3.org/2002/07/owl#onProperty'),
    allValuesFrom: namedNode('http://www.w3.org/2002/07/owl#allValuesFrom'),
    someValuesFrom: namedNode('http://www.w3.org/2002/07/owl#someValuesFrom'),
    hasValue: namedNode('http://www.w3.org/2002/07/owl#hasValue')
  },
  skos: {
    prefLabel: namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
    ConceptScheme: namedNode('http://www.w3.org/2004/02/skos/core#ConceptScheme')
  },
  sh: {
    name: namedNode('http://www.w3.org/ns/shacl#name'),
    property: namedNode('http://www.w3.org/ns/shacl#property'),
    rule: namedNode('http://www.w3.org/ns/shacl#rule')
  },
  vann: {
    preferredNamespacePrefix: namedNode('http://purl.org/vocab/vann/preferredNamespacePrefix')
  }
}
