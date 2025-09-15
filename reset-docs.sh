#!/bin/bash
# Reset documentation to start fresh

echo "🧹 Cleaning documentation files..."

# Remove generated API docs (keep manual pages and custom index.md)
find docs/api -name "*.md" ! -name "index.md" -delete
rm -rf docs/api/classes docs/api/interfaces docs/api/enumerations docs/api/type-aliases docs/api/functions docs/api/variables

# Remove Python virtual environment  
rm -rf docs-env/

# Remove built site
rm -rf site/

echo "✅ Documentation reset complete!"
echo ""
echo "To rebuild:"
echo "1. python3 -m venv docs-env"
echo "2. source docs-env/bin/activate" 
echo "3. pip install -r requirements.txt"
echo "4. npm run docs:build"