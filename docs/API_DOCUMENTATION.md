# Templar Archives API Documentation

**Version**: 6.0
**Last Updated**: 2025-10-26
**Base URL**: `https://templar-archives.vercel.app`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Natural Search](#natural-search)
   - [Import Hands](#import-hands)
   - [Parse Hendon Mob](#parse-hendon-mob)
   - [Parse Payout CSV](#parse-payout-csv)
   - [YouTube Channel Streams](#youtube-channel-streams)
5. [RPC Functions](#rpc-functions)
6. [Security](#security)

---

## Authentication

All API endpoints use **Supabase Authentication** with JWT tokens.

### Getting a Token

```javascript
// Client-side
import { createClientSupabaseClient } from '@/lib/supabase-client'

const supabase = createClientSupabaseClient()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

### Using the Token

Include the token in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Rate Limiting

All endpoints are rate-limited using **Upstash Redis**.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/natural-search` | 5 requests | 1 minute |
| `/api/import-hands` | 10 requests | 1 minute |
| `/api/parse-*` | 10 requests | 1 minute |
| General APIs | 30 requests | 1 minute |

### Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2025-10-26T10:30:00.000Z
```

### Rate Limit Exceeded Response

```json
{
  "error": "요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
  "retryAfter": 45
}
```

**HTTP Status**: `429 Too Many Requests`

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `429` | Too Many Requests (rate limit exceeded) |
| `500` | Internal Server Error |

---

## API Endpoints

### Natural Search

Search for poker hands using natural language queries powered by Claude AI.

**Endpoint**: `POST /api/natural-search`

**Authentication**: Required

**Rate Limit**: 5 requests/minute

#### Request

```json
{
  "query": "Find hands with pocket aces from WSOP 2024 with pot size over $100k"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Natural language search query (1-500 chars) |

#### Response

```json
{
  "results": [
    {
      "id": "uuid",
      "number": 42,
      "description": "Hand description",
      "pot_size": 125000,
      "board_cards": "A♠ K♥ Q♦ J♣ 10♠",
      "tournament_name": "WSOP 2024 Main Event",
      "players": [...]
    }
  ],
  "filter": {
    "category": "WSOP",
    "minPotSize": 100000,
    "year": 2024
  },
  "count": 15
}
```

#### Example

```javascript
const response = await fetch('/api/natural-search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: 'big bluffs from Triton tournaments'
  })
})

const data = await response.json()
```

---

### Import Hands

Import hand history data in bulk.

**Endpoint**: `POST /api/import-hands`

**Authentication**: Required (Admin only)

**Rate Limit**: 10 requests/minute

#### Request

```json
{
  "hands": [
    {
      "dayId": "uuid",
      "number": 1,
      "description": "Preflop all-in",
      "timestamp": 3600,
      "potSize": 50000,
      "boardCards": "A♠ K♥ Q♦",
      "players": [
        {
          "playerId": "uuid",
          "position": "BTN",
          "cards": "A♠ A♥"
        }
      ]
    }
  ]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hands` | array | Yes | Array of hand objects (max 100) |
| `hands[].dayId` | UUID | Yes | Stream/Day ID |
| `hands[].number` | number | Yes | Hand number |
| `hands[].description` | string | No | Hand description |
| `hands[].timestamp` | number | No | Timestamp in video (seconds) |
| `hands[].potSize` | number | No | Pot size in chips |
| `hands[].boardCards` | string | No | Community cards |
| `hands[].players` | array | No | Players in hand |

#### Response

```json
{
  "success": true,
  "imported": 42,
  "skipped": 2,
  "errors": []
}
```

#### Validation Rules

- Maximum 100 hands per request
- `dayId` must exist
- `number` must be unique per day
- `potSize` must be non-negative
- `boardCards` format: "A♠ K♥ Q♦ J♣ 10♠"

---

### Parse Hendon Mob

Parse tournament data from Hendon Mob HTML.

**Endpoint**: `POST /api/parse-hendon-mob`

**Authentication**: Required

**Rate Limit**: 10 requests/minute

#### Request

```json
{
  "url": "https://pokerdb.thehendonmob.com/event.php?a=r&n=12345"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Hendon Mob tournament URL |

#### Response

```json
{
  "tournament": {
    "name": "WSOP 2024 Main Event",
    "buyIn": "$10,000",
    "entryCount": 8773,
    "totalPrize": "$87,730,000",
    "winner": "John Doe",
    "location": "Las Vegas, USA",
    "date": "2024-07-03"
  },
  "payouts": [
    {
      "place": 1,
      "name": "John Doe",
      "country": "USA",
      "prize": "$10,000,000"
    }
  ]
}
```

---

### Parse Payout CSV

Parse payout structure from CSV file.

**Endpoint**: `POST /api/parse-payout-csv`

**Authentication**: Required

**Rate Limit**: 10 requests/minute

#### Request

```json
{
  "csv": "Place,Name,Country,Prize\n1,John Doe,USA,$10000000\n2,Jane Smith,UK,$5000000"
}
```

#### Response

```json
{
  "payouts": [
    {
      "place": 1,
      "name": "John Doe",
      "country": "USA",
      "prize": "$10,000,000"
    }
  ],
  "count": 2
}
```

#### CSV Format

Required columns:
- `Place` or `Rank`
- `Name` or `Player`
- `Country` (optional)
- `Prize` or `Winnings`

---

### YouTube Channel Streams

Fetch completed live streams from a YouTube channel.

**Endpoint**: `POST /api/youtube/channel-streams`

**Authentication**: Required

**Rate Limit**: 10 requests/minute

#### Request

```json
{
  "channelInput": "https://www.youtube.com/@PokerChannel",
  "inputMethod": "url",
  "maxResults": 50
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channelInput` | string | Yes | Channel URL or ID |
| `inputMethod` | string | Yes | "url" or "id" |
| `maxResults` | number | No | Max videos to fetch (default: 50, max: 200) |

#### Response

```json
{
  "videos": [
    {
      "id": "youtube-video-id",
      "title": "Poker Stream - Day 1A",
      "url": "https://www.youtube.com/watch?v=...",
      "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg",
      "publishedAt": "2024-10-20T10:00:00Z",
      "description": "Video description"
    }
  ],
  "channelId": "UC...",
  "count": 50
}
```

---

## RPC Functions

PostgreSQL functions that can be called via Supabase.

### get_players_with_hand_counts

Fetch all players with their hand counts (optimized single query).

**Function**: `get_players_with_hand_counts()`

**Returns**: Array of players with hand counts

**Security**: `SECURITY INVOKER` (respects RLS)

**Access**: Public (anonymous and authenticated)

#### Example

```javascript
const { data, error } = await supabase
  .rpc('get_players_with_hand_counts')

// Returns: [{ id, name, country, total_winnings, hand_count }, ...]
```

---

### get_player_hands_grouped

Get all hands for a specific player, grouped by tournament hierarchy.

**Function**: `get_player_hands_grouped(player_uuid UUID)`

**Parameters**:
- `player_uuid`: Player's UUID

**Returns**: JSONB (hierarchical structure)

**Security**: `SECURITY INVOKER` (respects RLS)

**Access**: Public

#### Example

```javascript
const { data, error } = await supabase
  .rpc('get_player_hands_grouped', {
    player_uuid: 'player-uuid-here'
  })

// Returns hierarchical JSON:
// [
//   {
//     tournament_id, tournament_name,
//     sub_events: [
//       { sub_event_id, sub_event_name,
//         days: [
//           { day_id, day_name,
//             hands: [...]
//           }
//         ]
//       }
//     ]
//   }
// ]
```

---

### get_hand_details_batch

Batch fetch hand details with related data (optimized for performance).

**Function**: `get_hand_details_batch(hand_ids UUID[])`

**Parameters**:
- `hand_ids`: Array of hand UUIDs (max 100)

**Returns**: Array of hand details

**Security**: `SECURITY INVOKER` (respects RLS)

**Validation**:
- Maximum 100 items
- Non-null, non-empty array

**Access**: Public

#### Example

```javascript
const { data, error } = await supabase
  .rpc('get_hand_details_batch', {
    hand_ids: ['uuid1', 'uuid2', 'uuid3']
  })

// Returns: [
//   {
//     id, day_id, number, description, pot_size,
//     board_cards, tournament_name, players: [...]
//   }
// ]
```

#### Error Handling

```javascript
// Empty array
{ error: "hand_ids array cannot be empty" }

// Too many items
{ error: "Array size exceeds maximum of 100 items (received: 150)" }

// Null array
{ error: "hand_ids parameter cannot be NULL" }
```

---

## Security

### CSRF Protection

All `POST` endpoints validate the request origin:

```javascript
// Automatic validation
// Origin header must match host
```

### Input Sanitization

All inputs are sanitized to prevent:
- SQL Injection
- XSS attacks
- Command injection

### File Upload Validation

File uploads are validated using **magic number** checking:

```javascript
// Validates actual file content, not just extension
// Supported types: JPEG, PNG, WebP, GIF, MP4, WebM
// Size limits: Images (5MB), Videos (500MB)
```

### Authentication Levels

| Level | Description | Access |
|-------|-------------|--------|
| Anonymous | No authentication | Public data only |
| Authenticated | Signed in user | User-specific data |
| High Templar | Elevated user | Moderator actions |
| Reporter | Content creator | News/live reports |
| Admin | Administrator | Full system access |

---

## Examples

### Complete Search Example

```typescript
import { createClientSupabaseClient } from '@/lib/supabase-client'

async function searchHands(query: string) {
  const supabase = createClientSupabaseClient()

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Authentication required')
  }

  // Make API request
  const response = await fetch('/api/natural-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ query })
  })

  // Handle response
  if (!response.ok) {
    if (response.status === 429) {
      const data = await response.json()
      throw new Error(`Rate limit exceeded. Retry after ${data.retryAfter}s`)
    }
    throw new Error('Search failed')
  }

  return await response.json()
}

// Usage
const results = await searchHands('big bluffs from 2024')
console.log(results.results)
```

---

## Changelog

### v6.0 (2025-10-26)
- Added array size validation to RPC functions (DoS protection)
- Changed RPC functions to SECURITY INVOKER (RLS enforcement)
- Added structured logging with Pino
- Centralized environment variable management

### v5.0 (2025-10-24)
- Comprehensive security enhancement
- Natural search API redesign (SQL → JSON filter)
- CSRF protection for all POST endpoints
- Magic number file validation

---

## Support

For issues or questions:
- **GitHub**: https://github.com/potent-zedlee/templar-archives/issues
- **Security**: Report security issues privately

---

**Generated with**: Claude Code
**Maintainer**: Templar Archives Team
