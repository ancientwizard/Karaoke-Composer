# CMP Parser Architecture: Pure Read/Write with Optional Path Normalization

## Problem Solved

The original implementation modified paths during parsing (`read`), which violated round-trip fidelity:
- Read .cmp → modify paths → serialize → result ≠ original

## Solution: Facade Pattern for Path Normalization

### Design Principles

1. **Pure CMPParser** - No side effects, faithful to binary format
   - `parse()` reads raw binary data exactly as stored
   - `serialize()` writes the exact same binary structure back out
   - Result: `read → serialize → new file matches original perfectly`

2. **Optional Path Normalization** - Via `PathNormalizationFacade`
   - Transform paths AFTER parsing, not during
   - Can be enabled for UI/display or disabled for save operations
   - Zero impact on binary fidelity

### Usage Patterns

#### Pattern 1: Load and Display (with normalized paths)
```typescript
// User loads a .cmp file
const parser = new CMPParser(buffer);
const rawProject = parser.parse();

// For UI display, apply normalization
const facade = new PathNormalizationFacade({
  normalizeSlashes: true,        // \ → /
  replaceSampleFiles: true,      // Sample_Files → cdg-projects
});
const displayProject = facade.normalize(rawProject);

// Use displayProject for UI rendering
```

#### Pattern 2: Save/Export (no path normalization)
```typescript
// Get raw project (no normalization)
const rawProject = projectLoader.getRawProject(project);

// Serialize exactly as it was read
const parser = new CMPParser(new Uint8Array());
const binary = parser.serialize(rawProject);

// Write to file - result matches original perfectly
```

### Components

#### CMPParser (Pure)
- `parse()`: Read binary → CMPProject (raw, unchanged paths)
- `serialize()`: CMPProject → binary (faithful to original format)
- Supports: BMPClip, TextClip, ScrollClip, PALGlobalClip
- Big-endian integers (matching C++ implementation)
- Null-terminated strings (matching C++ implementation)

#### PathNormalizationFacade (Optional)
- `normalize()`: Transform paths in a project
- Options:
  - `normalizeSlashes`: Convert `\` to `/`
  - `replaceSampleFiles`: Convert `Sample_Files/` to `cdg-projects/`
- Non-mutating: Creates new objects, preserves originals

#### ProjectLoader (Integration)
- `getRawProject()`: Raw CMPProject without normalization
- `getNormalizedProject()`: Normalized for UI display
- `extractFileReferences()`: Lists files from raw project

## Benefits

✅ **Round-trip Fidelity**: read(file) → serialize() → write(file) ≡ original  
✅ **Optional Transforms**: Path normalization is opt-in, not baked in  
✅ **Pure Functions**: Parser has no side effects  
✅ **Testable**: Can verify serialization matches original binary  
✅ **Future-Proof**: Easy to add more facades (validation, compression, etc.)

## Testing

```typescript
// Test round-trip fidelity
const originalBinary = readFile('sample_project_04.cmp');
const parser = new CMPParser(originalBinary);
const project = parser.parse();

// NO normalization - just read and write back
const serialized = parser.serialize(project);

// Verify binary matches
assert(serialized.length === originalBinary.length);
assert(arraysEqual(serialized, originalBinary));
```

## Future Enhancements

- Add validation facade: Check file references exist, validate timing
- Add transformation facade: Remap clips, adjust timing
- Add export adapters: Save as different formats (JSON, XML)
- Each facade applies transformations without modifying parser core
