#!/usr/bin/env bash
# Quick test - Check if first diagram works with online editor

FIRST_DIAGRAM="01-Core-Architecture.puml"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔍 Testing PlantUML diagram format..."
echo ""

if [ -f "$DIR/$FIRST_DIAGRAM" ]; then
    echo "✅ Diagram file found: $FIRST_DIAGRAM"
    echo ""
    echo "📋 First 10 lines:"
    head -10 "$DIR/$FIRST_DIAGRAM"
    echo ""
    echo "✨ To render this diagram:"
    echo "   1. Go to: https://www.plantuml.com/plantuml/uml/"
    echo "   2. Copy all content from: $DIR/$FIRST_DIAGRAM"
    echo "   3. Paste into the online editor"
    echo "   4. See the diagram render instantly!"
    echo ""
    echo "📊 Total lines in diagram: $(wc -l < "$DIR/$FIRST_DIAGRAM")"
else
    echo "❌ Diagram file not found!"
    exit 1
fi
