import re

with open('SSD.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. High-Level Architecture
arch_target = """    subgraph Supabase
        AUTH[Supabase Auth]
        DB[(PostgreSQL)]
        STORAGE[Storage Buckets]
        RLS[Row Level Security]
    end

    subgraph External
        OPENAI[OpenAI GPT-4o API]
        PAYSTACK[Paystack API]
    end

    WEB --> NEXT
    MOBILE --> NEXT
    NEXT --> MW
    MW --> AUTH
    MW --> API
    API --> DB
    API --> STORAGE
    API --> OPENAI
    API --> PAYSTACK
    AUTH --> DB
    DB --> RLS"""

arch_replacement = """    subgraph Firebase
        AUTH[Firebase Auth]
        DB[(Firestore NoSQL)]
        STORAGE[Cloud Storage]
        RULES[Security Rules]
    end

    subgraph External
        OPENAI[OpenAI GPT-4o API]
        PAYSTACK[Paystack API]
    end

    WEB --> NEXT
    MOBILE --> NEXT
    NEXT --> MW
    MW --> AUTH
    MW --> API
    API --> DB
    API --> STORAGE
    API --> OPENAI
    API --> PAYSTACK
    AUTH --> DB
    DB --> RULES"""

content = content.replace(arch_target, arch_replacement)

# 2. Request Flow
flow_target = """    participant A as Supabase Auth"""
flow_replacement = """    participant A as Firebase Auth"""
content = content.replace(flow_target, flow_replacement)

# 3. Database Schema
# we need to replace everything from `## 2. Complete Database Schema` up to `## 3. API Endpoints Specification`
schema_pattern = re.compile(r"## 2\. Complete Database Schema.*?---\s*## 3\. API Endpoints", re.DOTALL)

schema_replacement = """## 2. Complete Database Schema (Firestore)

### 2.1 Collections & Subcollections

```javascript
/* 
🔥 Firestore Database Structure 
*/

users (Collection)
  - uid (String, Document ID from Firebase Auth)
  - email (String)
  - full_name (String)
  - subscription_status (String: 'free' | 'premium' | 'active')
  - subscription_tier (String)
  - paid_until (Timestamp)
  - free_explanations_used (Number)
  - created_at (Timestamp)

courses (Collection)
  - course_id (String, Auto-ID)
  - code (String, e.g., "CSC 101")
  - title (String)
  - department (String)
  - level (Number)
  - is_active (Boolean)
  - created_at (Timestamp)

topics (Collection)
  - topic_id (String, Auto-ID)
  - course_id (String, Refers to courses)
  - name (String)
  - question_count (Number)

questions (Collection)
  - question_id (String, Auto-ID)
  - course_id (String, Refers to courses)
  - topic_id (String, Refers to topics)
  - year (Number)
  - semester (String)
  - question_number (Number)
  - question_text (String)
  - question_image_url (String) -- Pulled from Cloud Storage
  - explanation_status (String: 'pending' | 'completed')
  - created_at (Timestamp)

explanations (Collection)
  - explanation_id (String, matches question_id)
  - question_id (String)
  - explanation_text (String)
  - step_by_step (Array of Objects)
  - formulas_used (Array of Strings)
  - model_used (String)
  - generated_at (Timestamp)

payments (Collection)
  - payment_id (String, Paystack Reference)
  - user_id (String)
  - amount_kobo (Number)
  - status (String: 'success' | 'failed' | 'pending')
  - initiated_at (Timestamp)
```

### 2.2 Firebase Security Rules (Replaces RLS)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Auth requirement helper
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Users can only view and edit their own profiles
    match /users/{userId} {
      allow read, update: if isSignedIn() && request.auth.uid == userId;
      allow create: if isSignedIn();
    }
    
    // Courses and topics are globally readable
    match /courses/{courseId} {
      allow read: if true;
    }
    match /topics/{topicId} {
      allow read: if true;
    }
    
    // Questions are readable by everyone
    match /questions/{questionId} {
      allow read: if true;
    }
    
    // Explanations can only be read if user is premium or has free credits available
    match /explanations/{explanationId} {
      allow read: if isSignedIn() && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.subscription_status == 'premium' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.free_explanations_used < 3
      );
    }
    
    // Payments are strictly API-only (Next.js server writes/verifies via Firebase Admin)
    match /payments/{paymentId} {
      allow read: if isSignedIn() && resource.data.user_id == request.auth.uid;
      allow write: if false; // Only Admin SDK can write
    }
  }
}

// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /questions/{allPaths=**} {
      allow read: if true; // Publicly accessible past question images
      allow write: if false; // Admin-only uploads
    }
  }
}
```

---

## 3. API Endpoints"""

content = schema_pattern.sub(schema_replacement, content)

with open('SSD.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("Architecture and DB schema updated.")
