# 🎤 Karaoke Composer

A modern Vue 3 application for creating amazing karaoke experiences! Built with TypeScript, Vue Router, and Bootstrap 5.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
npm instal## 📝 Next Steps

1. **Install dependencies** with `npm install`
2. **Start the dev server** with `npm run dev`
3. **Run the test suite** with `npm test` to see musical timing in action
4. **Begin building your karaoke features!**

### Available Advanced Features:

- ✅ **Audio playback integration** - Implemented with timing controls
- ✅ **Lyrics synchronization** - Real-time syllable-level highlighting
- ✅ **Musical timing intelligence** - Beat-aware distribution with rest detection
- ✅ **Advanced timing workflow** - Spacebar timing + musical enhancement

### Suggested Features to Add:

- User scoring system
- Playlist management
- Social sharing features
- Audio effects and pitch control
- Recording and playback of performancestart development server:**

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
| `npm run debug`         | Run TypeScript debug scripts with tsx    |
| `npm run debug:218ms`   | Debug the 218ms syllable timing issue    |
| `npm run debug:multiple-words` | Debug multiple word timing behavior |
| `npm run debug:syllables` | Debug syllable detection in unfinalized words |
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

### Core Karaoke Features
- 🎤 **Interactive Karaoke Interface** - User-friendly karaoke experience
- 🎵 **Song Library** - Browse and search through songs
- ⭐ **Favorites Management** - Save your favorite songs
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Clean, attractive interface with Bootstrap
- ⚡ **Fast Performance** - Built with Vite for optimal speed

### Advanced Timing Features
- ⏱️ **Real-time Word Timing** - Spacebar-driven word timing workflow
- 🎼 **Musical Intelligence** - Beat-aware syllable distribution with rest detection
- 🎯 **Accurate Highlighting** - Precise syllable-level karaoke highlighting
- 🎵 **Musical Patterns** - Uses 8th notes, quarter notes, half notes (not arbitrary spacing)
- 🧠 **BPM Learning** - Adapts to song patterns for better timing estimates
- 🔄 **Reset & Refine** - Easy syllable timing reset and reapplication

### Technical Highlights
- **ES Module Architecture** - Modern JavaScript module system
- **TypeScript Integration** - Full type safety across the codebase
- **Comprehensive Testing** - Jest test suite with musical timing validation
- **Vue 3 Composition API** - Reactive, performant component architecture

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

### Test Suite Overview

This project includes a comprehensive test suite covering:

- **🎵 Musical Timing Engine** - Beat-aware syllable distribution with rest detection
- **⏱️ Karaoke Timing Engine** - Accurate syllable highlighting and word progression
- **🔧 Integration Tests** - End-to-end timing functionality
- **📊 Edge Case Coverage** - Multiple words, syllable detection, and timing accuracy

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test patterns
npm test -- --testPathPattern=musicalTiming
npm test -- --testPathPattern=karaokeEngine

# Run e2e tests
npm run test:e2e
```

### Test Categories

#### Musical Timing Tests (`musicalTimingDemo.test.ts`)
Tests the beat-aware timing system that addresses "space-filling" issues:

- ✅ **Rest Detection** - Identifies natural pauses from punctuation and timing gaps
- ✅ **Beat Patterns** - Uses 8th notes, quarter notes, half notes instead of arbitrary divisions
- ✅ **BPM Learning** - Adapts to user timing patterns for better estimates
- ✅ **Space Management** - Reserves time for musical breathing/phrasing

#### Core Engine Tests (`karaokeTimingEngine.test.ts`)
Tests the fundamental timing engine:

- ✅ **Syllable Detection** - Accurate word-to-syllable breakdown
- ✅ **Current Position** - Real-time highlighting during playback
- ✅ **Word Progression** - Smooth transitions between words
- ✅ **Integration** - Vue component integration

#### Specialized Tests
- `goldHighlightingStability.test.ts` - UI highlighting accuracy

## 🔧 Debug Scripts

For visual debugging and analysis, this project includes dedicated debug scripts that provide detailed console output. These are **separate from tests** to keep test output clean while providing rich debugging information.

### Available Debug Scripts

```bash
# Debug the 218ms syllable timing boundary issue
npm run debug:218ms

# Debug multiple word timing behavior
npm run debug:multiple-words

# Debug syllable detection in current (unfinalized) words
npm run debug:syllables

# Run any debug script directly with tsx
npm run debug src/debug/your-debug-file.ts
```

### Debug Output Example

```
🔧 DEBUG: Testing the 218ms boundary issue
[     0ms] WORD_ASSIGNED        L: 0 W: 0 S:-1 Happy
[     0ms] SYLLABLE_TIMED       L:-1 W:-1 S: 0 Hap (207.4ms)
[   207ms] SYLLABLE_TIMED       L:-1 W:-1 S: 1 py (592.6ms)

🔧 DEBUG: Happy syllable timing:
  0: "Hap" -> 0ms to 207.4074074074074ms
  1: "py" -> 207.4074074074074ms to 800ms

🔧 DEBUG: Position tests:
  218ms: L0W0S1 (active: true)

🔧 DEBUG: Focus on 218ms:
218ms position: L0W0S1 (expected: L0W0S1)
Is this correct? YES
```

### Creating New Debug Scripts

Debug scripts are located in `src/debug/` and can be simple TypeScript files with console output. They're perfect for:

- **Timing Analysis** - Detailed syllable timing investigations
- **Edge Case Testing** - Specific scenarios that need visual verification
- **Development Debugging** - Quick iteration on timing logic
- **Performance Analysis** - Timing engine behavior analysis

### Test Configuration

The project uses **Jest** with ES Module support and TypeScript:

```javascript
// jest.config.js highlights
{
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  extensionsToTreatAsEsm: [".ts"]
}
```

### Coverage Reports

Generate detailed coverage reports to see test coverage across the codebase:

```bash
npm run test:coverage
```

Reports are generated in the `coverage/` directory with:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## 📖 Development Guidelines

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

## 📝 Next Steps

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
