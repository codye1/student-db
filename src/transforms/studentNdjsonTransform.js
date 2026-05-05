import { Transform } from 'stream';

class StudentNdjsonTransform extends Transform {
  constructor() {
    super({ writableObjectMode: true });
  }

  _transform(student, encoding, callback) {
    callback(null, `${JSON.stringify(student)}\n`);
  }
}

export default StudentNdjsonTransform;
