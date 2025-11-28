# Bug Fixes Tracking Document

This document tracks all reported bugs and their fixes.

## Issue 1: Profile Page

### 1.a - Mobile Profile Page Scroll Issue
**Status:** Pending  
**Description:** On mobile, when user saves the home court, screen is not centered. User has to scroll up a lot. Bad UX.  
**Files Affected:** `frontend/app/profile/page.tsx`  
**Fix Required:** Scroll to top or center the form after saving facility.

### 1.b - Form Reset on Save Facility
**Status:** Pending  
**Description:** When user clicks "Save Facility", the form resets previously populated values like Gender and Bio. Affects mobile and desktop.  
**Files Affected:** `frontend/app/profile/page.tsx`  
**Fix Required:** Preserve form values when saving facility separately.

---

## Issue 2: Navigation

### 2.a - Mobile Navigation Background
**Status:** Pending  
**Description:** On mobile, left-hand navigation shows a black background on the right. Should be a "drop left" overlay on the current page. Currently looks like a new page with black background.  
**Files Affected:** `frontend/src/components/layout/NavigationBar.tsx`  
**Fix Required:** Change mobile menu to overlay instead of full-screen with black background.

---

## Issue 3: Notifications

### 3.a - Notification Bell Indicator
**Status:** Pending  
**Description:** Notification bell does not show an indicator when there is a new notification (mobile and desktop).  
**Files Affected:** `frontend/src/components/NotificationBell.tsx`  
**Fix Required:** Add visual indicator (badge/dot) when unreadCount > 0.

### 3.b - Duplicate Notifications
**Status:** Pending  
**Description:** Notifications are duplicated (mobile and desktop).  
**Files Affected:** `frontend/src/stores/notifications-store.ts`, `frontend/src/components/NotificationBell.tsx`, `frontend/app/notifications/page.tsx`  
**Fix Required:** Fix deduplication logic in notification store and prevent duplicate fetches.

### 3.c - Clear All Notifications
**Status:** Pending  
**Description:** Notification page, when user clicks "Clear all", should show a clear/empty page (mobile and desktop).  
**Files Affected:** `frontend/app/notifications/page.tsx`  
**Fix Required:** Ensure notifications array is cleared and empty state is shown.

### 3.d - Mobile Notification Dropdown
**Status:** Pending  
**Description:** On mobile, notification dropdown looks ugly, like the left navigation. Not centered and has a black background. Should display over the current page.  
**Files Affected:** `frontend/src/components/NotificationBell.tsx`  
**Fix Required:** Fix mobile styling to overlay properly without black background.

---

## Issue 4: Create User / Email Verification

### 4.a - Email Verification Message for Social Accounts
**Status:** Pending  
**Description:** When user creates a new account, we show a message about sending email to verify email address. Do not show this message to social account creation. For regular accounts, add a copy message saying something about checking spam folder.  
**Files Affected:** `frontend/app/auth/register/page.tsx`, `frontend/app/auth/callback/page.tsx`  
**Fix Required:** Conditionally show email verification message only for regular accounts, add spam folder message.

### 4.b - Email Verification Status Bug
**Status:** Pending  
**Description:** After user accesses the mail to verify their email address and clicks the link, their account shows "Pending Email verification" on Profile page. When manually flagged Phone verified in Database, then Email showed as verified. There's a bug likely checking if both fields (email and phone) are verified. Phone Number verification needs to remain hardcoded to True as we don't have Twilio integration, but email should be fully operative (mobile and desktop).  
**Files Affected:** `frontend/app/profile/page.tsx`, `backend/src/auth/auth.service.ts`  
**Fix Required:** Fix email verification status check to be independent of phone verification. Ensure phoneVerified defaults to true, emailVerified works independently.

---

## Issue 5: Calendar Page

### 5.a - Mobile Calendar Page Size
**Status:** Pending  
**Description:** Mobile - the whole page is too big for mobile. Create Match and Hide Map buttons are too big.  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Reduce button sizes and overall page spacing on mobile.

### 5.b - Filters Space on Mobile
**Status:** Pending  
**Description:** Mobile - Filters occupy too much space by default.  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Make filters more compact on mobile, possibly collapsible.

### 5.c - Sticky Filters on Mobile
**Status:** Pending  
**Description:** Mobile - When user scrolls down, Filters remain on top consuming half screen.  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Make filters collapsible or reduce sticky header size on mobile.

### 5.d - Match Cards Visibility
**Status:** Pending  
**Description:** Mobile - When user selects a day with matches in the calendar, it's not intuitive that there is a new section below with game cards.  
**Files Affected:** `frontend/app/calendar/page.tsx`  
**Fix Required:** Add visual indicator or scroll to match cards section when date is selected.

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

### 6.g - Automated Message Formatting
**Status:** Pending  
**Description:** The automated message (1st message in the chat) has a closing ")" on the date, but not an opening one (mobile and desktop).  
**Files Affected:** `backend/src/chat/chat.service.ts` or match creation service  
**Fix Required:** Fix the automated message formatting.

### 6.h - Multiple Time Slot Applications
**Status:** Pending  
**Description:** When a match has multiple time slots, Applicants can apply to more than 1, even all time slots. Match Creator can accept just 1. When one time slot is accepted, the whole match is confirmed.  
**Files Affected:** `frontend/app/matches/[id]/page.tsx`, `backend/src/applications/applications.service.ts`  
**Fix Required:** Prevent applicants from applying to multiple slots of the same match, or handle this case properly.

---

## Issue 7: Dashboard

### 7.a - Mobile Dashboard Size
**Status:** Pending  
**Description:** Mobile - The whole dashboard is too big, cards are too big. Needs to be revamped for Mobile UX.  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Reduce card sizes, spacing, and overall layout for mobile.

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

### 7.d - Match Status Colors
**Status:** Pending  
**Description:** Matches section should have different color for Status "Applied" vs "Completed" and we should also show "Waitlisted" (mobile and desktop).  
**Files Affected:** `frontend/app/dashboard/page.tsx`  
**Fix Required:** Add color coding for different match statuses and show waitlisted status.

---

## Issue 8: Report Score

### 8.1 - Score Report Player Order
**Status:** Pending  
**Description:** Report score screen should always show "Creator vs Opponent", using the real names, but in that order. If I am opponent I should see "Creator's name vs My Name". Right now, shows Current user 1st vs the other user 2nd (mobile and desktop).  
**Files Affected:** `frontend/app/matches/[id]/score/page.tsx` (if exists)  
**Fix Required:** Always show creator first, then opponent, regardless of who is viewing.

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


