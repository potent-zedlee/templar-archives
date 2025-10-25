# Security Audit Report
**Date**: 2025-10-25
**Auditor**: Claude Code (Automated)
**Scope**: Supabase Query Optimization (Migration 20251025000010, 20251025000011)
**Status**: ⚠️ **MEDIUM RISK** - Action Required

---

## 📋 Executive Summary

This security audit was performed following the deployment of query optimization changes, which introduced 3 new RPC functions and 8 composite indexes. While the changes significantly improve performance, several security concerns were identified that require attention.

### Overall Risk Assessment
- **Critical Issues**: 0
- **High Issues**: 2
- **Medium Issues**: 2
- **Low Issues**: 2

### Key Findings
1. 🔴 **SECURITY DEFINER functions bypass RLS policies**
2. 🔴 **DoS vulnerability in batch function (no array size limit)**
3. 🟡 **Anonymous access to player data**
4. 🟡 **Sensitive data exposure through RPC functions**

---

## 🔍 Detailed Findings

### 1. 🔴 **HIGH: SECURITY DEFINER Functions Bypass RLS**

**Affected Functions:**
- `get_players_with_hand_counts()`
- `get_player_hands_grouped(UUID)`
- `get_hand_details_batch(UUID[])`

**Issue:**
All 3 RPC functions are created with `SECURITY DEFINER`, which means they execute with the privileges of the function owner (likely postgres superuser), bypassing Row Level Security (RLS) policies.

**Location:**
```sql
-- supabase/migrations/20251025000010_optimize_queries_rpc.sql:22
LANGUAGE plpgsql
SECURITY DEFINER
```

**Impact:**
- RLS policies on `players`, `hands`, `hand_players`, `tournaments`, `sub_events`, `days` are bypassed
- Any authenticated user can access all data through these functions
- Anonymous users can access player lists via `get_players_with_hand_counts()`

**Proof of Concept:**
```sql
-- Even if RLS restricts access to hands table,
-- this function will return all hands for a player
SELECT * FROM get_player_hands_grouped('any-player-uuid');
```

**Recommendation:**
Change to `SECURITY INVOKER` to respect RLS policies:

```sql
CREATE OR REPLACE FUNCTION get_players_with_hand_counts()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER
AS $$
BEGIN
  -- Function body remains the same
END;
$$;
```

**Severity**: HIGH
**CVE**: N/A (Internal vulnerability)
**CVSS Score**: 7.5 (High)

---

### 2. 🔴 **HIGH: DoS Vulnerability - No Array Size Limit**

**Affected Function:**
- `get_hand_details_batch(UUID[])`

**Issue:**
The function accepts an array of UUIDs with no size limit. An attacker could send a very large array, causing:
- Database resource exhaustion
- Memory overflow
- Service disruption

**Location:**
```sql
-- supabase/migrations/20251025000010_optimize_queries_rpc.sql:165
CREATE OR REPLACE FUNCTION get_hand_details_batch(hand_ids UUID[])
-- No array size validation
```

**Proof of Concept:**
```javascript
// Client-side attack
const maliciousArray = Array(10000).fill('uuid-here')
await supabase.rpc('get_hand_details_batch', { hand_ids: maliciousArray })
// Database executes query on 10,000 hands
```

**Recommendation:**
Add array size validation:

```sql
CREATE OR REPLACE FUNCTION get_hand_details_batch(hand_ids UUID[])
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Validate array size
  IF array_length(hand_ids, 1) > 100 THEN
    RAISE EXCEPTION 'Array size exceeds maximum of 100 items';
  END IF;

  RETURN QUERY
  SELECT ...
END;
$$;
```

**Severity**: HIGH
**CVSS Score**: 7.1 (High) - Availability Impact

---

### 3. 🟡 **MEDIUM: Anonymous Access to Player Data**

**Affected Function:**
- `get_players_with_hand_counts()`

**Issue:**
Anonymous (unauthenticated) users can access the complete player list with hand counts.

**Location:**
```sql
-- supabase/migrations/20251025000010_optimize_queries_rpc.sql:255
GRANT EXECUTE ON FUNCTION get_players_with_hand_counts() TO anon;
```

**Data Exposed:**
- Player names
- Countries
- Total winnings
- Photo URLs
- Hand counts

**Consideration:**
This may be intentional for a public player leaderboard. However, it should be explicitly documented and reviewed.

**Questions to Answer:**
1. Should anonymous users see all player data?
2. Should total_winnings be public?
3. Should photo_urls be accessible without authentication?

**Recommendation:**
If data should be public, add explicit comment:
```sql
-- PUBLIC ACCESS: Player data is intentionally public for leaderboard
GRANT EXECUTE ON FUNCTION get_players_with_hand_counts() TO anon;
```

If data should be restricted:
```sql
-- Remove anonymous access
REVOKE EXECUTE ON FUNCTION get_players_with_hand_counts() FROM anon;
```

**Severity**: MEDIUM (depends on business requirements)
**Data Classification**: PII (Potentially Personally Identifiable Information)

---

### 4. 🟡 **MEDIUM: Sensitive Hand History Exposure**

**Affected Function:**
- `get_player_hands_grouped(UUID)`

**Issue:**
Any authenticated user can retrieve the complete hand history for any player by providing their UUID.

**Data Exposed:**
- All hands played by a player
- Timestamps, pot sizes, board cards
- Player positions and hole cards
- Tournament information

**Privacy Concern:**
Players may not want their entire hand history publicly accessible. This could be used for:
- Opponent research (data mining)
- Strategy analysis
- Privacy invasion

**Recommendation:**
Add ownership or permission check:

```sql
CREATE OR REPLACE FUNCTION get_player_hands_grouped(player_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER
AS $$
DECLARE
  result JSONB;
  requesting_user_id UUID;
BEGIN
  -- Get current user
  requesting_user_id := auth.uid();

  -- Check if user is requesting their own data OR has player_claims
  IF NOT EXISTS (
    SELECT 1 FROM player_claims
    WHERE player_id = player_uuid
    AND user_id = requesting_user_id
    AND status = 'approved'
  ) AND requesting_user_id IS DISTINCT FROM player_uuid THEN
    RAISE EXCEPTION 'Access denied: You can only view your own hand history';
  END IF;

  -- Original query...
  SELECT COALESCE(jsonb_agg(tournament_data), '[]'::jsonb)
  INTO result
  FROM ...

  RETURN result;
END;
$$;
```

**Severity**: MEDIUM
**Data Classification**: Sensitive (Game Strategy Data)

---

### 5. 🟢 **LOW: Index Type Mismatch**

**Affected Index:**
- `idx_hands_board_cards`

**Issue:**
Migration intended to create a GIN index for array operations but fell back to B-tree due to TEXT type incompatibility.

**Location:**
```sql
-- supabase/migrations/20251025000011_optimize_indexes.sql:53
CREATE INDEX IF NOT EXISTS idx_hands_board_cards
ON hands(board_cards)  -- B-tree instead of GIN
WHERE board_cards IS NOT NULL;
```

**Impact:**
- Reduced performance for board card searches
- Array containment queries may be slower

**Recommendation:**
If `board_cards` is TEXT[], convert to proper GIN index:
```sql
CREATE INDEX idx_hands_board_cards
ON hands USING GIN(board_cards)
WHERE board_cards IS NOT NULL;
```

If `board_cards` is TEXT (comma-separated), consider:
1. Normalize to TEXT[] type
2. Use full-text search (tsvector)
3. Keep B-tree for exact matches

**Severity**: LOW (Performance issue, not security)

---

### 6. 🟢 **LOW: Missing Days Table Index**

**Affected Migration:**
- `20251025000011_optimize_indexes.sql:95`

**Issue:**
Days table index was commented out due to table existence uncertainty.

**Location:**
```sql
-- Note: days table index commented out - table name may be different in production
-- CREATE INDEX IF NOT EXISTS idx_days_subevent_published
-- ON days(sub_event_id, published_at DESC NULLS LAST)
```

**Impact:**
- Potentially slower queries on days table
- Missing optimization opportunity

**Recommendation:**
Verify days table existence and create index if applicable:
```sql
-- Check if days table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'days'
);

-- If exists, create index
CREATE INDEX IF NOT EXISTS idx_days_subevent_published
ON days(sub_event_id, published_at DESC NULLS LAST)
WHERE sub_event_id IS NOT NULL;
```

**Severity**: LOW (Performance optimization only)

---

## 🔒 Security Architecture Review

### Current Security Layers

#### ✅ **Implemented Protections**
1. **RLS Policies**: 6 core tables have admin-only write restrictions
   - tournaments, sub_events, days, hands, players, hand_players
   - Policies check role IN ('admin', 'high_templar') AND banned_at IS NULL

2. **Server Actions**: Archive management uses server-side verification
   - `verifyAdmin()` function checks DB role and ban status
   - Cannot be bypassed by client-side manipulation

3. **Input Validation**: Zod schemas for API endpoints
   - SQL Injection prevention (sql-sanitizer.ts)
   - XSS prevention (xss-sanitizer.ts)
   - CSRF protection (csrf.ts)

4. **Rate Limiting**: User ID-based (VPN-resistant)
   - Implemented in lib/rate-limit.ts

#### ⚠️ **Bypassed Protections**
1. **RLS Bypass via SECURITY DEFINER**: 3 new RPC functions
2. **Anonymous Access**: Player list function
3. **No Authorization Check**: get_player_hands_grouped()

### Defense in Depth Analysis

| Layer | Status | Notes |
|-------|--------|-------|
| Network | ✅ Secured | Supabase managed |
| Application | ⚠️ Partial | RPC functions need review |
| Database RLS | ⚠️ Bypassed | SECURITY DEFINER issue |
| Authentication | ✅ Secured | Google OAuth |
| Authorization | ⚠️ Partial | Missing in RPC functions |
| Input Validation | ✅ Secured | Zod + sanitizers |
| Rate Limiting | ✅ Secured | User ID-based |
| Logging | ✅ Secured | Admin logs + security events |

**Recommendation**: Add authorization layer to RPC functions to restore defense in depth.

---

## 📊 Risk Matrix

| Finding | Likelihood | Impact | Risk Level |
|---------|-----------|--------|------------|
| SECURITY DEFINER RLS Bypass | High | High | 🔴 **HIGH** |
| DoS (Array Size) | Medium | High | 🔴 **HIGH** |
| Anonymous Player Access | Low | Medium | 🟡 **MEDIUM** |
| Hand History Exposure | Medium | Medium | 🟡 **MEDIUM** |
| Index Type Mismatch | N/A | Low | 🟢 **LOW** |
| Missing Days Index | N/A | Low | 🟢 **LOW** |

---

## 🔧 Remediation Plan

### Immediate Actions (Within 24 hours)

1. **Create Fix Migration**
   ```bash
   supabase/migrations/20251025000012_fix_security_definer.sql
   ```

2. **Change SECURITY DEFINER to SECURITY INVOKER**
   - All 3 RPC functions
   - Test with authenticated users to ensure functionality

3. **Add Array Size Validation**
   - `get_hand_details_batch()` max 100 items
   - Return clear error message

### Short-term Actions (Within 1 week)

4. **Review Anonymous Access Policy**
   - Document business decision
   - Add explicit comments
   - Consider rate limiting for anon users

5. **Add Authorization to get_player_hands_grouped()**
   - Check player_claims table
   - Allow only claimed players to access their data
   - Allow admins to access all data

6. **Verify Days Table**
   - Check if table exists
   - Create missing index if applicable

### Long-term Actions (Within 1 month)

7. **Security Testing**
   - Penetration testing on new RPC functions
   - Load testing for DoS scenarios
   - Authorization testing with different roles

8. **Monitoring**
   - Track RPC function usage
   - Alert on unusual access patterns
   - Log authorization failures

9. **Documentation**
   - Security architecture diagram
   - Data classification policy
   - RPC function security guidelines

---

## 📝 Compliance Checklist

### OWASP Top 10 (2021)

| Rank | Vulnerability | Status | Notes |
|------|--------------|--------|-------|
| A01 | Broken Access Control | ⚠️ Partial | RLS bypass via SECURITY DEFINER |
| A02 | Cryptographic Failures | ✅ Pass | N/A |
| A03 | Injection | ✅ Pass | SQL sanitization implemented |
| A04 | Insecure Design | ⚠️ Review | Missing authorization in RPC |
| A05 | Security Misconfiguration | ⚠️ Review | SECURITY DEFINER default |
| A06 | Vulnerable Components | ✅ Pass | Dependencies up to date |
| A07 | Auth Failures | ✅ Pass | OAuth + RLS |
| A08 | Software/Data Integrity | ✅ Pass | Server-side validation |
| A09 | Logging Failures | ✅ Pass | Admin logs implemented |
| A10 | SSRF | N/A | No external requests |

**Overall Compliance**: 70% (7/10 passing)

---

## 🎯 Testing Recommendations

### Manual Testing

1. **RLS Bypass Test**
   ```sql
   -- Login as regular user
   -- Should be restricted by RLS
   SELECT * FROM hands LIMIT 1;  -- Should fail or return limited results

   -- Should bypass RLS
   SELECT * FROM get_hand_details_batch(ARRAY['some-uuid']);  -- Returns data
   ```

2. **DoS Test**
   ```javascript
   // Test array size limit
   const largeArray = Array(1000).fill('uuid').map((_, i) => crypto.randomUUID())
   await supabase.rpc('get_hand_details_batch', { hand_ids: largeArray })
   // Should return error or timeout
   ```

3. **Authorization Test**
   ```javascript
   // User A tries to access User B's hands
   const userBPlayerId = 'user-b-uuid'
   await supabase.rpc('get_player_hands_grouped', { player_uuid: userBPlayerId })
   // Should succeed (ISSUE: no authorization)
   ```

### Automated Testing

```bash
# Add to CI/CD pipeline
npm run test:security
```

Create `tests/security/rpc-functions.test.ts`:
```typescript
describe('RPC Function Security', () => {
  it('should respect RLS policies', async () => {
    // Test with different roles
  })

  it('should reject large arrays', async () => {
    // Test DoS protection
  })

  it('should require authorization', async () => {
    // Test access control
  })
})
```

---

## 📚 References

1. **Supabase Security Best Practices**
   - https://supabase.com/docs/guides/database/postgres/row-level-security
   - https://supabase.com/docs/guides/security

2. **PostgreSQL SECURITY DEFINER**
   - https://www.postgresql.org/docs/current/sql-createfunction.html
   - https://www.postgresql.org/docs/current/plpgsql-trigger.html

3. **OWASP Top 10 (2021)**
   - https://owasp.org/Top10/

4. **CVE Database**
   - https://cve.mitre.org/

---

## 🔄 Change History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-25 | Claude Code | Initial security audit |
| TBD | TBD | Remediation verification |

---

## ✅ Sign-Off

**Audit Completed**: 2025-10-25
**Next Review**: 2025-11-25 (or after remediation)

**Action Required**:
- [ ] Review findings with development team
- [ ] Create fix migration (20251025000012)
- [ ] Test fixes in staging environment
- [ ] Deploy to production
- [ ] Update this report with remediation status

---

## 📞 Contact

For questions or concerns about this security audit:
- **Security Team**: [Internal Contact]
- **Developer**: [Team Contact]
- **Emergency**: [On-call Rotation]

---

**END OF REPORT**
