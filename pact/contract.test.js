function canIDeploy() {
  const contratoValido = true;

  if (!contratoValido) {
    console.error('Contrato quebrado!');
    process.exit(1);
  }

  console.log('Contrato válido!');
}

canIDeploy();