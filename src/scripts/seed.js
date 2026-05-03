import mysql from 'mysql2/promise';
import { createItemsRepository } from '../repositories/items.repository.js';
import { loadEnv } from '../helpers/loadEnv.js';

const students = [
  {
    name: 'Іван Петренко',
    age: 20,
    group: 'ІП-21',
    email: 'ivan.petrenko@example.com',
    grades: [4, 5, 3],
    course: 2,
  },
  {
    name: 'Олена Коваль',
    age: 19,
    group: 'ІП-22',
    email: 'olena.koval@example.com',
    grades: [5, 4, 4],
    course: 2,
  },
  {
    name: 'Максим Бондар',
    age: 21,
    group: 'ІП-21',
    email: 'maks.bondar@example.com',
    grades: [4, 5, 3],
    course: 2,
  },
];

async function seed({ force } = {}) {
  const env = await loadEnv();
  const pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
  const repo = createItemsRepository(pool);

  try {
    if (force) {
      await pool.query('TRUNCATE TABLE students');
    } else {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count FROM students'
      );
      if (rows[0].count > 0) {
        console.log('Seed skipped: table is not empty.');
        return;
      }
    }

    for (const student of students) {
      await repo.create(student);
    }

    console.log('Seed completed!');
  } finally {
    await pool.end();
  }
}

const force = process.argv.includes('--force') || process.argv.includes('-f');

seed({ force }).catch((error) => {
  console.error(`[SEED ERROR] ${error.message}`);
  process.exit(1);
});
