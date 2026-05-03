import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 150 },
    group: { type: String, trim: true },
    email: { type: String, default: null, trim: true },
    grades: { type: [Number], required: true, default: [] },
    course: { type: Number, required: true, min: 1, max: 6 },
    image: { type: String, default: null },
    test: { type: String, default: '' },
  },
  { versionKey: false }
);

export function getStudentModel(db) {
  return db.models.Student ?? db.model('Student', studentSchema);
}
