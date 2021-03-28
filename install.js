const readline = require("readline");
const cfgTemplate = require("./config_template");
const { Client } = require("pg");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function dbInstall () {
    const unchanged = [];
    const user = await rl.question("PostgreSQL username: ");
    !/\S/i.test(user) ? (cfgTemplate.db.user = user) : unchanged.push("user");
    const passwd = await rl.question("PostgreSQL password: ");
    cfgTemplate.db.password = passwd;
    const host = await rl.question("PostgreSQL host: ");
    !/\S/i.test(host) ? (cfgTemplate.db.host = host) : unchanged.push("host");
    const database = await rl.question("PostgreSQL database: ");
    !/\S/i.test(database)
        ? (cfgTemplate.db.user = database)
        : unchanged.push("database name");
    const port = await rl.question("PostgreSQL port: ");
    /\d+/i.test(port)
        ? (cfgTemplate.db.user = parseInt(port))
        : unchanged.push("user");
    if (unchanged.length != 0) {
        console.error(`The values ${unchanged} are unchanged!!`);
        return;
    }
    try {
        console.log("Checking connection . . .");
        const testClient = new Client(cfgTemplate.db);
    } catch (error) {}
}
