import { mysqlTable, serial, varchar, int, json } from 'drizzle-orm/mysql-core';

export const students = mysqlTable('students', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  age: int('age').notNull(),
  group: varchar('group', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  grades: json('grades').$type('json').notNull(),
  course: int('course').notNull(),
  image: varchar('image', { length: 255 }),
  test: varchar('test', { length: 255 }).default('')
});

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
});