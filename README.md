# Filo - Modern Note-Taking Application

A clean, fast, and smart note-taking app that automatically saves your work as you write. Perfect for organizing thoughts, drafting documents, and keeping all your notes in one place.

## What You Can Do

### **Write and Organize**
- **Smart Auto-Save**: Your notes are saved automatically as you type - never lose your work
- **Folders**: Organize your notes into folders for better structure
- **Quick Switching**: Jump between notes instantly while your changes save in the background
- **Markdown Support**: Write with full Markdown formatting and see live preview

### **Find Anything Fast**
- **Instant Search**: Find any note by typing part of its title or content
- **Smart Results**: Recent notes appear first, with highlighted search terms
- **Search Operators**: Use `folder:name` to search specific folders or `title:text` for titles only

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
   git clone <repository-url>
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
- A Firebase account (free tier works perfectly)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New note | `Ctrl+N` |
| New folder | `Ctrl+Shift+N` |
| Search notes | `Ctrl+K` |
| Bold text | `Ctrl+B` |
| Italic text | `Ctrl+I` |
| Insert link | `Ctrl+K` |
| Editor mode | `Ctrl+1` |
| Split view | `Ctrl+2` |
| Preview mode | `Ctrl+3` |
| Toggle dark mode | `Ctrl+D` |

## Technical Architecture

### Frontend
- **SvelteKit**: Modern web framework for fast, reactive apps
- **TypeScript**: Type-safe JavaScript for better development
- **Tailwind CSS**: Utility-first styling for clean, responsive design
- **CodeMirror**: Advanced text editor with syntax highlighting

### Backend
- **Firebase Firestore**: Cloud database that syncs in real-time
- **Auto-scaling**: Handles any number of notes without setup
- **Offline Support**: Works without internet, syncs when reconnected

### Key Features
- **Real-time sync**: Changes appear instantly across all your devices
- **Smart auto-save**: Saves only when you make changes, won't interrupt your writing
- **Full-text search**: Find notes by any word in title or content
- **Responsive design**: Adapts perfectly to any screen size

## Development

### Build Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code quality
```

## Future Enhancements

### Coming Soon
- **User Accounts**: Sign in to access your notes from anywhere
- **Sharing**: Share notes and folders with others
- **Rich Text Editor**: Bold, italic, and formatting buttons
- **Export Options**: Download notes as PDF, Word, or plain text
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

Found a bug or have a feature request? [Open an issue](https://github.com/your-repo/filo/issues) and let us know!

## Acknowledgments

Built with amazing open-source tools:
- [SvelteKit](https://kit.svelte.dev/) - The web framework
- [Firebase](https://firebase.google.com/) - Database and hosting
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [CodeMirror](https://codemirror.net/) - Text editor

---

*Made with ❤️ for writers, thinkers, and note-takers everywhere.*
