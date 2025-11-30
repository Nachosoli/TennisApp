# Bug Fixes Tracking Document

This document tracks all reported bugs and their fixes.

## Issue 3: Notifications

### 3.a - Notification Bell Indicator
**Status:** Pending  
**Description:** Notification bell does not show an indicator when there is a new notification (mobile and desktop).  
**Files Affected:** `frontend/src/components/NotificationBell.tsx`  
**Fix Required:** Add visual indicator (badge/dot) when unreadCount > 0.

**Implementation Plan:**
- Treat “unread” as a frontend concern (notifications the user hasn’t opened yet), separate from backend delivery `status` (`pending` / `sent`).
- Extend the `Notification` type in `frontend/src/types/index.ts` with an optional `read?: boolean` field used only on the client.
- In `frontend/src/stores/notifications-store.ts`:
  - Initialize loaded notifications with `read: false` (or preserve `read` if already present).
  - Compute `unreadCount` from `!notification.read` instead of `status === 'pending'`.
  - Ensure `addNotification` inserts new notifications with `read: false` and increments `unreadCount`.
  - Update `markAsRead` to set `read: true` and recalculate `unreadCount`.
- In `frontend/src/components/NotificationBell.tsx`, keep rendering the red dot when `unreadCount > 0`, and ensure clicking a notification (or optionally “View All”) calls `markAsRead` for the appropriate items.
- (Future phase) If persistent unread state is needed across sessions/devices, add a `readAt`/`isRead` field to the backend `Notification` entity and API, then wire the frontend to it.

### 3.b - Duplicate Notifications
**Status:** Pending  
**Description:** Notifications are duplicated (mobile and desktop).  
**Files Affected:** `frontend/src/stores/notifications-store.ts`, `frontend/src/components/NotificationBell.tsx`, `frontend/app/notifications/page.tsx`  
**Fix Required:** Fix deduplication logic in notification store and prevent duplicate fetches.

**Implementation Plan:**
- Long term, model each logical notification event once in the backend and treat delivery channels (email/SMS/push) as separate delivery records:
  - Keep `Notification` as the logical event (user, type, content, metadata, createdAt).
  - Introduce a `NotificationDelivery` entity/table with `notificationId`, `channel`, `status`, `sentAt`, and `retryCount`.
- Add a migration to:
  - Create the `notification_deliveries` table and foreign key to `notifications`.
  - Migrate existing rows by grouping old notifications by `(user_id, type, content, created_at)` into single `Notification` events and creating one `NotificationDelivery` per original row.
- In `backend/src/notifications/notifications.service.ts`:
  - Change `createNotification` to create one `Notification` per event plus one-or-more `NotificationDelivery` rows based on the user’s preferences.
  - Update `processNotifications` and `retryFailedNotifications` to operate on deliveries while updating the parent notification as needed.
  - Emit a socket `notification` event once per logical `Notification`, not once per delivery.
- In the API/controller, ensure `/notifications` returns one item per logical notification, optionally including a `channels: NotificationChannel[]` field.
- On the frontend:
  - Update the `Notification` interface in `frontend/src/types/index.ts` to match the new shape (and optional `channels` list).
  - Keep `useNotificationsStore` (`notifications`, `addNotification`, `unreadCount`) working against one event per item; with the backend unified, the bell and `/notifications` page will naturally stop showing duplicates.

### 3.c - Clear All Notifications
**Status:** Pending  
**Description:** Notification page, when user clicks "Clear all", should show a clear/empty page (mobile and desktop).  
**Files Affected:** `frontend/app/notifications/page.tsx`  
**Fix Required:** Ensure notifications array is cleared and empty state is shown.

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


