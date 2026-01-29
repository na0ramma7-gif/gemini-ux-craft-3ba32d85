# Lean - Business Efficiency Management System

A comprehensive portfolio, product, feature, and release management system built with React, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Overview of all portfolios with KPIs, revenue/cost charts, and portfolio distribution
- **Portfolio Management**: Manage multiple portfolios with products, resources, and financials
- **Product Management**: Track products with roadmaps, releases, and feature management
- **Feature Tracking**: Create, edit, and manage features with status, priority, and ownership
- **Release Management**: Organize features into releases with timeline tracking
- **Resource Management**: Manage team resources, assignments, and utilization tracking
- **Financial Overview**: Track revenue, costs, and profit margins at all levels

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - UI component library
- **Lucide React** - Icon library
- **TanStack Query** - Data fetching

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build
# or
bun run build

# Preview production build
npm run preview
# or
bun run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── KPICard.tsx     # KPI metric cards
│   ├── Logo.tsx        # Application logo
│   ├── Sidebar.tsx     # Navigation sidebar
│   └── StatusBadge.tsx # Status indicator badges
├── context/            # React context providers
│   └── AppContext.tsx  # Global application state
├── data/               # Initial/mock data
│   └── initialData.ts  # Sample portfolio/product data
├── lib/                # Utility functions
│   └── utils.ts        # Helper functions
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── PortfolioPage.tsx # Portfolio details
│   ├── ProductPage.tsx # Product details
│   └── ResourcesPage.tsx # Resource management
├── types/              # TypeScript type definitions
│   └── index.ts        # All type interfaces
├── App.tsx             # Main application component
├── index.css           # Global styles & design system
└── main.tsx           # Application entry point
```

## Design System

The application uses a custom design system with:

- **Primary Color**: Professional indigo (#6366F1)
- **Semantic tokens** for consistent theming
- **Dark mode support** (CSS variables based)
- **Responsive design** for mobile, tablet, and desktop

## Screens

1. **Dashboard** - Overview with KPIs, charts, and portfolio cards
2. **Portfolio View** - Portfolio details with products, resources, and financials
3. **Product View** - Product details with roadmap, releases, and documentation
4. **Resources** - Team directory, assignments, and utilization tracking

## License

MIT License - see LICENSE file for details
