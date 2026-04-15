const { validarCupom } = require('../src/coupon/validarCupom');

const catalogo = {
  BLACK50: 0.5
};

describe('validarCupom', () => {

  test('deve rejeitar cupom vazio', () => {
    const res = validarCupom('', 100, catalogo);
    expect(res.valido).toBe(false);
  });

  test('deve rejeitar cupom inexistente', () => {
    const res = validarCupom('INVALIDO', 100, catalogo);
    expect(res.valido).toBe(false);
  });

  test('deve rejeitar saldo zerado', () => {
    const res = validarCupom('BLACK50', 0, catalogo);
    expect(res.valido).toBe(false);
  });

  test('deve aceitar cupom válido com saldo', () => {
    const res = validarCupom('BLACK50', 100, catalogo);
    expect(res.valido).toBe(true);
  });

});