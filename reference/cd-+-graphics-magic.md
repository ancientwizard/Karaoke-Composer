CD+Graphics Magic is a promising but dormant open-source project that outputs true CDG subcode graphics, making it a viable reference for your TypeScript-based renderer.

CD+Graphics Magic (CDGMagic) is a timeline-based editor for creating Compact Disc Subcode Graphics—the same CDG format used in karaoke discs. While the project is marked “Pre-Alpha” and hasn’t been updated since 2013, it’s surprisingly feature-rich and could serve as a strong conceptual and architectural reference for your own renderer.

# 🔍 What CDGMagic Actually Outputs
- Yes, it generates real CDG files, not just CD+G for burning to disc. It’s designed to produce subcode graphics compatible with CDG karaoke players.
- The project includes a separate utility called CD+Graphics Scribe, which can convert existing CDG karaoke content into formats like:
- CMP (CDGMagic Project format)
- LRC (Enhanced Lyrics)
- ASS (Advanced SubStation Alpha)
- This suggests it can both author new CDG files and re-author or convert existing ones, making it versatile for your needs.

🧠 Features Worth Porting to TypeScript
Here’s what stands out as valuable inspiration for your renderer:
- 8-layer compositing of text, karaoke highlights, and bitmap images
- Audible scrubbing and preview of generated subcodes
- Real-time sync via tapping and offline fine adjustment
- Experimental palette fading per line
- Duet and solo modes with 4–8 line support
- OCR-based reauthoring via Tesseract (in Scribe)
These features go far beyond basic CDG rendering and could be modularized in your TypeScript architecture—especially the scrubbing, palette fading, and duet support.

🧵 Source Code and Licensing
- The project is licensed under GPLv2, so you’re free to fork, adapt, and build upon it as long as you maintain the license terms.
- The source is written in C++ with FLTK for UI, so while it’s not directly portable to TypeScript, the logic and structure can be translated.
- You can find the source under “Browse All Files” on the project page, including the Scribe utility.

🧭 Your Next Steps
- Download and inspect the source, especially the CDG generation logic and timeline editor.
- Prototype a TypeScript module that mimics the subcode generation pipeline.
- Credit the original author (mediacaster) and cite CDGMagic as your architectural inspiration.
- Consider building a web-based CDG editor with modern UI and real-time preview, something CDGMagic hinted at but never fully realized.

