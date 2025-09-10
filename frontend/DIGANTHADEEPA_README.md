# Diganthadeepa Design System

A premium, modern design system for React applications combining minimalist principles with functional elegance. Features glass morphism effects, subtle animations, and thoughtful interactions.

![Diganthadeepa Design System](https://via.placeholder.com/800x400/151f30/6366f1?text=Diganthadeepa+Design+System)

## Features

- **Glass Morphism Effects**: Translucent surfaces with backdrop filters for depth and elegance
- **Subtle Animations**: Smooth transitions and micro-interactions for enhanced user experience
- **Customizable Components**: Flexible design components that adapt to your needs
- **Dark Mode Optimized**: Designed with a dark aesthetic for modern applications
- **Material-UI Integration**: Built on top of Material-UI for robust foundation
- **TypeScript Support**: Fully typed components for better developer experience

## Installation

```bash
# Install dependencies
npm install @mui/material @emotion/react @emotion/styled
```

## Usage

1. Import the theme into your application:

```jsx
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import diganthadeepaTheme from './theme/diganthadeepaTheme';

function App() {
  return (
    <ThemeProvider theme={diganthadeepaTheme}>
      <CssBaseline />
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

2. Import and use the components:

```jsx
import { Button, GlassCard, Badge, Loading } from './components/DiganthadeepaUI';

function MyComponent() {
  return (
    <GlassCard sx={{ p: 3 }} animated borderGlow>
      <h2>Hello Diganthadeepa</h2>
      <p>This is a glass card with animation and border glow</p>
      
      <Button variant="contained" gradient>
        Gradient Button
      </Button>
      
      <Badge label="New Feature" variant="primary" glow />
    </GlassCard>
  );
}
```

## Components

### GlassCard

A card component with glass morphism effects.

```jsx
<GlassCard>Basic card</GlassCard>
<GlassCard animated>With animation</GlassCard>
<GlassCard borderGlow>With glowing border</GlassCard>
<GlassCard elevation="high">High elevation</GlassCard>
```

### Button

Enhanced button with multiple variants and effects.

```jsx
<Button variant="contained">Standard</Button>
<Button variant="contained" gradient>Gradient</Button>
<Button variant="outlined" glassMorphic>Glass</Button>
<Button variant="text" glow>Glow</Button>
<Button loading>Loading</Button>
```

### Badge

Status indicators and labels.

```jsx
<Badge label="New" variant="primary" />
<Badge label="Warning" variant="warning" glow />
<Badge label="Error" variant="error" size="large" />
```

### Loading

Loading spinners and indicators.

```jsx
<Loading />
<Loading size="small" />
<Loading message="Loading data..." />
<Loading transparent />
```

## Animation Utilities

The system includes animation utilities for creating dynamic backgrounds:

```jsx
import { useParticleAnimation, useStarfieldAnimation } from './utils/diganthadeepaAnimations';

function MyComponent() {
  // Add ID to your container
  return (
    <div id="animated-container" style={{ height: '100vh' }}>
      {useParticleAnimation('animated-container')}
      {/* Your content */}
    </div>
  );
}
```

## Examples

Check the `DesignSystemSimple.tsx` file for a comprehensive showcase of all components and styles.

## Documentation

See the `DESIGN_SYSTEM.md` file for detailed documentation and usage guidelines.

## License

MIT
