# Organization API

Manage organization (tenant) settings and profile information.

**Base Path**: `/api/v1/organization`

**Authorization**: Admin users only

---

## Endpoints

### GET /organization

Retrieve the current organization's profile information.

**Authorization**: Admin only

**Response**: `200 OK`

```json
{
  "data": {
    "id": "37a6815e-cb57-4cf7-bdae-2a6157dab893",
    "name": "Demo Company",
    "slug": "demo-company",
    "phone": "+1-555-123-4567",
    "address": "123 Main Street, Suite 100, San Francisco, CA 94105",
    "logoUrl": "https://cdn.example.com/logos/demo-company.png",
    "timezone": "America/New_York",
    "country": "US",
    "createdAt": "2025-10-15T22:17:08.026Z"
  }
}
```

**curl Example**:

```bash
curl -X GET http://localhost:3000/api/v1/organization \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

**Error Responses**:

- `401 Unauthorized` - Invalid or expired session token
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Organization not found

---

### PATCH /organization

Update organization settings. Supports partial updates.

**Authorization**: Admin only

**Request Body** (all fields optional):

```json
{
  "name": "Acme Corporation",
  "phone": "+1-555-123-4567",
  "address": "123 Main Street, Suite 100, San Francisco, CA 94105",
  "logoUrl": "https://cdn.example.com/logos/acme-corp.png",
  "timezone": "America/New_York",
  "country": "US"
}
```

**Field Descriptions**:

| Field      | Type   | Description                                                     |
| ---------- | ------ | --------------------------------------------------------------- |
| `name`     | string | Organization name (1-255 characters)                            |
| `phone`    | string | Phone number (max 50 characters), nullable                      |
| `address`  | string | Full address (max 500 characters), nullable                     |
| `logoUrl`  | string | Logo URL from CDN/storage (max 500 characters, valid URL), nullable |
| `timezone` | string | IANA timezone string (e.g., "America/New_York")                 |
| `country`  | string | ISO 3166-1 alpha-2 country code (2 uppercase letters, e.g., "US"), nullable |

**Response**: `200 OK`

```json
{
  "data": {
    "id": "37a6815e-cb57-4cf7-bdae-2a6157dab893",
    "name": "Acme Corporation",
    "slug": "demo-company",
    "phone": "+1-555-123-4567",
    "address": "123 Main Street, Suite 100, San Francisco, CA 94105",
    "logoUrl": "https://cdn.example.com/logos/acme-corp.png",
    "timezone": "America/New_York",
    "country": "US",
    "createdAt": "2025-10-15T22:17:08.026Z"
  }
}
```

**curl Examples**:

Update phone and address:

```bash
curl -X PATCH http://localhost:3000/api/v1/organization \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1-555-987-6543",
    "address": "456 Oak Avenue, New York, NY 10001"
  }'
```

Add logo URL:

```bash
curl -X PATCH http://localhost:3000/api/v1/organization \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logoUrl": "https://cdn.example.com/logos/company-logo.png"
  }'
```

Update timezone and country:

```bash
curl -X PATCH http://localhost:3000/api/v1/organization \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "Europe/London",
    "country": "GB"
  }'
```

Clear optional fields:

```bash
curl -X PATCH http://localhost:3000/api/v1/organization \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": null,
    "address": null,
    "logoUrl": null,
    "country": null
  }'
```

**Error Responses**:

- `400 Bad Request` - Invalid input or validation error
  - Invalid country code format (must be 2 uppercase letters)
  - Invalid URL format for logoUrl
  - String length violations
- `401 Unauthorized` - Invalid or expired session token
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Organization not found

**Validation Rules**:

- `name`: 1-255 characters
- `phone`: Max 50 characters
- `address`: Max 500 characters
- `logoUrl`: Must be a valid URL, max 500 characters
- `timezone`: Max 100 characters (IANA timezone format recommended)
- `country`: Exactly 2 uppercase letters (ISO 3166-1 alpha-2)

---

## Logo Upload Strategy

The API accepts a logo URL, not file uploads. The recommended flow:

1. **Frontend**: Upload image to CDN/S3 (e.g., AWS S3, Cloudinary, etc.)
2. **Frontend**: Receive CDN URL from upload service
3. **Frontend**: Call `PATCH /organization` with the CDN URL in `logoUrl` field
4. **Backend**: Store the URL and return updated organization data

This approach keeps the API simple and delegates file storage to specialized services.

---

## Common Timezone Examples

- US Pacific: `America/Los_Angeles`
- US Mountain: `America/Denver`
- US Central: `America/Chicago`
- US Eastern: `America/New_York`
- UK: `Europe/London`
- Central Europe: `Europe/Paris`
- UTC: `UTC`

Full list: [IANA Time Zone Database](https://www.iana.org/time-zones)

---

## Common Country Codes

- United States: `US`
- Canada: `CA`
- United Kingdom: `GB`
- Germany: `DE`
- France: `FR`
- Japan: `JP`
- Australia: `AU`

Full list: [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

---

## Integration Example

Complete workflow for organization settings page:

```typescript
// 1. Fetch organization data on page load
async function loadOrganization() {
  const response = await fetch('/api/v1/organization', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  const { data } = await response.json();
  return data;
}

// 2. Upload logo to CDN
async function uploadLogo(file: File): Promise<string> {
  // Your CDN upload logic (e.g., S3, Cloudinary)
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('https://your-cdn.com/upload', {
    method: 'POST',
    body: formData
  });
  const { url } = await response.json();
  return url;
}

// 3. Update organization with new logo URL
async function updateOrganization(updates: Partial<Organization>) {
  const response = await fetch('/api/v1/organization', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  const { data } = await response.json();
  return data;
}

// Complete flow
async function handleLogoUpload(file: File) {
  try {
    // Upload to CDN first
    const logoUrl = await uploadLogo(file);

    // Then update organization
    const updatedOrg = await updateOrganization({ logoUrl });

    console.log('Organization updated:', updatedOrg);
  } catch (error) {
    console.error('Failed to update logo:', error);
  }
}
```

---

## Notes

- Organization data is scoped to the current tenant (from session)
- Only admin users can view and modify organization settings
- All updates are partial - only provided fields are modified
- The `slug` field cannot be modified via this API
- Changes are reflected immediately for all users in the organization
