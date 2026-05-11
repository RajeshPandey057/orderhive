# UI Style Guide

This file is the default visual and interaction reference for building new UI in this project.

## Design Principles

- Keep interfaces clean, flat, and high-contrast with subtle borders.
- Prefer compact controls and dense information display.
- Use consistent 32px control height for filters, inputs, selects, and primary actions.
- Favor rectangular surfaces with small radii over large rounded cards.
- Emphasize hierarchy through spacing and typography, not heavy decoration.

## Core Tokens

### Colors

- `--bg-page`: `#FFFFFF`
- `--bg-muted`: `#FBF9F8` (sidebar, table headers, secondary surfaces)
- `--bg-soft`: `#F1F1F1` (segmented control container)
- `--text-primary`: `#222626`
- `--text-secondary`: `#687976`
- `--text-muted`: `#8D8D8D`
- `--icon-muted`: `#859693`
- `--border-default`: `#EBEEEE`
- `--border-input`: `#D4D9D9`
- `--brand-dark`: `#222626` (primary buttons, active chips)
- `--brand-accent`: `#F04C06` (selected sidebar item, input focus border)
- `--brand-accent-soft`: `#FFF0DE` (selected sidebar background)
- `--focus-ring-soft`: `#FFD3A8`
- `--danger`: `#DC2626` (errors/helper text)

### Typography

- **Page/Modal Title**: `Roboto`, `24/32`, weight `500`
- **Section Label / Control Label**: `Inter`, `13/20`, weight `450`
- **Body / Table Cell**: `Inter`, `13/20`, weight `450`
- **Button Label (default)**: `Inter`, `14/20`, weight `450`
- **Button Label (active segmented)**: `Inter`, `14/20`, weight `550`
- **Sidebar item text**: `Inter`, `14/20`, weight `450`

### Radius

- `4px`: small inline buttons (e.g., table row actions)
- `6px`: inputs, selects, primary buttons, segmented items, table container
- `999px`: circular avatar or pill-only elements

### Elevation

- Popup/modal panel: `0 25px 50px -12px rgba(0,0,0,0.25)` (`shadow-2xl`)
- Most other surfaces: no heavy shadow, rely on border separation

## Layout System

### App Shell

- Sidebar width: `252px`
- Sidebar background: `#FBF9F8`
- Sidebar divider: `1px solid #EBEEEE`
- Content area uses internal padding `24px`
- Page header block:
  - Height target: `64px`
  - Bottom spacing: `32px`

### Spacing Scale (preferred)

- `4px`: tight label/control spacing
- `6px`: compact inline gaps
- `8px`: icon + text spacing
- `12px`: horizontal control padding
- `16px`: section stack spacing
- `24px`: page/card/popup internal padding
- `32px`: header-to-body separation

## Components

### Primary Button

- Height: `32px`
- Padding: `0 12px`
- Radius: `6px`
- Background: `#222626`
- Text: white
- Border: `1px solid rgba(0,0,0,0.05)`
- Optional leading icon: `16px`

### Secondary/Ghost Button

- Height: `24px` (table row actions) or `32px` (toolbar)
- Border: `1px solid #EBEEEE`
- Background: white
- Text: `#222626`

### Input Field

- Height: `32px`
- Padding: `6px 12px`
- Radius: `6px`
- Border: `1px solid #D4D9D9`
- Text/placeholder: `Inter 13/20 #222626`
- Focused (error/accent state from design sample):
  - Border: `#F04C06`
  - Ring: dual ring effect with `#FFFFFF` and `#FFD3A8`
  - Rule: never use grey/brand-ring focus for form fields; active focus must be orange.

### Select Field

- Match input dimensions and spacing exactly
- Optional leading icon: `16px` in `#859693`
- Chevron-down icon on right
- Focused:
  - Border: `#F04C06`
  - Ring: `#FFD3A8`

### Segmented Control (Filters)

- Container:
  - Height: `36px`
  - Padding: `2px`
  - Radius: `8px`
  - Background: `#F1F1F1`
- Item:
  - Height: `32px`
  - Radius: `6px`
- Active item:
  - Background: `#222626`
  - Label: white, weight `550`
- Inactive item:
  - Transparent background
  - Label: `#222626`, weight `450`

### Data Table

- Outer container:
  - Border: `1px solid #EBEEEE`
  - Radius: `6px`
- Header row:
  - Cell height: `36px`
  - Background: `#FBF9F8`
  - Header text: `Inter 13/20 #687976`
- Body row:
  - Cell height: `52px` (min `48px`)
  - Cell padding: `14px 12px`
  - Grid lines: `1px solid #EBEEEE`
  - Text: `Inter 13/20 #222626`

### Sidebar Navigation

- Item height: `36px`
- Item padding: `6px 8px`
- Icon size: `20px`
- Default text/icon: `#222626`
- Active item:
  - Background: `#FFF0DE`
  - Text/icon: `#F04C06`
  - Radius: `4px`

### Popup / Modal / Side Sheet Form

- White surface with strong shadow (`shadow-2xl`)
- Base internal padding: `24px`
- Title row spacing bottom: `32px`
- Form fields stack in one column with `16px` to `24px` rhythm
- Footer action button spans full width when single CTA
- Typical popup width from design reference: `474px`

## Form Behavior Rules

- Keep labels above fields.
- Use a single primary CTA per popup (`Invite`, `Save`, etc.).
- Make helper/error text `13/20`, red (`#DC2626`), directly under control.
- Only show optional helper text when needed; default UI is minimal.
- Use icon-leading selects for role/type/category controls.
- All interactive form controls (`input`, `select`, `textarea`, combobox trigger) must use orange focus state (`#F04C06` + `#FFD3A8` ring).

## Copy and Naming Style

- Titles: short, functional (e.g., `Access Management`, `Invite User`)
- Labels: explicit nouns (e.g., `Agent Role`, `Access Type`)
- CTA text: action-first (`Add Member`, `Edit Access`, `Invite`)

## Implementation Checklist (for every new UI)

- Use `32px` tall inputs/selects/buttons unless table-inline action.
- Apply `#EBEEEE` borders for structural separation.
- Use `#222626` for primary text and primary CTA background.
- Keep card/sheet padding at `24px`.
- Preserve the compact density and avoid oversized controls.
- Verify active states use accent palette (`#F04C06`, `#FFF0DE`, `#FFD3A8`).
- Keep table headers muted and body text strong for readability.

## Do / Avoid

- Do: prioritize consistency over novelty.
- Do: reuse existing button, input, select, sidebar, and table patterns.
- Do: keep whitespace intentional and systematic.
- Avoid: large shadows everywhere (only overlays/panels should float strongly).
- Avoid: introducing new radii, font sizes, or arbitrary colors without need.
- Avoid: mixing multiple visual styles in one screen.
