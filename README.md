# Papita2 Code Editor

A code editor built with Tauri 2.0 and SolidJS with integrated Claude AI capabilities.

## Features

- Virtual file system with in-memory storage and IndexedDB persistence
- Multiple language support (JavaScript, TypeScript, Python, Rust, etc.)
- Monaco Editor integration
- '/generate' command to generate code using Claude API
- File explorer with create/edit/delete operations

## Technologies

- Tauri 2.0 for the desktop application framework
- SolidJS for the frontend UI
- Monaco Editor for code editing
- Redux Toolkit for state management
- Claude API for code generation

## Getting Started

### Prerequisites

- Node.js (>=16.0.0)
- Rust (>=1.65.0)
- Tauri CLI

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/papita2.git
   cd papita2
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

### Building for Production

```
npm run build
```

## Usage

1. Set your Claude API key in the settings
2. Create and edit files in the file explorer
3. Use the `/generate` command in the editor to generate code with Claude AI

## License

MIT