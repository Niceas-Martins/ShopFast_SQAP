const SALDO_MINIMO_ACEITO = 0.01;

function validarCupom(codigoCupom, saldoDisponivel, catalogoCupons) {

  if (!codigoEstaPreenchido(codigoCupom)) {
    return resultado(false, 'Cupom ausente ou vazio.', 0);
  }

  if (!cupomExisteNoCatalogo(codigoCupom, catalogoCupons)) {
    return resultado(false, `Cupom "${codigoCupom}" não encontrado.`, 0);
  }

  if (!temSaldoPositivo(saldoDisponivel)) {
    return resultado(false,
      `Saldo insuficiente: R$ ${saldoDisponivel}`, 0);
  }

  return resultado(true, 'Cupom válido.', catalogoCupons[codigoCupom]);
}

function codigoEstaPreenchido(codigo) {
  return typeof codigo === 'string' && codigo.trim().length > 0;
}

function cupomExisteNoCatalogo(codigo, catalogo) {
  return Object.prototype.hasOwnProperty.call(catalogo, codigo);
}

function temSaldoPositivo(saldo) {
  return typeof saldo === 'number' && saldo >= SALDO_MINIMO_ACEITO;
}

function resultado(valido, motivo, taxaDesconto) {
  return { valido, motivo, taxaDesconto };
}

module.exports = { validarCupom };