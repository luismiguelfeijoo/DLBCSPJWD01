# Multi-Currency POS & Analytics Platform (DLBCSPJWD01)

A full-stack TypeScript application for recording multi-currency sales transactions, currency exchange adjustments, real-time balance calculations, and exchange rate disparity analytics.

Built with **Fastify**, **Mongoose**, **TypeBox**, and **Angular** (standalone components, Tailwind CSS, Angular Material, and **@ngrx/signals** SignalStores).

---

## Installation & Running

### Prerequisites

- **Node.js**: `v22.x` or newer
- **npm**: `v10.x` or newer
- **MongoDB**: A running MongoDB instance

### 1. Install Dependencies

Install all workspace dependencies from the root repository:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `server/` directory

Ensure the following variables are defined in `server/.env`:

```env
MONGODB_URI=<mongo db connection string>
EXCHANGE_API_URL=https://api.frankfurter.dev
ALLOWED_ORIGINS=http://localhost:4200
```

> **Note on MongoDB Connection:**
> - Set `MONGODB_URI` to the supplied MongoDB Atlas connection string on the submission form.
> - If you do not need to connect to MongoDB Atlas and prefer running against a local MongoDB instance (e.g., `mongodb://127.0.0.1:27017/exchange-app`), you can automatically seed the database with initial users using the populate script:
>   ```bash
>   npm run populate --workspace=server
>   ```

### 3. Run the Application

#### Run Both Client and Server Concurrently (Recommended)

```bash
npm start
```

- **Client Application:** [http://localhost:4200](http://localhost:4200)
- **Backend API Server:** [http://localhost:3000](http://localhost:3000)

#### Run Individually

**Backend Server:**

```bash
npm start --workspace=server
```

**Frontend Client:**

```bash
npm start --workspace=client
```

---

## Project Scaffolding & Folder Structure

The project is structured as an npm monorepo with dedicated `server` and `client` workspaces.

```
DLBCSPJWD01/
├── package.json          # Root workspace configuration & concurrent runner
├── README.md             # Project documentation
├── client/               # Angular frontend application
└── server/               # Fastify backend application
```

---

### Server Scaffolding (`/server`)

The backend is built with Fastify, Mongoose, and TypeBox, organized into functional layers:

- **`routes/`**  
  Defines RESTful HTTP API route handlers grouped by domain:
  - `users.ts`: User retrieval, base currency updates, user currencies, balances, and disparity calculations.
  - `transactions.ts`: Transaction queries and creation of sales and adjustments.
  - `currency.ts`: Supported currency lookups and external exchange rate endpoints.

- **`schemas/`**  
  TypeBox JSON Schema definitions for compile-time and runtime validation of request headers, URL parameters, query parameters, bodies, and standardized responses (including error responses).

- **`models/`**  
  Mongoose document schemas, TypeScript interfaces, and MongoDB aggregation pipelines:
  - `user.ts`: User account data.
  - `transaction.ts`: Transaction documents and aggregation pipelines for net currency balances and volume disparity metrics.

- **`plugins/`**  
  Fastify plugins that decorate the Fastify instance (e.g., registering external currency integration services).

- **`services/`**  
  External API integrations (e.g., exchange rate API client built with `undici`).

- **`scripts/`**  
  Database management and seeding utilities (e.g., `populate-db.ts` for populating demo users).

---

### Client Scaffolding (`/client`)

The frontend is an Angular standalone application organized into a foundational `core` layer and feature-based pages and components:

#### Core Layer (`src/app/core/`)

- **`guards/`**  
  Route navigation guards (e.g., `user.guard.ts` to ensure an active user is selected before accessing dashboard routes).
- **`model/`**  
  TypeScript domain interfaces, entities, and data transfer objects (DTOs) for users, transactions, currencies, rates, balances, and disparities.
- **`service/`**  
  Angular HTTP services wrapping backend REST endpoints (`UserService`, `TransactionService`, `CurrencyService`).
- **`tokens/`**  
  Dependency injection tokens (e.g., `api-url.token.ts` for configuring the backend API base URL).
- **`store/`**  
  NgRx SignalStores (`@ngrx/signals`) managing reactive state:
  - `UserStore`: Active user and base currency selection.
  - `CurrencyStore`: Available currencies.
  - `TransactionStore`: Sales, adjustments, balances, and exchange rate disparities.
  - `ExchangeRateStore`: Historical exchange rate series for analytical charts.

#### Pages & Components (`src/app/`)

- **`user/`**  
  The user selection and login page. Displays registered users and authenticates the active user session.
- **`dashboard/`**  
  The main authenticated application shell featuring a top toolbar (with user profile and global base currency selector) and responsive sidebar navigation.
  - **`sales/`**  
    Sales management page. Displays the sales history table and actions to record new sales.
  - **`transaction-form/`**  
    A dynamic form used across the app to register sales or currency adjustments, featuring live exchange rate lookups and calculations.
  - **`analytics/`**  
    The analytics dashboard containing three reporting components:
    - **`currency-balance/`**: Summary cards displaying net balance amounts per held currency with an action to trigger currency adjustments.
    - **`exchange-rate-comparision/`**: Horizontal bar chart visualizing exchange rate disparity percentages against market rates.
    - **`historical-exchange-rate-graph/`**: 30-day historical line chart with market exchange rates.

---

## API Endpoints Overview

| Method  | Endpoint                          | Description                                                              |
| ------- | --------------------------------- | ------------------------------------------------------------------------ |
| `GET`   | `/users`                          | List all users                                                           |
| `GET`   | `/users/:id`                      | Get user by ID                                                           |
| `PATCH` | `/users/:id`                      | Update user base currency                                                |
| `GET`   | `/users/:id/currencies`           | Distinct currencies used by user in transactions                         |
| `GET`   | `/users/:id/balances`             | Aggregated net balance per currency                                      |
| `GET`   | `/users/:id/exchange-disparity`   | Calculated rate volume disparity metrics                                 |
| `GET`   | `/transactions?userId=&type=`     | Fetch user transactions (filtered by `sale` or `adjustment`)             |
| `POST`  | `/transactions`                   | Create a new transaction (`sale` or `adjustment`, returns `201 Created`) |
| `GET`   | `/currencies`                     | List all supported currencies                                            |
| `GET`   | `/currencies/:baseCurrency/rates` | Fetch historical/live rates via external exchange rate API               |
