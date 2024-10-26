# OntoManager

OntoManager is a web-based application designed to manage and visualize ontologies. It supports importing and visualizing ontologies from various sources, including GitHub repositories. For ontologies stored in GitHub repositories, it also supports editing and committing changes back to the repository.

## Usage

### Importing Ontologies

- Click on the "Import Ontology" button in the header or go to the main getting started page.
- Enter the URL of the ontology or the GitHub repository.
- Click "Import" to add the ontology to the list.

### Managing Ontologies

- Toggle Visibility: Click the eye icon next to an ontology to show or hide it.
- Remove Ontology: Click the trash icon to remove an ontology from the list.
- Change Branch: Select a different branch for GitHub-hosted ontologies.

### Visualizing Ontologies

- The ontology classes and properties are visualized in a tree structure.
- Click on a resource to view its details and relationships.
- The trees are generated as follows:
  - **Classes**: The ontology quads with subClassOf predicate are used to generate the class tree. All nodes of type rdfs:Class or owl:Class are considered to be classes.
  - **Decomposition**: The decomposition (or partonomy) of classes is visualized by following the restrictions on any property that has 'hasPart' in its URI (should be configurable in the future).
  - **Properties**: The ontology quads with subPropertyOf predicate are used to generate the class tree. All nodes of type rdfs:Property, owl:ObjectProperty, owl:DatatypeProperty, owl:AnnotationProperty are considered to be properties.
  - **Individuals**: The ontology quads with rdf:type predicate are used to generate the tree. Nodes that had an rdf:type object that is not a class or property are considered to be individuals.

### Editing Resources

- Make sure to select an ontology to edit in the header.
- Editing is only possible in ontologies stored in Github repository with write access.
- Click on a resource to view its details. The resource is defined in the selected ontology if it's bold, but additional information can be added in different ontologies as well.
- Either add/edit/remove objects from any of the existing properties, add new properties or remove properties.
- Either commit the changes or discard them. Committing the changes will serialize the ontology to turtle and will overwrite the existing file in the repository.

## Contact

For any questions or support, please contact:

- **Email**: <niko.raes@gmail.com>
- **GitHub Issues**: [OntoManager Issues](https://github.com/nikoraes/ontomanager/issues)

## License

Licensed under the Apache License, Version 2.0: <http://www.apache.org/licenses/LICENSE-2.0>
