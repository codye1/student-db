import { Transform } from 'stream';

class StudentAvgGradeTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(student, encoding, callback) {
    const grades = Array.isArray(student.grades) ? student.grades : [];
    const sum = grades.reduce((acc, grade) => acc + Number(grade || 0), 0);
    const avgGrade = grades.length > 0 ? sum / grades.length : 0;

    const { grades: _grades, ...rest } = student;
    callback(null, { ...rest, avgGrade });
  }
}

export default StudentAvgGradeTransform;
