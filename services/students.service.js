import {
  findAll,
  findById,
  create,
  update,
  remove,
} from '../src/repositories/items.repository.js';

export const listStudents = async (course) => {
  const students = await findAll();
  if (course !== undefined) {
    return students.filter((student) => student.course === course);
  }
  return students;
};

export const addStudent = async (data) => {
  return await create(data);
};

export const updateStudentById = async (id, patch) => {
  const student = await findById(id);
  if (!student) return null;
  return await update(id, patch);
};

export const deleteStudentById = async (id) => {
  const student = await findById(id);
  if (!student) return null;
  await remove(id);
  return student;
};
