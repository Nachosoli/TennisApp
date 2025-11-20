# CourtMate Development Tasks

## Navigation & UI Improvements

### 1. Logo Navigation Fix
- **File**: `frontend/src/components/layout/Header.tsx`
- **Task**: When user is logged in, clicking the CourtMate logo (upper left corner) should navigate to `/dashboard` instead of `/`
- **Current**: Logo links to `/` (landing page)
- **Required**: Check `isAuthenticated` and route to `/dashboard` if logged in, `/` if not

### 2. Add Navigation Bar
- **Files**: 
  - `frontend/src/components/layout/Header.tsx` (add nav bar)
  - `frontend/app/contact/page.tsx` (create new page)
  - `frontend/app/rules/page.tsx` (create new page - or rename to "Code of Conduct")
- **Task**: Add a horizontal navigation bar below the header with links to:
  - Dashboard
  - Courts
  - Calendar
  - Contact Us (new page needed)
  - Rules/Code of Conduct (new page needed - covers code of conduct, what to expect, how to behave)
- **Requirements**: 
  - Mobile-friendly (consider hamburger menu on small screens)
  - Should be visible when user is logged in
  - Active page highlighting

## Match Creation

### 3. Add Gender Field to Match Creation
- **Files**: 
  - `frontend/app/matches/create/page.tsx`
  - `backend/src/matches/dto/create-match.dto.ts` (if backend changes needed)
- **Task**: Add a gender field in the match creation form
- **Options**: 
  - "Woman" (to play vs a woman)
  - "Man" (to play vs a man)
  - "Any" (to play vs anyone)
- **Note**: This is different from `genderFilter` - this specifies who the creator wants to play against
- **Current**: Form has `genderFilter` but it's auto-populated from user's gender

## Calendar Page Improvements

### 4. Fix Calendar Day Click Card
- **File**: `frontend/src/components/CalendarView.tsx` (lines 200-278)
- **Tasks**:
  - **Button Color**: Change "View Details" button color - currently unreadable (line 270)
  - **Gender Display**: Gender should show the creator's gender, not the match gender filter (line 264)
  - **ELO Display**: Add internal ELO display (currently shows ELO but verify it's correct - line 237)
  - **Time Slots Count**: Display how many time slots are being offered (e.g., "3 time slots available")
  - **White Oval Shape**: Investigate and fix/remove the white oval shape in upper right corner of card (around line 250-259)
- **Current Issues**:
  - Button uses `bg-gray-900` which may be unreadable on dark backgrounds
  - Gender shows `match.gender` instead of `creator.gender`
  - Need to count `match.slots.length` for time slots

### 5. Fix Calendar Filtering
- **File**: `frontend/app/calendar/page.tsx`
- **Tasks**:
  - **Skill Level Filter**: Currently shows "Beginner/Intermediate/Advanced/Pro" but database doesn't have these values
    - **Option A**: Map these to rating ranges (e.g., Beginner = 0-3.0, Intermediate = 3.0-4.5, Advanced = 4.5-6.0, Pro = 6.0+)
    - **Option B**: Remove skill level filter and use rating-based filtering instead
    - **Decision Needed**: Which approach?
  - **Filter Bug**: When selecting ANY filter, matches disappear even if there are matches that should match
    - **Issue**: Filter logic in `useEffect` (lines 56-66) may be too strict
    - **Fix**: Review filter logic to ensure it correctly filters matches
- **Current**: Filters use `match.skillLevel` which may not exist in the data model

### 6. Remove Range Slider
- **File**: `frontend/app/calendar/page.tsx`
- **Task**: Remove the distance range slider - user says it doesn't provide value
- **Current**: `distanceValue` state and `handleDistanceChange` function (lines 28, 80-83)
- **Action**: Remove slider UI and related state/logic

## Settings Page Redesign

### 7. Redesign Settings Page
- **File**: `frontend/app/settings/page.tsx`
- **Tasks**:
  - **Notification Preferences**: Change from separate Email On/Off and SMS On/Off toggles to:
    - Single toggle: "Match Created On/OFF"
    - When ON: Show dropdown with options: "SMS", "EMAIL", "BOTH"
    - Apply this pattern to all notification types
  - **Collapsible Sections**: Make sections collapsible/expandable:
    - "Notifications" - collapsed by default, shows count when collapsed
    - "Account Settings" - collapsed by default
    - Click to expand/collapse
  - **Mobile Friendly**: Ensure all changes work well on mobile devices
- **Current**: Each notification type has 2 separate toggles (Email + SMS)
- **Backend**: May need to update API to handle new preference format (SMS/EMAIL/BOTH instead of separate booleans)

## Implementation Notes

### Priority Order (Suggested):
1. Logo navigation fix (quick win)
2. Calendar filtering bug fix (critical)
3. Calendar day click card improvements (UX)
4. Remove range slider (cleanup)
5. Match creation gender field (feature)
6. Settings page redesign (UX improvement)
7. Navigation bar (larger feature)
8. Contact Us and Rules pages (new content)

### Questions to Clarify:
1. **Skill Level Filter**: Should we map Beginner/Intermediate/Advanced/Pro to rating ranges, or remove it entirely?
2. **Gender Field in Match Creation**: Is this a new field separate from `genderFilter`, or should we replace `genderFilter`?
3. **Rules Page Name**: Should it be "Rules", "Code of Conduct", or "Guidelines"?
4. **Navigation Bar**: Should it replace the user dropdown menu items, or be in addition to it?

