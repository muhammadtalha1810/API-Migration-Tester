# API Migration Tester

An Angular-based application for automated testing and validation of API migrations. This tool helps ensure that migrated APIs behave identically to their legacy counterparts by generating comprehensive test cases, executing them against both API versions, and using AI to analyze any discrepancies.

## Features

### API Configuration
- Configure legacy and migrated API endpoints with full control over:
  - HTTP methods (GET, POST, PUT, PATCH, DELETE)
  - Custom headers and bearer token authentication
  - Path parameters (e.g., `/users/{id}`)
  - Query parameters
  - Request payloads
- Support for using global bearer token settings across multiple APIs

### AI-Powered Test Case Generation
- Automatically generates comprehensive test cases using AI models
- Supports multiple AI providers:
  - OpenAI (GPT-4o, etc.)
  - Anthropic (Claude Sonnet, etc.)
  - Azure OpenAI
  - Groq (Llama models)
- Intelligent test case generation based on:
  - Sample payload structures
  - User-defined rules and boundary conditions
  - Edge cases (null values, empty strings, special characters, max length)
  - Data type variations
  - Validation rules
- Specialized handling for GET/DELETE endpoints (focus on path/query parameters)
- Batch generation for large test suites to handle token limits

### Automated API Testing
- Concurrent execution of test cases against both legacy and migrated APIs
- Configurable concurrency level for optimal performance
- Real-time progress tracking during test execution
- Automatic error handling and network error reporting
- Response time measurement for performance comparison

### Response Comparison
- Intelligent comparison of API responses:
  - Status code matching
  - JSON body deep comparison
  - Header comparison (excluding volatile headers like date, server, etc.)
- Identifies discrepancies between legacy and migrated implementations

### AI-Powered Bug Analysis
- Automatic analysis of response differences using AI
- Generates detailed bug reports including:
  - Bug title and description
  - Steps to reproduce (workflow)
  - Likely root causes
  - Helpful suggestions for fixing
- Distinguishes between acceptable differences (format changes) and actual bugs
- Batch analysis for handling large test suites

### Session Management
- Create and manage multiple testing sessions
- Save sessions with custom names to local storage
- Load previously saved sessions
- Automatic session state updates during execution
- Session metadata tracking (creation date, update date, status)

### Import/Export
- Export complete test sessions to JSON files
- Import sessions from JSON files
- Share test configurations and results with team members
- Archive and backup test sessions

### Results Dashboard
- Visual dashboard displaying:
  - Total test cases, passed, failed, and error counts
  - Bug count and summary
  - Real-time status updates
  - Progress indicators
- Filter and view test results by status

### Test Case Details
- Detailed view for individual test cases showing:
  - Request payload and parameters
  - Legacy API response (status, body, headers, response time)
  - Migrated API response (status, body, headers, response time)
  - Comparison results
  - AI-generated bug reports (if differences detected)

### Settings Management
- Configure AI provider settings:
  - Provider selection (OpenAI, Anthropic, Azure, Groq)
  - Model selection with provider-specific defaults
  - API key management
  - Azure-specific settings (endpoint, deployment name)
- Global bearer token configuration for API authentication
- Settings persisted to local storage

### Test Execution Control
- Start new test sessions
- Rerun all test cases with existing configuration
- Reset test case states for re-execution
- Cancel or pause test execution

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
