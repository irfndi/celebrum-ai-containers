---
inclusion: always
---

# Product Context & Development Guidelines

## Celebrum AI Trading Platform

A cryptocurrency trading platform combining arbitrage detection & technical analysis. Delivers opportunities through Telegram bot and web dashboard with AI-powered market analysis.

## Core Business Logic

### Trading Strategies
- **Arbitrage**: Cross-exchange price differences (2-position: long/short)
- **Technical Analysis**: Single-position opportunities based on indicators
- **Risk Levels**: Conservative arbitrage for beginners, technical trading for advanced users

### Access Control & User Management
- **Tiered Access**: Free users (limited) → Subscription users (unlimited)
- **RBAC System**: Role-based access with invitation-only onboarding
- **Session Management**: Push notifications tied to user sessions
- **Trading Isolation**: Global opportunity detection with personal API trading

### Opportunity Generation
- **Global System**: Centralized detection using read-only admin APIs
- **Personal Generation**: When user exchanges differ from global configuration
- **AI Integration**: Opportunity analysis and personalized recommendations

## Development Conventions

### Domain Modeling
- **Opportunities**: Core entity with type (arbitrage/technical), risk level, exchange pairs
- **Users**: Profile with subscription tier, exchange connections, notification preferences
- **Sessions**: Active trading sessions with real-time opportunity delivery
- **Trading Pairs**: Symbol standardization across exchanges (BTC/USDT format)

### API Design Patterns
- **Read-Only Admin APIs**: For global opportunity detection
- **User-Scoped APIs**: Personal trading and configuration
- **Webhook Integration**: Real-time opportunity delivery
- **Rate Limiting**: Exchange API protection and user tier enforcement

### Data Flow Architecture
- **Opportunity Detection** → **Risk Assessment** → **User Filtering** → **Delivery**
- **Exchange Data** → **Technical Indicators** → **Signal Generation** → **Notification**
- **User Actions** → **Session Updates** → **Preference Learning** → **Personalization**

### Business Rules
- Never mix global and personal trading credentials
- Maintain strict separation between opportunity detection and execution
- Progressive feature unlocking based on user tier and experience
- All trading decisions require explicit user confirmation
- Opportunity expiration based on market volatility and time sensitivity

### Error Handling Patterns
- **Exchange Failures**: Graceful degradation with alternative data sources
- **API Rate Limits**: Intelligent backoff and request queuing
- **User Errors**: Clear feedback with suggested corrections
- **System Errors**: Fail-safe modes that protect user funds

### Performance Considerations
- **Real-time Requirements**: Sub-second opportunity detection and delivery
- **Scalability**: Support for 10k+ concurrent users
- **Exchange Integration**: Efficient polling and WebSocket management
- **Caching Strategy**: Opportunity data with appropriate TTL based on volatility