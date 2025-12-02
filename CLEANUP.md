# Chattio Project Cleanup

This document outlines the cleanup process and standards for the Chattio project.

## Cleanup Script

We've added a cleanup script to help maintain a clean development environment:

```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

This script will:

1. Remove `node_modules` and lock files
2. Clear build artifacts
3. Remove temporary and cache files
4. Clean npm cache
5. Reinstall dependencies

## Project Structure

```
chattio/
├── .github/              # GitHub workflows and issue templates
├── build/                # Build configurations
├── dist/                 # Production build output
├── public/               # Static files
│   └── icons/            # Application icons
├── scripts/              # Build and utility scripts
│   └── cleanup.sh        # Cleanup script
├── src/                  # Application source code
│   ├── main/             # Main process code
│   ├── renderer/         # Renderer process code
│   └── shared/           # Shared code between processes
├── tests/                # Test files
│   ├── e2e/             # End-to-end tests
│   ├── integration/      # Integration tests
│   └── unit/             # Unit tests
├── .editorconfig         # Editor configuration
├── .eslintrc.js          # ESLint configuration
├── .gitignore            # Git ignore rules
├── .prettierrc           # Prettier configuration
├── package.json          # Project manifest
└── README.md             # Project documentation
```

## Code Style and Linting

1. **ESLint**: Configured with recommended settings
2. **Prettier**: For consistent code formatting
3. **EditorConfig**: Consistent editor settings

## Best Practices

### Git Workflow

1. **Branch Naming**:
   - `feature/` - New features
   - `bugfix/` - Bug fixes
   - `hotfix/` - Critical production fixes
   - `chore/` - Maintenance tasks

2. **Commit Messages**:
   - Use present tense ("Add feature" not "Added feature")
   - Keep the first line under 50 characters
   - Include a blank line between the subject and body
   - Reference issues and pull requests

### Dependencies

1. Keep dependencies up to date
2. Remove unused dependencies
3. Use exact versions in `package.json`
4. Document why each dependency is needed

### Code Organization

1. Keep files small and focused
2. Use clear, descriptive names
3. Group related functionality
4. Document complex logic

## Maintenance Tasks

### Weekly

1. Update dependencies
2. Run tests
3. Clean up branches
4. Review and address linter warnings

### Before Release

1. Update version numbers
2. Update changelog
3. Run all tests
4. Build and test release artifacts

## Troubleshooting

### Common Issues

1. **Node modules issues**:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Build failures**:
   - Clear build directory
   - Check for version conflicts
   - Verify environment variables

3. **Test failures**:
   - Clear test cache: `npm test -- --clearCache`
   - Run tests with debug output: `npm test -- --verbose`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
