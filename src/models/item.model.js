const ItemModel = {
  id: null, // string | number (унікальний ідентифікатор)
  name: '', // string (ім'я студента)
  age: 0, // number (вік)
  group: '', // string (група)
  email: null, // string (електронна пошта)
  grades: [], // array of numbers (оцінки)
  course: 1, // number (курс)
  image: null, // string (відносний шлях до зображення)
  test:""
};

export default ItemModel;
