# New React Features Guide

This guide covers the implementation of modern React features and libraries in the Sorami language learning portal.

## Table of Contents

1. [React View Transitions API](#react-view-transitions-api)
2. [React Activity Component](#react-activity-component)
3. [Swapy Library](#swapy-library)
4. [Implementation Examples](#implementation-examples)
5. [Browser Support](#browser-support)
6. [Best Practices](#best-practices)

---

## React View Transitions API

The View Transitions API provides smooth, native transitions between different states of a web page without requiring JavaScript animations.

### What is View Transitions?

View Transitions allow you to create smooth transitions between different states of your application by leveraging the browser's native animation capabilities. This is particularly useful for:

- Page navigation
- State changes within components
- Smooth transitions between different views

### How it Works

The View Transitions API works by:

1. **Capturing the current state** of elements with `view-transition-name` CSS property
2. **Updating the DOM** to the new state
3. **Animating between states** using CSS animations

### Browser Support

- **Chrome/Edge**: Full support (version 111+)
- **Firefox**: In development
- **Safari**: Not yet supported

### Basic Usage

```typescript
// Check for browser support
if ('startViewTransition' in document) {
  document.startViewTransition(() => {
    // Update DOM here
    updatePageContent();
  });
} else {
  // Fallback for unsupported browsers
  updatePageContent();
}
```

### Integration with Next.js

For Next.js applications, wrap navigation calls:

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

const navigateWithTransition = (url: string) => {
  if ('startViewTransition' in document) {
    document.startViewTransition(() => {
      router.push(url);
    });
  } else {
    router.push(url);
  }
};
```

### CSS Configuration

Define transition styles in your CSS:

```css
/* Root transition styles */
::view-transition {
  duration: 300ms;
  easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Named transitions */
::view-transition-old(page) {
  animation: slide-out-left 300ms ease-out;
}

::view-transition-new(page) {
  animation: slide-in-right 300ms ease-out;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  ::view-transition {
    duration: 0ms;
  }
}
```

---

## React Activity Component

The Activity component (introduced in React 19 Canary) allows parts of the UI to be hidden and deprioritized while preserving their state.

### Purpose

Activity is designed to:
- **Preserve component state** when navigating away
- **Improve performance** by deprioritizing hidden components
- **Maintain user context** across navigation

### Basic Usage

```tsx
import { Activity } from 'react';

function App() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <Activity mode={isVisible ? 'visible' : 'hidden'}>
      <YourComponent />
    </Activity>
  );
}
```

### Mode Props

- **`visible`**: Component is fully active and visible
- **`hidden`**: Component is hidden but state is preserved

### Navigation Example

```tsx
import { Activity } from 'react';
import { useRouter } from 'next/navigation';

function App() {
  const { url } = useRouter();

  return (
    <>
      <Activity mode={url === '/' ? 'visible' : 'hidden'}>
        <Home />
      </Activity>
      {url !== '/' && <Details />}
    </>
  );
}
```

### Current Availability

- **React 19 Canary**: Available in experimental builds
- **Production**: Not yet available in stable React releases
- **Alternative**: Custom state preservation hooks

---

## Swapy Library

Swapy is a framework-agnostic JavaScript library that enables drag-to-swap functionality in web layouts.

### Core Concepts

- **Slots**: Containers that can hold items
- **Items**: Draggable elements that can be swapped
- **Swapping**: The act of moving items between slots

### Installation

```bash
npm install swapy
```

### Basic Setup

```typescript
import { createSwapy } from 'swapy';
import { useEffect, useRef } from 'react';

function SwapyComponent() {
  const containerRef = useRef(null);
  const swapyInstance = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      swapyInstance.current = createSwapy(containerRef.current, {
        animation: 'dynamic', // Options: 'dynamic', 'spring', 'none'
      });

      // Handle swap events
      swapyInstance.current.onSwap((event) => {
        console.log('Swapped:', event.newSlotItemMap.asArray);
      });
    }

    return () => {
      swapyInstance.current?.destroy();
    };
  }, []);

  return (
    <div ref={containerRef}>
      <div data-swapy-slot="slot1">
        <div data-swapy-item="item1">Item 1</div>
      </div>
      <div data-swapy-slot="slot2">
        <div data-swapy-item="item2">Item 2</div>
      </div>
    </div>
  );
}
```

### Configuration Options

```typescript
const swapyInstance = createSwapy(container, {
  animation: 'dynamic',     // Animation type
  swapMode: 'drop',        // When to trigger swap
  dragAxis: 'both',        // Drag direction
  threshold: 0.5,          // Swap threshold
});
```

### Event Handling

```typescript
swapyInstance.onSwap((event) => {
  // Handle successful swap
  const newOrder = event.newSlotItemMap.asArray;
  updateOrder(newOrder);
});

swapyInstance.onSwapStart((event) => {
  // Handle drag start
  console.log('Drag started:', event.draggingItem, 'from', event.fromSlot);
});

swapyInstance.onSwapEnd((event) => {
  // Handle drag end
  console.log('Drag ended. Changed:', event.hasChanged);
});

swapyInstance.onBeforeSwap((event) => {
  // Validate swap before it happens - return false to cancel
  return true; // Allow swap
});
```

### Persistence

To persist the order after swaps:

```typescript
// Save to localStorage or state management
const saveOrder = (newOrder) => {
  localStorage.setItem('card-order', JSON.stringify(newOrder));
};

// Load on initialization
const loadOrder = () => {
  const saved = localStorage.getItem('card-order');
  return saved ? JSON.parse(saved) : defaultOrder;
};
```

---

## Implementation Examples

### Study Session Hub with Swapy

```typescript
import { createSwapy } from 'swapy';
import { useStudyCardOrderStore } from '@/stores/study-card-order-store';

export function StudySessionHub() {
  const containerRef = useRef(null);
  const swapyInstance = useRef(null);
  const { cardOrder, setCardOrder } = useStudyCardOrderStore();

  useEffect(() => {
    if (containerRef.current) {
      swapyInstance.current = createSwapy(containerRef.current, {
        animation: 'dynamic',
      });

      swapyInstance.current.onSwap((event) => {
        const newOrder = event.newSlotItemMap.asArray.map(item => item.id);
        setCardOrder(newOrder);
      });
    }

    return () => swapyInstance.current?.destroy();
  }, []);

  // Sort study options based on saved order
  const sortedOptions = useMemo(() => {
    return [...studyOptions].sort((a, b) => {
      const aIndex = cardOrder.indexOf(a.type);
      const bIndex = cardOrder.indexOf(b.type);
      return aIndex - bIndex;
    });
  }, [cardOrder]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedOptions.map((option) => (
        <div key={option.type} data-swapy-slot={`slot-${option.type}`}>
          <div data-swapy-item={`item-${option.type}`}>
            <StudyCard {...option} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### View Transitions with Navigation

```typescript
import { startViewTransition } from '@/lib/view-transitions';

export function NavigationWithTransitions() {
  const router = useRouter();

  const navigateToStudy = (type: string) => {
    startViewTransition(() => {
      router.push(`/study/${type}`);
    });
  };

  return (
    <Button onClick={() => navigateToStudy('words')}>
      Start Word Study
    </Button>
  );
}
```

---

## Browser Support

### View Transitions API

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ 111+ | Full support |
| Edge | ✅ 111+ | Full support |
| Firefox | 🚧 In development | Experimental |
| Safari | ❌ Not supported | No timeline |

### Activity Component

| React Version | Availability | Notes |
|---------------|--------------|-------|
| 19 Canary | ✅ Available | Experimental |
| 18.x | ❌ Not available | Use custom solutions |

### Swapy Library

| Browser | Support | Notes |
|---------|---------|-------|
| Modern browsers | ✅ Full support | IE11+ with polyfills |
| Mobile | ✅ Full support | Touch events supported |

---

## Best Practices

### View Transitions

1. **Always provide fallbacks** for unsupported browsers
2. **Respect user preferences** for reduced motion
3. **Keep transitions short** (200-500ms) for better UX
4. **Test on different devices** and browsers

### Activity Component

1. **Use sparingly** - only for components that benefit from state preservation
2. **Consider performance** - hidden components still consume resources
3. **Plan migration** - Activity API may change before stable release

### Swapy

1. **Clean up instances** on component unmount
2. **Handle dynamic content** by calling `update()` when DOM changes
3. **Provide visual feedback** during drag operations
4. **Test on mobile devices** for touch interactions

### General

1. **Progressive enhancement** - features should gracefully degrade
2. **Performance monitoring** - measure impact on Core Web Vitals
3. **Accessibility** - ensure features work with assistive technologies
4. **User testing** - validate that features improve user experience

---

## Troubleshooting

### View Transitions Not Working

1. Check browser support
2. Verify CSS `view-transition-name` properties
3. Ensure DOM updates happen inside the transition callback

### Swapy Not Initializing

1. Verify container ref is properly set
2. Check for conflicting CSS styles
3. Ensure data attributes are correctly applied

### Activity Component Issues

1. Verify React version (19 Canary required)
2. Check for proper import from 'react'
3. Consider custom state preservation as alternative

---

## Resources

- [View Transitions API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [React Activity Component Blog Post](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)
- [Swapy Library Documentation](https://swapy.tahazsh.com/)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
