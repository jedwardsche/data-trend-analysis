# Sending a Sign-In Link via the CHE Lambda Email Service

## Overview

Sign-in emails bypass Firebase's default email sender entirely. The backend generates a Firebase sign-in link using the Admin SDK, then sends it through CHE's Lambda email API (`noreply@che.systems` via AWS SES).

```
Frontend (fetch) → Backend POST /auth/send-signin-link → Firebase Admin SDK (generate link) → Lambda API (send email) → AWS SES → noreply@che.systems
```

---

## 1. Frontend: Trigger the Sign-In Link

**File:** `frontend/src/services/apiService.ts`

```ts
async sendSignInLink(email: string, redirectUrl: string): Promise<SendSignInLinkResponse> {
  const url = `${getApiBaseUrl()}/auth/send-signin-link`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect_url: redirectUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

**Request body:**

| Field          | Type   | Description                                      |
| -------------- | ------ | ------------------------------------------------ |
| `email`        | string | Recipient email address                          |
| `redirect_url` | string | Where to send the user after clicking the link (e.g. `https://enroll.che.school/auth-redirect?email=...`) |

**This is a public endpoint** — no auth token required (it's the login flow).

After calling, store the email in `localStorage` so the app can complete sign-in when the user returns:

```ts
window.localStorage.setItem("emailForSignIn", email);
```

---

## 2. Backend: Generate Link and Send Email

**File:** `backend/app/functions/auth.py` — `POST /auth/send-signin-link`

### Request Model

```python
class SendSignInLinkRequest(BaseModel):
    email: EmailStr
    redirect_url: str
```

### What the Endpoint Does

1. **Checks Airtable** — looks up the email via `airtable_service.search_parents_by_email(email)`
2. **Checks Firebase** — calls `auth_client.get_user_by_email(email)`
3. **Account linking** (if needed):
   - Both exist → ensures custom claims (`airtableRecordId`) and Airtable `Firebase UID` field are in sync
   - Airtable only → calls the account-creation Lambda to create a Firebase user and link it
   - Neither → returns `404` with detail `"EMAIL_NOT_FOUND"`
4. **Generates the Firebase sign-in link:**

```python
action_code_settings = auth_client.ActionCodeSettings(
    url=request.redirect_url,
    handle_code_in_app=True,
)

sign_in_link = auth_client.generate_sign_in_with_email_link(
    request.email,
    action_code_settings
)
```

5. **Sends the email via Lambda service:**

```python
from app.services.lambda_email_service import send_firebase_signin_email

email_result = await send_firebase_signin_email(
    to=request.email,
    sign_in_link=sign_in_link,
    app_name="CHE Enrollment"
)
```

### Success Response

```json
{
  "success": true,
  "message": "Sign-in link sent successfully",
  "email": "parent@example.com",
  "lambda_response": { ... },
  "account_linked": false
}
```

---

## 3. Lambda Email Service

**File:** `backend/app/services/lambda_email_service.py`

### API Endpoint

```
POST https://api.che.systems/email/sendmail
```

### Authentication

```
Header: x-api-token: <LAMBDA_EMAIL_API_TOKEN>
```

Token is loaded via:

```python
LAMBDA_API_TOKEN = get_secret_or_env("LAMBDA_EMAIL_API_TOKEN", "LAMBDA_EMAIL_API_TOKEN")
```

This checks Google Cloud Secret Manager first, then falls back to the environment variable.

### `send_firebase_signin_email()` Function

```python
async def send_firebase_signin_email(
    to: str,
    sign_in_link: str,
    app_name: str = "CHE Enrollment",
    base_url: Optional[str] = None,
) -> Dict:
```

This wraps the generic `send_email()` with sign-in-specific defaults:

| Payload field | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| `to`          | Recipient email                                              |
| `subject`     | `"Sign in to CHE Enrollment"`                                |
| `template`    | `"firebase-signin"`                                          |
| `buttonText`  | `"Sign In"`                                                  |
| `buttonLink`  | The Firebase sign-in link                                    |
| `body`        | Fallback text about the link expiring in 15 minutes          |
| `baseUrl`     | App base URL (auto-detected or passed in)                    |

### Generic `send_email()` Payload Shape

The full payload sent to the Lambda API:

```json
{
  "to": "parent@example.com",
  "subject": "Sign in to CHE Enrollment",
  "template": "firebase-signin",
  "buttonText": "Sign In",
  "buttonLink": "https://enroll.che.school/__/auth/action?...",
  "body": "Click the button below to sign in...",
  "baseUrl": "https://enroll.che.school"
}
```

Optional fields (not used for sign-in, but supported by `send_email()`): `cc`, `bcc`, `attachments`.

---

## 4. Email Template

**File:** `backend/templates/firebase-signin.hbs`

Handlebars HTML template. Key variables:

| Variable       | Usage                              |
| -------------- | ---------------------------------- |
| `{{{body}}}`   | Main message text (triple-stache for raw HTML) |
| `{{buttonLink}}`| Sign-in link URL on the CTA button |
| `{{buttonText}}`| Button label (defaults to "Sign In") |

Design: CHE-branded, orange `#ea580c` CTA button, yellow security notice box, 10-minute expiration warning, footer linking to `che.school`.

---

## 5. Required Dependencies

### Python (backend)

| Package          | Purpose                             |
| ---------------- | ----------------------------------- |
| `firebase-admin` | `generate_sign_in_with_email_link`, `ActionCodeSettings`, user lookups |
| `httpx`          | Async HTTP client for Lambda API calls |
| `fastapi`        | API router and request handling     |
| `pydantic`       | Request model with `EmailStr` validation |

### Secret

| Name                      | Source                        | Required |
| ------------------------- | ----------------------------- | -------- |
| `LAMBDA_EMAIL_API_TOKEN`  | Google Cloud Secret Manager or env var | Yes |

---

## 6. Error Handling

| Scenario                          | HTTP Status | Detail              |
| --------------------------------- | ----------- | -------------------- |
| Email not in Airtable or Firebase | `404`       | `EMAIL_NOT_FOUND`    |
| Missing API token                 | `500`       | `ValueError` raised  |
| Lambda API HTTP error             | `500`       | Parsed error from Lambda response |
| Lambda connection failure         | `500`       | `"Failed to connect to email service"` |

The frontend checks for `EMAIL_NOT_FOUND` specifically and handles account-linking errors silently (the backend may still send the link despite linking issues).

---

## 7. Completing Sign-In (After User Clicks the Link)

When the user clicks the email link and lands back on the app:

```ts
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";

if (isSignInWithEmailLink(auth, window.location.href)) {
  const email = window.localStorage.getItem("emailForSignIn");
  await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem("emailForSignIn");
}
```

This is handled in `frontend/src/contexts/AuthContext.tsx` via the `signInWithLink()` method.
