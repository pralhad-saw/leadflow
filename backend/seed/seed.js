/**
 * Seed script -- creates the demo tenants + the test logins the assignment
 * asks for ("Deployed link with test logins for each kind of user").
 *
 * Run:  npm run seed
 * WARNING: wipes Brokerage / User / Lead collections first.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const Brokerage = require('../models/Brokerage');
const User = require('../models/User');
const Lead = require('../models/Lead');

const PASSWORD = process.env.SEED_PASSWORD || 'Passw0rd!123';

const TENANTS = [
  { name: 'Berlin Expat Mortgages', slug: 'berlin' },
  { name: 'Munich Home Finance', slug: 'munich' },
];

const SAMPLE_LEADS = {
  berlin: [
    { name: 'Ana Sousa', email: 'ana.sousa@example.com', phone: '+49 151 1111111', stage: 'New', source: 'webform' },
    { name: 'Raj Mehta', email: 'raj.mehta@example.com', phone: '+49 151 2222222', stage: 'Contacted', source: 'zapier' },
    { name: 'Lucia Rossi', email: 'lucia.rossi@example.com', phone: '+49 151 3333333', stage: 'Qualified', source: 'partner-link' },
    { name: 'Tom Becker', email: 'tom.becker@example.com', phone: '+49 151 4444444', stage: 'Won', source: 'webform' },
  ],
  munich: [
    { name: 'Yuki Tanaka', email: 'yuki.tanaka@example.com', phone: '+49 152 5555555', stage: 'New', source: 'webform' },
    { name: 'Omar Haddad', email: 'omar.haddad@example.com', phone: '+49 152 6666666', stage: 'Proposal', source: 'ads' },
    { name: 'Elena Petrova', email: 'elena.petrova@example.com', phone: '+49 152 7777777', stage: 'Lost', source: 'webform' },
  ],
};

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in .env');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Promise.all([Brokerage.deleteMany({}), User.deleteMany({}), Lead.deleteMany({})]);
  console.log('Cleared Brokerage / User / Lead collections');

  const rows = [];

  const platformAdmin = await User.create({
    name: 'Platform Admin',
    email: 'platform@leadflow.test',
    password: PASSWORD,
    role: 'platform_admin',
  });
  rows.push(['-- platform --', 'platform_admin', platformAdmin.email]);

  for (const t of TENANTS) {
    const brokerage = await Brokerage.create({
      ...t,
      webhookSecret: crypto.randomBytes(24).toString('hex'),
    });

    const admin = await User.create({
      brokerageId: brokerage._id,
      name: `${t.name} Admin`,
      email: `admin@${t.slug}.test`,
      password: PASSWORD,
      role: 'brokerage_admin',
    });

    const advisor1 = await User.create({
      brokerageId: brokerage._id,
      name: 'Advisor One',
      email: `advisor1@${t.slug}.test`,
      password: PASSWORD,
      role: 'advisor',
    });

    const advisor2 = await User.create({
      brokerageId: brokerage._id,
      name: 'Advisor Two',
      email: `advisor2@${t.slug}.test`,
      password: PASSWORD,
      role: 'advisor',
    });

    const client = await User.create({
      brokerageId: brokerage._id,
      name: 'Demo Client',
      email: `client@${t.slug}.test`,
      password: PASSWORD,
      role: 'client',
    });

    rows.push([t.slug, 'brokerage_admin', admin.email]);
    rows.push([t.slug, 'advisor', advisor1.email]);
    rows.push([t.slug, 'advisor', advisor2.email]);
    rows.push([t.slug, 'client', client.email]);

    const advisors = [advisor1, advisor2];
    await Lead.insertMany(
      SAMPLE_LEADS[t.slug].map((lead, i) => ({
        ...lead,
        brokerageId: brokerage._id,
        order: i,
        assignedTo: i % 2 === 0 ? advisors[0]._id : advisors[1]._id,
      }))
    );

    console.log(`Seeded tenant "${t.name}" (${SAMPLE_LEADS[t.slug].length} leads)`);
  }

  console.log('\n================ TEST LOGINS ================');
  console.log(`password for all accounts: ${PASSWORD}\n`);
  console.log('tenant        role              email');
  console.log('------------  ----------------  ------------------------');
  rows.forEach(([tenant, role, email]) =>
    console.log(`${tenant.padEnd(13)} ${role.padEnd(17)} ${email}`)
  );
  console.log('=============================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
