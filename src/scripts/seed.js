import { create } from '../repositories/items.repository.js';

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
  for (const student of students) {
    await create(student);
  }
  console.log('Seed completed!');
}

seed();
