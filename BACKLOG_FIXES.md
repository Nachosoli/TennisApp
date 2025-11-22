# Backlog Fixes

This document outlines all the fixes that need to be implemented based on user feedback and screenshots.

## 1. Profile Page - Phone Number Field Layout Issue

**File:** `frontend/app/profile/page.tsx`

**Problem:** The Phone Number field overlaps with the "Phone verified" text below it.

**Current Code Location:** Lines 534-567

**Solution:**
- Adjust the layout of the phone input section to prevent overlap
- Add proper spacing/margin between the phone input and the verification status text
- Consider using a flex layout with proper gap spacing or adding margin-top to the verification text

**Implementation:**
- Modify the phone input container (lines 534-567) to use a better layout structure
- Ensure the verification text has sufficient top margin to avoid overlap with the input field
- Test with both verified and unverified phone states

---

## 2. Profile Page - Gender Dropdown Default Value

**File:** `frontend/app/profile/page.tsx`

**Problem:** 
- Gender dropdown should default to the value from the database
- If gender is not defined in the database, it should be mandatory and default to "Select Gender"

**Current Code Location:** 
- Form initialization: Lines 149-167
- Gender dropdown: Lines 569-584
- Schema validation: Line 30

**Solution:**
- Update the form reset logic to properly set the gender value from the database
- If `user.gender` is null/undefined, set the default value to empty string ("") to show "Select Gender"
- Ensure the schema validation requires gender (already required in schema, but verify it's enforced)
- The dropdown should show "Select Gender" when value is empty

**Implementation:**
- In the `useEffect` that resets the form (lines 149-167), handle the case where gender is undefined:
  ```typescript
  gender: normalizedGender || '', // Use empty string if not defined
  ```
- Verify the gender dropdown (lines 573-580) properly shows "Select Gender" when value is empty
- Ensure form validation prevents submission without gender selected

---

## 3. Profile Page - Save Court When Updating Profile

**File:** `frontend/app/profile/page.tsx`

**Problem:** If a user adds a new Court (fills in the new facility form) and clicks "Update Profile" without clicking "Save Facility" first, the profile is saved but the court is not created.

**Current Code Location:**
- Court creation: Lines 251-302 (`handleCreateFacility`)
- Form submission: Lines 402-449 (`onSubmit`)

**Solution:**
- In the `onSubmit` function, check if there's a new facility form that needs to be saved
- If `showNewFacilityForm` is true and all required fields are filled, create the court first before updating the profile
- After court creation, use the new court ID to update the user's homeCourtId
- Then proceed with the profile update

**Implementation:**
- Modify `onSubmit` (lines 402-449) to check for pending court creation:
  ```typescript
  // Check if there's a new facility to create
  if (showNewFacilityForm && facilityName.trim() && newFacilityAddress.trim() && selectedGooglePlace) {
    // Create the facility first
    const newCourt = await courtsApi.create({...});
    selectedFacilityId = newCourt.id;
  }
  ```
- Ensure the court creation happens before the profile update
- Handle errors appropriately if court creation fails

---

## 4. Dashboard - Edit Match Button 404 Error

**File:** `frontend/app/dashboard/page.tsx`

**Problem:** The Edit button in the Matches table navigates to `/matches/${match.id}/edit`, but this route doesn't exist (404 error).

**Current Code Location:** Line 486

**Solution:**
- Create the edit match page at `frontend/app/matches/[id]/edit/page.tsx`
- The page should allow editing match details (date, time slots, format, etc.)
- Only allow editing if:
  - User is the creator
  - Match status is 'pending'
  - No confirmed participants

**Implementation:**
- Create new file: `frontend/app/matches/[id]/edit/page.tsx`
- Similar structure to `frontend/app/matches/create/page.tsx` but pre-filled with existing match data
- Add API endpoint in backend if needed: `PUT /api/v1/matches/:id`
- Update the backend `MatchesService.update()` method to handle match updates
- Ensure proper validation (can't edit if confirmed participants exist)

---

## 5. Dashboard - Match Status for Applied Matches

**File:** `frontend/app/dashboard/page.tsx`

**Problem:** 
- If a user applied to someone else's match, they should see that match with a status indicating they applied but the match hasn't been accepted/rejected yet
- If the application is rejected, don't show the match
- If the application is accepted/confirmed, show the match

**Current Code Location:** 
- Match fetching: Lines 56-74
- Status display: Lines 369-391
- Match filtering: Lines 66-68

**Solution:**
- Update `getMyMatches()` API call or filter logic to include matches where the user has applied
- Check if user has an application for each match
- Display appropriate status:
  - "Applied" - if user has pending application
  - "Confirmed" - if user's application was confirmed
  - Hide match if application was rejected
- Update status badge logic (lines 369-391) to handle "Applied" status

**Implementation:**
- Modify the match fetching logic to include matches where user has applications
- Add logic to check application status for each match:
  ```typescript
  const userApplication = match.slots?.find(slot => 
    slot.application?.applicantUserId === user?.id || slot.application?.userId === user?.id
  )?.application;
  
  if (userApplication?.status?.toLowerCase() === 'rejected') {
    // Don't show this match
    return false;
  }
  ```
- Update status display to show "Applied" when application is pending
- Ensure backend `getMyMatches()` endpoint returns matches where user has applications

---

## 6. Match Detail Page - Remove Home Court Validation for Applications

**Files:**
- `backend/src/applications/applications.service.ts`
- `frontend/app/matches/[id]/page.tsx`

**Problem:** Users without a home court cannot apply to matches. This validation should be removed. However, users should still have:
- Phone verified (if phone is provided)
- Email verified
- Gender defined

**Current Code Location:**
- Backend validation: `backend/src/applications/applications.service.ts` lines 59-62
- Frontend validation/warning: `frontend/app/matches/[id]/page.tsx` (check for any home court warnings)

**Solution:**
- Remove the home court check from `applyToSlot` method in `ApplicationsService`
- Keep the phone verification check (if phone is provided)
- Add email verification check
- Add gender check
- Remove any frontend warnings about home court requirement for applying

**Implementation:**
- In `backend/src/applications/applications.service.ts`:
  - Remove lines 59-62 (home court check)
  - Add email verification check:
    ```typescript
    if (!user.emailVerified) {
      throw new ForbiddenException('Please verify your email address before applying to matches');
    }
    ```
  - Add gender check:
    ```typescript
    if (!user.gender) {
      throw new ForbiddenException('Please set your gender in your profile before applying to matches');
    }
    ```
- Check frontend for any home court validation messages and remove them
- Update any error messages that reference home court requirement

---

## 7. Chat Messages Not Being Stored

**Files:**
- `frontend/src/lib/socket.ts`
- `frontend/src/components/ChatWindow.tsx`
- `frontend/src/hooks/useMatchChat.ts`
- `backend/src/chat/chat.gateway.ts`

**Problem:** 
- Chat messages are shown in the chat modal and can be sent, but messages are not being stored in the database
- After navigating away and coming back, messages disappear
- Opponents are not receiving messages

**Root Cause:**
- Frontend socket service emits `chat_message` event (line 70 in socket.ts)
- Backend gateway expects `send_message` event (line 98 in chat.gateway.ts)
- Frontend listens for `chat_message` event (line 76 in socket.ts)
- Backend emits `new_message` event (line 113 in chat.gateway.ts)
- There's a mismatch in event names between frontend and backend

**Current Code Location:**
- Frontend socket emit: `frontend/src/lib/socket.ts` line 68-72
- Frontend socket listener: `frontend/src/lib/socket.ts` line 74-78
- Backend gateway handler: `backend/src/chat/chat.gateway.ts` line 98-119
- Backend gateway emit: `backend/src/chat/chat.gateway.ts` line 113

**Solution:**
- Update frontend socket service to emit `send_message` instead of `chat_message`
- Update frontend socket service to listen for `new_message` instead of `chat_message`
- Ensure the socket event payload matches what backend expects: `{ matchId, message }`
- Verify that messages are being saved to database via `ChatService.createMessage()`
- Ensure messages are fetched from database when chat window loads

**Implementation:**
- In `frontend/src/lib/socket.ts`:
  - Change `sendMessage` method to emit `send_message` event (line 68-72)
  - Change `onMessage` method to listen for `new_message` event (line 74-78)
  - Update event payload structure to match backend DTO: `{ matchId, message }`
- In `frontend/src/components/ChatWindow.tsx`:
  - Ensure `fetchMessages` is called when component mounts to load existing messages
  - Verify that messages from socket are properly merged with existing messages
- In `frontend/src/hooks/useMatchChat.ts`:
  - Ensure socket listener is set up correctly for `new_message` event
  - Verify message structure matches ChatMessage type
- Test that messages persist after page refresh
- Test that opponents receive messages in real-time

---

## 8. Chat UI - Improve Visual Design

**File:** `frontend/src/components/ChatWindow.tsx`

**Problem:** The chat window doesn't look obviously like a chat interface. It needs better visual contrast and styling to make it clear it's a chat window.

**Current Code Location:** Lines 78-137

**Solution:**
- Add more prominent chat-like styling with better contrast
- Use a distinct background color or border to make it stand out
- Add chat bubble styling with shadows and rounded corners
- Improve spacing and typography
- Add a header/title bar to indicate it's a chat
- Consider adding chat icons or visual indicators

**Implementation:**
- Update the container styling (line 79) to have:
  - More prominent border or background
  - Shadow or elevation effect
  - Clear visual separation from surrounding content
- Add a chat header/title bar:
  ```typescript
  <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg font-semibold">
    Match Chat
  </div>
  ```
- Improve message bubble styling:
  - Add shadows to message bubbles
  - Increase border radius for more rounded appearance
  - Better color contrast between own messages and others
  - Add subtle animations or transitions
- Improve input area styling:
  - More prominent border
  - Better focus states
  - Chat-like input styling
- Consider adding:
  - Chat icon in header
  - Online/offline indicators
  - Message timestamps in a more chat-like format
  - Scroll indicators when there are many messages

---

## 9. Report Score - Winner Dropdown Only Shows One User

**File:** `frontend/app/matches/[id]/score/page.tsx`

**Problem:** The winner dropdown in the report score page only shows the match creator, not the confirmed applicant. This makes it impossible to select the actual winner if the applicant won.

**Current Code Location:** Lines 72-75

**Solution:**
- Update the `participants` array to include both the creator and the confirmed applicant
- Find the confirmed application from the match slots
- Add the confirmed applicant to the participants list
- Handle cases where there might be multiple confirmed applications (though there should only be one)

**Implementation:**
- Update the participants array (lines 72-75) to:
  ```typescript
  const participants = [
    { id: currentMatch.creatorUserId, name: `${currentMatch.creator?.firstName} ${currentMatch.creator?.lastName}` },
  ];

  // Find confirmed applicant from match slots
  const confirmedSlot = currentMatch.slots?.find(slot => 
    slot.status?.toLowerCase() === 'confirmed' || 
    slot.applications?.some(app => app.status?.toLowerCase() === 'confirmed')
  );

  if (confirmedSlot?.applications) {
    const confirmedApplication = confirmedSlot.applications.find(
      app => app.status?.toLowerCase() === 'confirmed'
    );
    if (confirmedApplication?.applicant) {
      participants.push({
        id: confirmedApplication.applicant.id || confirmedApplication.applicantUserId,
        name: `${confirmedApplication.applicant.firstName} ${confirmedApplication.applicant.lastName}`
      });
    }
  }
  ```
- Ensure the match data includes the necessary relations (applications and applicant) when fetched
- Verify that `fetchMatchById` in matches store loads the required relations
- Test with matches where applicant is confirmed
- Test with matches where creator is confirmed (if applicable)

---

## 10. Report Score UI - Update to Match Screenshot Design

**File:** `frontend/app/matches/[id]/score/page.tsx`

**Problem:** The current report score UI uses a simple text input and dropdown. It should be updated to match the screenshot design which shows:
- Player vs Player display format
- Three separate SET sections (SET 1, SET 2, SET 3) with individual input boxes for each set
- Instructions about reporting scores from the reporter's perspective
- Checkboxes for alternative match outcomes (default win, opponent retirement)

**Current Code Location:** Lines 90-166

**Current Implementation:**
- Single text input for score (line 115-119)
- Dropdown for winner selection (line 129-139)
- Basic form layout

**Solution:**
- Update the UI structure to match the screenshot while maintaining the existing styling system
- Display player vs opponent format (e.g., "You vs. [Opponent Name]")
- Create three SET sections (SET 1, SET 2, SET 3) with separate input fields for each set
- Add instructional text about reporting scores from the reporter's perspective
- Add checkboxes for "I won the match by default" and "the match was not completed - my opponent retired"
- Update form schema to handle set-by-set scores and alternative outcomes
- Keep existing Card, Button, and Input component styling

**Implementation:**
- Update the form schema (lines 20-23) to include:
  ```typescript
  const scoreSchema = z.object({
    set1Player: z.string().optional(),
    set1Opponent: z.string().optional(),
    set2Player: z.string().optional(),
    set2Opponent: z.string().optional(),
    set3Player: z.string().optional(),
    set3Opponent: z.string().optional(),
    wonByDefault: z.boolean().optional(),
    opponentRetired: z.boolean().optional(),
  });
  ```
- Add player vs opponent display section:
  ```typescript
  <div className="flex items-center gap-4 mb-6">
    <div className="flex items-center gap-2">
      {/* User icon/silhouette */}
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
        {user?.firstName?.[0] || 'U'}
      </div>
      <span className="font-medium">You</span>
    </div>
    <span className="text-gray-500">vs.</span>
    <div className="flex items-center gap-2">
      <span className="text-blue-600 font-medium">{opponentName}</span>
    </div>
  </div>
  ```
- Create SET sections with input fields:
  ```typescript
  {[1, 2, 3].map((setNum) => (
    <div key={setNum} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        SET {setNum}
      </label>
      <div className="flex items-center gap-2">
        <Input
          {...register(`set${setNum}Player`)}
          placeholder="0"
          className="w-20"
        />
        <span className="text-gray-500">-</span>
        <Input
          {...register(`set${setNum}Opponent`)}
          placeholder="0"
          className="w-20"
        />
      </div>
    </div>
  ))}
  ```
- Add instructional text:
  ```typescript
  <div className="bg-gray-50 p-4 rounded-lg mb-6">
    <p className="text-sm text-gray-700 mb-2">
      <strong>Scores should be reported from the perspective of the person reporting.</strong>
    </p>
    <ul className="text-sm text-gray-600 space-y-1">
      <li>Example win: 6-4, 6-4.</li>
      <li>Example loss: 4-6, 3-6.</li>
      <li>Tie break sets are reported 7-6 or 6-7.</li>
    </ul>
  </div>
  ```
- Add checkboxes for alternative outcomes:
  ```typescript
  <div className="space-y-3">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        {...register('wonByDefault')}
        className="rounded border-gray-300"
      />
      <span className="text-sm text-gray-700">I won the match by default</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        {...register('opponentRetired')}
        className="rounded border-gray-300"
      />
      <span className="text-sm text-gray-700">the match was not completed - my opponent retired</span>
    </label>
  </div>
  ```
- Update `onSubmit` function to format the score string from set inputs or handle alternative outcomes
- Update backend API call to send the formatted score or alternative outcome flags
- Maintain existing styling system (Card, Button, Input components)
- Keep the same color scheme and design tokens

---

## Summary of Files to Modify

1. **frontend/app/profile/page.tsx**
   - Fix phone field layout (Issue #1)
   - Fix gender dropdown default (Issue #2)
   - Save court when updating profile (Issue #3)

2. **frontend/app/dashboard/page.tsx**
   - Fix edit match route (Issue #4)
   - Add match status for applied matches (Issue #5)

3. **frontend/app/matches/[id]/edit/page.tsx**
   - Create new file for editing matches (Issue #4)

4. **backend/src/applications/applications.service.ts**
   - Remove home court validation (Issue #6)
   - Add email and gender validation (Issue #6)

5. **backend/src/matches/matches.service.ts** (if needed)
   - Add/update `update()` method for editing matches (Issue #4)

6. **frontend/app/matches/[id]/page.tsx** (if needed)
   - Remove any home court validation warnings (Issue #6)

7. **frontend/src/lib/socket.ts**
   - Fix chat message event names (Issue #7)

8. **frontend/src/components/ChatWindow.tsx**
   - Improve chat UI styling (Issue #8)
   - Ensure messages are loaded from database (Issue #7)

9. **frontend/src/hooks/useMatchChat.ts**
   - Fix socket event listeners (Issue #7)

10. **frontend/app/matches/[id]/score/page.tsx**
    - Add confirmed applicant to winner dropdown (Issue #9)
    - Update UI to match screenshot design with SET sections (Issue #10)

11. **backend/src/chat/chat.gateway.ts** (if needed)
    - Verify event names match frontend expectations (Issue #7)

12. **backend/src/results/results.service.ts** (if needed)
    - Update to handle set-by-set scores or alternative outcomes (Issue #10)

---

## Testing Checklist

- [ ] Phone field doesn't overlap with verification text
- [ ] Gender dropdown defaults to database value
- [ ] Gender dropdown shows "Select Gender" when not set
- [ ] Gender is required and prevents form submission if not selected
- [ ] New court is saved when updating profile without clicking "Save Facility"
- [ ] Edit match page exists and works correctly
- [ ] Edit button navigates to correct page
- [ ] Applied matches show "Applied" status in dashboard
- [ ] Rejected applications don't show matches in dashboard
- [ ] Confirmed applications show matches in dashboard
- [ ] Users without home court can apply to matches
- [ ] Users without verified email cannot apply
- [ ] Users without gender cannot apply
- [ ] Users without verified phone (if phone provided) cannot apply
- [ ] Chat messages are stored in database
- [ ] Chat messages persist after page refresh
- [ ] Opponents receive chat messages in real-time
- [ ] Chat window has clear visual design that looks like a chat interface
- [ ] Chat has proper styling with good contrast
- [ ] Report score dropdown shows both creator and confirmed applicant
- [ ] Winner can be selected from both participants in score reporting
- [ ] Report score UI shows player vs opponent format
- [ ] Report score UI has three SET sections with separate inputs
- [ ] Report score UI includes instructional text about reporting perspective
- [ ] Report score UI has checkboxes for default win and retirement
- [ ] Score submission handles set-by-set scores correctly
- [ ] Score submission handles alternative outcomes (default, retirement)

