# Skill Exchange Platform 🔄
> **Barter-Based Learning System** — Trade skills, not money.

A full-stack DBMS mini-project where users offer skills, request skills, and earn credits through completed exchanges.

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Database   | MySQL 8+                            |
| Backend    | Node.js + Express.js                |
| Auth       | JWT (jsonwebtoken) + bcrypt         |
| Frontend   | HTML5 + Vanilla CSS + Vanilla JS    |

---

## 📁 Project Structure

```
DBMSproject/
├── schema.sql              ← Full MySQL schema + sample data
├── package.json
├── README.md
├── backend/
│   ├── server.js           ← Express entry point
│   ├── db.js               ← MySQL connection pool
│   ├── .env                ← DB credentials & JWT secret
│   ├── middleware/
│   │   └── auth.js         ← JWT verify middleware
│   └── routes/
│       ├── auth.js         ← /register, /login
│       ├── skills.js       ← /add-skill-offer, /add-skill-wanted
│       ├── match.js        ← /match-users
│       ├── requests.js     ← /send-request, /update-request-status
│       ├── exchange.js     ← /complete-exchange
│       └── ratings.js      ← /rate-user, /my-profile
└── frontend/
    ├── index.html          ← Login / Register
    ├── dashboard.html      ← Credits, skills overview
    ├── add-skills.html     ← Manage offered & wanted skills
    ├── match.html          ← Recommended mutual matches
    ├── requests.html       ← Pending / accepted / completed
    ├── profile.html        ← Ratings & feedback
    ├── style.css           ← Shared design system
    └── app.js              ← Shared JS utilities
```

---

## ⚡ Quick Start

### Step 1 — Set Up MySQL Database

1. Open your MySQL client (MySQL Workbench, HeidiSQL, or terminal).
2. Run the schema file:
   ```sql
   SOURCE /path/to/DBMSproject/schema.sql;
   ```
   Or via terminal:
   ```bash
   mysql -u root -p < schema.sql
   ```
3. This creates the `skill_exchange` database with all 7 tables and sample data.

---

### Step 2 — Configure Environment

Open `backend/.env` and update with your MySQL credentials:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=skill_exchange

JWT_SECRET=skill_exchange_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d
```

---

### Step 3 — Install Dependencies

In the project root (`DBMSproject/`):

```bash
npm install
```

---

### Step 4 — Start the Backend

```bash
npm start
```

Or with auto-reload (development):
```bash
npm run dev
```

You should see:
```
✅  MySQL connected to database: skill_exchange
🚀  Skill Exchange Platform Backend
📡  Server running at: http://localhost:3000
🌐  Frontend at:       http://localhost:3000/index.html
```

---

### Step 5 — Open the App

Visit: **http://localhost:3000/index.html**

Or open `frontend/index.html` directly in your browser (make sure the backend is running).

---

## 🧪 Testing the App

### Sample Users (password: `password123`)

| Name          | Email                 | Credits | Rating |
|---------------|-----------------------|---------|--------|
| Alice Johnson | alice@example.com     | 15      | 4.5    |
| Bob Smith     | bob@example.com       | 10      | 4.0    |
| Carol Davis   | carol@example.com     | 20      | 4.8    |
| David Lee     | david@example.com     | 8       | 3.5    |
| Eva Martinez  | eva@example.com       | 12      | 4.2    |

### Test Flow

1. **Login** as Alice → Dashboard shows credits & skills
2. Go to **Match** → Bob should appear (he offers Web Design, wants Python)
3. **Send a request** to Bob
4. **Login** as Bob → Go to Requests → **Accept** Alice's request
5. **Login** as Alice → Go to Requests → **Mark Complete**  
   → 5 credits transfer: Alice loses 5, Bob gains 5
6. **Rate** Bob from the Completed tab
7. View Bob's **Profile** to see updated rating

---

## 🔌 API Reference

All API routes are prefixed with `/api`.

### Auth (Public)
| Method | Route        | Body                        |
|--------|-------------|------------------------------|
| POST   | /register   | `{ name, email, password }`  |
| POST   | /login      | `{ email, password }`        |

### Skills (Requires Bearer Token)
| Method | Route                   | Body / Params              |
|--------|------------------------|----------------------------|
| GET    | /all-skills             | —                          |
| GET    | /my-skills              | —                          |
| POST   | /add-skill-offer        | `{ skill_id, skill_level }` |
| POST   | /add-skill-wanted       | `{ skill_id, priority_level }` |
| DELETE | /remove-skill-offer/:id | —                          |
| DELETE | /remove-skill-wanted/:id| —                          |

### Matching
| Method | Route         | Description                    |
|--------|--------------|-------------------------------|
| GET    | /match-users  | Find mutually compatible users |

### Requests
| Method | Route                   | Body                                   |
|--------|------------------------|----------------------------------------|
| POST   | /send-request           | `{ receiver_id, skill_offered_id, skill_requested_id }` |
| POST   | /update-request-status  | `{ request_id, status }` (accepted/rejected) |
| GET    | /my-requests            | —                                      |

### Exchange
| Method | Route              | Body             |
|--------|--------------------|------------------|
| POST   | /complete-exchange  | `{ request_id }` |

### Ratings & Profile
| Method | Route               | Body                              |
|--------|--------------------|------------------------------------|
| POST   | /rate-user          | `{ to_user_id, rating, feedback }` |
| GET    | /user-ratings/:id   | —                                  |
| GET    | /my-profile         | —                                  |

---

## 🗄️ Database Schema

```
Users ──────────────┐
  user_id (PK)      │
  name              │         Skills
  email (UNIQUE)    │           skill_id (PK)
  password          │           skill_name
  credits           │           category
  rating            │
                    │
User_Skills_Offered ←─── user_id, skill_id
User_Skills_Wanted  ←─── user_id, skill_id

Exchange_Requests ←── sender_id, receiver_id, skill_offered_id, skill_requested_id
                         status: pending|accepted|rejected|completed

Transactions ←── request_id, credits_transferred

Ratings ←── from_user, to_user, rating, feedback
```

---

## 🎯 Key Features

- ✅ **JWT Authentication** — secure login/register
- ✅ **Mutual Matching** — SQL JOINs to find complementary users
- ✅ **Credit System** — atomic DB transactions for safe credit transfer
- ✅ **Rating System** — live average recalculation on each new rating
- ✅ **7 Normalized Tables** with FK constraints
- ✅ **Glassmorphism UI** — modern dark design with animations
- ✅ **Responsive** — works on desktop and mobile

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| `MySQL connection failed` | Check `.env` credentials match your MySQL setup |
| `Cannot reach server` | Make sure `node backend/server.js` is running |
| `No matches found` | Add both offered AND wanted skills; matches need to be mutual |
| `Insufficient credits` | You need ≥5 credits to complete an exchange |
| Port already in use | Change `PORT=3001` in `.env` |
