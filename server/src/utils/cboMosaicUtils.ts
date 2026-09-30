import cboDictionary from './cboDictionary.json';

export interface MosaicInfo {
  codigo: string;
  grupoCodigo: string;
  grupoNome: string;
  grupoDescricao?: string;
  segmento: string;
  descricaoCompleta: string;
  descricaoTexto?: string;
}

export interface CBOInfo {
  codigo: string;
  titulo: string;
  formatado: string;
}

export const MOSAIC_GRUPOS: Record<string, string> = {
  A: 'Elites Brasileiras',
  B: 'Experientes Urbanos de Vida Confortável',
  C: 'Juventude Trabalhadora Urbana',
  D: 'Jovens da Periferia',
  E: 'Adultos Urbanos Estabelecidos',
  F: 'Envelhecendo no Século XXI',
  G: 'Donos de Negócio',
  H: 'Massa Trabalhadora Urbana',
  I: 'Moradores de Áreas Empobrecidas do Sul e do Sudeste',
  J: 'Habitantes de Zonas Precárias',
  K: 'Habitantes de Áreas Rurais',
};

export const MOSAIC_SEGMENTOS: Record<string, { grupo: string; segmento: string }> = {
  // Grupo A
  A01: { grupo: 'A', segmento: 'Ricos e influentes' },
  A02: { grupo: 'A', segmento: 'Elite urbana qualificada' },
  // Grupo B
  B03: { grupo: 'B', segmento: 'Idosos tradicionais de alto padrão' },
  B04: { grupo: 'B', segmento: 'A caminho da aposentadoria nas melhores cidades' },
  B05: { grupo: 'B', segmento: 'Assalariados de meia-idade das grandes cidades' },
  // Grupo C
  C06: { grupo: 'C', segmento: 'Construindo uma carreira promissora' },
  C07: { grupo: 'C', segmento: 'Jovens dependentes do interior' },
  C08: { grupo: 'C', segmento: 'Jovens protagonistas da classe média' },
  // Grupo D
  D09: { grupo: 'D', segmento: 'Seguindo a vida na periferia' },
  D10: { grupo: 'D', segmento: 'No coração da periferia' },
  D11: { grupo: 'D', segmento: 'Novos moradores da comunidade' },
  D12: { grupo: 'D', segmento: 'Trabalhadores vizinhos da grande cidade' },
  D13: { grupo: 'D', segmento: 'Independência na casa dos pais' },
  D14: { grupo: 'D', segmento: 'Juventude de baixa renda no interior urbano' },
  // Grupo E
  E15: { grupo: 'E', segmento: 'Esticando a renda' },
  E16: { grupo: 'E', segmento: 'Amadurecendo confortavelmente no interior' },
  E17: { grupo: 'E', segmento: 'Ascendentes do bairro' },
  E18: { grupo: 'E', segmento: 'Operários da vila' },
  // Grupo F
  F19: { grupo: 'F', segmento: 'Idosos independentes da classe média' },
  F20: { grupo: 'F', segmento: 'Jovens idosos urbanos e dinâmicos' },
  F21: { grupo: 'F', segmento: 'Idosos remediados do interior' },
  // Grupo G
  G22: { grupo: 'G', segmento: 'Empresários estabilizados' },
  G23: { grupo: 'G', segmento: 'Jovens empreendedores e ousados' },
  G24: { grupo: 'G', segmento: 'Pequenos negociantes do interior' },
  // Grupo H
  H25: { grupo: 'H', segmento: 'Carteira assinada nas regiões metropolitanas' },
  H26: { grupo: 'H', segmento: 'Trabalhadores manuais de baixa remuneração' },
  H27: { grupo: 'H', segmento: 'Prestadores de serviços nas regiões metropolitanas' },
  H28: { grupo: 'H', segmento: 'Jovens da informalidade' },
  H29: { grupo: 'H', segmento: 'Comunidades do litoral' },
  // Grupo I
  I30: { grupo: 'I', segmento: 'Envelhecendo com simplicidade' },
  I31: { grupo: 'I', segmento: 'Periferia jovem do interior' },
  I32: { grupo: 'I', segmento: 'Comunidade madura' },
  // Grupo J
  J33: { grupo: 'J', segmento: 'Jovens desprovidos' },
  J34: { grupo: 'J', segmento: 'Adultos vulneráveis' },
  // Grupo K
  K35: { grupo: 'K', segmento: 'Pedacinho de terra' },
  K36: { grupo: 'K', segmento: 'Jovens trabalhadores do agronegócio' },
  K37: { grupo: 'K', segmento: 'Saudade da roça' },
  K38: { grupo: 'K', segmento: 'Juventude do Norte e do Nordeste rural' },
  K39: { grupo: 'K', segmento: 'Idosos da agricultura familiar do Norte e do Nordeste' },
  K40: { grupo: 'K', segmento: 'Sertão profundo' },
};

export const MOSAIC_GRUPOS_DESCRICOES: Record<string, string> = {
  A: 'Empresários e executivos bem-sucedidos, vivem os confortos permitidos pela alta renda: automóveis de luxo, viagens internacionais, restaurantes e produtos exclusivos.',
  B: 'Com mais de 50 anos, são profissionais bem estabelecidos ou já aposentados. Usufruem agora do padrão de vida confortável conquistado com o trabalho. Moram em áreas urbanas, com destaque para o litoral.',
  C: 'Com até 35, são jovens em início de carreira, mas ainda buscando aumentar sua escolaridade, que já é superior à dos pais. São otimistas e antenados, com acesso à tecnologia e de olho nas tendências.',
  D: 'Jovens adultos moradores de zonas periféricas com difícil rotina devido às limitações no acesso à educação e por causa da falta de infraestrutura dos bairros onde moram. Porém, viram a vida melhorar e acreditam num futuro ainda melhor.',
  E: 'O brasileiro adulto médio. Com boa escolaridade e esforço, eles conquistaram uma vida profissional e financeira estável, ainda que sem luxos. São consumidores mais cautelosos.',
  F: 'O crescente grupo de idosos de classe média usufrui hoje de melhores condições, devido à renda da aposentadoria e do maior acesso a serviços de saúde. Ainda assim, sente nostalgia dos tempos mais simples.',
  G: 'O sonho de ser o próprio patrão se tornou realidade para eles. São pequenos e médios empreendedores que investiram suas economias e começam a ver o resultado, ainda que com algumas instabilidades.',
  H: 'Formando a massa de trabalhadores com baixa escolaridade e renda, eles vivem as vantagens e as desvantagens das grandes cidades: o acesso ao consumo e à informação e os problemas de mobilidade e alto custo de vida.',
  I: 'Trabalhadores com escolaridade e renda baixas, morando em áreas precárias, com difícil acesso a espaços e serviços públicos. Nos últimos anos, viram seu poder de consumo crescer, indo além das necessidades mais imediatas.',
  J: 'Homens e mulheres que vivem próximos à linha de pobreza e, por isso, dependem de programas sociais. A baixa renda e a baixa escolaridade são agravadas por estarem em regiões com acesso restrito a serviços públicos.',
  K: 'Moraram a vida toda em áreas rurais, e isso define muito sobre eles: o trabalho para o agronegócio ou em lavoura para consumo próprio, a dificuldade para acessar educação e outros serviços públicos e o amor à terra.'
};

export const MOSAIC_DESCRICOES: Record<string, string> = {
  A01: 'Empresários e executivos dos setores privado e público, maduros e bem-sucedidos. São representantes paradigmáticos da elite brasileira. Pessoas muito bem escolarizadas que vivem nas áreas mais prestigiadas e influentes do País, sobretudo nas capitais e regiões metropolitanas.\n\nPossuem apartamentos e carros de luxo e conseguem manter vários confortos, como empregados domésticos. São consumidores exclusivos, que gostam de grifes e frequentam os melhores e mais caros espaços de suas cidades, como restaurantes, shopping centers, casas de shows, teatros, entre outros.\n\nA passeio ou a trabalho, constantemente realizam viagens nacionais e internacionais. Em suas vidas profissionais, em geral tiveram sucesso ao mesclar tradição com ousadia. Mas, em outras dimensões de suas vidas, sobretudo política e educação, costumam ser um pouco conservadores.',
  A02: 'Moradores de grandes centros urbanos, bem remunerados e estabelecidos em função da alta escolaridade. Pessoas acima de 30 anos, mais concentradas na faixa dos 36 aos 70 anos. Compõem a elite instruída do País.\n\nA maioria teve acesso à educação superior de qualidade, o que lhes permitiu alcançar ocupações profissionais importantes e rentáveis. Vivem nas grandes cidades, em especial nas regiões Sudeste e Sul, em bairros bastante valorizados.\n\nEm geral, moram em apartamentos de alto padrão. A boa renda e o tipo de trabalho desempenhado permitem que essas pessoas desfrutem de um bom padrão de vida. Podem realizar viagens nacionais e internacionais com alguma frequência, costumam ir a bons restaurantes e têm acesso à vida cultural das grandes cidades.',
  B03: 'São, majoritariamente, idosos no fim da carreira profissional ou já aposentados. Possuem excelente renda e vivem em áreas ricas das regiões metropolitanas do País, com destaque para grandes cidades litorâneas, como Santos, Rio de Janeiro ou Florianópolis. Têm alta escolaridade, principalmente levando-se em conta a dificuldade de acesso à educação na época em que eram jovens.\n\nGrande parcela possui, inclusive, ensino superior completo. Dessa forma, conquistaram uma carreira profissional de sucesso e, em muitos casos, uma boa aposentadoria.\n\nSão pessoas ativas, que aproveitam a estabilidade financeira para desfrutar de mais qualidade de vida. É o caso das caminhadas à beira-mar, momento em que mesclam lazer e cuidados com a saúde.',
  B04: 'São aposentados ou pessoas a caminho de uma aposentadoria confortável. A maioria tem idade acima de 50 anos, com maior presença de mulheres. A grande maioria apresenta nível médio de escolaridade, o que lhes garante uma boa renda.\n\nSão, geralmente, funcionários de empresas privadas. Além da renda fixa, proveniente de muitos anos de trabalho, contam com a possibilidade de continuar trabalhando após a aposentadoria.\n\nVivem com suas famílias, em geral com 2 ou 3 moradores na casa, e é possível encontrar pessoas que estejam em um segundo casamento. Moram em áreas de classe média-alta de capitais, regiões metropolitanas e cidades ricas do interior, em especial nas regiões Sudeste e Sul. Além da renda, contam também com a boa estrutura das regiões onde vivem, como centros comerciais, hospitais e parques.',
  B05: 'Em geral, são homens, chefes de família, conservadores e tradicionais em seus valores familiares. Em sua maioria, com mais de 40 anos e trabalhadores da iniciativa privada em cargos médios. Apesar da baixa escolaridade, adquiriram certa estabilidade financeira devido ao tempo de carreira.\n\nAinda assim, vivem equilibrando as contas todos os meses, sem muita perspectiva de futuro, apesar de terem melhorado de vida nos últimos anos. Vivem em áreas de classe média-baixa de capitais e regiões metropolitanas.\n\nTêm acesso a serviços básicos, porém com opções limitadas de lazer e espaço público. Seus filhos já estão crescidos e batalham para fazer uma faculdade à noite, pois trabalham desde cedo. Isso é fonte de esperança, uma vez que eles mesmos não conseguiram o tão sonhado diploma.',
  C06: 'Filhos de famílias de alta renda, puderam começar suas vidas de forma mais confortável. O acesso a uma boa educação permite um início de carreira mais vantajoso e promissor. Assim, despontam como a futura elite do País.\n\nMoram em apartamentos, em áreas urbanas de alto padrão. A maioria é solteira e alguns já moram sozinhos. Gostam de se divertir, viajam sempre que podem e aproveitam oportunidades de lazer, como cinemas, baladas e bares.\n\nTambém apreciam consumir, em especial roupas e artigos eletrônicos. Apesar de uma boa renda pessoal, têm um padrão de vida acima desse patamar. Como não precisam ajudar em casa, seus ganhos são exclusivamente para usufruto próprio. Isso não significa, entretanto, que todo o dinheiro ganho seja usado no consumo: costumam poupar, pensando no futuro.',
  C07: 'Têm, na sua maioria, entre 26 e 35 anos e moram em áreas urbanas fora das capitais ou regiões metropolitanas. Embora tenham começado a trabalhar cedo, de certa forma ainda estão no início de suas carreiras profissionais. Possuem renda relativamente modesta, porém potencializada pelo menor custo de vida de suas regiões.\n\nA maior parte ainda mora com os pais ou parentes e, assim, esses jovens podem investir em si mesmos, principalmente nos estudos. A vida é menos “corrida” que nas grandes cidades, mas costumam aproveitar bares, baladas e cinema.\n\nRoupas e eletrônicos são valorizados, ainda que não sejam sempre de última geração. São mais comuns as viagens de fim de semana ou férias no País, programadas com antecedência. Sonham com uma melhora de renda para que, em um futuro próximo, possam sair da casa dos pais.',
  C08: 'Com até 25 anos, são os filhos da classe média brasileira que ascendeu nos últimos anos. Diferentemente de seus pais, a grande maioria conseguiu completar o ensino médio sem precisar trabalhar ao mesmo tempo.\n\nEstão no início de suas carreiras profissionais e ocupam cargos medianos ou baixos, mas pretendem continuar os estudos e cursar a universidade – sonho absoluto de seus pais. Como são os “protagonistas” da família, é comum serem responsáveis por pequenos investimentos no lar, como conexão à internet ou TV por assinatura.\n\nSeus salários são direcionados principalmente para a universidade e gastos próprios, como roupas e lazer. Solteiros, comunicativos, costumam ter um círculo de amizade ampliado e realizam muitas atividades de lazer, geralmente mais voltadas para espaços privados.',
  D09: 'Jovens adultos, principalmente na faixa dos 26 aos 45 anos, moradores de grandes cidades, vivendo em zonas muito distantes do centro. Em geral, vivem com suas famílias estendidas, que, em muitos casos, são chefiadas por mulheres.\n\nApesar de muitos possuírem escolaridade média, isso não significa que tenham garantia de boas ocupações: suas rendas são bem modestas. Sofrem com a falta de opção de lazer público nos bairros em que vivem e acabam realizando a maioria das atividades dentro do espaço doméstico. Por isso, investem em televisores mais modernos, videogames e em pacotes mais simples de TV por assinatura.',
  D10: 'São jovens moradores de zonas periféricas urbanas com baixa escolaridade. Em geral, nasceram nas periferias, e seus pais já viviam com renda mais baixa. Cerca de metade possui apenas o ensino fundamental.\n\nDessa forma, são aptos a postos de trabalho de menor remuneração ou informais. Em geral solteiros, muitos vivem em locais compartilhados de residência: uma mesma família dividindo uma casa cujos cômodos são separados ou em terrenos com mais de uma casa construída. Moram em bairros com poucas opções de lazer.\n\nMesmo assim é comum encontrarmos campos de futebol de várzea, direcionados sobretudo aos homens. Para as mulheres, o lazer pode ser o café com a vizinha ou a ida esporádica ao salão de beleza local. Em sua maioria, são consumidores do comércio de rua e não são frequentadores assíduos de shoppings.',
  D11: 'Ainda muito jovens, com menos de 30 anos, já moram sem a família em áreas extremamente periféricas, em geral comunidades fora das capitais. Muitos deles chegaram recentemente a essas áreas, sendo que parte vem do interior de estados mais pobres, buscando melhores oportunidades em centros urbanos. Há maior presença de mulheres.\n\nUma parte pequena, mas significativa, participa de programas sociais do governo. São pessoas que levam a vida com dificuldades, com renda apertada e gastos que devem ser devidamente controlados.\n\nO orçamento não tem “folga” e qualquer imprevisto pode provocar um desequilibrio financeiro. Por outro lado, muitos têm pequenos negócios informais e apostam nisso para melhorar suas condições.',
  D12: 'São jovens e adultos, em geral solteiros. Trabalhadores de menor qualificação e baixa remuneração que, por morarem em cidades fora dos grandes centros urbanos (capitais e regiões metropolitanas), apresentam condições de vida relativamente melhores do que a renda inicialmente sugeriria.\n\nTêm risco de crédito elevado, mas vivem uma vida um pouco mais tranquila do que os jovens com a mesma faixa de renda que vivem em periferias das regiões metropolitanas. Uma parcela participa de algum programa social do governo.\n\nPor estarem mais longe dos centros urbanos, têm menos acesso a informações culturais e eventos em geral. São menos antenados com as novidades, apesar de possuírem acesso à internet e relativo interesse por tecnologia.',
  D13: 'São jovens solteiros que, apesar de ainda viverem com suas famílias estendidas, mantêm alguma independência econômica e conseguem se sustentar com seus próprios recursos. Assim, podem investir em bens de consumo, como computadores e roupas, e pensar em economizar para constituir uma família. Vivem em áreas periféricas, em geral das regiões metropolitanas.\n\nPoucos moram nas capitais. Mesmo com a maior parte morando há mais de cinco anos no mesmo endereço, destaca-se o fato de que uma parcela já mudou de cidade pelo menos uma vez na vida.\n\nPossuem baixíssimo acesso a atividades culturais e são mais frequentadores de comércio de rua. Apesar da vida difícil, sonham com um futuro melhor e acreditam que o trabalho formal possa lhes trazer alguma estabilidade ao longo dos anos.',
  D14: 'São jovens, na maioria, entre 18 e 25 anos, solteiros e sem filhos. A baixa renda e a baixa escolaridade – a maioria não foi além do ensino fundamental – são compensadas, em parte, por viverem no interior e com suas famílias.\n\nPor outro lado, são mais dependentes, tanto dos familiares como de ajuda governamental. Uma parcela pequena trabalha na iniciativa privada e outros realizam trabalhos informais.\n\nSua vida é bastante modesta: pouco conseguem fazer além do básico. Por isso, os poucos momentos de lazer são mais voltados para o espaço doméstico, como a TV e a internet, ou espaços públicos gratuitos, embora essa opção seja escassa.',
  E15: 'Adultos, entre 36 e 60 anos, a maioria homens, que vivem com suas famílias, normalmente com duas a três pessoas na residência. São como “malabaristas” que conseguem tirar o máximo dos recursos disponíveis para ter a melhor condição de vida possível.\n\nSão profissionais de baixa a média escolaridade, que atingiram alguma estabilidade no emprego e possuem renda fixa, porém muitas vezes insuficiente para cobrir todos os gastos mensais. Assim, recorrem com frequência ao crédito – seja cartão de crédito, seja empréstimo pessoal – para poderem fechar as contas no fim do mês.\n\nMetade já mudou de cidade pelo menos uma vez na vida. Moram, em geral, em regiões metropolitanas, onde o custo de vida é mais alto, e isso acaba dificultando o frágil equilíbrio que tentam manter entre despesa e renda.',
  E16: 'São pessoas maduras, já se aproximando da terceira idade, que tiveram uma boa educação e boas oportunidades na vida. Por isso, hoje possuem uma estabilidade financeira que indica a chegada a um futuro confortável. Em geral, moram nas cidades do interior e, por isso, usufruem de melhores condições de vida.\n\nEsse fator permite que suas rendas ofereçam maior poder de compra, já que nesses locais o custo de vida é mais baixo. A maioria é casada, com uma boa parcela de idosos na residência.\n\nA principal ocupação é o trabalho na iniciativa privada, seja como funcionário, seja como profissional liberal, e uma pequena parcela é dona do próprio negócio. Acreditam que estão chegando a um ponto de amadurecimento em suas vidas e trabalham para garantir um futuro confortável e sem preocupação.',
  E17: 'Adultos, maioria homens, com idade entre 30 e 55 anos. Apesar da faixa etária, muitos são solteiros.\n\nTiveram razoável acesso à educação, o que permitiu uma melhora de vida ao longo do tempo. Conseguiram carreiras boas e estáveis, e muitos trabalham no setor público, construindo carreiras como militares, bombeiros, professores, entre outras.\n\nMoram nas capitais e regiões metropolitanas, em áreas menos nobres do que a renda indica. Destacam-se em seus bairros por terem os bens em melhores condições – carros mais novos, casas mais bem arrumadas, reformadas e equipadas, além de hábitos de lazer mais caros, como refeições fora de casa nos fins de semana e eventuais viagens nacionais.',
  E18: 'São, em geral, homens chefes de família, na faixa dos 25 aos 45 anos, com baixa escolaridade. Ocupam cargos de baixa remuneração no setor industrial ou de serviços. A família é o porto seguro, e o trabalho é o centro de suas vidas.\n\nPorém, como moram perto do emprego, têm mais tempo para o descanso. São bairros com infraestrutura básica, mas sem acesso a lazer e espaços públicos.\n\nA vida é apertada em função da baixa renda, porém acreditam que vivem razoavelmente bem pelo fato de não terem estudado muito e estarem empregados. Além disso, costumam ser controlados em relação ao consumo, evitando recorrer ao crédito. Valorizam a educação, buscando melhorar sua qualificação ou garantir melhores condições para os filhos.',
  F19: 'A boa escolaridade – uma parte importante concluiu o ensino superior – foi preponderante para a qualidade de vida atual, que não foi impactada de maneira decisiva pela aposentadoria. Muitos vivem sozinhos e são independentes, inclusive financeiramente.\n\nPossuem um estilo de vida estável e confortável, morando no mesmo endereço, em geral em capitais e regiões metropolitanas, há muito tempo. Desse modo, têm relações enraizadas com o bairro e a vizinhança.\n\nApresentam hábitos conservadores em diversas esferas de suas vidas, como no distanciamento em relação à tecnologia. Esse conservadorismo se reflete também na relação com o consumo: não se arriscam muito em questões financeiras e, talvez por isso, quase não fazem uso do crédito a que possuem acesso em função da renda fixa.',
  F20: 'A maioria tem mais de 65 anos, mas podem ser considerados jovens entre os idosos. Oriundos das classes baixa ou média-baixa, obtiveram um incremento de renda e melhor acesso a bens e serviços, proporcionados principalmente pelo tempo de vida e pelas mudanças socioeconômicas das últimas décadas.\n\nVivem em bairros de classe média-baixa, a maioria em regiões metropolitanas ou capitais. Sua renda pessoal média é ligeiramente superior à nacional, pois, além da aposentadoria, muitos mantêm alguma atividade rentável extra, dado a idade não tão avançada.\n\nAs dificuldades passadas na vida os tornaram um pouco mais flexíveis e, com a melhora dos últimos anos, mais otimistas. Por isso, apresentam comportamento financeiro e de consumo pouco conservador e recorrem ao crédito quando necessário.',
  F21: 'Com faixa etária média acima de 70 anos, são aposentados que vivem fora das regiões metropolitanas ou capitais, em áreas de menor desenvolvimento econômico e urbano, porém com custo de vida menor. Boa parte deste grupo é composta por mulheres viúvas.\n\nDe um modo geral, são pessoas marcadas pela idade, mas que vivem uma vida tranquila. Com baixa escolaridade, são conservadores, com pouquíssimo conhecimento das questões financeiras ou de crédito.\n\nJunto à baixa renda e aos elevados gastos fixos provocados pela idade, o receio em relação ao crédito faz dessas pessoas quase “não consumidoras”, pois ficam restritas às necessidades mais básicas. No entanto, podem ceder o nome limpo para membros da família que precisem fazer um financiamento ou empréstimo.',
  G22: 'São predominantemente homens, com idade em torno dos 50 anos e alta escolaridade. Muitos começaram a vida como funcionários, em especial no setor público, mas resolveram investir no próprio negócio pensando em aumentar a renda, garantir o futuro e obter maior flexibilidade de horário.\n\nMoram fora das capitais e têm a preocupação de ajudar os filhos, que não são mais crianças, a começarem suas vidas. Por isso, por vezes empregam filhos e demais parentes em seus negócios.\n\nComo suas empresas em geral já passaram dos anos mais perigosos, nos quais muitas acabam fechando, possuem estabilidade, e isso lhes garante uma vida extremamente confortável se comparada aos padrões brasileiros. Conseguem consumir produtos de marcas famosas e ter acesso a bens culturais e viagens.',
  G23: 'São jovens adultos, entre os 26 e os 45 anos, que acreditam fortemente na possibilidade de uma renda maior se investirem em negócios próprios em vez de trabalharem como empregados. Valorizam mais suas qualidades empreendedoras do que a própria escolaridade. Audaciosos e otimistas, lançam-se ao mercado.\n\nComo não estão muito bem preparados, muitas vezes passam por dificuldades, mas não desistem. A maioria é composta por solteiros, e mais da metade já se mudou de cidade pelo menos uma vez.\n\nO mesmo apetite que apresentam em relação aos negócios é observado na vida pessoal: são ambiciosos e acreditam que a aquisição de bens demonstra seu status social e sua capacidade profissional. Assim, estão constantemente pressionados pelo desejo de alcançar o sucesso e pela necessidade de investimento que seus negócios iniciantes demandam.',
  G24: 'Pequenos comerciantes de cidades do interior do País que enxergaram na abertura do negócio próprio uma boa oportunidade de aumento de renda e estabilidade financeira. Alguns são ou já foram funcionários públicos que aproveitaram a estabilidade para fazer uma pequena poupança e investir em um negócio próprio, por vezes administrado inicialmente pela esposa ou algum parente, enquanto continuam atuando no trabalho assalariado.\n\nSuas rendas não são altas, mas costumam ser constantes, o que lhes permite usufruir de vida confortável, principalmente porque nas cidades do interior o custo de vida tende a ser mais baixo. No entanto, diferentemente dos demais segmentos deste grupo, não há espaço para serem consumistas ou muito ambiciosos, pois atuam em mercados menos aquecidos.',
  H25: 'São trabalhadores moradores dos subúrbios e periferias das regiões metropolitanas, cujo acesso ao emprego formal possibilitou que atingissem uma situação financeira mais estável e segura. A maioria é casada e tem filhos.\n\nEm geral, vivem com suas famílias em bairros que, apesar de humildes, possuem serviços básicos de saneamento, saúde e educação, por estarem em grandes centros urbanos. Apesar do alto índice de emprego formal, sua escolaridade é muito baixa, o que muitas vezes os impede de exercer funções mais prestigiadas e com remuneração mais elevada. Porém, por terem visto sua situação progredir, alimentam esperanças de um futuro melhor para si e para seus filhos.',
  H26: 'São pessoas entre 30 e 55 anos, casadas, com filhos e moradoras das regiões metropolitanas. Trabalhadores pouco qualificados, estão usualmente em atividades manuais, de baixo prestígio e remuneração.\n\nEm geral, moram em bairros pobres e afastados, com dificuldade de acesso a serviços básicos como saneamento, coleta de lixo e iluminação pública, assim como serviço de saúde pública e educação. Em sua maioria, moram há pouco tempo no mesmo endereço, dificultando a formação de laços sociais de solidariedade na vizinhança. Vivem em situação de vulnerabilidade social e compõem parte expressiva de uma população urbana que é alvo de políticas públicas de assistência social.',
  H27: 'O acesso à escolaridade formal proporcionou a esses adultos uma vantagem competitiva: conseguiram ocupações profissionais de nível superior ou técnico em setores administrativos e do comércio. São majoritariamente homens e se encontram na faixa dos 36 aos 55 anos.\n\nComo, em geral, vivem fora das capitais, em cidades menores das regiões metropolitanas e, por vezes, do interior, o poder de compra de sua renda é potencializado pelo menor custo de vida desses locais. Embora sua renda permita que tenham, no interior de suas casas, condições de vida melhores, com maior acesso a lazer e consumo um pouco além do básico, eles continuam vivendo em bairros simples, por vezes precários.',
  H28: 'Jovens, concentrados na faixa etária entre 26 e 40 anos, que atuam profissionalmente fora do mercado formal de emprego. Em função da baixa escolaridade, a renda também costuma ser baixa. Isso, somado à informalidade, coloca essas pessoas em situações claras de vulnerabilidade social, e muitos são alvo de políticas públicas de combate à pobreza.\n\nEm geral, estão nas regiões metropolitanas, mas fora das capitais, em especial as situadas na costa brasileira. Isso faz com que haja presença de trabalho sazonal, de acordo com a vinda dos turistas.\n\nSão, em boa parte, moradores de favelas que vivem em situações limítrofes de habitação, com baixo acesso a serviços públicos de saúde e educação e sem muita perspectiva de vida. Muitas vezes, a praia é a única opção de lazer de que podem desfrutar.',
  H29: 'Pessoas entre 26 e 50 anos, muitas solteiras. A maioria é moradora de favelas em áreas urbanas, predominantemente em capitais, nas regiões costeiras, com destaque para a cidade do Rio de Janeiro e para o Estado da Bahia. Essas moradias são em geral precárias, sem regulamentação fundiária, carentes de identificação das ruas, pavimentação, iluminação pública e serviços de coleta de lixo e saneamento básico.\n\nUma parte está inserida no mercado formal de trabalho. No entanto, a maioria atua na informalidade ou está desempregada.\n\nMuitos trabalham por conta própria em funções pouco rentáveis, ou seja, encontram algum jeito de ganhar a vida. Uma proporção expressiva recebe ajuda governamental. Apesar da violência em suas comunidades, conseguem construir redes de solidariedade e cultura.',
  I30: 'São homens e mulheres chegando à terceira idade, concentrando-se na faixa dos 50 aos 70 anos. É comum, em decorrência das dificuldades que a vida lhes trouxe, apresentarem aparência física mais envelhecida do que a própria idade cronológica sugere. São profissionais de baixa qualificação, quase sempre com apenas o ensino básico.\n\nPor isso, acabaram inseridos em cargos menos valorizados no mercado de trabalho. A maioria é casada e vive com suas famílias estendidas em bairros periféricos, com acesso restrito à infraestrutura básica.\n\nFilhos costumam morar com os pais, assim como os avós ou parentes mais velhos. Com pouco acesso a lazer público, no ambiente doméstico e na vizinhança estão os principais nós da rede de sociabilidade que dão sustento material e simbólico às suas vidas.',
  I31: 'Jovens adultos, cuja idade varia entre 26 e 40 anos. Na maioria solteiros, compartilham o domicílio com a família estendida, e parte convive com idosos em casa. Poucos possuem emprego com carteira assinada, indicando uma alta taxa de desemprego e de pessoas trabalhando informalmente.\n\nAlguns recebem ajuda governamental. A maioria completou o ensino fundamental e uma boa parte chegou ao ensino médio.\n\nSeu consumo é bastante restrito a itens básicos relacionados a moradia, alimentação e vestuário. Mas são ligados na internet e não deixam de sonhar: por vezes, conseguem comprar produtos mais caros, como roupas de marca, eletrônicos (TV de LCD, videogame, smartphone) e eventualmente veículos, principalmente motocicletas.',
  I32: 'Homens e mulheres adultos que vivem em regiões precárias, concentradas nas áreas mais populosas do País. Com baixa escolaridade, muitos estão inseridos no mercado informal ou mesmo desempregados. Os filhos são os principais pontos de investimento, pois representam a esperança e a possibilidade de realização dos sonhos da família inteira.\n\nA vida é bem modesta, mas há espaço para algumas manobras, como o churrasco no fim de semana, a compra de uma TV de LCD ou uma pequena reforma em casa. São caseiros, valorizam as famílias e o convívio com a vizinhança.\n\nDistantes do emprego formal, tornam-se mais vulneráveis. Mas, por serem relativamente jovens e estarem em regiões mais populosas, têm mais “jogo de cintura” para encarar as situações adversas, ainda que à luz do subemprego.',
  J33: 'Embora jovens, eles já enfrentaram todo tipo de dificuldade: financeira e no acesso a serviços públicos e à cidadania. Por isso, muitas vezes parecem mais amadurecidos e envelhecidos do que realmente são. Vivem em cidades pequenas, em geral do Nordeste e do Norte do País.\n\nQuando conseguem vencer a barreira do acesso, encontram uma educação de baixa qualidade, sem formação profissional. Dessa forma, só obtêm colocações informais ou de baixíssima remuneração.\n\nComo dependem de suas famílias, dividem residências que são densamente povoadas, com pouco espaço para privacidade ou lazer. Fora de casa, o espaço público é carente de quase tudo. Possuem poucas expectativas em relação ao futuro, mas mantêm alguns sonhos de consumo, como um computador, uma TV grande e, quem sabe, uma moto.',
  J34: 'Adultos com média etária em torno de 55 anos. Em geral, são trabalhadores com baixíssima qualificação, muitos na informalidade. Suas esposas são donas de casa ou também vivem situações profissionais desfavoráveis.\n\nMoram em cidades pequenas, em áreas pouco desenvolvidas economicamente do Norte e do Nordeste do País. As casas são densamente habitadas, frequentemente com presença de idosos já aposentados, cuja renda influencia decisivamente nas condições de vida da família. Poucos conseguem consumir além das necessidades básicas relacionadas a moradia, alimentação e vestuário.\n\nTiveram pouco acesso à escolaridade, e alguns são analfabetos. Passaram boa parte de suas vidas à margem da cidadania, esquecidos pelo Estado. Assim, muitos encontram na religião uma forma de alento para o dia a dia sofrido.',
  K35: 'São trabalhadores e pequenos proprietários moradores das zonas rurais do Sul e do Sudeste do País. Com escolaridade mediana e condições de vida razoáveis, têm satisfação no trabalho com a terra e na distância dos problemas das grandes cidades.\n\nHá pessoas distribuídas em uma ampla faixa etária, mas concentradas em uma média por volta dos 40 anos. Grande parte é de pessoas casadas, que vivem com suas famílias, incluindo idosos na residência.\n\nA maioria é composta por empregados com registro formal, mas há também uma proporção significativa de pequenos proprietários. São também pessoas que apresentam certa mobilidade: muitos já mudaram de cidade ao menos uma vez.',
  K36: 'Jovens moradores do interior do Sudeste e do Centro-Oeste do País, trabalhando em latifúndios ou empresas ligadas ao agronegócio. Em geral, nasceram em áreas rurais e suas famílias praticavam agricultura de subsistência. Muitos migraram de regiões mais ao sul, com os pais ou sozinhos para tentar a vida.\n\nA escolaridade é baixa em relação à faixa etária, mas boa para a média em áreas rurais. A renda também é razoável.\n\nParte é casada e vive com suas famílias, sendo comum a presença de crianças nas casas. A residência muitas vezes é localizada em fazendas e cedida pelo grande proprietário empregador. Por isso, seu anseio é conseguir juntar dinheiro para ter sua própria terra, sem depender do patrão e sem precisar migrar novamente.',
  K37: 'Idosos que moram há muito tempo no mesmo endereço em bairros ou pequenas cidades rurais do Sul e do Sudeste do País. Em geral, são homens, muitos deles viúvos. Alguns são filhos de imigrantes italianos, alemães ou japoneses.\n\nTrabalharam a vida inteira na roça. Apesar de a maioria ser aposentada, há os que ainda trabalham como empregados formais. A idade, porém, é avançada para o trabalho rural e também requer cuidados mais constantes com a saúde.\n\nPor isso, deslocam-se com frequência para as cidades próximas. Muitas vezes, seus filhos acabam cuidando da terra e dando continuidade ao sustento da família. São extremamente tradicionais, apegados a suas raízes e não se adaptam a certas mudanças que ocorreram nos últimos anos, como a chegada da tecnologia.',
  K38: 'São jovens moradores das áreas rurais do Norte e do Nordeste do País. Com baixa renda e situação informal de emprego, vivem em condições difíceis, com muita insegurança financeira e vulneráveis do ponto de vista social. Uma boa parte está inserida em programas sociais do governo.\n\nTrabalham nas terras da família ou possuem um pequeno pedaço de terra para o cultivo de subsistência. Porém, isso não rende o suficiente para viverem com conforto, já que em suas regiões não há mercado consumidor para sobras da produção.\n\nSão extremamente suscetíveis às condições climáticas. Apesar da baixa escolaridade, muitos são a primeira geração da família que foi alfabetizada, o que lhes traz certas responsabilidades, inclusive a de ajudar seus pais. Alguns possuem telefones celulares ou até motos simples.',
  K39: 'Idosos, vivem em áreas pobres das zonas rurais do Norte e do Nordeste do País. Há uma grande parcela de moradores de áreas consideradas vilas rurais isoladas. Muitos já deixaram de trabalhar regularmente, mas ainda fazem alguns “bicos” em lavouras de proprietários maiores para ter uma pequena renda.\n\nA maioria não possui nenhum tipo de proteção social, como aposentadoria. Outros recebem ajuda de programas sociais do governo. Chegaram a uma fase da vida em que o cansaço venceu o trabalho cotidiano.\n\nPor isso, dependem do trabalho dos filhos. Muitos possuem terras que foram ocupadas no passado e já estão regularizadas. As dificuldades pelas quais passaram na vida – inclusive fome – os fazem acreditar que, apesar da extrema pobreza, vivem hoje em melhores condições.',
  K40: 'Homens e mulheres de todas as idades, morando nas áreas mais distantes e rurais do País. A situação precária é marcada pela falta de água encanada, saúde, educação e até, por vezes, luz elétrica. De escolaridade baixa, muitos nem conseguiram terminar o ensino fundamental.\n\nSuas rendas estão entre as mais baixas do País, ou seja, na linha da pobreza. Não possuem terra própria e dependem de subempregos em lavouras, que às vezes existem, às vezes não.\n\nEstão à margem do sistema, e grande parte não possui sequer documentação básica. Sem nenhum tipo de garantias, sobrevivem quase que exclusivamente de ajuda governamental.'
};

const cboMap = cboDictionary as Record<string, string>;

/**
 * Traduz e formata código CBO oficial com título da ocupação
 */
export function translateCBO(rawCode?: string | number | null): CBOInfo | null {
  if (!rawCode) return null;
  const str = String(rawCode).trim();
  if (!str || str === '-' || str.toUpperCase() === 'NULL' || str.toUpperCase() === 'UNDEFINED') return null;

  const cleanDigits = str.replace(/\D/g, '');
  let foundTitle = cboMap[str] || cboMap[cleanDigits];

  if (!foundTitle && cleanDigits.length > 0 && cleanDigits.length < 6) {
    const padded = cleanDigits.padStart(6, '0');
    foundTitle = cboMap[padded];
  }

  let codigoFormatado = str;
  if (cleanDigits.length === 6) {
    codigoFormatado = `${cleanDigits.substring(0, 4)}-${cleanDigits.substring(4)}`;
  }

  if (foundTitle) {
    return {
      codigo: codigoFormatado,
      titulo: foundTitle,
      formatado: `${codigoFormatado} - ${foundTitle}`
    };
  }

  return {
    codigo: codigoFormatado,
    titulo: str,
    formatado: str
  };
}

/**
 * Traduz e formata código Mosaic para Perfil Socioeconômico com Grupo e Segmento
 */
export function translateMosaic(rawCode?: string | number | null): MosaicInfo | null {
  if (!rawCode) return null;
  const str = String(rawCode).trim().toUpperCase();
  if (!str || str === '-' || str === 'NULL' || str === 'UNDEFINED') return null;

  // 1. Tentar correspondência direta em MOSAIC_SEGMENTOS
  if (MOSAIC_SEGMENTOS[str]) {
    const item = MOSAIC_SEGMENTOS[str];
    const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
    return {
      codigo: str,
      grupoCodigo: item.grupo,
      grupoNome,
      grupoDescricao: MOSAIC_GRUPOS_DESCRICOES[item.grupo],
      segmento: item.segmento,
      descricaoCompleta: `${str} - ${item.segmento} (${grupoNome})`,
      descricaoTexto: MOSAIC_DESCRICOES[str] || MOSAIC_GRUPOS_DESCRICOES[item.grupo]
    };
  }

  // 2. Se for número puro (1 a 40)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 40) {
    const segKeys = Object.keys(MOSAIC_SEGMENTOS);
    const key = segKeys[num - 1];
    if (key) {
      const item = MOSAIC_SEGMENTOS[key];
      const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
      return {
        codigo: key,
        grupoCodigo: item.grupo,
        grupoNome,
        grupoDescricao: MOSAIC_GRUPOS_DESCRICOES[item.grupo],
        segmento: item.segmento,
        descricaoCompleta: `${key} - ${item.segmento} (${grupoNome})`,
        descricaoTexto: MOSAIC_DESCRICOES[key] || MOSAIC_GRUPOS_DESCRICOES[item.grupo]
      };
    }
  }

  // 3. Se for código com 1 dígito numérico após letra (ex: A1 -> A01, D9 -> D09)
  const letterMatch = str.match(/^([A-K])(\d{1})$/);
  if (letterMatch) {
    const paddedKey = `${letterMatch[1]}0${letterMatch[2]}`;
    if (MOSAIC_SEGMENTOS[paddedKey]) {
      const item = MOSAIC_SEGMENTOS[paddedKey];
      const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
      return {
        codigo: paddedKey,
        grupoCodigo: item.grupo,
        grupoNome,
        grupoDescricao: MOSAIC_GRUPOS_DESCRICOES[item.grupo],
        segmento: item.segmento,
        descricaoCompleta: `${paddedKey} - ${item.segmento} (${grupoNome})`,
        descricaoTexto: MOSAIC_DESCRICOES[paddedKey] || MOSAIC_GRUPOS_DESCRICOES[item.grupo]
      };
    }
  }

  // 4. Se for apenas a letra do grupo (ex: 'A', 'B', 'GRUPO A')
  const cleanGrupo = str.replace(/^GRUPO\s*/, '').trim();
  if (MOSAIC_GRUPOS[cleanGrupo]) {
    const grupoNome = MOSAIC_GRUPOS[cleanGrupo];
    return {
      codigo: cleanGrupo,
      grupoCodigo: cleanGrupo,
      grupoNome,
      grupoDescricao: MOSAIC_GRUPOS_DESCRICOES[cleanGrupo],
      segmento: grupoNome,
      descricaoCompleta: `Grupo ${cleanGrupo} - ${grupoNome}`,
      descricaoTexto: MOSAIC_GRUPOS_DESCRICOES[cleanGrupo]
    };
  }

  // 5. Se já vier descritivo ou não catalogado
  return {
    codigo: str,
    grupoCodigo: '',
    grupoNome: '',
    segmento: str,
    descricaoCompleta: str
  };
}
