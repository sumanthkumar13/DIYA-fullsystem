# Cursor Rules for Diya B2B Platform

## Branch Management
- Always work on `dev` branch or feature branches
- Never commit directly to `main` or `master` branch
- Create feature branches for new features: `feature/<feature-name>`
- Create fix branches for bug fixes: `fix/<bug-name>`

## Security
- Never commit secrets or sensitive data
- Never commit `.env` files
- Never commit `application-local.properties` files
- Always use environment variables or secure configuration management
- Add sensitive files to `.gitignore`

## Documentation
- Always update documentation when endpoints change
- Update `docs/API_MAP.md` when adding/modifying REST endpoints
- Update `docs/DB_SCHEMA.md` when modifying entities or relationships
- Update `docs/FRONTEND_MAP.md` when adding new screens or services
- Update `docs/PROJECT_MAP.md` when adding new modules or flows

## API Changes
- Always update Flutter app (`diya_frontend/`) if API changes affect retailer endpoints
- Always update Dashboard (`DiyaWholesalerDashboard/`) if API changes affect wholesaler endpoints
- Maintain backward compatibility when possible
- Document breaking changes in commit messages

## Testing
- Always add tests checklist in task completion notes
- Include unit tests for service layer
- Include integration tests for controllers
- Test authentication and authorization flows
- Test error handling scenarios

## Code Quality
- Follow existing code patterns and conventions
- Use meaningful variable and method names
- Add comments for complex business logic
- Keep methods focused and single-purpose
- Refactor when code duplication is detected
