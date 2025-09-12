# Project Structure & Architecture

## Folder Organization

```
src/
├── models/           # TypeScript interfaces and data models
│   ├── trendyol.ts   # Trendyol API models and types
│   ├── oblio.ts      # Oblio API models and types
│   ├── common.ts     # Shared interfaces and types
│   └── storage.ts    # Storage-related models
├── services/         # Business logic and API clients
│   ├── trendyol-client.ts    # Trendyol API integration
│   ├── oblio-client.ts       # Oblio API integration
│   ├── storage-service.ts    # Encrypted storage management
│   ├── sync-service.ts       # Synchronization orchestration
│   └── transform-service.ts  # Data transformation logic
├── ui/               # UI components and controllers
│   ├── app.ts        # Main application controller
│   ├── dashboard.ts  # Dashboard interface management
│   ├── orders-list.ts        # Orders table component
│   ├── config-panel.ts      # Configuration panel
│   └── loading-spinner.ts   # Loading indicator component
├── styles/
│   └── main.css      # Application styles
├── test/             # Test files and setup
│   └── setup.ts      # Test environment configuration
└── main.ts           # Application entry point
```

## Architecture Patterns

### Service Layer Pattern
- **Services**: Handle business logic and external API communication
- **Models**: Define data structures and interfaces
- **UI Components**: Manage presentation and user interaction

### Dependency Injection
- Services are instantiated and injected into UI components
- Storage service implements interface for testability
- Clear separation between data access and business logic

### Error Handling Strategy
- Comprehensive try-catch blocks in all async operations
- User-friendly error messages displayed in UI
- Retry functionality for transient failures
- Logging for debugging purposes

## Naming Conventions
- **Files**: kebab-case (e.g., `storage-service.ts`)
- **Classes**: PascalCase (e.g., `StorageService`)
- **Interfaces**: PascalCase (e.g., `TrendyolShipmentPackage`)
- **Variables/Functions**: camelCase (e.g., `encryptAndStore`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ENCRYPTED_CONFIG_KEY`)

## Code Organization Rules
- One primary class/interface per file
- Export main functionality at file level
- Group related types in model files
- Keep UI components focused on presentation logic
- Services handle all external API communication