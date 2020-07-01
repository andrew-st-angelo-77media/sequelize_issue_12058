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

sequelize
  .authenticate()
  .then(() => sequelize.sync({ force: true }))
  .then(() => main())
  .catch(err => {
    console.log(err);
  });

async function stubData() {
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

  await User.create({
    name: "Wile E. Coyote",
    membersihps: [acme, massiveDynamics]
  });

  await User.create({
    name: "Ellen Ripley",
    membersihps: [weyland, monsters]
  });
  // return User.create(
  //   {
  //     name: "John Doe",
  //     memberships: [
  //       {
  //         totalAmount: 10,
  //         entryDate: moment()
  //           .subtract(5, "months")
  //           .toISOString()
  //       }
  //     ]
  //   },
  //   {
  //     include: [DeliveredProcedure]
  //   }
  // );
}

async function findNotWorking() {
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

async function main() {
  await stubData();

  try {
    // This doesn't work
    await findNotWorking();
  } catch (e) {
    console.error(e);
  }

  // But this does

  console.log("Test complete");
}

http.createServer().listen(8000, err => {
  if (err) {
    throw err;
  }
  console.log("Server Started");
});
