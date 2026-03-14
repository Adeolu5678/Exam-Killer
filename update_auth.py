import re

with open('SSD.md', 'r', encoding='utf-8') as f:
    content = f.read()


auth_target = """### 4.3 Supabase Auth Configuration

```typescript
// lib/supabase/auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ... set and remove methods
      },
    }
  );
};
```"""

auth_replacement = """### 4.3 Firebase Auth Configuration

```typescript
// lib/firebase/auth.ts
import { auth } from './config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return await signOut(auth);
};
```"""

content = content.replace(auth_target, auth_replacement)

# Flow Target
flow_target = """// Auth configuration (set in Supabase dashboard)
// 1. Email confirmations: Disabled for MVP (reduce friction)
// 2. JWT expiry: 3600 seconds (1 hour)
// 3. Refresh token: Enabled (rolling)

export const getAuthUser = async () => {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  
  // Get full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return { ...user, ...profile };
};"""

flow_replacement = """// Authentication flow (set in Firebase console)
// 1. User signs up with email/password
// 2. Auth creates user record
// 3. User document is created in Firestore `users` collection

// Example API Route Wrapper for checking auth
export async function getAuthUser(req) {
  // Use firebase-admin to verify session cookie or ID token
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return null;
    
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get full profile from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data()
    };
  } catch (error) {
    return null;
  }
}"""
content = content.replace(flow_target, flow_replacement)

# Middleware
mw_target = """// middleware.ts
import { createMiddlewareClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protect dashboard and practice routes
  if (!session && (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/practice') ||
    req.nextUrl.pathname.startsWith('/courses/view') ||
    req.nextUrl.pathname.startsWith('/question')
  )) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Check paid status for protected routes
  if (session && (
    req.nextUrl.pathname.startsWith('/practice') ||
    req.nextUrl.pathname.startsWith('/question')
  )) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, free_explanations_used, free_explanations_limit')
      .eq('id', session.user.id)
      .single();
      
    // Redirect logic handled in components for paywall
  }

  return res;
}"""

mw_replacement = """// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Firebase Auth state is typically verified via API routes or client-side observers,
  // but session cookies can be verified here if implemented.
  
  // Example for simple path protection (client assumes true, server re-verifies via API later)
  const sessionToken = req.cookies.get('session');
  
  if (req.nextUrl.pathname.startsWith('/dashboard') && !sessionToken) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  return res;
}"""
content = content.replace(mw_target, mw_replacement)

# Provider
pr_target = """// Client components auth
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      }
    });
    
    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  async function fetchProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    setUser({ id: userId, ...profile });
  }
  
  return { user };
}"""

pr_replacement = """// Initial client wrapper for Firebase auth listener
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional profile data
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser({ ...firebaseUser, ...profileDoc.data() });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Provide user context...
}"""
content = content.replace(pr_target, pr_replacement)

# Config
cfg_target = """# Database Config (Supabase)
# ==========================================
# Get these from Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# KEEP THIS SECRET! Never expose to client.
# Need this for admin operations like verifying payments and assigning premium
SUPABASE_SERVICE_ROLE_KEY=eyJ...  // Admin operations

# For local development against Supabase CLI (optional)
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI Config
# ==========================================
OPENAI_API_KEY=sk-proj-...
# Optional: track usage per environment
# OPENAI_ORG_ID=org-...

# Paystack Config
# ==========================================
# Public key for client-side checkout
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
# Secret key for server-side verification
PAYSTACK_SECRET_KEY=sk_test_...
```

### 7.2 Configuration Validation

Create a central config validation on startup:

```typescript
// lib/config.ts
export function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const config = {
  supabase: {
    supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    // Only required on server
    supabaseServiceKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
  },
  paystack: {
    publicKey: getEnvVar('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'),
    secretKey: getEnvVar('PAYSTACK_SECRET_KEY'),
  }
};"""

cfg_replacement = """# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="exam-killer-xxxx.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="exam-killer-xxxx"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="exam-killer-xxxx.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:xxx:web:yyy"

# Firebase Admin SDK (Keep Secret!)
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@exam-killer-xxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...=\n-----END PRIVATE KEY-----\n"

# OpenAI Database Config
OPENAI_API_KEY=sk-proj-...

# Paystack Config
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
```

### 7.2 Configuration Validation

Create a central config validation on startup:

```typescript
// lib/config.ts
export const config = {
  firebase: {
    apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    clientEmail: getEnvVar('FIREBASE_CLIENT_EMAIL'),
    privateKey: getEnvVar('FIREBASE_PRIVATE_KEY'),
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
  },
  paystack: {
    publicKey: getEnvVar('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'),
    secretKey: getEnvVar('PAYSTACK_SECRET_KEY'),
  }
};"""

content = content.replace(cfg_target, cfg_replacement)

with open('SSD.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates applied.")
