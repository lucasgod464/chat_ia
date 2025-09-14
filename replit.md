# Slapy - AI Conversational Interface

## Overview

Slapy is a modern web-based AI conversational interface that enables seamless interaction through both voice and text input. The application features continuous voice listening with wake word detection, real-time speech transcription, and text-to-speech responses. Built as a full-stack TypeScript application, it integrates with external AI services through webhooks and provides a futuristic, dark-themed user interface optimized for conversational AI interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable interface elements
- **Styling**: Tailwind CSS with dark mode theming and custom CSS variables for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints for chat messages and webhook integration
- **Development**: Hot module replacement with Vite middleware integration
- **Build Process**: ESBuild for production bundling with external package handling

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Database**: PostgreSQL (configured) with Neon Database serverless driver
- **Schema**: Centralized schema definitions in shared directory for type consistency
- **Migration**: Drizzle Kit for database migrations and schema synchronization
- **Fallback Storage**: In-memory storage implementation for development/testing

### Voice and Audio Processing
- **Speech Recognition**: Browser Web Speech API with continuous listening capability
- **Wake Word Detection**: Custom implementation supporting configurable wake words like "Ok, Slapy"
- **Text-to-Speech**: Integration with ElevenLabs API for high-quality voice synthesis
- **Audio Management**: Browser Audio API for playback control and audio state management

### Authentication and Session Management
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **User Management**: Basic user schema with username/password authentication
- **Security**: Session-based authentication with secure cookie handling

## External Dependencies

### Core AI Services
- **N8N Webhook**: Primary integration point at `https://n8n.yuccie.pro/webhook/n8n` for AI processing and response generation
- **ElevenLabs API**: Text-to-speech service for converting AI responses to natural-sounding audio

### Database Services
- **Neon Database**: Serverless PostgreSQL database for production data storage
- **Database URL**: Environment-based configuration for database connectivity

### Development and Deployment
- **Replit Integration**: Native support for Replit development environment with runtime error handling and dev tools
- **Vite Plugins**: Cartographer and dev banner plugins for enhanced development experience
- **Environment Configuration**: Environment variable-based configuration for different deployment targets

### UI and Styling Dependencies
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Modern icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework with PostCSS integration
- **Class Variance Authority**: Type-safe component variant management
- **Date-fns**: Date utility library for timestamp formatting and manipulation

### Build and Development Tools
- **TypeScript**: Static type checking with strict configuration
- **ESLint/Prettier**: Code quality and formatting (configured through components.json)
- **Vite**: Fast build tool with HMR and development server
- **ESBuild**: Production bundling for server-side code