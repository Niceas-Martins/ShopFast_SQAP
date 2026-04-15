const { calcularTotalComDesconto } = require('../src/pricing/calcularTotal');

test('calcula desconto corretamente', () => {
  const total = calcularTotalComDesconto(100, 0.5);
  expect(total).toBe(50);
});