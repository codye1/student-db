import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import mongoose from 'mongoose';
import { getStudentModel } from '../../db/models/student.model.js';

const students = [
  {
    id: '1',
    name: 'Іван Петренко',
    age: 20,
    group: 'ІП-21',
    email: 'ivan.petrenko@example.com',
    grades: [4, 5, 3],
    course: 2,
  },
  {
    id: '2',
    name: 'Олена Коваль',
    age: 19,
    group: 'ІП-22',
    email: 'olena.koval@example.com',
    grades: [5, 4, 4],
    course: 2,
  },
  {
    id: '3',
    name: 'Максим Бондар',
    age: 21,
    group: 'ІП-21',
    email: 'maks.bondar@example.com',
    grades: [4, 5, 3],
    course: 2,
  },
];

async function seed() {
  const envSchema = {
    type: 'object',
    required: ['MONGO_URL', 'MONGO_DB_NAME'],
    properties: {
      MONGO_URL: { type: 'string' },
      MONGO_DB_NAME: { type: 'string' },
    },
  };

  const envOptions = { schema: envSchema, dotenv: true };
  const tempFastify = Fastify();
  await tempFastify.register(fastifyEnv, envOptions);
  const config = tempFastify.config;

  await mongoose.connect(config.MONGO_URL, { dbName: config.MONGO_DB_NAME });
  const Student = getStudentModel(mongoose.connection);

  const isForce = process.argv.includes('--force');
  if (isForce) {
    await Student.deleteMany({});
  } else {
    const count = await Student.countDocuments();
    if (count > 0) {
      console.log('Seed skipped: collection is not empty.');
      await mongoose.disconnect();
      return;
    }
  }

  const docs = students.map(({ id, ...rest }) => ({
    _id: String(id),
    ...rest,
  }));

  await Student.insertMany(docs);
  await mongoose.disconnect();
  console.log('Seed completed!');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
