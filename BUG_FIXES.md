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

### 5.e - Waitlist Status on Game Cards
**Status:** Pending  
**Description:** The game card should indicate the user is waitlisted (if they already applied). Perhaps replace the line that says "X Slots available" and show "You are already on the waitlist" (mobile and desktop).  
**Files Affected:** `frontend/app/calendar/page.tsx`, `frontend/src/components/CalendarView.tsx` (if exists)  
**Fix Required:** Check user's application status and show waitlist message instead of slots available.

### 5.f - Completed Matches Showing as Pending
**Status:** Pending  
**Description:** Calendar is showing matches that should be completed. The game card is pending, but when clicking view details and accessing Match/ID, the game properly shows as completed (mobile and desktop).  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Filter out completed matches from calendar view or update match status check.

---

## Issue 6: Match/ID Page

### 6.a - Apply Button Update Delay
**Status:** Pending  
**Description:** When a user applies to a match, continues to show "Apply" for 3 to 5 minutes. The change takes too long to reflect to the user (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`  
**Fix Required:** Optimistic UI update or faster refresh after application submission.

### 6.b - Mobile Confirm/Reject Buttons
**Status:** Pending  
**Description:** Mobile - When Creator accesses their match and has applicants, the Confirm/Reject button should be on the same line. UI for Mobile is too big and hard to navigate.  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`  
**Fix Required:** Make buttons inline on mobile, reduce button sizes.

### 6.i - Improve Manage Applications UI for Mobile
**Status:** Pending  
**Description:** The "Manage Applications" section is too crowded on mobile. The page needs optimization for better mobile UX.  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`, `frontend/src/components/ApplicationsTable.tsx`  
**Fix Required:** 
- Remove the informational text box: "As the match creator, you can review and manage applications from players who want to join this match." (lines 531-535 in `frontend/app/matches/[id]/page.tsx`)
- Optimize mobile card layout:
  - **Option 1 (Recommended):** Replace the "pending" status badge in the header with two badge icons (checkmark for Confirm, X for Reject) that are clickable. This saves vertical space and makes actions more accessible.
  - **Option 2:** Keep buttons at bottom but make them smaller (reduce padding, use icon-only buttons with tooltips, or use compact button style)
  - Reduce spacing between card elements
  - Consider collapsing less critical stats (e.g., Cancellation Rate) behind a "Show more" toggle
  - Reduce card padding on mobile
- Ensure buttons are easily tappable (minimum 44x44px touch target)

### 6.c - Waitlist Status Display
**Status:** Pending  
**Description:** If user is waitlisted, the timeslot should show "Waitlist", not "Confirmed". It's misleading for that user (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`  
**Fix Required:** Show correct status based on user's application status, not match status.

### 6.d - Chat Visibility
**Status:** Pending  
**Description:** Chat area should not be displayed for ANY user other than Creator and Accepted Applicant (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`  
**Fix Required:** Add conditional rendering to check if user is creator or confirmed applicant.

### 6.e - Report Visibility
**Status:** Pending  
**Description:** Report should not show for ANY user other than Creator and Accepted Applicant (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`  
**Fix Required:** Add conditional rendering similar to chat.

### 6.f - Chat History After Withdrawal
**Status:** Pending  
**Description:** If a user removes themselves from a match, Creator should see a cleared up chat box. Right now they can see the history creator had with previous opponent (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`, `backend/src/chat/chat.service.ts`  
**Fix Required:** Clear or hide chat history when applicant withdraws.

### 6.h - Multiple Time Slot Applications
**Status:** Pending  
**Description:** When a match has multiple time slots, Applicants can apply to more than 1, even all time slots. Match Creator can accept just 1. When one time slot is accepted, the whole match is confirmed.  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`, `backend/src/applications/applications.service.ts`  
**Fix Required:** Prevent applicants from applying to multiple slots of the same match, or handle this case properly.

---

## Issue 7: Dashboard

### 7.b - Matches Table Visibility
**Status:** Pending  
**Description:** Mobile - When user has matches, either creator or applicant, it's not intuitive there is a table with matches scrolling down.  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Add visual indicator or improve layout to show matches section is scrollable.

### 7.c - Edit Button for Matches with Applicants
**Status:** Pending  
**Description:** If there are applicants to a match, then creator should not be able to edit. Change EDIT button to "Manage?" or just not show the EDIT as user can click the row/card and access to Match/ID for management (mobile and desktop).  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Conditionally show/hide or change Edit button based on applicant count.

### 7.e - Edit Button Visibility for Creators Without Applicants
**Status:** Pending  
**Description:** In dashboard, game creator should see EDIT button if they don't have applicants (mobile and desktop).  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Show EDIT button for match creators when `hasAnyApplicants` is false. Currently `canEdit` is hardcoded to `false` on lines 468 and 718.

### 7.d - Match Status Colors
**Status:** Pending  
**Description:** Matches section should have different color for Status "Applied" vs "Completed" and we should also show "Waitlisted" (mobile and desktop).  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Add color coding for different match statuses and show waitlisted status.

---

## Issue 8: Report Score

### 8.2 - Post-Score Report Redirect
**Status:** Pending  
**Description:** After reporting score, user should land in Dashboard (mobile and desktop).  
**Files Affected:** Score reporting component/page  
**Fix Required:** Redirect to dashboard after successful score submission.

---

## Issue 9: Notifications (Settings)

### 9.1 - Match Applicants Toggle
**Status:** Pending  
**Description:** Add a "Match applicants" toggle, defaulted to OFF (mobile and desktop).  
**Files Affected:** `frontend/app/notifications/page.tsx` or settings page, `backend/src/notifications/notifications.service.ts`  
**Fix Required:** Add new notification preference type and toggle in UI.

### 9.2 - Default Email for Match Applications
**Status:** Pending  
**Description:** Do not send match applications email by default. Right now, we don't have the toggle and we are getting emails (mobile and desktop).  
**Files Affected:** `backend/src/notifications/notifications.service.ts`, `backend/src/applications/applications.service.ts`  
**Fix Required:** Change default email preference for MATCH_ACCEPTED to false, or add toggle first (9.1).

---

## Notes

- All fixes should be tested on both mobile and desktop unless specified otherwise.
- Mobile-first approach should be maintained.
- All UI elements should meet minimum touch target sizes (44x44px).


