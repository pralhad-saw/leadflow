DAY 1 Prompts:

To Claude.ai
1)
I have a technical assignment to build a multi-tenant lead management platform help me understand the requirements, identify the important features that must be implemented, and suggest what should be prioritized if I have limited time.


2)
Hey, I am a fresher and its my first real world corporate project with MERN stack requirments. Create a realistic 6-7 day implementation plan for this assignment. Prioritize features that demonstrate authentication, multi-tenancy, real-time updates, lead management, client conversion and document verification. I have to add 4 users with different roles and access level.

3)
Acha sunn now suggest a free-tier technology stack for this MERN-based multi-tenant lead management application. I want free for this all features:
MERN is fixed, now for document storage by various clients, real time update and commuinication between clients, whatsapp ya mail add karna ho toh, inmeins e ek se lead receive kar sake web forms, ad platforms, booking tools and partner links, hamara user khus email create kar sake apne template create kar sake


4)
 I want React with Vite for the frontend, Node.js and Express for the backend, MongoDB Atlas for the database, Socket.io for real-time communication and Cloudinary for document storage.

 5)Give steps and boilerplate codes to create the backend for a MERN project using Node.js and Express. Include the required npm packages, env, Express server, atlas connection code using Mongoose and a basic checking steps.

 6).env file mein jwt setup ab, Also explain what should be added to .gitignore so credentials are not committed to GitHub


To chatgpt:
 7)created Express server with atlas using Mongoose. now verify that both Express server and MongoDB connection are working


8) Done. now give steps creating a React frontend using Vite inside the project structure with all required dependencies installation for API communication, routing and future Socket.io integration

9)
Now verify frontend 


To Arena.ai

10) Design the initial Mongoose schemas for a multi-tenant lead management platform. Create models for:

Brokerage
User
Lead

 User model should support the roles platform_admin, brokerage_admin, advisor and client. Users and leads should be associated with a brokerage using brokerageId


 11)Express is working but mongodb connection giving error even uri is right: 
 
[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node server.js`
◇ injected env (3) from .env
Server running on port 5000
MongoParseError: Invalid connection string
    at new ConnectionString (D:\Coding\UNsquare\backend\node_modules\mongodb-connection-string-url\lib\index.js:117:23)
    at parseOptions (D:\Coding\UNsquare\backend\node_modules\mongodb\lib\connection_string.js:202:17)
    at new MongoClient (D:\Coding\UNsquare\backend\node_modules\mongodb\lib\mongo_client.js:67:61)
    at NativeConnection.createClient (D:\Coding\UNsquare\backend\node_modules\mongoose\lib\drivers\node-mongodb-native\connection.js:338:14)
    at NativeConnection.openUri (D:\Coding\UNsquare\backend\node_modules\mongoose\lib\connection.js:1081:34)
    at Mongoose.connect (D:\Coding\UNsquare\backend\node_modules\mongoose\lib\mongoose.js:475:15)
    at Object.<anonymous> (D:\Coding\UNsquare\backend\server.js:12:10)
    at Module._compile (node:internal/modules/cjs/loader:1929:14)
    at Object..js (node:internal/modules/cjs/loader:2060:10)
    at Module.load (node:internal/modules/cjs/loader:1651:32)


12)done

13)To Chatgpt: Proper Authentication system all feature point wise for multi tanenet website with 4 user role

To Arena.ai

14)

Now continue the LeadFlow project from the existing Express, MongoDB Atlas and Vite React setup
First improve the existing Brokerage, User and Lead models for a multi-tenant mortgage brokerage platform.
The User model should support these roles:
platform_admin
brokerage_admin
advisor
client

15)
Add secure password hashing with bcrypt, password comparison, active or disabled account status, Platform admins should not belong to a brokerage, but all other users must have a brokerageId

16)
For Brokerage model add a unique field, active status, default pipeline stages and a webhook secret field that can be used later for inbound lead webhooks.

17)
For the Lead model add brokerageId, stage, order for Kanban sorting, assigned advisor, duplicate-related fields, converted client reference, dedupeKey and raw webhook data. Also add useful indexes for tenant-based queries and explain how duplicate detection can be improved later.

18)
Create proper authentication system with:
1. Login endpoint
2. JWT token generation
3. Current logged-in user endpoint
4. Protected routes
5. Role-based middleware
6. Change password endpoint
7. Logout from all devices
8. Disabled account protection
9. Token version validation
10. Centralized error handling

19)
The most important requirement is tenant isolation. A Berlin brokerage user must never be able to see Munich brokerage users or leads. The brokerageId should come from the authenticated user session and not be trusted from the request body. Explain how to protect against someone guessing another tenant's document ID.

20)
Create user and brokerage routes with controllers. Include validation and proper status codes. Also add Helmet, CORS allow-list, login rate limiting and general API rate limiting. 

21)error de rha hai. Keep code with my installed versions:
Express 5.2.1
Mongoose 9.10.2
bcryptjs 3.0.3
dotenv 18.0.4
jsonwebtoken 9.0.3
Socket.io 4.8.4
Node.js 20+

22)Give process for testing this done till now

23)
OK then give seed script 
Use the same demo password for all seeded users and print a clear login table after seeding.

Claude
24)give day 2 frontend task

Arena.ai
25)now create frontend:
1. Login page
2. Quick login buttons for demo users
3. Auth context
4. Protected route component
5. Axios instance with API base URL
6. JWT request interceptor
7. Automatic logout on 401
8. Session restore after browser refresh
9. Simple dashboard placeholder
10. Normal CSS without Tailwind

also for testing give:
1. Commands to install dependencies
2. Commands to seed the database
3. Commands to run backend and frontend separately
4. Test login details
5. Manual API testing commands for PowerShell
6. A checklist to verify tenant isolation
7. A simple explanation that I can use in an interview


26)so now main features or pipeline will be made. first give data about all 4 users what we had done till now and remaining features too.

27)so now we will move to day 3 goal 
**Din 3 — Lead Webhook + Kanban Board (UI only)**
- Ek POST `/api/webhook/lead` endpoint banao jo external source se lead accept kare (Postman se test karo, ya Google Form → Sheet → Apps Script se webhook call bhi kar sakte ho)
- React mein simple Kanban UI (columns: New, Contacted, Won, Lost)
- `@dnd-kit/core` ya `react-beautiful-dnd` se drag-drop (isko chhota tutorial dekh ke laga sakte ho, 1-2 ghante ka kaam hai)

give in detail all we need to do upon this day 3 summary and what will be done and what we will not do intentionally to make it faster but mvp ready and which roles will be involved and for them what will be created,
thrn categories according to fronend and backend and at last give workflow process of both and day 3 as a whole and at last what all we need to be checked

