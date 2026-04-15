const { validarCupom } = require('../coupon/validarCupom');
const { calcularTotalComDesconto } = require('../pricing/calcularTotal');

async function aplicarCupomFluxo(pedido, respostaPagamento, catalogoCupons, servicos) {

  const { valido, motivo, taxaDesconto } = validarCupom(
    pedido.cupom,
    respostaPagamento.remainingBalance,
    catalogoCupons
  );

  if (!valido) {
    return { sucesso: false, erro: motivo };
  }

  const totalFinal = calcularTotalComDesconto(pedido.valor, taxaDesconto);

  await servicos.pagamento.cobrar(totalFinal);
  await servicos.logistica.despachar(pedido);

  return { sucesso: true, totalFinal };
}

module.exports = { aplicarCupomFluxo };