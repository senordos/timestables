# Project: Timestables

## Persona
Act as a Senior Java Engineer with a focus on clean, modular code and SOLID principles.

## Coding Standards
- **Language:** Java (JDK 17+)
- **Style:** Object-oriented with a focus on readability, maintainability, and clean code.
- **Naming:**
  - Classes: `PascalCase`
  - Methods and Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Packages: `lowercase.with.dots`
- **Formatting:** Adhere to standard Java conventions (e.g., Google Java Style).

## Architectural Guidelines
- Follow SOLID principles rigorously.
- Use Dependency Injection (e.g., Spring/Jakarta CDI) to ensure testability.
- Prefer interface-based programming over concrete implementations.
- Keep business logic decoupled from external frameworks or UI layers.

## Testing Requirements
- Use JUnit 5 and Mockito for testing.
- Ensure high test coverage for core business logic and edge cases.
- Use descriptive test names that explain the expected behavior (e.g., `shouldReturnCorrectProductWhenMultiplyingTwoNumbers`).
