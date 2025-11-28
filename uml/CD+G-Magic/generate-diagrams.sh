#!/usr/bin/env bash
# Generate UML diagrams using PlantUML

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR"

# Find plantuml - try system first, then npm
PLANTUML=""
if command -v plantuml &> /dev/null; then
    PLANTUML="plantuml"
elif command -v npx &> /dev/null; then
    PLANTUML="npx plantuml"
else
    echo "ERROR: plantuml or npm not found"
    exit 1
fi

echo "📊 Generating UML diagrams from PlantUML files..."
echo "   Output directory: $OUTPUT_DIR"
echo "   Using: $PLANTUML"
echo ""

# Convert all .puml files to PNG
for puml_file in "$SCRIPT_DIR"/*.puml; do
    if [ -f "$puml_file" ]; then
        filename=$(basename "$puml_file" .puml)
        echo "🔄 Processing: $filename"
        $PLANTUML "$puml_file" -o "$OUTPUT_DIR"
        echo "✅ Generated: $filename.png"
    fi
done

echo ""
echo "✨ All diagrams generated successfully!"
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

