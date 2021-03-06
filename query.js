const { Client } = require('pg');
const { validateId } = require('./queries/id');
const dbExists = require('./queries/db-exists');
const password = require('./queries/password');
const touchLogin = require('./queries/touch-login');

module.exports = async (req, res) => {
  const { id } = req.session;
  validateId(id);

  if (!(await dbExists(id))) {
    throw new Error('No database found. Reload this page.');
  }
  await touchLogin(id);

  const client = await createClient(id);

  try {
    const result = await client.query(req.body.query);

    if (Array.isArray(result)) {
      res.send(
        result.map(({ rows, fields, command }) => ({ command, rows, fields }))
      );
    } else {
      res.send([
        { command: result.command, rows: result.rows, fields: result.fields },
      ]);
    }
  } finally {
    await client.end();
  }
};

const createClient = async (id) => {
  const hashed = await password(id);

  const client = new Client({
    user: id,
    host: process.env.PG_HOST,
    database: id,
    password: hashed,
    port: process.env.PG_PORT,
  });

  await client.connect();

  return client;
};
