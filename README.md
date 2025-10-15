# Filo - Modern Note-Taking Application

A clean, fast, and intelligent note-taking application built with SvelteKit and Firebase. Features real-time sync, advanced markdown support, and intelligent auto-saving to keep your thoughts organized and accessible across all devices.

## ✨ Core Features

### **📝 Smart Writing Experience**

- **Intelligent Auto-Save**: Advanced auto-save system that only saves when content actually changes, with visual saving indicators
- **Real-time Sync**: Changes appear instantly across all your devices with Firebase real-time database
- **Folder Organization**: Create unlimited folders to organize your notes with hierarchical structure
- **Quick Note Switching**: Jump between notes instantly while auto-save handles everything in the background
- **Offline-First**: Continue working without internet connection - all changes sync when reconnected

### **🔍 Powerful Search & Discovery**

- **Full-Text Search**: Lightning-fast search across all notes and folders with intelligent ranking
- **Advanced Search Operators**: 
  - `folder:name` - Search within specific folders
  - `title:text` - Search only in note titles
  - Smart content matching with highlighted results
- **Recent Notes Priority**: Recently modified notes appear first in search results
- **Search Result Previews**: See content excerpts with highlighted matches
- **Keyboard Navigation**: Navigate search results with arrow keys

### **📤 Comprehensive Export System**

- **Individual Note Export**: Export any note as `.md` (Markdown) or `.pdf` files
- **Folder Export**: Download entire folders as ZIP archives with preserved structure
- **Workspace Export**: Export your complete workspace with full folder hierarchy
- **PDF Generation**: Server-side PDF generation with Firebase Functions for high-quality output
- **Universal Markdown**: Files work in any text editor, documentation system, or markdown processor
- **Batch Operations**: Export multiple items with progress indicators

### **🎨 Adaptive User Interface**

- **Triple View Modes**: Switch between editor-only, preview-only, or split view layouts
- **Responsive Design**: Optimized experience on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Automatic system theme detection with manual toggle option
- **Collapsible Sidebar**: Maximize writing space with collapsible navigation
- **Context Menus**: Right-click menus for quick actions on notes and folders
- **Mobile-First**: Touch-friendly interface with gesture support

### **⌨️ Advanced Markdown & Editing**

- **Rich Markdown Support**: Full CommonMark with extensive plugin ecosystem
- **Mathematical Equations**: KaTeX integration for beautiful math rendering (`$inline$` and `$$block$$`)
- **Syntax Highlighting**: 180+ programming languages supported via highlight.js
- **Enhanced Tables**: Multi-line cells, alignment, and complex table layouts
- **Task Lists**: Interactive checkboxes with `- [x] completed` and `- [ ] todo` syntax
- **Typography Enhancements**:
  - Subscript/Superscript: `H~2~O` and `x^2^`
  - Highlighting: `==highlighted text==`
  - Footnotes: `[^1]` with automatic linking
  - Abbreviations: Hover tooltips for defined terms
- **Code Features**: 
  - Inline code and fenced code blocks
  - Syntax highlighting with language detection
  - Code block attributes and classes

### **⚡ Developer-Grade Performance**

- **CodeMirror 6**: Professional text editor with advanced features
- **Intelligent Debouncing**: Smart auto-save timing to prevent excessive API calls
- **Error Recovery**: Robust error handling with retry mechanisms
- **Loading States**: Visual feedback for all operations with loading spinners
- **Memory Efficient**: Optimized rendering for large notes and folders

## Getting Started

### Quick Demo

1. **Clone and Install**:

   ```bash
   git clone https://github.com/GShreekar/Filo.git
   cd filo
   npm install
   ```

2. **Start the App**:

   ```bash
   npm run dev
   ```

3. **Try Demo Data**: Click the "Demo Data" button to see sample notes and folders

### Set Up Your Own

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. **Enable Firestore**: Turn on Firestore Database in your Firebase project
3. **Add Config**: Copy your Firebase config to `.env` file
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. **Start Writing**: Create your first folder and note!

### Requirements

- Node.js 18 or higher
- npm or yarn package manager
- A Firebase account (free tier works perfectly)

## Advanced Markdown Features

Filo supports extended markdown with powerful plugins and focuses on the universal Markdown format for exports:

### Export Capabilities

- **Individual Notes**: Export any note as a `.md` file with full formatting preserved
- **Folder Export**: Download entire folders as ZIP archives containing all notes as `.md` files
- **Workspace Export**: Export your complete workspace with folder hierarchy intact
- **Universal Compatibility**: Markdown files work in any text editor, documentation system, or markdown processor
- **No Lock-in**: Your data remains accessible in the most widely-supported text format

### Math & Science

- **KaTeX Math**: Write beautiful equations with `$inline$` or `$$block$$` syntax
- **Subscript/Superscript**: Use `H~2~O` for H₂O and `x^2^` for x²

### Enhanced Formatting

- **Highlight**: Mark important text with `==highlighted==`
- **Abbreviations**: Define `*[HTML]: HyperText Markup Language` for tooltips
- **Footnotes**: Add references with `[^1]` and `[^1]: footnote content`

### Lists & Tables

- **Task Lists**: Create checkboxes with `- [x] completed` and `- [ ] todo`
- **Definition Lists**: Structured definitions with term/description pairs
- **Advanced Tables**: Multi-line cells, alignment, and complex layouts

### Code & Syntax

- **Syntax Highlighting**: 180+ languages supported via highlight.js
- **Code Attributes**: Add classes and attributes to code blocks

## ⌨️ Keyboard Shortcuts

| Category | Action | Shortcut | Description |
|----------|--------|----------|-------------|
| **File Operations** | New note | `Ctrl+N` | Create a new note in current folder |
| | New folder | `Ctrl+Shift+N` | Create a new folder |
| | Save | `Ctrl+S` | Manually save current note |
| **Search & Navigation** | Search/Focus | `Ctrl+K` or `Ctrl+F` | Focus search input |
| | Toggle sidebar | `Ctrl+\` | Show/hide sidebar navigation |
| **Text Formatting** | Bold | `Ctrl+B` | Make selected text bold |
| | Italic | `Ctrl+I` | Make selected text italic |
| | Inline code | `Ctrl+E` | Wrap selection in backticks |
| | Code block | `Ctrl+Shift+E` | Create fenced code block |
| | Insert link | `Ctrl+L` | Insert markdown link |
| **Headings** | Heading 1-6 | `Ctrl+1` to `Ctrl+6` | Insert heading at cursor |
| **Lists** | Bullet list | `Ctrl+U` | Create unordered list |
| | Numbered list | `Ctrl+O` | Create ordered list |
| **View Modes** | Editor only | `Ctrl+Alt+1` | Show editor panel only |
| | Split view | `Ctrl+Alt+2` | Show editor and preview |
| | Preview only | `Ctrl+Alt+3` | Show preview panel only |

## 🏗️ Technical Architecture

### **Frontend Stack**

- **SvelteKit 2.43+**: Modern full-stack web framework with SSR and static generation
- **Svelte 5.0**: Reactive framework with new runes API and improved performance
- **TypeScript 5.0+**: Full type safety with comprehensive IDE support
- **Tailwind CSS 4.0**: Modern utility-first CSS framework with advanced features
- **CodeMirror 6**: Professional-grade text editor with extensible architecture
- **Vite 7.0+**: Lightning-fast build tool with hot module replacement

### **Backend & Cloud Services**

- **Firebase 12.3**: Complete backend-as-a-service platform
- **Firestore**: Real-time NoSQL database with offline support and multi-region sync
- **Firebase Functions**: Serverless functions for PDF generation and processing
- **Firebase Hosting**: Global CDN with automatic SSL and performance optimization
- **Auto-scaling**: Serverless architecture handles unlimited users without configuration

### **Markdown Processing Engine**

- **markdown-it**: Extensible markdown parser with comprehensive plugin ecosystem
- **KaTeX**: Fast math typesetting with LaTeX syntax support
- **highlight.js**: Syntax highlighting for 180+ programming languages
- **Advanced Plugins**:
  - Tables with multi-line cells and alignment
  - Task lists with interactive checkboxes
  - Footnotes with automatic back-linking
  - Definition lists for structured content
  - Abbreviations with hover tooltips
  - Subscript/superscript notation
  - Text highlighting and attributes
  - Code block enhancements

### **Export & File Processing**

- **JSZip**: Client-side ZIP archive creation for bulk exports
- **file-saver**: Cross-browser file download handling
- **PDF Generation**: Server-side PDF creation via Firebase Functions
- **Sanitization**: Filename sanitization for cross-platform compatibility

### **Development & Quality Assurance**

- **ESLint 9.22+**: Advanced linting with TypeScript and Svelte support
- **Prettier 3.4+**: Code formatting with Svelte and Tailwind plugins
- **TypeScript ESLint**: Comprehensive type checking and style enforcement
- **Hot Reload**: Instant development feedback with preserved state

### **Performance Features**

- **Real-time Synchronization**: Sub-second sync across devices with conflict resolution
- **Smart Auto-save**: Debounced saving that only triggers on actual content changes
- **Offline-first Architecture**: Full functionality without internet connection
- **Intelligent Caching**: Optimized data loading with Firebase offline persistence
- **Memory Management**: Efficient rendering for large documents and workspaces
- **Progressive Enhancement**: Works with JavaScript disabled for core functionality

## 🚀 Development

### **Prerequisites**

- **Node.js 18+**: Latest LTS version recommended
- **npm/yarn**: Package manager of your choice
- **Firebase Account**: Free tier provides generous limits for personal use
- **Modern Browser**: Chrome, Firefox, Safari, or Edge with ES2022 support

### **Build Commands**

```bash
# Development
npm run dev        # Start development server with hot reload
npm run check      # TypeScript and Svelte type checking
npm run check:watch # Continuous type checking

# Code Quality
npm run lint       # Run ESLint and Prettier checks
npm run format     # Format code with Prettier

# Production
npm run build      # Build for production (static site)
npm run preview    # Preview production build locally
```

### **Project Structure**

```
src/
├── lib/
│   ├── components/           # Reusable Svelte components
│   │   ├── MainEditor.svelte    # Main editing interface
│   │   ├── MarkdownEditor.svelte # CodeMirror integration
│   │   ├── MarkdownPreview.svelte # Rendered preview
│   │   ├── Sidebar.svelte       # Navigation sidebar
│   │   ├── TopBar.svelte        # Top navigation
│   │   ├── SearchResults.svelte # Search interface
│   │   └── ...modals and utilities
│   ├── auto-save.ts          # Intelligent auto-save system
│   ├── export-import-service.ts # File export/import logic
│   ├── firebase-service.ts   # Firebase/Firestore operations
│   ├── keyboard-shortcuts.ts # Keyboard shortcut handling
│   ├── markdown-renderer.ts  # Markdown processing engine
│   ├── pdf-service.ts        # PDF generation service
│   ├── search-service.ts     # Advanced search functionality
│   ├── stores.ts            # Svelte stores for state management
│   └── types.ts             # TypeScript type definitions
└── routes/
    ├── +layout.svelte       # App layout and global styles
    ├── +layout.ts          # Layout configuration
    └── +page.svelte        # Main application page

functions/                   # Firebase Functions
├── src/index.ts            # PDF generation endpoint
└── package.json           # Function dependencies

static/                     # Static assets
└── robots.txt             # SEO configuration
```

### **Deployment Options**

#### Firebase Hosting (Recommended)

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Project** (already configured):
   ```bash
   firebase init hosting
   ```

3. **Deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

#### Alternative Platforms

- **Vercel**: `npm run build` → Deploy `build/` directory
- **Netlify**: `npm run build` → Deploy `build/` directory  
- **GitHub Pages**: Configure GitHub Actions for automatic deployment
- **Self-hosted**: Serve `build/` directory with any static file server

### **Environment Configuration**

Create `.env` file for Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: Firebase Functions (for PDF generation)
VITE_FIREBASE_FUNCTIONS_URL=https://region-project.cloudfunctions.net
```

## 🛣️ Roadmap & Future Enhancements

### **Version 2.0 - Enhanced User Experience**

- **User Authentication**: Sign-in system with personal workspaces
- **Cloud Backup**: Automatic backup to Google Drive, Dropbox, or OneDrive
- **Rich Text Editor**: WYSIWYG editing mode alongside markdown
- **Note Templates**: Pre-defined templates for meetings, projects, daily notes
- **Tags System**: Tag-based organization with filtering and search
- **Note Linking**: Internal linking between notes with backlinks

### **Version 2.1 - Collaboration Features**

- **Real-time Collaboration**: Multi-user editing with operational transforms
- **Sharing & Permissions**: Share notes/folders with view or edit permissions
- **Comments & Annotations**: Inline comments and collaborative feedback
- **Version History**: Track changes with diff view and restore points
- **Team Workspaces**: Shared spaces for teams and organizations

### **Version 3.0 - Advanced Features**

- **Mobile Applications**: Native iOS and Android apps with offline sync
- **Plugin System**: Extensible architecture for custom functionality
- **Advanced Search**: Semantic search, date filters, and saved searches
- **AI Integration**: Smart suggestions, content generation, and summaries
- **Enhanced Export**: Additional formats (DOCX, EPUB, HTML) with styling
- **Data Visualization**: Charts, diagrams, and embedded media support

### **Performance & Infrastructure**

- **Edge Computing**: Deploy to edge locations for reduced latency
- **Advanced Caching**: Intelligent caching strategies for faster loading
- **Bulk Operations**: Enhanced performance for large workspaces
- **Search Indexing**: Full-text search with fuzzy matching and typo tolerance
- **Conflict Resolution**: Advanced merge strategies for simultaneous edits

## License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

We welcome contributions from developers, designers, and users! Here's how you can help make Filo better:

### **Getting Started**

1. **Fork the Repository**: Click the "Fork" button on GitHub
2. **Clone Your Fork**: 
   ```bash
   git clone https://github.com/your-username/Filo.git
   cd filo
   npm install
   ```
3. **Create a Branch**: 
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make Changes**: Implement your feature or bug fix
5. **Test Your Changes**: 
   ```bash
   npm run check
   npm run lint
   npm run build
   ```
6. **Submit Pull Request**: Create a PR with clear description of changes

### **Areas for Contribution**

- **🐛 Bug Fixes**: Fix issues and improve stability
- **✨ Features**: Implement items from the roadmap
- **📚 Documentation**: Improve README, code comments, and guides
- **🎨 UI/UX**: Enhance design and user experience
- **🔧 Performance**: Optimize loading times and memory usage
- **🧪 Testing**: Add unit tests and integration tests
- **🌐 Accessibility**: Improve screen reader and keyboard navigation support

### **Code Style Guidelines**

- Follow existing TypeScript and Svelte conventions
- Use Prettier for code formatting (`npm run format`)
- Ensure all ESLint rules pass (`npm run lint`)
- Add TypeScript types for all new code
- Write clear, descriptive commit messages

### **Reporting Issues**

Found a bug or have a feature request? [Open an issue](https://github.com/GShreekar/Filo/issues) with:

- **Bug Reports**: Steps to reproduce, expected vs actual behavior, screenshots
- **Feature Requests**: Use case, proposed solution, potential alternatives
- **Questions**: Use GitHub Discussions for general questions and ideas

## 🙏 Acknowledgments

Filo is built with incredible open-source technologies and tools:

### **Core Framework & Build Tools**
- [SvelteKit](https://kit.svelte.dev/) - Full-stack web framework with outstanding developer experience
- [Svelte 5](https://svelte.dev/) - Reactive component framework with revolutionary runes API
- [Vite](https://vitejs.dev/) - Lightning-fast build tool and development server
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript with excellent tooling

### **Backend & Infrastructure**
- [Firebase](https://firebase.google.com/) - Complete backend platform with real-time database
- [Firestore](https://firebase.google.com/products/firestore) - NoSQL database with offline support

### **User Interface & Styling**
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for rapid development
- [Lucide](https://lucide.dev/) - Beautiful, customizable icon library
- [CodeMirror 6](https://codemirror.net/) - Advanced text editor with extensible architecture

### **Markdown Processing & Rendering**
- [markdown-it](https://github.com/markdown-it/markdown-it) - Configurable markdown parser with rich plugin ecosystem
- [KaTeX](https://katex.org/) - Fast math typesetting library for beautiful equations
- [highlight.js](https://highlightjs.org/) - Syntax highlighting for 180+ programming languages

### **File Processing & Export**
- [JSZip](https://stuk.github.io/jszip/) - JavaScript library for creating and reading ZIP files
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - Cross-browser file saving functionality

### **Development & Quality Tools**
- [ESLint](https://eslint.org/) - Pluggable JavaScript linting utility
- [Prettier](https://prettier.io/) - Opinionated code formatter for consistent style
- [@sveltejs/adapter-static](https://github.com/sveltejs/kit/tree/master/packages/adapter-static) - Static site generation for SvelteKit

### **Special Thanks**

- The Svelte team for creating an amazing framework that makes development joyful
- The Firebase team for providing robust, scalable backend services
- All contributors to the open-source markdown ecosystem
- The developer community for inspiration, feedback, and contributions

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

**Copyright (c) 2024 GShreekar**

*Made with ❤️ for writers, thinkers, and note-takers everywhere.*
