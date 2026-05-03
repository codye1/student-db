import { getStudentModel } from '../../db/models/student.model.js';

let repositoryInstance;

function normalize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id };
}

function createItemsRepository(db) {
  const Student = getStudentModel(db);

  return {
    async findAll() {
      const docs = await Student.find({}).sort({ _id: 1 }).lean();
      return docs.map(normalize);
    },
    async *iterateAll() {
      const cursor = Student.find({}).sort({ _id: 1 }).lean().cursor();
      for await (const doc of cursor) {
        yield normalize(doc);
      }
    },
    async findById(id) {
      const doc = await Student.findById(String(id)).lean();
      return normalize(doc);
    },
    async create(data) {
      const { id, ...rest } = data;
      const payload = { ...rest };
      if (id !== undefined && id !== null) {
        payload._id = String(id);
      }
      const created = await Student.create(payload);
      return normalize(created.toObject());
    },
    async update(id, changes) {
      const updated = await Student.findByIdAndUpdate(String(id), changes, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) throw new Error('Not found');
      return normalize(updated);
    },
    async remove(id) {
      const removed = await Student.findByIdAndDelete(String(id)).lean();
      return Boolean(removed);
    },
  };
}

export function initItemsRepository(db) {
  repositoryInstance = createItemsRepository(db);
}

function getRepository() {
  if (!repositoryInstance) {
    throw new Error('Items repository is not initialized');
  }
  return repositoryInstance;
}

export async function findAll() {
  return getRepository().findAll();
}

export async function* iterateAll() {
  for await (const item of getRepository().iterateAll()) {
    yield item;
  }
}

export async function findById(id) {
  return getRepository().findById(id);
}

export async function create(data) {
  return getRepository().create(data);
}

export async function update(id, changes) {
  return getRepository().update(id, changes);
}

export async function remove(id) {
  return getRepository().remove(id);
}
