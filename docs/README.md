# Documentation Guide

This folder contains essential reference materials for the CD+G Magic TypeScript implementation.

---

## 📍 Quick Navigation

### **Core Reference** (Start Here)
- **[REFERENCE.md](REFERENCE.md)** - Core concepts and implementation reference
  - Timing model (packets vs milliseconds)
  - File format concepts
  - Implementation highlights
  - Highly organized, ~400 lines

### **C++ Analysis** (Understand the Original)
- **[CPP-IMPLEMENTATION-ANALYSIS.md](CPP-IMPLEMENTATION-ANALYSIS.md)** - Complete C++ source analysis
  - BMP to CD+G conversion pipeline
  - FontBlock processing and VRAM comparison
  - Packet creation algorithms (1/2/3/4+ color encoding)
  - Global commands and file writing
  - ~800 lines of detailed technical reference
  
- **[RESEARCH-SUMMARY.md](RESEARCH-SUMMARY.md)** - High-level research findings
  - Algorithm overview
  - Key discoveries from source analysis
  - File statistics

### **Binary Format** (Implementation Reference)
- **[CDG-reference.md](CDG-reference.md)** - CD+G packet format specification
  - Complete packet structure
  - All instruction codes
  - Palette and color handling
  
- **[PACKET-BINARY-FORMAT.md](PACKET-BINARY-FORMAT.md)** - Quick reference
  - 24-byte packet structure diagrams
  - Binary layout and encoding
  - Common patterns and examples

### **Text Rendering** (Specialized)
- **[TEXT-RENDERING-SUMMARY.md](TEXT-RENDERING-SUMMARY.md)** - Executive summary
  - How palette colors are used
  - Pixel-to-FontBlock mapping
  - Common pitfalls
  - **Navigation to detailed text rendering docs**

- **[TEXT-RENDERING-ANALYSIS.md](TEXT-RENDERING-ANALYSIS.md)** - Deep technical analysis
  - Text rendering to pixels (FLTK details)
  - Color determination algorithms
  - BMP to FontBlock conversion
  - CD+G packet encoding (all color cases)
  - Transparency and alpha handling

- **[TEXT-RENDERING-EVOLUTION.md](TEXT-RENDERING-EVOLUTION.md)** - Historical development
  - How text rendering was discovered and refined
  - Solutions to technical challenges
  - Implementation iterations

- **[TEXT-RENDERING-IMPLEMENTATION-CHECKLIST.md](TEXT-RENDERING-IMPLEMENTATION-CHECKLIST.md)** - Step-by-step guide
  - Phase-by-phase implementation plan
  - Code structure and organization
  - Testing strategy

- **[TEXT-RENDERING-QUICK-REFERENCE.md](TEXT-RENDERING-QUICK-REFERENCE.md)** - Lookup tables
  - Palette color index table
  - Encoding decision tree
  - Color analysis formulas

- **[TEXT-RENDERING-SOURCE-CODE-REFERENCE.md](TEXT-RENDERING-SOURCE-CODE-REFERENCE.md)** - Code mapping
  - How C++ source maps to TypeScript
  - Function equivalents
  - Data structure conversions

- **[TEXT-RENDERING-ARCHITECTURE.md](TEXT-RENDERING-ARCHITECTURE.md)** - Design patterns
  - Text clip architecture
  - Positioning model
  - Color settings and transparency

### **Implementation Guides**
- **[TYPESCRIPT-IMPLEMENTATION-GUIDE.md](TYPESCRIPT-IMPLEMENTATION-GUIDE.md)** - TS-specific patterns
  - Core concepts in TypeScript
  - Rendering context setup
  - Type system usage

- **[conversion-order.md](conversion-order.md)** - Conversion strategy
  - Module organization
  - Dependency order
  - Integration sequence

- **[INDEX.md](INDEX.md)** - Document navigation hub
  - Cross-references between docs
  - Topic index

### **Progress Tracking**
- **[RENDERING-PROGRESS.md](RENDERING-PROGRESS.md)** - Implementation status
  - Completed features
  - Known issues
  - Testing status

### **Tool Documentation**
- **[RENDER-CDG-USAGE.md](RENDER-CDG-USAGE.md)** - render-cdg.ts tool usage
  - Command-line options
  - Example usage
  - Output formats

### **Reference Materials**
- **[CRITICAL-FACTS.md](CRITICAL-FACTS.md)** - Key facts summary
  - Important discoveries
  - Technical notes
  - Common gotchas

- **[CD+G-Magic-UML.md](CD+G-Magic-UML.md)** - Class hierarchy diagrams
  - Object relationships
  - Inheritance structure

- **[vlc-cdg-decoder-summary.md](vlc-cdg-decoder-summary.md)** - VLC decoder reference
  - How VLC implements CD+G decoding
  - Alternative approaches for comparison

- **[ARCHITECTURE-NOTES.md](ARCHITECTURE-NOTES.md)** - Design patterns
  - CMP parser design
  - Path normalization
  - Architecture decisions

---

## 📊 Documentation Statistics

- **Total files**: 22 documentation files
- **Total size**: ~150 KB
- **Focus**: C++ analysis, binary format reference, text rendering implementation
- **All documents**: Self-contained and cross-referenced

---

## 🎯 How to Use This Documentation

1. **New to the project**: Start with [REFERENCE.md](REFERENCE.md)
2. **Understanding the algorithm**: Read [CPP-IMPLEMENTATION-ANALYSIS.md](CPP-IMPLEMENTATION-ANALYSIS.md)
3. **Implementing text rendering**: Follow [TEXT-RENDERING-SUMMARY.md](TEXT-RENDERING-SUMMARY.md) and its sub-docs
4. **Binary format questions**: Check [PACKET-BINARY-FORMAT.md](PACKET-BINARY-FORMAT.md)
5. **Implementation patterns**: See [TYPESCRIPT-IMPLEMENTATION-GUIDE.md](TYPESCRIPT-IMPLEMENTATION-GUIDE.md)
6. **Quick lookup**: Use [TEXT-RENDERING-QUICK-REFERENCE.md](TEXT-RENDERING-QUICK-REFERENCE.md) for tables and formulas
- **[CD+G-Magic-UML.md](CD+G-Magic-UML.md)** - UML diagrams
  - System architecture diagrams
  - Class relationships
  - Processing pipeline visualization

### **For Decoder Reference**
- **[vlc-cdg-decoder-summary.md](vlc-cdg-decoder-summary.md)** - VLC decoder analysis
  - How VLC decodes CD+G packets
  - Packet layout and color handling
  - Implementation comparison

### **Legacy Reference (For Context)**
- **[CRITICAL-FACTS.md](CRITICAL-FACTS.md)** - Important facts
  - Kept for historical reference
  - Contains some overlapping info with REFERENCE.md

---

## 🎯 By Use Case

### **I need to understand the project architecture**
1. Read: REFERENCE.md (sections: Core Concepts, Architecture Overview)
2. View: CD+G-Magic-UML.md (diagrams)
3. Deep dive: ARCHITECTURE-NOTES.md

### **I need to understand CD+G format**
1. Read: REFERENCE.md (section: File Format Reference)
2. Reference: CDG-reference.md
3. Details: PACKET-BINARY-FORMAT.md

### **I need to implement a feature**
1. Read: REFERENCE.md
2. Reference: CPP-IMPLEMENTATION-ANALYSIS.md (find similar feature in C++)
3. Guide: TYPESCRIPT-IMPLEMENTATION-GUIDE.md

### **I'm debugging an issue**
1. Check: REFERENCE.md (section: Known Issues & Limitations)
2. Reference: PACKET-BINARY-FORMAT.md (binary layout)
3. Compare: vlc-cdg-decoder-summary.md (how VLC handles it)

### **I need to understand how CMP works**
1. Read: REFERENCE.md (section: Architecture Overview - CMP Parser)
2. Details: ARCHITECTURE-NOTES.md

---

**Last Updated:** December 8, 2025  
**Status:** Active Development

// VIM: set ft=markdown :
// END
