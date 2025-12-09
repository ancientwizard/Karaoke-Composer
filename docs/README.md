# Documentation Guide

This folder contains essential reference materials for the CD+G Magic TypeScript implementation. Start here.

---

## 📍 Quick Navigation

### **For Getting Started**
- **[REFERENCE.md](REFERENCE.md)** ← **START HERE**
  - Consolidated reference covering everything you need to know
  - Core concepts, architecture, implementation details
  - Known issues and limitations
  - ~400 lines, highly organized

### **For Implementation Decisions**
- **[INDEX.md](INDEX.md)** - Navigation guide to all documents
  - Points to specific reference materials by topic
- **[conversion-order.md](conversion-order.md)** - Strategy for TS conversion
- **[TYPESCRIPT-IMPLEMENTATION-GUIDE.md](TYPESCRIPT-IMPLEMENTATION-GUIDE.md)** - Implementation patterns

### **For Technical Deep Dives**
- **[CPP-IMPLEMENTATION-ANALYSIS.md](CPP-IMPLEMENTATION-ANALYSIS.md)** - Complete C++ analysis
  - How the original C++ code works
  - Packet encoding algorithms
  - Font block processing
  - ~800 lines of detailed technical reference
  
- **[RESEARCH-SUMMARY.md](RESEARCH-SUMMARY.md)** - Research overview
  - High-level findings from C++ analysis
  - Key algorithms explained
  - File statistics and validation

### **For Format & Binary Details**
- **[CDG-reference.md](CDG-reference.md)** - CD+G packet format spec
  - Complete packet structure reference
  - All instruction codes
  - Palette and color handling
  
- **[PACKET-BINARY-FORMAT.md](PACKET-BINARY-FORMAT.md)** - Quick reference
  - 24-byte packet structure
  - Binary layout diagrams
  - Common encoding patterns

- **[ARCHITECTURE-NOTES.md](ARCHITECTURE-NOTES.md)** - Design patterns
  - CMP parser design (round-trip fidelity)
  - Path normalization facade
  - Architecture decisions

### **For Architecture Understanding**
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
