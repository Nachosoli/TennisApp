# Bug Fixes Tracking Document

This document tracks all reported bugs and their fixes.

---

## Issue 4: Create User / Email Verification

### 4.b - Email Verification Status Bug
**Status:** Pending  
**Description:** After user accesses the mail to verify their email address and clicks the link, their account shows "Pending Email verification" on Profile page. When manually flagged Phone verified in Database, then Email showed as verified. There's a bug likely checking if both fields (email and phone) are verified. Phone Number verification needs to remain hardcoded to True as we don't have Twilio integration, but email should be fully operative (mobile and desktop).  
**Files Affected:** `frontend/app/profile/page.tsx`, `backend/src/auth/auth.service.ts`  
**Fix Required:** Fix email verification status check to be independent of phone verification. Ensure phoneVerified defaults to true, emailVerified works independently.

---

## Issue 5: Calendar Page

### 5.c - Sticky Filters on Mobile
**Status:** Pending  
**Description:** Mobile - When user scrolls down, Filters remain on top consuming half screen.  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Make filters collapsible or reduce sticky header size on mobile.

---

## Issue 6: Match/ID Page

### 6.f - Chat History After Withdrawal
**Status:** Pending  
**Description:** If a user removes themselves from a match, Creator should see a cleared up chat box. Right now they can see the history creator had with previous opponent (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`, `backend/src/chat/chat.service.ts`  
**Fix Required:** Clear or hide chat history when applicant withdraws.

---

## Issue 7: Dashboard

---

---

## Notes

- All fixes should be tested on both mobile and desktop unless specified otherwise.
- Mobile-first approach should be maintained.
- All UI elements should meet minimum touch target sizes (44x44px).


