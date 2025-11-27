/**
 * Supabase Client Stub
 *
 * 이 파일은 Firestore 마이그레이션 중 레거시 호환성을 위한 스텁입니다.
 * 실제 Supabase 기능은 사용되지 않으며, 모든 메서드는 빈 결과를 반환합니다.
 *
 * TODO: 전체 Firestore 마이그레이션 완료 후 이 파일과 관련 의존성 제거
 *
 * @deprecated Firestore로 마이그레이션됨
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientStub = {
  from: (table: string) => {
    select: (columns?: string, options?: unknown) => Promise<{ data: null; error: null; count: number }>
    insert: (data: unknown) => Promise<{ data: null; error: null }>
    update: (data: unknown) => { eq: (col: string, val: unknown) => Promise<{ data: null; error: null }> }
    delete: () => { eq: (col: string, val: unknown) => Promise<{ data: null; error: null }> }
    eq: (col: string, val: unknown) => {
      single: () => Promise<{ data: null; error: null }>
      order: (col: string, opts?: unknown) => Promise<{ data: []; error: null }>
    }
  }
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: unknown) => Promise<{ data: null; error: null }>
      download: (path: string) => Promise<{ data: null; error: null }>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>
    getSession: () => Promise<{ data: { session: null }; error: null }>
    onAuthStateChange: (callback: unknown) => { data: { subscription: { unsubscribe: () => void } } }
  }
}

function createStubClient(): SupabaseClientStub {
  const stubQuery = {
    select: async () => ({ data: null, error: null, count: 0 }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
    eq: () => ({
      single: async () => ({ data: null, error: null }),
      order: async () => ({ data: [], error: null }),
    }),
  }

  return {
    from: () => stubQuery,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.stub/${path}` } }),
      }),
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  }
}

/**
 * @deprecated Firestore로 마이그레이션됨. firebase.ts를 대신 사용하세요.
 */
export function createClientSupabaseClient(): SupabaseClientStub {
  console.warn('[supabase-client] DEPRECATED: Use firebase.ts instead. This is a stub.')
  return createStubClient()
}

/**
 * @deprecated Firestore로 마이그레이션됨. firebase.ts를 대신 사용하세요.
 */
export function createBrowserSupabaseClient(): SupabaseClientStub {
  console.warn('[supabase-client] DEPRECATED: Use firebase.ts instead. This is a stub.')
  return createStubClient()
}
