# Diganthadeepa Design System

## Overview
Diganthadeepa is a premium, modern design system combining minimalist principles with functional elegance. It features glass morphism effects, subtle animations, and thoughtful interactions to create an elegant and immersive user experience.

## Core Components

### Button
A versatile button component with multiple variants:
- Standard variants: contained, outlined, text
- Special effects: gradient, glass morphism, glow
- Loading state with spinner

```jsx
// Examples
<Button variant="contained">Default Button</Button>
<Button variant="contained" gradient>Gradient Button</Button>
<Button variant="outlined" glassMorphic>Glass Button</Button>
<Button variant="outlined" loading={isLoading}>Loading Button</Button>
<Button variant="text" glow>Glowing Text Button</Button>
```

### GlassCard
A glass morphism card component with customizable effects:
- Elevation levels: low, medium, high
- Border glow effect
- Animation on mount
- Hover effects

```jsx
// Examples
<GlassCard>Standard Glass Card</GlassCard>
<GlassCard borderGlow>Glass Card with Glowing Border</GlassCard>
<GlassCard animated>Animated Glass Card</GlassCard>
<GlassCard elevation="high">High Elevation Glass Card</GlassCard>
```

### Badge
Status indicators and labels:
- Multiple variants: primary, secondary, success, warning, error, info
- Size options: small, medium, large
- Special effects: glow, pill/rounded shape

```jsx
// Examples
<Badge label="New" variant="primary" />
<Badge label="Warning" variant="warning" glow />
<Badge label="Error" variant="error" size="large" />
```

### Loading
Loading indicator with customizable properties:
- Size options: small, medium, large
- Message display option
- Transparent background option

```jsx
// Examples
<Loading />
<Loading size="small" />
<Loading message="Loading data..." />
<Loading transparent size="large" />
```

## Design Principles

### Glass Morphism
Translucent surfaces with subtle backdrop filters create a sense of depth and elegance. This effect is applied to cards, buttons, and other interactive elements.

### Subtle Animations
Smooth transitions and micro-interactions enhance the user experience without being distracting. Components animate on hover, mount, and during state changes.

### Depth & Layering
Strategic use of shadows, elevation, and transparency creates a clear visual hierarchy and sense of space.

### Gradient Accents
Subtle color gradients are used for emphasis and visual interest, particularly for primary actions and important content.

## Usage Guidelines

### Color Usage
- Use primary colors for main actions and focus elements
- Use secondary colors for supporting elements
- Use warning/error colors sparingly for notifications and alerts
- Maintain sufficient contrast for accessibility

### Typography
- Use headings (h1-h6) for hierarchical structure
- Use body text styles for content
- Maintain consistent line height and spacing
- Limit use of gradient text to important headings

### Spacing
- Use consistent spacing increments (4px, 8px, 16px, 24px, 32px, etc.)
- Maintain adequate whitespace around components
- Group related elements with consistent spacing

## Implementation
The design system is built with React and Material-UI, with custom styled components and CSS animations. See the `DesignSystem.tsx` component for examples of all components in use.

## Future Enhancements
- Form components (inputs, selectors, checkboxes)
- Navigation components
- Data visualization components
- Motion system with more advanced animations
