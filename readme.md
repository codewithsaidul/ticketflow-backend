# 🎫 Velotix - High-Performance Event Ticketing Platform (Client)

## 🚀 Project Overview

Velotix is a secure, scalable, and role-based backend API for a modern event ticketing system. Built with Node.js, Express.js, and Mongoose (TypeScript), it provides a complete system to handle high concurrency during seat booking, manage events, and provide detailed analytics for admins and hosts.

The system is engineered for integrity, using database transactions and scheduled tasks to ensure accurate inventory (seats) at all times.


## 🌟 Core Features & Technical Highlights

### 🛡️ 1. Concurrency and Reliability (Critical)

- Atomic Seat Locking: Ensures no double-booking by utilizing Mongoose Transactions during the booking process.

- Scheduled Cleanup (Cron Job): Implemented node-cron logic to automatically check for and release seats from expired PENDING transactions (e.g., after 5 minutes), ensuring clean inventory.

- Inventory Integrity: Automatic logic prevents "stuck" seats, guaranteeing that the available seat count is always accurate.

### 🎫 2. Ticketing & Validation

- QR Code Generation: Generates a secure Base64 QR code image string for confirmed bookings, enabling physical ticket validation (integrated with qrcode library).

- Dynamic Payment: Handles payment initiation and callback processing via a third-party gateway (SSLCommerz).

### 👑 3. Role-Based Management (RBAC)

- Hierarchical Access: Routes are protected by JWT and role middleware for Admin, Host, and User.

- Admin Management: Full visibility across all users, bookings, and events. Includes secure logic for updating user roles and status.

- Host Scope: Hosts can only view and manage bookings associated with their specific events (getHostBookings service).

- Dashboard Analytics: Utilizes MongoDB Aggregation Pipelines to provide real-time statistics (Revenue, Total Bookings) for the Admin panel.



## ⚙️ Technologies Used


```

Category                        Technology                          Description

Runtime                         Node.js, Express.JS                 Fast and minimalist web framework.

Language                        TypeScript                          Statically typed superset of JavaScript for robust code.

Database                        Mongodb / Mongoose                  NoSQL database with elegant modeling.

Auth                            JWT, Bcrypt.js                      Secure access tokens and password hashing.

Validation                      Zod                                 TypeScript-first schema declaration and validation.

Scheduling                      node-cron                           For automating maintenance tasks (seat cleanup).

Utility                         qrcode, Day.js                      QR code generation and efficient date handling.

Deployment                      Render                              Serverless deployment environment.

```



## 🗂️ Project Structure

The project uses a clean, modular architecture (Mongoose Services, Express Controllers) for scalability and separation of concerns.

```

🗂️ src/
├── app.ts                      # Express application setup
├── server.ts                   # Database connection and server start
│
├── app/
│   ├── modules/
│   │   ├── admin/              # Admin CRUD and management
│   │   ├── auth/               # Authentication, Tokens, Security
│   │   ├── booking/            # Core logic, transactions, seat locking
│   │   ├── events/             # Event management CRUD
│   │   ├── payment/            # Payment initiation and callback
│   │   └── stats/              # Analytics and dashboard data (Aggregation)
│   │
│   ├── middleware/             # checkAuth, globalErrorHandler
│   ├── utils/                  # Reusable functions (jwt, catchAsync, sendResponse)
│   └── config/                 # Environment variables, Redis, Cloudinary
│
└── ...                           # Error handlers, helpers, constants

```




## 🔑 API Endpoints Summary

###### Authentication ```(/api/v1/auth)```

```
Endpoint                  Method                    Description                                                 Role(s)
/register                 POST                      Register a new user (default role: User).                   Public
/login                    POST                      Log in user and generate tokens.                            Public
/refresh-token            POST                      Generate new access token using refresh token.              Public

```


###### User & Admin Management ```(/api/v1/user)```

```
Endpoint                  Method                    Description                                                 Role(s)
/                         GET                       Get all Users                                               Super Admin, Admin
/me                       GET                       Get the profile of the currently logged-in user.            User, Host, Admin
/:userId                  PATCH                     Update user information.                                    Admin (status/role), Self

```


###### Booking & Payment ```(/api/v1/bookings)```

```
Endpoint                           Method                    Description                                                                     Role(s)
/                                  POST                      Initiate seat selection and booking (creates PENDING transaction).              User
/my-bookings                       GET                       View user's personal booking history.                                           User
/host-bookings                     GET                       View bookings for all hosted events.                                            Host
/init-payment/:bookingId           POST                      Retries payment; initiates SSLCommerz redirect URL.                             User

```


###### Analytics ```(/api/v1/stats)```

```
Endpoint                           Method                    Description                                                                     Role(s)
/dashboard                         GET                       Get aggregated dashboard statistics (revenue, sales count).                     Host, Super Admin
```



## ⚙️ Setup and Installation

Follow these steps to set up the project on your local machine.

#### ✅ Prerequisites

- Node.js >= 20

- npm or yarn

- MongoDB Atlas or Local MongoDB Instance


## 📦 Installation


#### 1. Clone the repository:

```

git clone https://github.com/codewithsaidul/velotix-core
cd velotix-core

```


#### 2. Install dependencies:


```

npm install

or

bun install

or

pnpm install

or 

yarn install

```


## 3. Set up environment variables:

Create a .env file and configure your database URL, JWT secrets, and Admin credentials.


## 4. Run the application in development mode:

This will start the server with ts-node-dev, which automatically restarts on file changes.


```
bun run dev
# or
npm run dev
# or
yarn dev
# or
pnpm dev

```

The server will be running on http://localhost:5000.


### 🧑‍💻 Author

##### SAIDUL ISLAM RANA

Frontend Dev | Backend Learner | MERN Stack Enthusiast
GitHub: @codewithsaidul