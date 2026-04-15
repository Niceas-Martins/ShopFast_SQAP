function calcularTotalComDesconto(valorPedido, taxaDesconto) {
  return valorPedido - (valorPedido * taxaDesconto);
}

module.exports = { calcularTotalComDesconto };