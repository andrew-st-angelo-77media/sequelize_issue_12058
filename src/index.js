const { Sequelize, Model, DataTypes } = require("sequelize");
const http = require("http");
const moment = require("moment");

const Op = Sequelize.Op;

const connectionOptions = {
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: null
};

const sequelize = new Sequelize(connectionOptions);

class User extends Model {}
User.init(
  {
    name: {
      type: DataTypes.STRING
    }
  },
  { sequelize, modelName: "user" }
);

class Organization extends Model {}
Organization.init(
  {
    name: {
      type: DataTypes.STRING
    },
    employeeCount: {
      type: DataTypes.INTEGER
    }
  },
  { sequelize, modelName: "organization" }
);

class Membership extends Model {}
Membership.init(
  {
    userId: DataTypes.INTEGER,
    organizationId: DataTypes.INTEGER
  },
  { sequelize, modelName: "membership" }
);

User.hasMany(Membership);
Membership.belongsTo(User, { foreignKey: "userId" });
Membership.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Membership);
// User.belongsToMany(Organization, {as: 'organizations', through: 'memberships', foreignKey: 'userId'});
// Organization.belongsToMany(User, {as: 'users', through: 'memberships', foreignKey: 'organizationId'});

sequelize
  .authenticate()
  .then(() => sequelize.sync({ force: true }))
  .then(() => main())
  .catch(err => {
    console.log(err);
  });

async function stubData() {
  console.log('--stubbing organizations--');
  const acme = await Organization.create({
    name: "Acme Corporation",
    employeeCount: 500
  });
  const massiveDynamics = await Organization.create({
    name: "Massive Dynamics",
    employeeCount: 5000
  });
  const hadden = await Organization.create({
    name: "Hadden Industries",
    employeeCount: 50000
  });
  const weyland = await Organization.create({
    name: "Weyland-Yutani Corporation",
    employeeCount: 6000
  });
  const monsters = await Organization.create({
    name: "Monsters Inc",
    employeeCount: 1500
  });

  console.log('--stubbing users--')

  const wile = await User.create({
    name: "Wile E. Coyote",
  });//.then(wile => {wile.setOrganizations([acme, massiveDynamics].map(o => o.id));});

  const ripley = await User.create({
    name: "Ellen Ripley",
   // memberships: [weyland, monsters].map(o => o.id)
  });

  console.log('--stubbing memberships--');
  Membership.create({userId: ripley.id, organizationId: weyland.id});
  Membership.create({userId: ripley.id, organizationId: monsters.id});
  Membership.create({userId: wile.id, organizationId: acme.id});
  Membership.create({userId: wile.id, organizationId: massiveDynamics.id});

  console.log('\n\n------------------\n--verifying organizations--\n------------------');
  await Organization.findAll({attributes:['id','name']}).then(organizations => organizations.map(org => console.log(`-- [id: ${org.id}][name: ${org.name}]`)));
  
  console.log('\n\n------------------\n--verifying users--\n------------------');
  await User.findAll({attributes:['id','name']}).then(users => users.map(user => console.log(`-- [id: ${user.id}][name: ${user.name}]`)));

  console.log('\n\n------------------\n--verifying memberships--\n------------------');
  await Membership.findAll({attributes:['userId', 'organizationId']}).then(memberships => memberships.map(membership => console.log(`-- [userId: ${membership.userId}][organizationId: ${membership.organizationId}]`)));
}

async function findWorking() {
  console.log('\n\n-- Working Set: finding Users->Memberships->Organizations --')

  return User.findAll({
    include: [
      {
        model: Membership,
        required: true, // Not needed, because of the `where`, but being explicit
        include: [
          {
            model: Organization,
            required: true
          }
        ],
        where: { userId: { [Op.ne]: 200 } }
      }
    ]
  });
}

async function findNotWorking() {
  console.log('\n\n-- Broken Set: finding 10 of Users->Memberships->Organizations --')

  // The only difference here is the presence of the `limit` attribute.  But that's enough for the subquery to start missing tables
  return User.findAll({
    limit: 10,
    include: [
      {
        model: Membership,
        required: true, // Not needed, because of the `where`, but being explicit
        include: [
          {
            model: Organization,
            required: true
          }
        ],
        where: { userId: { [Op.ne]: 200 } }
      }
    ]
  });
}


function printResults(workingSet) {
  workingSet.forEach(user => {
    console.log('<------>')
    if((user.memberships || []).length) {
      (user.memberships || []).forEach(um => {
        console.log(`[user: ${user.name} -- org: ${(um.organization || {name: undefined}).name}]`);
      });
    }
    else {
      console.log(`[user: ${user.name} -- org: none]`);
    }
  });
}

async function main() {
  await stubData();

  // But this does
  const workingSet = await findWorking();
  console.log(`users found from working query: ${(workingSet||[]).length}`);

  printResults(workingSet);

  try {
    // This doesn't work
    const brokenSet = await findNotWorking();
    printResults(brokenSet);
  } catch (e) {
    console.warn('-- Shocker!  We have an error --');
    console.error(e);
  }

  console.log("\n\n-----------\n--Test complete--\n------------");
}

http.createServer().listen(8000, err => {
  if (err) {
    throw err;
  }
  console.log("Server Started");
});
