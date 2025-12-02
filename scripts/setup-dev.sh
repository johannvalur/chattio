#!/bin/bash

# Install development dependencies
echo "🔧 Installing development dependencies..."
npm install --save-dev \
  typescript \
  @types/node \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint \
  eslint-config-prettier \
  eslint-plugin-prettier \
  prettier \
  @playwright/test \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/user-event \
  jest \
  ts-jest \
  @types/jest

# Initialize TypeScript configuration
echo "📝 Initializing TypeScript configuration..."
npx tsc --init --target es2020 --module commonjs --esModuleInterop true --strict true --skipLibCheck true --forceConsistentCasingInFileNames true --outDir ./dist --rootDir ./src --moduleResolution node

# Create ESLint configuration
echo "🔍 Creating ESLint configuration..."
cat > .eslintrc.json << 'EOL'
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "env": {
    "node": true,
    "browser": true,
    "es2020": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prettier/prettier": "error"
  }
}
EOL

# Create Prettier configuration
echo "🎨 Creating Prettier configuration..."
cat > .prettierrc << 'EOL'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
EOL

# Create Prettier ignore file
echo "📋 Creating .prettierignore..."
cat > .prettierignore << 'EOL'
# Dependencies
node_modules

# Build output
dist
build
out

# Environment files
.env
.env.*
!.env.example

# Editor files
.vscode
.idea
*.sublime-*

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Test artifacts
coverage
.nyc_output

# Logs
logs
*.log

# Lock files
package-lock.json
yarn.lock
EOL

# Update package.json with new scripts
echo "📝 Updating package.json..."
npm pkg set \
  scripts.format="prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"" \
  scripts.lint="eslint . --ext .js,.jsx,.ts,.tsx" \
  scripts.type-check="tsc --noEmit" \
  scripts.test:coverage="jest --coverage"

echo "✨ Setup complete!"
echo "✅ TypeScript, ESLint, and Prettier have been configured."
echo "📋 Next steps:"
echo "1. Run 'npm run format' to format all files"
echo "2. Run 'npm run lint' to check for linting errors"
echo "3. Run 'npm run type-check' to check TypeScript types"
echo "4. Run 'npm test' to run tests"

echo "\n💡 Consider adding these VSCode extensions for a better development experience:"
echo "- ESLint"
echo "- Prettier - Code formatter"
echo "- TypeScript and JavaScript Language Features (built-in)"
