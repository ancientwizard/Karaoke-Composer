# Documentation Index

Essential reference materials for CDG Composer project.

## Core Files

### [KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md) ⭐ **START HERE**
**Complete reference** - All critical facts, architecture, known issues, and next steps in one place.
- Timing model (packet-based, not milliseconds)
- JSON structure and file format
- CDG packet structure and encoding
- Generation pipeline and key files
- Current implementation status
- Known issues and debugging
- Development commands

**Last Updated**: Current session with latest findings

### [RENDERING-ARCHITECTURE.md](RENDERING-ARCHITECTURE.md)
**Deep technical dive** - How CDG rendering actually works
- FontBlock data model and pipeline
- Tile encoding strategies (1-4 color blocks)
- Color-based optimization flags
- Compositing modes explained
- Reference to CDG Magic implementation details

**Use when**: Implementing tile rendering or optimizing encoding

### [CD+G-MAGIC-SUMMARY.md](CD+G-MAGIC-SUMMARY.md)
**Reference catalog** - What's available in the reference implementation
- Time unit explanation (300 packets/second)
- 60+ reference files documented
- Data flow (CMP → JSON → CDG)
- Extraction script documentation
- Project structure relationships

**Use when**: Looking for reference files or understanding data pipeline

## Reference Materials

### [CDG-reference.md](CDG-reference.md)
**Technical specification** - CD+G packet and color encoding details
- Packet structure breakdown
- Instruction types and values
- Palette color encoding (RGB → 4-bit channels)
- Screen dimensions and coordinate systems

**Use when**: Implementing low-level packet structure or encoding

### [vlc-cdg-decoder-summary.md](vlc-cdg-decoder-summary.md)
**Player perspective** - How VLC decodes and plays CDG files
- Decoder architecture
- Packet processing order
- Color rendering pipeline
- Known decoder quirks

**Use when**: Debugging playback issues or compatibility problems

## Workflow Documentation

### [GH-PAGES-WORKFLOW.md](GH-PAGES-WORKFLOW.md) & [gh-pages-recipe.md](gh-pages-recipe.md)
**Deployment** - GitHub Pages publishing procedures and troubleshooting
- Build and deploy steps
- Branch management
- Common issues and solutions

**Use when**: Deploying to production or troubleshooting build failures

---

## File Organization Philosophy

- **One comprehensive base** (KNOWLEDGE-BASE.md) - Daily reference
- **Specialized references** - Deep dives on specific topics
- **No redundant files** - Outdated/duplicate session notes deleted
- **Everything current** - Updated with latest discoveries

## How to Use These Docs

1. **First time?** → Start with KNOWLEDGE-BASE.md
2. **Want deep dive?** → Read RENDERING-ARCHITECTURE.md
3. **Need spec details?** → Check CDG-reference.md
4. **Debugging playback?** → Review vlc-cdg-decoder-summary.md
5. **Deploying?** → Follow GH-PAGES-WORKFLOW.md

## Adding New Knowledge

When you discover something important:
1. Update KNOWLEDGE-BASE.md with findings
2. If it's a deep topic, create specialized doc (pattern: TOPIC-NAME.md)
3. Link from KNOWLEDGE-BASE to specialized docs
4. Delete old session notes that become redundant

## Documentation Status

| Doc | Current | Last Updated |
|-----|---------|--------------|
| KNOWLEDGE-BASE.md | ✅ Current | This session |
| RENDERING-ARCHITECTURE.md | ✅ Current | Working analysis |
| CD+G-MAGIC-SUMMARY.md | ✅ Current | Reference catalog |
| CDG-reference.md | ✅ Current | Technical spec |
| vlc-cdg-decoder-summary.md | ✅ Current | Player behavior |
| GH-PAGES-WORKFLOW.md | ✅ Current | Deployment process |


