# CD+Graphics Magic - UML Diagrams

This directory contains PlantUML diagrams extracted from the CD+Graphics Magic C++ codebase.

## 📋 Diagram Overview

### 1. **Core Architecture** (`01-Core-Architecture.puml`)
High-level system overview showing the main components and their relationships:
- **Application Layer**: Entry point and main application
- **UI/Window Layer**: Main window, preview window, editing group
- **Graphics Processing**: Encoder and decoder components
- **Media Layer**: Clips, events, and track options
- **Audio Layer**: Playback and synchronization
- **Graphics Objects**: Font blocks, BMP objects, palette objects

### 2. **Graphics Pipeline** (`02-Graphics-Pipeline.puml`)
Detailed graphics processing flow:
- **Encoding Pipeline**: How graphics are encoded to CD+G packets
- **Decoding Pipeline**: How packets are decoded to RGBA output
- **Font Block System**: Font management and rendering
- **BMP Processing**: Bitmap handling and palette management
- **CD_SCPacket Structure**: 24-byte packet format

### 3. **Media Objects** (`03-Media-Objects.puml`)
Complete media object hierarchy:
- **Base Classes**: BMPObject, PALObject, MediaClip
- **Specialized Clips**: TextClip, ScrollClip, BMPClip, PALGlobalClip
- **Events**: MediaEvent structures and queues
- **Editing**: Editing groups, lanes, and playback heads
- **UI Windows**: Editor windows for each media type

### 4. **CD+G Packets** (`04-CDG-Packets.puml`)
Packet format and command specifications:
- **Packet Structure**: CD_SCPacket 24-byte format
- **Encoder Commands**: TV Graphics, Font, Scroll, CLUT operations
- **Decoder Commands**: Same as encoder + Extended Graphics
- **Screen Specs**: VRAM dimensions, CLUT sizes, RGBA options
- **Supporting Structures**: Font queues, event queues

### 5. **UI Windows** (`05-UI-Windows.puml`)
FLTK-based user interface hierarchy:
- **Main Windows**: Application, Main, Preview
- **Menu System**: Menu bar and menu items
- **Editing UI**: Editing group, lanes, playback head
- **Clip Windows**: Specialized windows for each clip type
- **Components**: Time output, movable boxes

## 🚀 Generating PNG Diagrams

### Option 1: Online PlantUML Editor (Easiest)
1. Visit https://www.plantuml.com/plantuml/uml/
2. Copy content from any `.puml` file
3. Paste into the editor
4. Diagrams render instantly in the browser
5. Download as PNG using the download button

### Option 2: Install PlantUML Locally

#### Ubuntu/Debian:
```bash
sudo apt-get install plantuml
```

#### macOS (Homebrew):
```bash
brew install plantuml
```

#### Windows (Chocolatey):
```bash
choco install plantuml
```

#### Or use Docker:
```bash
docker run -v /path/to/uml:/diagrams plantuml plantuml /diagrams/*.puml
```

### Option 3: Using VS Code PlantUML Extension
1. Install "PlantUML" extension by jbenden in VS Code
2. Open any `.puml` file
3. Right-click → "PlantUML: Export Current Diagram"
4. Choose PNG format

### Option 4: Manual Generation (after installing plantuml)
```bash
cd uml/CD+G-Magic
./generate-diagrams.sh
# or manually:
plantuml 01-Core-Architecture.puml -o ./
plantuml 02-Graphics-Pipeline.puml -o ./
plantuml 03-Media-Objects.puml -o ./
plantuml 04-CDG-Packets.puml -o ./
plantuml 05-UI-Windows.puml -o ./
```

## 📊 Key Relationships

### Object Composition
- `CDGMagic_Application` creates and manages `CDGMagic_MainWindow` and `CDGMagic_PreviewWindow`
- `CDGMagic_MainWindow` contains `CDGMagic_EditingGroup`
- `CDGMagic_EditingGroup` manages `CDGMagic_EditingLanes`
- `CDGMagic_MediaClip` contains queue of `CDGMagic_MediaEvent`
- `CDGMagic_MediaEvent` references `CDGMagic_BMPObject` and `CDGMagic_PALObject`

### Data Flow
1. **Encoding Path**: MediaClip → GraphicsEncoder → FontBlock → CD_SCPacket → CDG stream
2. **Decoding Path**: CD_SCPacket → GraphicsDecoder → RGBA Screen
3. **Audio Sync**: AudioPlayback triggers timing events for MediaClip synchronization
4. **UI Editing**: EditingLanes display MediaClips with PlaybackHead for timeline positioning

### Graphics Processing
- **BMP to Fonts**: CDGMagic_BMPObject is converted to CDGMagic_FontBlock instances
- **XOR Operations**: Font blocks can be XOR'd with existing VRAM
- **Palette Management**: CDGMagic_PALObject controls color lookup tables (CLUT)
- **Transitions**: Bitmap transition blocks for animated effects

## 🔍 Class Details

### Core Processing Classes

**CDGMagic_GraphicsEncoder**
- Converts media clips to CD+G packets
- Manages VRAM, composition buffers, palettes
- Generates font blocks and packet stream
- Command types: TV Graphics, Font operations, Scroll, Memory/Border preset

**CDGMagic_GraphicsDecoder**
- Decodes CD+G packets to RGBA output
- Processes commands: CLUT loads, font copy/XOR, scroll, transparency
- Supports both TV Graphics and Extended Graphics modes
- Manages screen dirty flags and channel masking

**CDGMagic_FontBlock**
- 12×6 pixel graphics elements
- Supports color indexing and transparency
- Tracks z-ordering and channel assignment
- Can be marked as VRAM-only or XOR-only

**CDGMagic_BMPObject**
- Bitmap with palette and positioning
- Supports transitions and resize operations
- Can be XOR'd for overlay effects
- Base class for specialized clip types

**CDGMagic_AudioPlayback**
- PortAudio-based audio playback
- Supports WAVE file loading
- Frame-by-frame playback control
- Generates waveform display bitmap

## 📐 Technical Specifications

### Screen Resolution
- **VRAM**: 300×216 pixels (raw CD+G)
- **RGBA Output**: 312×216 pixels (rendered)
- **Indexed**: 312×216 pixels (palette-indexed)

### Color Systems
- **TV Graphics**: 16-color (4-bit) palette
- **Extended Graphics**: 256-color (8-bit) palette
- **RGBA Orders**: RGBA, BGRA, ARGB support

### Timing
- **Audio Sample Rate**: 44,100 Hz
- **Audio Buffer**: 1,176 frames per buffer
- **CD+G Resolution**: ~74 minutes per CD (at 1×75 CD frames/second)

## 🔗 Dependencies

### External Libraries
- **FLTK 1.3.0rc2**: GUI framework
- **PortAudio v19**: Audio playback
- **Standard C++ Libraries**: STL containers (vector, deque, algorithm)

### Media Formats
- **Input**: BMP files, WAVE audio
- **Output**: CDG (CD+Graphics) packets, PNG (for preview)

## 📝 Notes

- Diagrams are automatically extracted from actual C++ header files in `reference/cd+g-magic/CDG_Magic/Source/`
- Methods shown are public/protected members only
- Private utility functions are omitted for clarity
- Pointer types simplified to type names for PlantUML compatibility
- FLTK widget inheritance simplified for better visualization
- All 40+ CD+G commands are documented in the packet diagrams

## 🎯 Next Steps

1. Generate PNG diagrams using one of the methods above
2. Use diagrams for code review and documentation
3. Share diagrams with team members for architecture discussions
4. Update diagrams when making major structural changes to the codebase
5. Reference specific diagrams in commit messages and PRs

