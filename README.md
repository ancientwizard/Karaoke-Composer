# 🎤 Karaoke Composer

A modern Vue 3 application for creating amazing karaoke experiences! Built with TypeScript, Vue Router, and Bootstrap 5.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Start development server:**

```bash
npm run dev
```

3. **Open your browser:**
   Visit `http://localhost:3000` to see your karaoke app!

## 📦 Available Scripts

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development server with hot reload |
| `npm run build`         | Build for production                     |
| `npm run preview`       | Preview production build locally         |
| `npm run test`          | Run unit tests with Jest                 |
| `npm run test:watch`    | Run tests in watch mode                  |
| `npm run test:coverage` | Run tests with coverage report           |
| `npm run test:e2e`      | Open Cypress for e2e testing             |
| `npm run lint`          | Lint and fix code with ESLint            |
| `npm run type-check`    | Check TypeScript types                   |

## 🛠️ Technology Stack

### Frontend

- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe JavaScript development
- **Vue Router 4** - Official router for Vue 3
- **Bootstrap 5** - Modern CSS framework for responsive design
- **Vite** - Fast build tool and development server

### Development & Testing

- **ESLint** - Code linting and formatting
- **Jest** - Unit testing framework
- **Vue Test Utils** - Vue component testing utilities
- **Cypress** - End-to-end testing
- **TypeScript** - Static type checking

## 📁 Project Structure

```
src/
├── components/     # Reusable Vue components
├── views/         # Page-level components
├── router/        # Vue Router configuration
├── stores/        # State management (Pinia/Vuex)
├── assets/        # Static assets (images, styles)
├── App.vue        # Root component
└── main.ts        # Application entry point
```

## 🎵 Features

- 🎤 **Interactive Karaoke Interface** - User-friendly karaoke experience
- 🎵 **Song Library** - Browse and search through songs
- ⭐ **Favorites Management** - Save your favorite songs
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Clean, attractive interface with Bootstrap
- ⚡ **Fast Performance** - Built with Vite for optimal speed

## 🔧 Development

### Key Dependencies

**Production:**

- `vue` - Vue 3 framework
- `vue-router` - Routing solution
- `bootstrap` - CSS framework

**Development:**

- `@vitejs/plugin-vue` - Vite Vue 3 plugin
- `@vue/vue3-jest` - Jest testing for Vue 3
- `typescript` - TypeScript support
- `eslint` - Code linting

### Configuration Files

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest testing configuration
- `.eslintrc.cjs` - ESLint configuration

## 🚀 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production build will be output to the `dist/` directory.

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## � Development Guidelines

### Code Formatting & Style

This project uses **Prettier** and **ESLint** to maintain consistent code formatting across the codebase.

#### Formatting Commands

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check

# Lint and auto-fix code issues
npm run lint
```

#### Code Style Preferences

**Brace Style:** Opening braces on new lines (Allman/BSD style)

```javascript
// ✅ Preferred
if (condition) {
  doSomething()
}

const config = {
  prop: 'value',
  another: 'data',
}
```

**Comment Alignment:** For aligned trailing comments, use `// prettier-ignore`:

```javascript
// prettier-ignore
const varA = 'something'; // description of A
const varB = 'more-of-something' // description of B
```

#### Automatic Formatting

- **VS Code**: Format on save enabled (see `.vscode/settings.json`)
- **Trailing whitespace**: Automatically removed on save
- **Final newlines**: Automatically inserted
- **ESLint**: Auto-fixes issues on save

#### Configuration Files

- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to skip formatting
- `.eslintrc.cjs` - ESLint rules including brace style
- `.vscode/settings.json` - VS Code editor settings

### Git Best Practices

- **Clean commits**: Formatting is handled automatically, no more trailing space issues
- **Consistent style**: ESLint enforces project-wide code consistency
- **Pre-commit**: Consider running `npm run lint` before committing

## �📝 Next Steps

1. **Install dependencies** with `npm install`
2. **Start the dev server** with `npm run dev`
3. **Begin building your karaoke features!**

### Suggested Features to Add:

- Audio playback integration
- Lyrics synchronization
- User scoring system
- Playlist management
- Social sharing features

---

Happy coding! 🎤✨
Compose Karaoke Content
