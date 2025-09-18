## Project Overview

This project automates the banking transaction collection process by:
- Implementing reverse-engineered login flow with client-side processing
- Fetching latest 10 transactions for multiple accounts
- Storing transaction data in MongoDB with structured schema (username, tx_date, description, amount, scraped_at)
- Supporting concurrent processing of 3+ accounts

## Tech Stack

- **Language**: TypeScript only
- **Database**: MongoDB
- **HTTP Client**: Axios (API-based, no browser automation)
- **Logging**: Winston with structured logging
- **Error Handling**: Comprehensive retry policies

## How to Run

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Setup Instructions
```bash
# 1. Clone repository
git clone <repository-url>
cd automation-authentication-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env if needed - default values should work

# 4. Start MongoDB - Access MongoDB web interface at http://localhost:8081
docker-compose up -d

# 5. Run the bot
npm run dev
```

## Configuration

The bot is configured via environment variables in `.env`:

```bash
# Site API URL
API_URL=https://enjoyed-involving-animal-oxide.trycloudflare.com

# Account credentials (comma-separated)
BANK_ACCOUNTS=testuser:123456,demo1:123456,demo2:123456

# Database settings
MONGODB_URI=mongodb://admin:password123@localhost:27017
DB_NAME=banking_bot

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_MS=2000
```

## Assumptions

1. **API Stability**: The site APIs remain consistent during execution
2. **Network Reliability**: Retry logic handles temporary network issues
3. **Account Validity**: All provided demo accounts are active and functional
4. **Concurrent Safety**: The site supports multiple simultaneous logins
5. **Token Lifetime**: Authentication tokens remain valid for the duration of transaction fetching
6. **MongoDB Availability**: MongoDB container starts successfully and is accessible
7. **Environment Variables**: File .env is configured with correct format and values
8. **Account Credentials**: Username/password combinations in BANK_ACCOUNTS are accurate

## How I Discovered the Login Flow

- First, I accessed the website link, then opened dev tools, navigated to the Network tab, enabled preserve log (to see API calls after redirects), filtered with Fetch/XHR, and proceeded to perform a normal login.
- Next, I examined the login API call to identify its payload structure. I discovered that besides the username from the form, there were additional fields: hash and nonce. This indicated client-side payload encryption, likely processed by JavaScript.
- Once I confirmed JavaScript involvement, I searched for the hash and nonce logic by switching to the Sources tab to find related JS files. However, I found no separate JS files on the page, leading me to suspect the script was embedded directly in the HTML.
- I opened the HTML file and searched for relevant keywords like "nonce", "username", and "login". This revealed the JavaScript processing logic within `<script></script>` tags in the HTML.
- Inside the script, I found the exact method for generating nonce and hash in the payload. Based on this logic, I replicated it in TypeScript code for the bot to perform the same login scenario.
- Additionally, after login, I discovered an API call to `/api/whoami` used to validate token authenticity. For safety, I integrated this API directly into the login flow to immediately check tokens upon receipt. If the server returns an invalid token for any reason, the system can retry immediately, avoiding the risk of accidentally sending an invalid token when fetching transaction data.
- After obtaining a valid token, I used it to call the transaction API and saved the results to the database.

## Database Schema

### MongoDB Collection: `transactions`

```object
{
  username: String,
  tx_date: Date,
  description: String,
  amount: Number,
  scraped_at: Date
}
```

## Concurrent Processing

The bot processes all accounts simultaneously using `Promise.allSettled()`:
- Supports 3+ accounts concurrently as required
- Individual error handling per account
- Detailed logging for each processing step
- Graceful failure handling (partial success allowed)

## Error Handling & Retry Policies

### Error Handling Patterns
- **Try-catch blocks**: Each service method handles exceptions gracefully
- **Promise.allSettled()**: Concurrent processing with partial failure tolerance
- **Graceful error returns**: Return error objects instead of throwing for business logic
- **Input validation**: Validate API responses and throw specific error messages

### Retry Logic
- **Network operations**: Configurable retries (default: 3 attempts, 2s delay)
- **Login flow**: Includes nonce fetching, authentication, and token validation
- **Transaction fetching**: API calls with automatic retry on failure

### Database Connection
- **Lazy initialization**: Connects to MongoDB only when first accessed
- **Connection reuse**: Single connection maintained throughout execution

### Structured Logging
- **Info**: Successful operations and progress
- **Warn**: Retry attempts and recoverable errors
- **Error**: Critical failures requiring attention
- **Debug**: Detailed request/response data

## Technical Implementation

### Authentication Flow
1. Fetch nonce from `/api/nonce`
2. Compute SHA-256 hash of `username:password:nonce`
3. Submit login request with username, nonce, and hash
4. Validate token using `/api/whoami`
5. Use validated token for transaction requests

### Data Collection
1. Login to each account and received tokens
2. Fetch transactions from `/api/transactions?token=xxx` with token
3. Transform and validate response data
4. Bulk insert to MongoDB with transaction metadata

### Concurrent Processing
```typescript
// Process all accounts simultaneously
const results = await Promise.allSettled(
  accounts.map(account => this.processAccount(account))
);
```

## Project Structure

```
src/
├── config/          # Database configuration
├── models/          # MongoDB transaction model
├── services/        # Core business logic
│   ├── AuthService.ts
│   ├── TransactionService.ts
│   └── BotService.ts
├── utils/           # Logging, retry, HTTP client
├── types/           # TypeScript interfaces
└── index.ts         # Main entry point
```

# Additional questions:
### Question 1:
Whether browser dev tool can not show requests that webpage sends. Is it possible that some requests will not be visible there and need to be captured by other tool(s).
#### Answer
For browser dev tools, the limitation is that they can only capture traffic within the browser. If I run on a mobile app or a desktop app, I can't use browser dev tools to see those requests. Instead, I can use other tools such as Burp Suite or Charles Proxy to sit in the middle and capture the traffic between the client and the server. These tools can be used for both apps and web.

### Question 2:
What type would you use to store amount data in MongoDB and what type it would be in Typescript? Tell why you wouldn't use other possible types (that can be used, but it's a bad idea to use them on amount data).
#### Answer
- For the current bot, since the scale is small and it only crawls and stores data, I choose Number (MongoDB) and number (TypeScript). Although there are floating point errors, the impact is negligible because the bot doesn't perform complex calculations and the accuracy requirements are low.
- However, if working with a production banking system and involving real money, which requires zero errors to avoid the risk of accumulated discrepancies over time, I would prioritize using Integer (MongoDB) and number (TypeScript). With Integer, the database will store integers and the computation unit will be shifted to the smallest unit of the currency to ensure absolute accuracy.
- Other data types such as Decimal128, Double, or String can also be used. However, Double introduces floating point errors with the consequences I mentioned above, while String requires casting before being used for calculations or comparisons, which can easily cause confusion during development. TypeScript does not natively support Decimal128 and is complex to handle, the constant conversion to a computable form also makes operations slower.
### Question 3:
Imagine, you have a request that sends data that you don't see being generated/compiled anywhere in html page source, but you know this data is being handeled client-side, what is your next move, where would you search it?
#### Answer
For this question, I understand it similarly to how I handle finding the hash and nonce in the login flow. But with the login flow it’s relatively simple. I’ll also add the case where there’s no JavaScript in the HTML, and the JS file is minified and very long, making it hard to read.
- First, I’ll use the search function in the Sources tab of the dev tools to look for keywords that I assume are related to the data I want to find, and from there identify the relevant JS file.
- Next, I’ll download that JS file, use unminifying tools to convert it into more readable code, or more quickly, I could rely on AI to help read the file, summarize it, and trace the related code I need in order to understand its logic.

### Question 4:
Let's say we have following record in DB table called applogs:
```json
{
  "_id": {
    "$oid": "68c81654rerewer23423p234"
  },
  "ref_no": "cc5eb43d-bb72-47ac-a6b4-9009234",
  "bank_name": "BNCC",
  "service_name": null,
  "level": "info",
  "message": "Payout request started",
  "timestamp": {
    "$date": "2025-09-15T13:36:20.536Z"
  },
  "hr_timestamp": "3358568367643242",
  "environment": "test",
  "request_id": "2e5ff4c32198a3fc849fed8a2428ebd0",
  "route_path": "/submit-transfer-bulk",
  "route_method": "POST",
  "sender_login": "MicroTech",
  "sender_account_no": "1223304412",
  "metadata": {
    "service_type": "payout",
    "transaction_type": "bulk_payout",
    "body_keys": [
      "Ref_no",
      "username",
      "password",
      "account_no",
      "recipient",
      "companyId",
      "pin"
    ],
    "query_keys": [],
    "hr_timestamp": "3358568367643242"
  }
}
```
Partners inform you that this transfer request has issues and you need to check it (they report that issue occured between 21:36:30 and 21:37:00 2025-09-15).
In MongoDB what is the most efficient query to check logs that would help you debug this issue they have. There are tables that show http requests (httprequests) (with same ref_no).
#### Answer
First, to clarify the question, you provided me with the incident time range of `21:36:30 to 21:37:00 on September 15, 2025`, but the database shows the timestamp as `2025-09-15T13:36:20.536Z` in `UTC+0` timezone.
I assume that in this case, the `21:36:30 to 21:37:00` time range you mentioned in the question is in your local timezone `UTC+8`, which aligns with the database. Therefore, I will perform the query using `UTC+0` system time to match the requirement.

1. First, identify the collection and fields to query, then create indexes to optimize the query. Here I will use `ref_no` and `timestamp` as conditions to query and identify the documents to retrieve. I will create indexes on these 2 fields. For `httprequests` I will create an index on `ref_no` for faster lookup.
```javascript
db.applogs.createIndex({"ref_no": 1, "timestamp": 1})
db.httprequests.createIndex({ "ref_no": 1 })
```

2. Combine the query to filter `applogs` documents by the given time range and join with the `httprequests` collection in one aggregate query to minimize round-trips to the database and reduce network latency.
```javascript
db.applogs.aggregate([
  {
    "$match": {
      "ref_no": "cc5eb43d-bb72-47ac-a6b4-9009234",
      "timestamp": {
        "$gte": new Date("2025-09-15T13:36:30.000Z"),
        "$lte": new Date("2025-09-15T13:37:00.000Z")
      }
    }
  },
  {
    "$lookup": {
      "from": "httprequests",
      "localField": "ref_no",
      "foreignField": "ref_no",
      "as": "http_data"
    }
  }
])
```

- Filter documents from `applogs` first, then join with `httprequests` that have the same `ref_no` to retrieve the corresponding `http_data`. With fewer `applogs` documents filtered first, it makes the join operation lighter.
