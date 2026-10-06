import { infosinistrosService } from '../src/services/infosinistrosService';

async function main() {
  console.log('--- Testando infosinistrosService ---');
  const res = await infosinistrosService.consultarPreVistoria('MIR2011');
  console.log('Sucesso:', res.sucesso);
  console.log('Cliente:', res.cliente);
  console.log('Total Produtos retornados:', Object.keys(res.resultados || {}).length);
  const p35 = res.resultados?.P35;
  console.log('P35 Status:', p35?.status);
  console.log('P35 Marca/Modelo:', p35?.conteudo?.marcaModelo);
  console.log('P35 RENAVAM:', p35?.conteudo?.renavam);
  console.log('P35 Chassi:', p35?.conteudo?.chassi);
  process.exit(0);
}

main().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
