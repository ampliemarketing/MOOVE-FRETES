# MaisFrete System Guidelines

## Overview
MaisFrete é uma plataforma completa de logística de fretes que conecta embarcadores, transportadoras e caminhoneiros com 8 módulos principais incluindo cadastro/autenticação, publicação de fretes, cotações, chat em tempo real, gamificação, rastreamento, transações seguras e rede social.

## Design Guidelines

### Color System
- **Primary Color**: Azul marinho (#253663) - Use apenas para elementos principais de navegação e CTAs importantes
- **Background**: Tons neutros (cinza/branco) para todos os demais elementos
- **Avoid**: Uso excessivo da cor laranja (#e9742b) - manter apenas para elementos essenciais se necessário
- **Philosophy**: Estética extremamente limpa e minimalista, focada na funcionalidade e legibilidade

### Typography
- Base font-size: 14px (definido em CSS custom properties)
- Use font-weight: 500 (--font-weight-medium) para headings
- Use font-weight: 400 (--font-weight-normal) para body text
- Avoid using Tailwind font size classes unless specifically overriding the base typography

### Component Design
- Mobile-first approach with responsive design
- Clean, professional interface projecting seriousness and business reliability
- Use shadow-card, shadow-card-hover for elevated elements
- Consistent spacing using Tailwind spacing scale
- Border radius: 0.75rem (--radius) for consistent rounded corners

### Form Design
- Robust form validation with onBlur trigger (validates after field loses focus)
- CPF/CNPJ inputs with automatic validation on blur - prevents infinite validation loops
- CEP input with automatic address lookup via ViaCEP API (only once per value)
- Advanced file upload with preview and drag & drop functionality
- Visual feedback for validation states appears after first blur
- Smart validation: shows feedback only after user finishes editing (onBlur), then validates in real-time for subsequent changes

### Navigation
- Bottom navigation bar for mobile with 5 main sections
- Hybrid architecture supporting both mobile and web formats
- Consistent navigation patterns across all screens

## Technical Guidelines

### React Components
- Create reusable components in the `/components` directory
- Use TypeScript for all components
- Import ShadCN components from `./components/ui/` with correct path format
- Use `motion/react` for animations (import as `Motion`)
- Use `sonner@2.0.3` for toast notifications

### State Management
- Use React hooks for local state
- Demo configuration in `/utils/demo-config.ts`
- User types defined in `/utils/user-types.ts`

### API Integration
- Demo mode with simulated API responses
- LocalStorage-based database for data persistence
- Full registration and authentication system
- User verification workflow with pending/approved states

### File Structure
- Components in `/components/`
- UI components in `/components/ui/`
- Utilities in `/utils/`
- Styles in `/styles/globals.css`

## User Experience Guidelines

### User Types
- **Caminhoneiro**: Truck drivers and independent operators
- **Transportadora**: Transportation companies
- **Embarcador**: Cargo shippers/companies
- **Agenciador**: Freight brokers

### Key Features
- Multi-step freight registration with progress tracking
- Real-time quote management system
- Integrated chat system
- Gamification with XP and levels
- Social feed for community interaction
- Advanced search and filtering
- **Preferred Routes Publication**: Truck drivers can publish their preferred routes as visible "posts" that transportation companies and freight brokers can see when searching for drivers. This is NOT a filter but a public indication of where drivers want to go, helping match drivers with ideal freight opportunities.

### Accessibility
- Ensure proper contrast ratios
- Use semantic HTML elements
- Provide alt text for images
- Keyboard navigation support
- Screen reader compatibility

## Development Standards

### Code Quality
- Use TypeScript for type safety
- Follow React best practices
- Implement proper error handling
- Use consistent naming conventions
- Comment complex logic

### Performance
- Optimize image loading with fallbacks
- Lazy load non-critical components
- Minimize bundle size
- Use proper caching strategies

### Security
- Validate all user inputs
- Sanitize data before display
- Use secure authentication flows
- Implement proper access controls
