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


28)
to chatgpt------------> take this input and covert task in time partiton blocks (output of 27)


29)to arena.ai this is our flow of work:
output of 28 ---> 

Hour 0 to 0:30: Existing code check Hour 0:30 to 2:00: Lead backend APIs Hour 2:00 to 3:00: Webhook and duplicate protection

Hour 3:00 to 4:00: Stage and advisor assignment Hour 4:00 to 5:30: Frontend Kanban boardHour 5:30 to 6:15: Socket.io live updateHour 6:15 to 7:00: Testing and commit

lets begin with goal 1

30)
Ab mujhe lead ke liye proper backend APIs bana ke do

GET all leads
GET single lead
POST new lead
PATCH lead details
PATCH lead stage
PATCH assign advisor
DELETE lead

Important hai ki har lead query brokerageId ke according scoped ho. Request body se aane wale brokerageId ko trust mat karna. Logged in user ke token se tenant identify karo

brokerage_admin apne brokerage ke saare leads dekh sake aur advisor bhi apne brokerage ke leads dekh sake. Client ko lead board ka access nahi milna chahiye

Advisor ko sirf same brokerage ka active advisor assign kiya ja sake. Kisi Berlin lead ko Munich advisor ke saath assign nahi karna hai

Code ke baad PowerShell se API test karne ke commands bhi dena


31)

Ab external tools se leads receive karne ke liye webhook bana do,jwt abhi use mat karna

Payload me name email phone source notes aur optional stage aa sakta hai

Agar brokerage inactive ho ya secret wrong ho to request reject karo


32)you did a mistake duplicate leads nhi hona chahiye retry hone par
Agar external payload me dedupeKey aaye to same brokerage ke andar usko idempotency key ki tarah use karo
Agar dedupeKey nahi aaye to email phone name aur source se ek stable hash bana sakte ho
Same dedupeKey dobara aaye to new lead create karne ke bajaye existing lead return karo

Agar same brokerage me same email ya phone ka lead already hai lekin payload ka dedupeKey alag hai to new lead create kar sakte ho but isDuplicate true aur duplicateOf me original lead ki id save karo

Different brokerages me same email ko duplicate mat samajhna

MongoDB unique index me null values ka issue bhi dhyan me rakhna.

33)

Dashboard placeholder ko actual Kanban lead board me replace karna hai

Columns ye honge

New
Contacted
Qualified
Proposal
Won
Lost

Lead card me name email phone source assigned advisor aur duplicate indicator dikhao
Brokerage admin ko add lead stage update aur advisor assignment ka option do
Advisor ko lead create aur stage update ka option do but advisor assignment ka option nahi dena

Client ko Kanban board nahi dikhana hai

Search add karo.


To Arena.ai

34)

lead board ka basic version ready hai. Socket.io ko integrate karna hai
Backend me HTTP server ke saath Socket.io attach karo
Socket connection ke time JWT verify karo aur user ka brokerageId identify karo
Ek brokerage ke events doosre brokerage ke users ko nahi milne chahiye
Lead create hone par lead:created event bhejo
Lead details update hone par lead:updated event bhejo
Stage change par lead:stageChanged event bhejo
Advisor assign hone par lead:assigned event bhejo
Lead delete hone par lead:deleted event bhejo
Frontend me socket.io-client use karke events listen karo aur board ko bina page refresh ke update karo
Agar socket token invalid ho ya user disabled ho to connection reject karo

35)

test done.all featre till now are working


35)

Ab lead ko client me convert karne ka feature add karna hai for both Brokerage admin aur advisor but not for client

Agar lead already converted hai to dobara convert na ho

Agar same email ka client already same brokerage me hai to existing client ko link kar sakte ho. Lekin agar email kisi different role ya different brokerage ka hai to error do

36)

Client login ke baad usko sirf apni application dikhni chahiye

GET /api/client/application banao
Frontend me simple client portal banao jisme

application name
current stage
assigned advisor
basic application status

37) done ab sab .
create a document model with brokerageId
clientId
leadId
uploadedBy
originalName
cloudinaryPublicId
secureUrl
resourceType
mimeType
size
status
failureReason
createdAt
updatedAt

also required controller as wll route file

38)
To Arena.ai
document upload worked
Ab iske upar fake background checking add karni hai
flow-->
Pending yellow color me
Checking blue color me
Approved green color me or Rejected red color me
use 3 to 15 sec random delay
70% cases final status uproved else reject give img not clr or other issue
Document image is unclear
in separate service folder for tracking in future

39)

use socket to make document flow live

40)
save rejected doc as maybe helpful in future log

41)complete testing of application

42)make readme i have uploaded my readme of my locatex project for refrence of structure
43)summary of application in md
44) THIS ALL DONE-->Thanks
Backend MongoDB ke saath connect ho
Frontend backend API se connect ho
All four roles login kar sake
Berlin user Munich data na dekh sake
Webhook lead create kare
Duplicate webhook duplicate lead na banaye
Kanban stage update work kare
Socket live update work kare
Lead client me convert ho
Client document upload kare
Cloudinary file store kare
Document status live update ho
README aur PROMPTS.md repo me present ho
