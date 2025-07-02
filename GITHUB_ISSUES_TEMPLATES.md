# GitHub Issues Templates - PytoMov Code Review

Copy each issue below and create them individually on GitHub. Remember to add the `jules` label to each issue.

---

## Issue 1: Critical - Potential Null Reference Errors

**Title:** [CRITICAL] Add null checks for DOM elements to prevent runtime crashes

**Labels:** `bug`, `critical`, `jules`

**Description:**
### Problem
The application references DOM elements without null checks, which can cause runtime crashes if elements are missing from the HTML.

### Location
`script.js` line 81:
```javascript
const originalFramesInput = document.getElementById('originalFramesInput');
```

### Impact
- Application crash if HTML elements are missing
- Poor user experience
- Potential data loss during video generation

### Solution
Add null checks before using DOM elements:
```javascript
const originalFramesInput = document.getElementById('originalFramesInput');
if (originalFramesInput) {
    // Use element safely
}
```

### Acceptance Criteria
- [ ] All `getElementById` calls have null checks
- [ ] Safe fallbacks when elements are missing
- [ ] No runtime errors when elements don't exist

**Priority:** Critical
**Estimated Time:** 1-2 hours

---

## Issue 2: Critical - Missing HTML Element for Console Logging

**Title:** [CRITICAL] Fix missing onPageConsole HTML element or remove unused code

**Labels:** `bug`, `critical`, `jules`

**Description:**
### Problem
Script references `onPageConsole` element but it's not present in the HTML file.

### Location
`script.js` line 3:
```javascript
const onPageConsole = document.getElementById('onPageConsole');
```

### Impact
- Console logging feature doesn't work
- Potential null reference errors
- Dead code affecting performance

### Solution
Either add the missing HTML element:
```html
<div id="onPageConsoleContainer">
    <h2>Console Output</h2>
    <div id="onPageConsole"></div>
</div>
```

Or remove the unused console logging code if not needed.

### Acceptance Criteria
- [ ] `onPageConsole` element exists in HTML OR
- [ ] Remove all references to unused console logging
- [ ] No null references to missing elements

**Priority:** Critical
**Estimated Time:** 30 minutes

---

## Issue 3: High Priority - Remove Deprecated Function

**Title:** [HIGH] Remove deprecated generateVideoWithWhammy_DEPRECATED function

**Labels:** `cleanup`, `high`, `jules`

**Description:**
### Problem
Deprecated function still exists in codebase causing code clutter and potential confusion.

### Location
`script.js` line 382:
```javascript
async function generateVideoWithWhammy_DEPRECATED()
```

### Impact
- Code bloat (30+ lines of unused code)
- Maintenance overhead
- Developer confusion
- Potential security issues if accidentally called

### Solution
Remove the entire deprecated function and any references to it.

### Acceptance Criteria
- [ ] `generateVideoWithWhammy_DEPRECATED` function removed
- [ ] No references to deprecated function remain
- [ ] Code size reduced
- [ ] No functionality lost

**Priority:** High
**Estimated Time:** 30 minutes

---

## Issue 4: High Priority - Standardize Error Handling

**Title:** [HIGH] Implement consistent error handling across the application

**Labels:** `enhancement`, `high`, `jules`

**Description:**
### Problem
Inconsistent error handling with mix of `alert()` and `updateStatus()` calls. Some errors only log to console without user notification.

### Impact
- Poor user experience
- Inconsistent UI behavior
- Difficult debugging
- Users may not know when errors occur

### Solution
Create standardized error handling:
```javascript
function handleError(message, shouldAlert = false) {
    updateStatus(`Error: ${message}`);
    console.error(message);
    if (shouldAlert) alert(`Error: ${message}`);
}
```

### Acceptance Criteria
- [ ] Single error handling function created
- [ ] All error cases use consistent method
- [ ] Users always notified of errors
- [ ] Console logging maintained for debugging

**Priority:** High
**Estimated Time:** 4-6 hours

---

## Issue 5: Medium Priority - Optimize Image Filter Performance

**Title:** [MEDIUM] Optimize image filter performance for large images

**Labels:** `performance`, `medium`, `jules`

**Description:**
### Problem
Heavy pixel manipulation in loops causes slow performance on large images.

### Location
`script.js` lines 268-343:
```javascript
for (let i = 0; i < data.length; i += 4) {
    // Pixel operations
}
```

### Impact
- Slow performance on large images
- UI blocking during filter application
- Poor user experience
- Potential browser freezing

### Solution
- Consider using Web Workers for heavy operations
- Implement progress indicators
- Add image size warnings
- Optimize algorithms

### Acceptance Criteria
- [ ] Large image processing doesn't block UI
- [ ] Performance improved by at least 50%
- [ ] Progress indicators during processing
- [ ] Graceful handling of very large images

**Priority:** Medium
**Estimated Time:** 8-12 hours

---

## Issue 6: Medium Priority - Modularize JavaScript Code

**Title:** [MEDIUM] Split large JavaScript file into modules

**Labels:** `refactor`, `medium`, `jules`

**Description:**
### Problem
Single large JavaScript file (651 lines) with mixed concerns including UI logic, video processing, and image filters.

### Impact
- Difficult to maintain
- Hard to test individual components
- Code reusability issues
- Merge conflicts in team development

### Solution
Split into modules:
- `ui.js` - DOM manipulation and event handling
- `imageFilters.js` - Image processing functions
- `videoGenerator.js` - Video creation logic
- `utils.js` - Utility functions

### Acceptance Criteria
- [ ] Code split into logical modules
- [ ] Each module has single responsibility
- [ ] Proper import/export structure
- [ ] All functionality preserved
- [ ] Easier to test and maintain

**Priority:** Medium
**Estimated Time:** 16-24 hours

---

## Issue 7: Medium Priority - Document Magic Numbers

**Title:** [MEDIUM] Replace magic numbers with documented constants

**Labels:** `documentation`, `medium`, `jules`

**Description:**
### Problem
Magic numbers throughout code without explanation or documentation.

### Examples
```javascript
const CLUSTER_MAX_DURATION = 30000; // No explanation
const threshold = 128; // Solarize threshold
```

### Impact
- Hard to understand code purpose
- Difficult to modify values
- No context for why specific values chosen

### Solution
Create constants file with documentation:
```javascript
// Video processing constants
const VIDEO_CONSTANTS = {
    CLUSTER_MAX_DURATION: 30000, // Maximum duration per cluster in milliseconds
    SOLARIZE_THRESHOLD: 128,     // Threshold for solarize effect (0-255)
    TEXT_MARGIN: 20,             // Default margin for text positioning
};
```

### Acceptance Criteria
- [ ] All magic numbers identified and documented
- [ ] Constants moved to dedicated location
- [ ] Clear comments explaining each value
- [ ] Easy to modify values in future

**Priority:** Medium
**Estimated Time:** 2-3 hours

---

## Issue 8: Medium Priority - Add Browser Compatibility Checks

**Title:** [MEDIUM] Add feature detection and graceful degradation

**Labels:** `compatibility`, `medium`, `jules`

**Description:**
### Problem
Modern APIs used without fallbacks or feature detection.

### Examples
```javascript
previewCanvas.captureStream(fpsVal)
new MediaRecorder(finalStream, options)
```

### Impact
- Breaks on older browsers
- No user feedback about compatibility
- Poor accessibility

### Solution
Add feature detection:
```javascript
if (!HTMLCanvasElement.prototype.captureStream) {
    showCompatibilityError("Canvas streaming not supported");
    return;
}
```

### Acceptance Criteria
- [ ] Feature detection for all modern APIs
- [ ] Graceful degradation when features unavailable
- [ ] Clear user feedback about browser support
- [ ] Fallback options where possible

**Priority:** Medium
**Estimated Time:** 4-6 hours

---

## Issue 9: Low Priority - Improve CSS Organization

**Title:** [LOW] Improve CSS specificity and naming conventions

**Labels:** `cleanup`, `low`, `jules`

**Description:**
### Problem
Some overly specific selectors and inconsistent naming conventions in CSS.

### Impact
- Harder to maintain styles
- Potential style conflicts
- Inconsistent codebase

### Solution
- Use consistent naming convention (BEM methodology)
- Reduce specificity where possible
- Organize CSS into logical sections

### Acceptance Criteria
- [ ] Consistent naming convention applied
- [ ] Reduced CSS specificity
- [ ] Better organized stylesheet
- [ ] No visual regression

**Priority:** Low
**Estimated Time:** 3-4 hours

---

## Issue 10: Low Priority - Enhance Accessibility

**Title:** [LOW] Improve accessibility features for better inclusive design

**Labels:** `accessibility`, `low`, `jules`

**Description:**
### Problem
Missing accessibility features:
- No alt text for canvas elements
- Limited keyboard navigation
- Poor screen reader support

### Impact
- Excludes users with disabilities
- Poor SEO
- Legal compliance issues

### Solution
- Add ARIA labels and descriptions
- Implement keyboard navigation
- Add screen reader announcements
- Include alt text equivalents

### Acceptance Criteria
- [ ] WCAG 2.1 AA compliance
- [ ] Full keyboard navigation
- [ ] Screen reader compatibility
- [ ] Semantic HTML improvements

**Priority:** Low
**Estimated Time:** 8-12 hours

---

## How to Create These Issues

1. Go to your GitHub repository
2. Click on "Issues" tab
3. Click "New Issue"
4. Copy the title and description from each template above
5. Add the `jules` label to each issue
6. Add appropriate priority labels (`critical`, `high`, `medium`, `low`)
7. Add type labels (`bug`, `enhancement`, `cleanup`, etc.)
8. Create the issue

Remember to create them in priority order: Critical → High → Medium → Low