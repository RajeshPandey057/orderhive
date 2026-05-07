# Tailwind Style Mapping

Use this together with `style.md`.  
This file translates the design system rules into concrete Tailwind utility patterns for implementation.

## Color Mapping

- `#222626` -> `text-[#222626]`, `bg-[#222626]`, `border-[#222626]`
- `#687976` -> `text-[#687976]`
- `#8D8D8D` -> `text-[#8D8D8D]`
- `#859693` -> `text-[#859693]`
- `#EBEEEE` -> `border-[#EBEEEE]`
- `#D4D9D9` -> `border-[#D4D9D9]`
- `#FBF9F8` -> `bg-[#FBF9F8]`
- `#F1F1F1` -> `bg-[#F1F1F1]`
- `#FFF0DE` -> `bg-[#FFF0DE]`
- `#F04C06` -> `text-[#F04C06]`, `border-[#F04C06]`
- `#FFD3A8` -> `ring-[#FFD3A8]`
- `#DC2626` -> `text-[#DC2626]`

## Typography Mapping

- **Page/Modal Title (24/32, 500)**  
  `text-2xl leading-8 font-medium tracking-normal`
- **Body/Label/Table text (13/20, 450-like)**  
  `text-[13px] leading-5 font-normal`
- **Button text default (14/20)**  
  `text-sm leading-5 font-normal`
- **Button text active/selected**  
  `text-sm leading-5 font-medium`

If a font family override is needed:
- Roboto title: `font-[Roboto]`
- Inter body: `font-[Inter]`

## Radius and Sizing Mapping

- Radius `4px` -> `rounded`
- Radius `6px` -> `rounded-md`
- Radius `8px` -> `rounded-lg`
- Radius `999px` -> `rounded-full`

- Control height `32px` -> `h-8`
- Table header row `36px` -> `h-9`
- Table body row `52px` -> `h-[52px]`
- Sidebar item `36px` -> `h-9`
- Icon sizes:
  - Compact controls: `size-4`
  - Sidebar: `size-5`

## Surface and Border Patterns

- Standard border: `border border-[#EBEEEE]`
- Input/select border: `border border-[#D4D9D9]`
- Table/grid dividers: `border-[#EBEEEE]`
- Sidebar background: `bg-[#FBF9F8] border-r border-[#EBEEEE]`
- Strong popup elevation: `shadow-2xl`

## Component Recipes

## Primary Action Button

Recommended classes:

`h-8 px-3 rounded-md border border-black/5 bg-[#222626] text-white text-sm leading-5 font-normal inline-flex items-center justify-center gap-2`

With icon:

`[&_svg]:size-4`

## Secondary Row Action Button

`h-6 px-2 rounded border border-[#EBEEEE] bg-white text-[#222626] text-xs leading-4`

## Text Input

Base:

`h-8 px-3 rounded-md border border-[#D4D9D9] bg-white text-[13px] leading-5 text-[#222626]`

Focus:

`focus-visible:outline-none focus-visible:border-[#F04C06] focus-visible:ring-2 focus-visible:ring-[#FFD3A8]`

Mandatory rule:

`Do not use default grey focus ring for form controls.`

Error:

`border-[#DC2626] text-[#222626]`

## Select Trigger

`h-8 px-3 rounded-md border border-[#D4D9D9] bg-white text-[13px] leading-5 text-[#222626] inline-flex items-center gap-2 justify-between`

Focus (same as input):

`focus-visible:outline-none focus-visible:border-[#F04C06] focus-visible:ring-2 focus-visible:ring-[#FFD3A8]`

Leading icon:

`[&_svg]:size-4 [&_svg]:text-[#859693]`

## Segmented Control

Container:

`inline-flex h-9 items-center gap-0.5 rounded-lg bg-[#F1F1F1] p-0.5`

Item default:

`h-8 px-3 rounded-md text-sm leading-5 font-normal text-[#222626]`

Item active:

`bg-[#222626] text-white font-medium border border-black/5`

## Table Wrapper

`overflow-hidden rounded-md border border-[#EBEEEE] bg-white`

Header cell:

`h-9 px-3 bg-[#FBF9F8] text-[13px] leading-5 font-normal text-[#687976] border-b border-r border-[#EBEEEE]`

Body cell:

`h-[52px] px-3 py-[14px] text-[13px] leading-5 text-[#222626] border-b border-r border-[#EBEEEE]`

## Sidebar Menu Item

Base:

`h-9 rounded px-2 py-1.5 text-sm leading-5 text-[#222626] inline-flex items-center gap-2`

Active:

`bg-[#FFF0DE] text-[#F04C06]`

Icon:

`[&_svg]:size-5`

## Popup / Sheet Form Container

`w-[474px] max-w-[95vw] bg-white p-6 shadow-2xl`

Header layout:

`pb-8`

Field stack:

`space-y-4`

Single full-width CTA:

`h-8 w-full`

## Layout Recipes

## Page Content Area

`p-6`

## Header Row (title + CTA)

`flex items-start justify-between pb-8`

## Section Group

`space-y-4`

## Label Above Control

Label:

`text-[13px] leading-5 text-[#222626]`

Wrapper:

`space-y-1`

## Interaction and State Patterns

- Hover on neutral controls: slightly darken border/background (`hover:bg-[#FBF9F8]`)
- Focus: always use orange border + orange soft ring (`#F04C06` + `#FFD3A8`) for form controls
- Active nav/filter: dark brand (`#222626`) or accent (`#F04C06`) depending context
- Error helper text: `mt-1 text-[13px] leading-5 text-[#DC2626]`

## Implementation Guardrails

- Keep controls compact (`h-8`) unless a component explicitly defines otherwise.
- Do not introduce new grays outside defined palette.
- Prefer `rounded-md` and `rounded` over large rounded corners.
- Keep table density compact and borders visible.
- Use consistent left-right paddings (`px-3` / 12px baseline).
