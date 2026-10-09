import { infosinistrosService } from '../src/services/infosinistrosService';
import { e20Service } from '../src/services/e20Service';

async function main() {
  console.log('--- Testando InfoSinistros e E20 para OVL-8B15 vs OLV-8B15 ---');

  // Teste 1: InfoSinistros com a placa correta OVL8B15
  console.log('\n[1] Consultando InfoSinistros para OVL8B15:');
  const res = await infosinistrosService.consultarPreVistoria('OVL8B15');
  console.log('Sucesso:', res.sucesso);
  console.log('Código:', res.codigo);
  console.log('Cliente:', res.cliente);
  console.log('P10 (Roubo e Furto):', res.resultados?.P10?.status, res.resultados?.P10?.conteudo);
  console.log('P19 (Recuperado BRF):', res.resultados?.P19?.status, res.resultados?.P19?.conteudo);

  // Teste 2: E20 consolidado com a placa correta OVL8B15
  console.log('\n[2] Consultando E20 Consolidado para OVL8B15:');
  const e20Res = await e20Service.executarConsultaE20('OVL8B15');
  console.log('Veículo:', e20Res.veiculo?.marcaModelo, e20Res.veiculo?.anoFabricacao, e20Res.veiculo?.anoModelo);
  console.log('Status Roubo/Furto E20:', e20Res.roubo_furto?.status);
  console.log('Queixa ativa?:', e20Res.roubo_furto?.temQueixaAtiva);
  console.log('Tempo Roubado calculado:', e20Res.roubo_furto?.tempoRoubado);
  console.log('Total ocorrências:', e20Res.roubo_furto?.totalOcorrencias);
  console.log('Ocorrências:', JSON.stringify(e20Res.roubo_furto?.ocorrencias, null, 2));

  const p10Item = e20Res.indicadores?.find((i: any) => i.chave === 'P10');
  console.log('Indicador P10 no Grid:', p10Item?.status, p10Item?.mensagem);
  console.log('P10 tempoRoubado:', p10Item?.tempoRoubado);

  const p24Item = e20Res.indicadores?.find((i: any) => i.chave === 'P24');
  console.log('\nIndicador P24 no Grid:');
  console.log('Status P24:', p24Item?.status);
  console.log('Mensagem P24:', p24Item?.mensagem);
  console.log('tempoRoubado P24:', p24Item?.tempoRoubado);
  console.log('Detalhes P24:', JSON.stringify(p24Item?.detalhes, null, 2));

  // Teste 3: InfoSinistros com a placa com inversão OLV8B15
  console.log('\n[3] Consultando InfoSinistros para OLV8B15 (inversão digitada):');
  const resOlv = await infosinistrosService.consultarPreVistoria('OLV8B15');
  console.log('Sucesso OLV:', resOlv.sucesso);
  console.log('Código OLV:', resOlv.codigo);

  process.exit(0);
}

main().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
