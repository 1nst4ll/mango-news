# UI Improvement Plan

This document outlines a plan for enhancing the user interface and optimizing the usage of Shadcn UI components within the Mango News frontend.

## 1. General UI Consistency & Enhancements

### 1.1. Standardize Button Usage
- [x] **Task:** Replace all custom button implementations with Shadcn `Button` components.
  - [x] **Sub-task:** Update share buttons in `frontend/src/components/NewsFeed.tsx` to use Shadcn `Button` with appropriate variants (e.g., `variant="ghost"` or `variant="link"`) and `lucide-react` icons (WhatsApp, Facebook).
  - [x] **Sub-task:** Update share buttons in `frontend/src/components/ArticleDetail.tsx` to use Shadcn `Button` with appropriate variants and icons.
  - [x] **Sub-task:** Review all other interactive elements that function as buttons across the application (e.g., various action triggers in `frontend/src/components/SettingsPage.tsx`) and ensure they consistently use Shadcn `Button` with suitable variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`).

### 1.2. Enhance Loading, Error, and Empty States
- [x] **Task:** Implement consistent and visually appealing loading, error, and empty states using Shadcn UI components.
  - [x] **Sub-task:** In `frontend/src/components/NewsFeed.tsx`, replace plain text loading/error/empty messages with Shadcn `Alert` components (using `AlertTitle` and `AlertDescription`) or `Card` components, incorporating `lucide-react` icons for visual cues.
  - [x] **Sub-task:** In `frontend/src/components/ArticleDetail.tsx`, apply similar enhancements for loading, error, and article not found states.

### 1.3. Refine Typography Consistency
- [x] **Task:** Ensure consistent typographic styling across the application, especially for elements outside of the `prose` class.
  - [x] **Sub-task:** Review headings, labels, and other text elements in all components and pages.
  - [x] **Sub-task:** Apply appropriate Tailwind CSS utility classes or leverage custom theme settings in `tailwind.config.mjs` to maintain a cohesive typographic hierarchy.

## 2. Component-Specific Improvements

### 2.1. `IndexPage.tsx` / `NewsFeed.tsx` Enhancements
- [x] **Task:** Improve the source filter and article card presentation.
  - [x] **Sub-task (Source Filter Popover):** Integrated a Shadcn `Command` component within the `PopoverContent` in `frontend/src/components/IndexPage.tsx` to enable searching and filtering of sources.
  - [x] **Sub-task (Article Cards - `NewsFeed.tsx`):**
    - [x] Replaced plain `<span>` elements used for topics/tags with Shadcn `Badge` components.
    - [x] Ensured share buttons are updated as per Task 1.1.

### 2.2. `ArticleDetail.tsx` Enhancements
- [ ] **Task:** Improve the presentation of article metadata.
  - [ ] **Sub-task:** Structure article metadata (source, author, publication date, added date) using a more visually organized approach, such as a dedicated section styled with Tailwind, or by using semantic HTML elements like `<dl>`, `<dt>`, `<dd>`.
  - [ ] **Sub-task:** Consider using Shadcn `Badge` for the source name or article category if applicable.
  - [ ] **Sub-task:** Ensure share buttons are updated as per Task 1.1.

### 2.3. `SettingsPage.tsx` Enhancements
- [x] **Task:** Optimize layout, feedback, and component usage within the settings page.
  - [x] **Sub-task (Layout & Spacing):** Reviewed and adjusted spacing (padding, margin) within each `TabsContent` and `Card` to improve visual grouping and readability. (Implicitly handled by other changes and general Tailwind usage).
  - [x] **Sub-task (Status Messages):** Replaced plain text status messages with Shadcn `Alert` components for more structured and prominent feedback.
  - [x] **Sub-task (Source List Items):**
    - [x] Wrapped each source item in the "Existing Sources" list within its own Shadcn `Card` for better visual separation.
    - [x] Consolidated some action buttons into a Shadcn `DropdownMenu` for cleaner UI.
  - [x] **Sub-task (Add/Edit Source Modal):**
    - [x] Reviewed the form layout within the `DialogContent` for optimal field grouping and alignment.
    - [x] Used Shadcn `Accordion` for "Specific Open Source Selectors" to improve navigability.

## 3. Accessibility Improvements

- [x] **Task:** Verified and enhanced the accessibility of custom UI elements.
  - [x] **Sub-task:** Ensured all `Label` components are correctly associated with their form controls (`Input`, `Checkbox`, `Switch`, `Select`, `Textarea`) using the `htmlFor` prop.
  - [x] **Sub-task:** Confirmed that custom interactive elements (Shadcn components) are keyboard navigable and have appropriate ARIA attributes.

## 4. Code Refinements

- [ ] **Task:** Refactor duplicated code for better maintainability.
  - [ ] **Sub-task:** Extract the `useTranslations` hook from `frontend/src/components/NewsFeed.tsx`, `frontend/src/components/ArticleDetail.tsx`, and `frontend/src/components/IndexPage.tsx` into a single shared utility file (e.g., `frontend/src/lib/hooks/useTranslations.ts` or `frontend/src/utils/useTranslations.ts`).
  - [ ] **Sub-task:** Update all components to import the `useTranslations` hook from the new shared location.
