const readline = require("readline");
const cfgTemplate = require("./config_template");
const { Client } = require("pg");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function dbInstall() {
    let unchanged = [];
    let user = await rl.question("PostgreSQL username: ");
    !/\S/i.test(user) ? (cfgTemplate.db.user = user) : unchanged.push("user");
    let passwd = await rl.question("PostgreSQL password: ");
    cfgTemplate.db.password = passwd;
    let host = await rl.question("PostgreSQL host: ");
    !/\S/i.test(host) ? (cfgTemplate.db.host = host) : unchanged.push("host");
    let database = await rl.question("PostgreSQL database: ");
    !/\S/i.test(database)
        ? (cfgTemplate.db.user = database)
        : unchanged.push("database name");
    let port = await rl.question("PostgreSQL port: ");
    /\d+/i.test(port)
        ? (cfgTemplate.db.user = parseInt(port))
        : unchanged.push("user");
    if (unchanged.length != 0) {
        console.error(`The values ${unchanged} are unchanged!!`);
        return;
    }
    try {
        console.log("Checking connection . . .");
        let testClient = new Client(cfgTemplate.db);
    } catch (error) {}
}
