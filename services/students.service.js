let students = [
  { id: 1, name: 'Ivan', grades: [5, 4, 5], course: 2 },
  { id: 2, name: 'Olena', grades: [4, 4, 3], course: 1 },
  { id: 3, name: 'Mykola', grades: [5, 5, 5], course: 3 },
];

let nextId = 4;

const listStudents = (course) => {
  if (course !== undefined) {
    return students.filter((student) => student.course === course);
  }

  return students;
};

const addStudent = ({ name, grades, course }) => {
  const student = {
    id: nextId++,
    name,
    grades,
    course,
  };

  students.push(student);
  return student;
};

const updateStudentById = (id, patch) => {
  const index = students.findIndex((student) => student.id === id);
  if (index === -1) {
    return null;
  }

  const updated = { ...students[index], ...patch };
  students[index] = updated;
  return updated;
};

const deleteStudentById = (id) => {
  const index = students.findIndex((student) => student.id === id);
  if (index === -1) {
    return null;
  }

  const [removed] = students.splice(index, 1);
  return removed;
};

module.exports = {
  listStudents,
  addStudent,
  updateStudentById,
  deleteStudentById,
};
