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

