# OntoManager

OntoManager is a web-based application designed to manage and visualize ontologies. It supports importing, editing, and visualizing ontologies from various sources, including GitHub repositories.

## Features

- **Import Ontologies**: Import ontologies from URLs or GitHub repositories.
- **Edit Ontologies**: Edit ontology details and manage their visibility.
- **Visualize Ontologies**: Visualize ontology classes and relationships.
- **Local Storage**: Save and load user-specific ontology configurations from local storage.

## Getting Started

### Prerequisites

- Node.js (version ^18.18.0 or >=20.0.0)
- pnpm (version 7 or higher)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/ontomanager.git
   cd ontomanager
   ```

2. Install dependencies:

   ```sh
   pnpm install
   ```

### Running the Application

To start the development server, run:

```sh
pnpm run dev
```

The application will be available at <http://localhost:5173>.

### Building for Production

To build the application for production, run:

```sh
pnpm run build

```

The built files will be in the dist directory.

### Running Tests

To run unit tests, use:

```sh
pnpm run test:unit

```

## Usage

### Importing Ontologies

- Click on the "Import Ontology" button in the header.
- Enter the URL of the ontology or the GitHub repository.
- Click "Import" to add the ontology to the list.

### Managing Ontologies

- Toggle Visibility: Click the eye icon next to an ontology to show or hide it.
- Remove Ontology: Click the trash icon to remove an ontology from the list.
- Change Branch: Select a different branch for GitHub-hosted ontologies.

### Visualizing Ontologies

- The ontology classes and relationships are visualized in a tree structure.
- Click on a class to view its details and relationships.

## Contact

For any questions or support, please contact:

- **Email**: <niko.raes@gmail.com>
- **GitHub Issues**: [OntoManager Issues](https://github.com/nikoraes/ontomanager/issues)
