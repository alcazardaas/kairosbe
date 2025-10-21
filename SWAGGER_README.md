# Swagger/OpenAPI Documentation

This project includes comprehensive Swagger/OpenAPI 3.0 documentation for all API endpoints.

## Accessing the Documentation

### Swagger UI (Interactive)
Once the application is running, access the interactive API documentation at:

```
http://localhost:3000/api
```

The Swagger UI allows you to:
- Browse all available endpoints grouped by feature
- View request/response schemas with examples
- Try out endpoints directly from the browser
- Authenticate using session tokens

### OpenAPI JSON Spec

The raw OpenAPI 3.0 specification is available at:

```
http://localhost:3000/api-json
```

## Exporting the OpenAPI Specification

To export the OpenAPI specification to a JSON file:

### 1. Start the Application

```bash
pnpm dev
# or
pnpm start
```

### 2. Export the Specification

In a separate terminal:

```bash
pnpm export:openapi
```

This will create an `openapi.json` file in the project root.

### 3. Use the Exported File

The `openapi.json` file can be:
- Imported into API testing tools (Postman, Insomnia, etc.)
- Used for client SDK generation (OpenAPI Generator, etc.)
- Shared with frontend teams for API contract reference
- Used for API documentation hosting (Redoc, Stoplight, etc.)

## Authentication

The API uses **session-based authentication** with opaque UUID tokens (not JWTs).

### To authenticate in Swagger UI:

1. Click the "Authorize" button at the top of the Swagger UI
2. Enter your session token in the "Value" field
3. Click "Authorize"
4. All subsequent requests will include the session token

### Getting a Session Token:

Use the `POST /api/v1/auth/login` endpoint:

```json
{
  "email": "user@example.com",
  "password": "your-password",
  "tenantId": "optional-tenant-id"
}
```

Response will include:
```json
{
  "data": {
    "sessionToken": "your-session-token-here",
    "refreshToken": "your-refresh-token-here",
    "userId": "...",
    "tenantId": "...",
    "expiresAt": "..."
  }
}
```

Copy the `sessionToken` value and use it for authorization.

## API Structure

### Base Path
All endpoints are prefixed with: `/api/v1`

### Response Format
All successful responses follow this pattern:

**Single item:**
```json
{
  "data": { /* entity data */ }
}
```

**List with pagination:**
```json
{
  "data": [ /* array of entities */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

**Error responses:**
```json
{
  "error": "Bad Request",
  "message": "Detailed error message",
  "statusCode": 400
}
```

## Endpoint Groups

The API is organized into the following feature groups:

1. **Authentication** - Login, logout, session management
2. **Projects** - Project CRUD and membership management
3. **My Projects** - Current user's accessible projects
4. **Tasks** - Task management within projects
5. **Time Entries** - Time tracking entries
6. **Timesheets** - Timesheet submission and approval workflows
7. **Leave Requests** - PTO/leave request management
8. **Benefit Types** - Leave benefit type configuration
9. **Holidays** - Company/tenant holiday calendar
10. **Timesheet Policies** - Timesheet policy configuration
11. **Search** - Search projects and tasks
12. **Calendar** - Unified calendar feed (holidays, leave, timesheets)
13. **Health** - Application health check

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Sorting
```
?sort=created_at:desc
```

### Filtering (varies by endpoint)
```
?status=pending&from=2025-01-01&to=2025-12-31
```

## Best Practices

1. **Always authenticate** - Most endpoints require a valid session token
2. **Check response schemas** - Review the documented response types in Swagger UI
3. **Use examples** - Each DTO includes realistic example values
4. **Handle errors** - Check the documented error responses for each endpoint
5. **Respect rate limits** - (if implemented in the future)

## Updating the Documentation

When adding new endpoints or modifying existing ones:

1. Create/update response DTOs in `src/<module>/dto/<module>-response.dto.ts`
2. Add `@ApiProperty()` decorators to all DTO fields with descriptions and examples
3. Annotate controller methods with:
   - `@ApiOperation()` - Endpoint description
   - `@ApiOkResponse()` / `@ApiCreatedResponse()` - Success response
   - `@ApiBadRequestResponse()` / `@ApiUnauthorizedResponse()` - Error responses
   - `@ApiSecurity('session')` - For protected routes
4. Rebuild and restart the application
5. Verify changes in Swagger UI
6. Re-export the OpenAPI spec

## Troubleshooting

### Swagger UI not loading

- Ensure the application is running
- Check that you're accessing the correct URL: `http://localhost:3000/api`
- Check browser console for errors

### Export script fails

- Ensure the application is running before executing `pnpm export:openapi`
- Verify the port in package.json matches your running application
- Check that `/api-json` endpoint is accessible

### Authentication not working in Swagger UI
- Ensure you've clicked "Authorize" and entered a valid session token
- Session tokens expire (default: 30 days) - obtain a new one if needed
- The token should be entered as-is, without any "Bearer" prefix

## Additional Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
