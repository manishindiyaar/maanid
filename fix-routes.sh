#!/bin/bash

# Find all route.ts files in the API directory
ROUTES=$(find src/app/api -name "route.ts")

# Loop through each file and add the dynamic export if it doesn't exist
for file in $ROUTES; do
  echo "Processing $file"
  
  # Check if the file already has the dynamic export
  if ! grep -q "export const dynamic" "$file"; then
    # Add the dynamic export after the imports
    awk '
      BEGIN { added = 0 }
      /^import/ { print; next }
      /^$/ && !added { print; print "export const dynamic = '\''force-dynamic'\'';\n"; added = 1; next }
      { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    
    echo "✅ Added dynamic export to $file"
  else
    echo "⏭️ File already has dynamic export: $file"
  fi
done

echo "All routes processed!" 