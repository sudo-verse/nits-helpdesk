---
name: Academic Precision
colors:
  surface: '#f9f9fe'
  surface-dim: '#d9dadf'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f8'
  surface-container: '#ededf3'
  surface-container-high: '#e7e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#191c1f'
  on-surface-variant: '#42474f'
  inverse-surface: '#2e3034'
  inverse-on-surface: '#f0f0f5'
  outline: '#727780'
  outline-variant: '#c2c7d1'
  surface-tint: '#2d6197'
  primary: '#00355f'
  on-primary: '#ffffff'
  primary-container: '#0f4c81'
  on-primary-container: '#8ebdf9'
  inverse-primary: '#a0c9ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#532800'
  on-tertiary: '#ffffff'
  tertiary-container: '#743b00'
  on-tertiary-container: '#f9a767'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#a0c9ff'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#07497d'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#f9f9fe'
  on-background: '#191c1f'
  surface-variant: '#e2e2e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 20px
  margin: 24px
---

## Brand & Style

The design system is engineered for a high-functioning academic environment, blending the intellectual authority of a university with the streamlined efficiency of modern developer tools. It draws inspiration from the high-density utility of Linear and the spatial clarity of Notion, while adhering to the structural logic of Material 3.

The aesthetic is **Modern Minimalist with Tonal Depth**. It utilizes a "Surface-on-Surface" architecture where hierarchy is communicated through subtle elevation, refined typography, and purposeful whitespace rather than decorative elements. The emotional response is one of calm reliability and high-tech sophistication, ensuring students and staff feel supported by a robust, intelligent infrastructure.

## Colors

The palette is anchored by "NIT Blue," a deep, academic indigo that signals trust and tradition. This is balanced by a more vibrant secondary blue for interactive elements. 

### Color Application
- **Primary (#0F4C81):** Used for institutional branding, primary navigation states, and heavy-weight buttons.
- **Secondary (#2563EB):** Used for utility-driven actions, links, and active indicators.
- **Surface Strategy:** In light mode, use a clean slate background with pure white cards. In dark mode, shift to a deep obsidian background with charcoal surfaces to maintain contrast and reduce eye strain during late-night study sessions.
- **Status Colors:** Follow industry standards but are slightly desaturated to fit the professional tone of the system.

## Typography

The typography system prioritizes legibility and information density. **Inter** provides a neutral, highly readable foundation for all interface elements and long-form content. 

To introduce the "high-tech" academic feel, **JetBrains Mono** is utilized for small labels, ticket IDs, and metadata. This monospaced touch suggests precision and data-driven reliability. 

### Implementation Guidelines
- **Tighten Tracking:** For headlines larger than 24px, apply negative letter spacing (-0.01em to -0.02em) to maintain a modern, "compact" feel.
- **Optical Sizing:** Ensure the 'Inter' variable font features are active, specifically prioritizing the 'opsz' axis for clarity at small sizes.

## Layout & Spacing

This design system uses a 4px base unit grid, allowing for precise alignment common in technical dashboards. 

### Grid Logic
- **Desktop:** 12-column fluid grid with 20px gutters. Use a "Max-Width" container of 1440px for dashboard views to prevent line-lengths from becoming unreadable.
- **Mobile:** 4-column grid with 16px margins.
- **Sidebars:** Fixed-width navigation (240px) or collapsed (64px) to maximize the workspace for ticket management and documentation.

## Elevation & Depth

The system uses **Tonal Layering** and **Ambient Shadows** to create a sense of organized depth.

- **Level 0 (Background):** Flat, non-interactive surface.
- **Level 1 (Cards/Content):** Subtle 1px border (color-mix of neutral and primary) with a soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Level 2 (Modals/Popovers):** Higher elevation with a 0.5px border and a distinct shadow (0px 12px 32px rgba(0,0,0,0.1)).
- **Glassmorphism:** Reserved for global headers and sticky navigation bars. Apply a `backdrop-filter: blur(12px)` with a 70% opacity background color to create a sense of transparency and modern layering.

## Shapes

The shape language is "Softly Geometric." While the core identity is clean and professional, the generous corner radii provide an approachable, modern feel that softens the "institutional" nature of a university app.

- **Base Radius:** 8px for small components (inputs, buttons).
- **Surface Radius:** 16px for cards and containers.
- **Large Radius:** 24px for modal containers and large featured sections.

## Components

### Buttons
- **Primary:** Solid NIT Blue with white text. 8px corner radius. On hover, darken by 10%.
- **Secondary:** Light blue tint background with Secondary Blue text. Ghost-style borders in dark mode.
- **Tertiary:** Text-only with an underline appearing on hover.

### Input Fields
- **Design:** Outlined style with a 1px border. The border becomes 2px NIT Blue on focus.
- **Labels:** Use the "Floating Label" pattern from Material 3 or a persistent small label using the JetBrains Mono font above the field.

### Chips & Tags
- **Status Tags:** Use a semi-transparent background (10-15% opacity) of the status color (Success, Error, etc.) with high-contrast text. 
- **Shape:** Pill-shaped (fully rounded) to distinguish them from interactive buttons.

### Cards
- **Construction:** 16px corner radius, 1px subtle border, and a Level 1 shadow. 
- **Headers:** Separated by a light horizontal rule or a subtle tonal shift in background color.

### Progress Indicators
- Use thin, linear bars for ticket progress. Use a secondary blue color to distinguish from the primary branding blue.