# Contributing to Chattio

Thank you for your interest in contributing to Chattio! This document outlines the process for contributing to the project.

## Code Style

### JavaScript/TypeScript
- Use ES6+ features where appropriate
- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and React components
- Use `UPPER_SNAKE_CASE` for constants
- Use `_` prefix for private class members
- Use JSDoc for public APIs
- Maximum line length: 100 characters
- Use semicolons
- Use single quotes for strings
- Use 2 spaces for indentation

### HTML/CSS
- Use semantic HTML5 elements
- Use BEM naming convention for CSS classes
- Prefer CSS variables for theming
- Use CSS Modules for component styles

### Git Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## Testing

### Unit Tests
- Place unit tests in `tests/unit`
- Test files should be named `*.test.js` or `*.test.ts`
- Aim for at least 80% test coverage
- Test both success and error cases

### Integration Tests
- Place integration tests in `tests/integration`
- Test component interactions
- Mock external dependencies

### E2E Tests
- Place E2E tests in `tests/e2e`
- Use Playwright for browser automation
- Test critical user flows

## Pull Requests
1. Keep PRs focused on a single feature or bugfix
2. Update documentation as needed
3. Ensure all tests pass
4. Add tests for new features
5. Update the CHANGELOG.md if applicable

## Code Review Process
1. Create a draft PR for early feedback
2. Request reviews from at least one maintainer
3. Address all review comments
4. Ensure CI passes before merging

## Reporting Issues
When reporting issues, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

## Development Setup
1. Clone the repository
2. Run `npm install`
3. Start the development server: `npm start`
4. Run tests: `npm test`

## License
By contributing, you agree that your contributions will be licensed under the project's MIT License.
