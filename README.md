# Filo - Modern Note-Taking Application

A clean, fast, and intelligent note-taking application built with SvelteKit and Firebase. Features real-time sync, markdown support, and automatic saving to keep your thoughts organized and accessible across all devices.

## What You Can Do

### **Write and Organize**

- **Smart Auto-Save**: Your notes are saved automatically as you type - never lose your work
- **Folders**: Organize your notes into folders for better structure
- **Quick Switching**: Jump between notes instantly while your changes save in the background
- **Advanced Markdown**: Full markdown with math equations (KaTeX), syntax highlighting, tables, footnotes, and task lists

### **Find Anything Fast**

- **Instant Search**: Find any note by typing part of its title or content
- **Smart Results**: Recent notes appear first, with highlighted search terms
- **Search Operators**: Use `folder:name` to search specific folders or `title:text` for titles only

### **Export and Share**

- **Markdown Export**: Export individual notes as `.md` files
- **Folder Export**: Download all notes in a folder as a ZIP archive with folder structure preserved
- **Workspace Export**: Export your entire workspace as a ZIP with complete folder hierarchy
- **Universal Format**: Markdown files work in any text editor or markdown processor

### **Comfortable Writing**

- **Multiple Views**: Switch between editor-only, preview-only, or split view
- **Dark/Light Theme**: Automatic theme detection or manual toggle
- **Mobile Friendly**: Works perfectly on desktop, tablet, and mobile devices
- **Keyboard Shortcuts**: Navigate faster with shortcuts like `Ctrl+1` for editor mode

### **Reliable and Secure**

- **Auto-Sync**: All notes sync instantly across your devices
- **Offline Ready**: Keep working even without internet connection
- **No Data Loss**: Built-in backup ensures your notes are always safe

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

## Keyboard Shortcuts

| Action           | Shortcut       |
| ---------------- | -------------- |
| New note         | `Ctrl+N`       |
| New folder       | `Ctrl+Shift+N` |
| Search notes     | `Ctrl+K`       |
| Bold text        | `Ctrl+B`       |
| Italic text      | `Ctrl+I`       |
| Insert link      | `Ctrl+K`       |
| Editor mode      | `Ctrl+1`       |
| Split view       | `Ctrl+2`       |
| Preview mode     | `Ctrl+3`       |
| Toggle dark mode | `Ctrl+D`       |

## Technical Architecture

### Frontend

- **SvelteKit 2.0**: Modern web framework with SSR and static generation
- **Svelte 5.0**: Reactive framework with runes and improved performance
- **TypeScript**: Type-safe development with full IDE support
- **Tailwind CSS 4.0**: Modern utility-first CSS framework
- **CodeMirror 6**: Advanced text editor with markdown syntax highlighting

### Backend & Infrastructure

- **Firebase 12.3**: Complete backend-as-a-service platform
- **Firestore**: Real-time NoSQL database with offline support
- **Firebase Hosting**: Fast, secure web hosting with global CDN
- **Auto-scaling**: Handles unlimited notes and users without configuration

### Key Features

- **Real-time sync**: Changes appear instantly across all your devices
- **Smart auto-save**: Intelligent saving that only triggers on actual changes
- **Advanced markdown**: Full markdown support with KaTeX math, syntax highlighting, and tables
- **Full-text search**: Lightning-fast search across all notes and folders
- **Markdown export**: Export notes, folders, or entire workspace as universal `.md` files
- **Responsive design**: Perfect experience on desktop, tablet, and mobile
- **Offline-first**: Continue working without internet, sync when reconnected

## Development

### Build Commands

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production (static site)
npm run preview    # Preview production build locally
npm run check      # Type check with svelte-check
npm run lint       # Run ESLint and Prettier checks
npm run format     # Format code with Prettier
```

### Deployment

#### Firebase Hosting Setup

1. **Install Firebase CLI** (if not already installed):

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:

   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting** (already configured in this project):

   ```bash
   firebase init hosting
   ```

4. **Deploy to Firebase Hosting**:

   ```bash
   # Build the app first
   npm run build

   # Deploy to Firebase
   firebase deploy --only hosting
   ```

#### Hosting Configuration

- **Static Adapter**: Uses `@sveltejs/adapter-static` for pre-rendered static site
- **Build Output**: `build/` directory contains all static assets
- **SPA Routing**: All routes fallback to `index.html` for client-side navigation
- **Firebase CLI**: Simple deployment without CI/CD complexity

Your app will be available at: `https://your-project-id.web.app`

## Future Enhancements

### Coming Soon

- **User Accounts**: Sign in to access your notes from anywhere
- **Sharing**: Share notes and folders with others
- **Rich Text Editor**: Bold, italic, and formatting buttons
- **Export Options**: Download notes and folders as Markdown files
- **Mobile Apps**: Native iOS and Android apps

### Advanced Features

- **Team Collaboration**: Real-time collaborative editing
- **Plugin System**: Add custom features and integrations
- **Advanced Search**: Search by date, tags, and more filters
- **Backup Options**: Export to Google Drive, Dropbox, etc.
- **Themes**: More color schemes and customization options

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

We welcome contributions! Here's how to help:

1. **Fork** the repository on GitHub
2. **Create** a new branch for your feature
3. **Make** your changes and test them
4. **Submit** a pull request with a clear description

Found a bug or have a feature request? [Open an issue](https://github.com/GShreekar/Filo/issues) and let us know!

## Acknowledgments

Built with amazing open-source tools:

- [SvelteKit](https://kit.svelte.dev/) - Full-stack web framework
- [Svelte 5](https://svelte.dev/) - Reactive component framework
- [Firebase](https://firebase.google.com/) - Backend services and hosting
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [CodeMirror](https://codemirror.net/) - Advanced text editor
- [Markdown-it](https://github.com/markdown-it/markdown-it) - Markdown parser with plugins
- [KaTeX](https://katex.org/) - Math typesetting
- [Lucide](https://lucide.dev/) - Beautiful icon library

---

_Made with ❤️ for writers, thinkers, and note-takers everywhere._
