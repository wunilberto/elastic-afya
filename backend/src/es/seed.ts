import { esClient } from "./client";
import { logger } from "../logger";
import "./setup";

type BaseDoc = {
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  popularity_score: number;
  updated_at: string;
  type: "product" | "article" | "event";
  url: string;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const products: BaseDoc[] = [
  {
    title: "Cafeteira Elétrica Mondial",
    description: "Cafeteira elétrica com capacidade para 18 xícaras, jarra de vidro e sistema corta-pingo.",
    categories: ["eletrodomésticos", "cozinha"],
    tags: ["cafeteira", "café", "eletrodoméstico"],
    popularity_score: 87.5,
    updated_at: daysAgo(1),
    type: "product",
    url: "https://example.com/products/cafeteira-mondial",
  },
  {
    title: "Tênis Esportivo Nike Revolution",
    description: "Tênis leve e confortável para corrida e caminhadas, disponível em várias cores.",
    categories: ["calçados", "esporte"],
    tags: ["tênis", "nike", "corrida"],
    popularity_score: 92.3,
    updated_at: daysAgo(2),
    type: "product",
    url: "https://example.com/products/tenis-nike-revolution",
  },
  {
    title: "Livro: O Poder do Hábito",
    description: "Best-seller de Charles Duhigg sobre como hábitos são formados e como mudá-los.",
    categories: ["livros", "autoajuda"],
    tags: ["livro", "hábito", "autoajuda"],
    popularity_score: 78.1,
    updated_at: daysAgo(3),
    type: "product",
    url: "https://example.com/products/o-poder-do-habito",
  },
  {
    title: "Smartphone Samsung Galaxy S23",
    description: "Smartphone com câmera tripla, tela AMOLED e bateria de longa duração.",
    categories: ["eletrônicos", "celulares"],
    tags: ["smartphone", "samsung", "galaxy"],
    popularity_score: 95.7,
    updated_at: daysAgo(4),
    type: "product",
    url: "https://example.com/products/galaxy-s23",
  },
  {
    title: "Aspirador de Pó Robô Xiaomi",
    description: "Aspirador inteligente com mapeamento de ambiente e recarga automática.",
    categories: ["eletrodomésticos", "limpeza"],
    tags: ["aspirador", "robô", "xiaomi"],
    popularity_score: 88.9,
    updated_at: daysAgo(5),
    type: "product",
    url: "https://example.com/products/aspirador-xiaomi",
  },
  {
    title: "Bicicleta Caloi 100 Sport",
    description: "Bicicleta aro 29, 21 marchas, ideal para trilhas e passeios urbanos.",
    categories: ["esporte", "lazer"],
    tags: ["bicicleta", "caloi", "trilha"],
    popularity_score: 81.2,
    updated_at: daysAgo(6),
    type: "product",
    url: "https://example.com/products/bicicleta-caloi-100",
  },
  {
    title: "Fone de Ouvido Bluetooth JBL",
    description: "Fone sem fio com cancelamento de ruído e bateria de até 40 horas.",
    categories: ["eletrônicos", "áudio"],
    tags: ["fone", "bluetooth", "jbl"],
    popularity_score: 90.4,
    updated_at: daysAgo(7),
    type: "product",
    url: "https://example.com/products/fone-jbl",
  },
  {
    title: "Relógio Smartwatch Amazfit Bip U",
    description: "Relógio inteligente com monitoramento de saúde, GPS e resistência à água.",
    categories: ["eletrônicos", "acessórios"],
    tags: ["smartwatch", "amazfit", "relógio"],
    popularity_score: 76.8,
    updated_at: daysAgo(8),
    type: "product",
    url: "https://example.com/products/amazfit-bip-u",
  },
  {
    title: "Cadeira Gamer ThunderX3",
    description: "Cadeira ergonômica com ajuste de altura, apoio lombar e design moderno.",
    categories: ["móveis", "escritório"],
    tags: ["cadeira", "gamer", "ergonômica"],
    popularity_score: 84.6,
    updated_at: daysAgo(9),
    type: "product",
    url: "https://example.com/products/cadeira-gamer-thunderx3",
  },
  {
    title: "Kit Panelas Tramontina Antiaderente",
    description: "Conjunto com 5 peças, revestimento antiaderente Starflon e cabos antitérmicos.",
    categories: ["cozinha", "utensílios"],
    tags: ["panelas", "tramontina", "antiaderente"],
    popularity_score: 89.2,
    updated_at: daysAgo(10),
    type: "product",
    url: "https://example.com/products/panelas-tramontina",
  },
  {
    title: "Mochila Executiva Samsonite",
    description: "Mochila resistente à água, compartimento para notebook e design elegante.",
    categories: ["acessórios", "viagem"],
    tags: ["mochila", "samsonite", "executiva"],
    popularity_score: 77.5,
    updated_at: daysAgo(11),
    type: "product",
    url: "https://example.com/products/mochila-samsonite",
  },
  {
    title: "Perfume Calvin Klein Euphoria",
    description: "Perfume feminino com fragrância marcante e sofisticada, 100ml.",
    categories: ["beleza", "perfumaria"],
    tags: ["perfume", "calvin klein", "euphoria"],
    popularity_score: 82.1,
    updated_at: daysAgo(12),
    type: "product",
    url: "https://example.com/products/perfume-euphoria",
  },
  {
    title: "Jogo de Lençol 100% Algodão",
    description: "Lençol casal, 4 peças, toque macio e alta durabilidade.",
    categories: ["cama", "banho"],
    tags: ["lençol", "algodão", "cama"],
    popularity_score: 73.9,
    updated_at: daysAgo(13),
    type: "product",
    url: "https://example.com/products/lencol-algodao",
  },
  {
    title: "Notebook Dell Inspiron 15",
    description: "Notebook com processador Intel i5, 8GB RAM, SSD 256GB e tela Full HD.",
    categories: ["eletrônicos", "informática"],
    tags: ["notebook", "dell", "inspiron"],
    popularity_score: 91.6,
    updated_at: daysAgo(14),
    type: "product",
    url: "https://example.com/products/notebook-dell-inspiron",
  },
  {
    title: "Câmera GoPro Hero 11",
    description: "Câmera de ação à prova d'água, gravação em 5K e estabilização avançada.",
    categories: ["eletrônicos", "fotografia"],
    tags: ["gopro", "câmera", "ação"],
    popularity_score: 86.3,
    updated_at: daysAgo(15),
    type: "product",
    url: "https://example.com/products/gopro-hero-11",
  },
  {
    title: "Churrasqueira Elétrica Britânia",
    description: "Churrasqueira portátil, fácil de limpar, ideal para ambientes internos.",
    categories: ["eletrodomésticos", "lazer"],
    tags: ["churrasqueira", "elétrica", "britânia"],
    popularity_score: 74.7,
    updated_at: daysAgo(16),
    type: "product",
    url: "https://example.com/products/churrasqueira-britania",
  },
  {
    title: "Patins Roller Inline Fila",
    description: "Patins ajustável, rodas de poliuretano e freio traseiro.",
    categories: ["esporte", "lazer"],
    tags: ["patins", "fila", "roller"],
    popularity_score: 79.8,
    updated_at: daysAgo(17),
    type: "product",
    url: "https://example.com/products/patins-fila",
  },
  {
    title: "Aparelho de Jantar Oxford Porcelanas",
    description: "Aparelho com 20 peças, porcelana resistente e design moderno.",
    categories: ["cozinha", "mesa"],
    tags: ["aparelho de jantar", "porcelana", "oxford"],
    popularity_score: 83.4,
    updated_at: daysAgo(18),
    type: "product",
    url: "https://example.com/products/aparelho-jantar-oxford",
  },
  {
    title: "Secador de Cabelo Taiff Style",
    description: "Secador potente, tecnologia cerâmica e 2 velocidades.",
    categories: ["beleza", "cabelos"],
    tags: ["secador", "taiff", "cabelo"],
    popularity_score: 80.2,
    updated_at: daysAgo(19),
    type: "product",
    url: "https://example.com/products/secador-taiff",
  },
  {
    title: "Jogo de Panelas Rochedo Inova",
    description: "Conjunto com 7 peças, antiaderente, cabos ergonômicos.",
    categories: ["cozinha", "utensílios"],
    tags: ["panelas", "rochedo", "antiaderente"],
    popularity_score: 85.0,
    updated_at: daysAgo(20),
    type: "product",
    url: "https://example.com/products/panelas-rochedo",
  },
];
const articles: BaseDoc[] = [
  {
    title: "Mudanças Climáticas: Impactos Globais",
    description: "Análise dos efeitos das mudanças climáticas no planeta, incluindo eventos extremos e políticas de mitigação.",
    categories: ["meio ambiente", "clima"],
    tags: ["mudanças climáticas", "aquecimento global", "sustentabilidade"],
    popularity_score: 92.1,
    updated_at: daysAgo(2),
    type: "article",
    url: "https://example.com/articles/mudancas-climaticas",
  },
  {
    title: "Inteligência Artificial na Medicina",
    description: "Como a IA está revolucionando diagnósticos, tratamentos e pesquisas médicas.",
    categories: ["tecnologia", "saúde"],
    tags: ["inteligência artificial", "medicina", "inovação"],
    popularity_score: 88.7,
    updated_at: daysAgo(3),
    type: "article",
    url: "https://example.com/articles/ia-medicina",
  },
  {
    title: "Economia Circular: O Futuro do Consumo",
    description: "Entenda o conceito de economia circular e como ele pode transformar a produção e o consumo.",
    categories: ["economia", "sustentabilidade"],
    tags: ["economia circular", "reciclagem", "meio ambiente"],
    popularity_score: 85.3,
    updated_at: daysAgo(4),
    type: "article",
    url: "https://example.com/articles/economia-circular",
  },
  {
    title: "Energia Solar: Crescimento no Brasil",
    description: "Panorama do avanço da energia solar no Brasil e seus benefícios ambientais e econômicos.",
    categories: ["energia", "meio ambiente"],
    tags: ["energia solar", "sustentabilidade", "renováveis"],
    popularity_score: 80.5,
    updated_at: daysAgo(5),
    type: "article",
    url: "https://example.com/articles/energia-solar-brasil",
  },
  {
    title: "Saúde Mental em Tempos de Pandemia",
    description: "Os desafios enfrentados pela população mundial em relação à saúde mental durante a pandemia de COVID-19.",
    categories: ["saúde", "sociedade"],
    tags: ["saúde mental", "pandemia", "covid-19"],
    popularity_score: 90.2,
    updated_at: daysAgo(6),
    type: "article",
    url: "https://example.com/articles/saude-mental-pandemia",
  },
  {
    title: "Carros Elétricos: Tendências e Desafios",
    description: "O crescimento do mercado de carros elétricos e os principais desafios para sua adoção em massa.",
    categories: ["automóveis", "tecnologia"],
    tags: ["carros elétricos", "mobilidade", "sustentabilidade"],
    popularity_score: 83.9,
    updated_at: daysAgo(7),
    type: "article",
    url: "https://example.com/articles/carros-eletricos",
  },
  {
    title: "Alimentação Plant-Based: Benefícios e Mitos",
    description: "Explorando a dieta baseada em plantas, seus benefícios para a saúde e mitos comuns.",
    categories: ["alimentação", "saúde"],
    tags: ["plant-based", "nutrição", "saúde"],
    popularity_score: 78.6,
    updated_at: daysAgo(8),
    type: "article",
    url: "https://example.com/articles/plant-based",
  },
  {
    title: "Criptomoedas: O que esperar em 2024",
    description: "Tendências e previsões para o mercado de criptomoedas no próximo ano.",
    categories: ["economia", "tecnologia"],
    tags: ["criptomoedas", "bitcoin", "blockchain"],
    popularity_score: 87.4,
    updated_at: daysAgo(9),
    type: "article",
    url: "https://example.com/articles/criptomoedas-2024",
  },
  {
    title: "Viagens Sustentáveis: Como Reduzir o Impacto",
    description: "Dicas e práticas para viajar de forma mais sustentável e consciente.",
    categories: ["viagem", "sustentabilidade"],
    tags: ["viagem sustentável", "ecoturismo", "meio ambiente"],
    popularity_score: 75.8,
    updated_at: daysAgo(10),
    type: "article",
    url: "https://example.com/articles/viagens-sustentaveis",
  },
  {
    title: "O Avanço da Telemedicina no Brasil",
    description: "Como a telemedicina está facilitando o acesso à saúde em regiões remotas do país.",
    categories: ["saúde", "tecnologia"],
    tags: ["telemedicina", "saúde digital", "inovação"],
    popularity_score: 82.0,
    updated_at: daysAgo(11),
    type: "article",
    url: "https://example.com/articles/telemedicina-brasil",
  },
  {
    title: "Educação Financeira para Jovens",
    description: "A importância de ensinar finanças pessoais desde cedo e dicas práticas para jovens.",
    categories: ["educação", "finanças"],
    tags: ["educação financeira", "jovens", "finanças pessoais"],
    popularity_score: 77.3,
    updated_at: daysAgo(12),
    type: "article",
    url: "https://example.com/articles/educacao-financeira-jovens",
  },
  {
    title: "Cibersegurança: Como se Proteger Online",
    description: "Principais ameaças digitais e dicas para manter sua segurança na internet.",
    categories: ["tecnologia", "segurança"],
    tags: ["cibersegurança", "internet", "privacidade"],
    popularity_score: 84.5,
    updated_at: daysAgo(13),
    type: "article",
    url: "https://example.com/articles/ciberseguranca",
  },
  {
    title: "Moda Sustentável: O Futuro da Indústria Têxtil",
    description: "Como a moda sustentável está mudando a indústria e o comportamento dos consumidores.",
    categories: ["moda", "sustentabilidade"],
    tags: ["moda sustentável", "indústria têxtil", "consumo consciente"],
    popularity_score: 73.9,
    updated_at: daysAgo(14),
    type: "article",
    url: "https://example.com/articles/moda-sustentavel",
  },
  {
    title: "O Crescimento do E-commerce no Brasil",
    description: "Fatores que impulsionaram o crescimento das vendas online no país.",
    categories: ["economia", "tecnologia"],
    tags: ["e-commerce", "vendas online", "comércio digital"],
    popularity_score: 89.1,
    updated_at: daysAgo(15),
    type: "article",
    url: "https://example.com/articles/ecommerce-brasil",
  },
  {
    title: "Desafios da Mobilidade Urbana nas Grandes Cidades",
    description: "Soluções inovadoras para melhorar o transporte e a mobilidade urbana.",
    categories: ["cidades", "mobilidade"],
    tags: ["mobilidade urbana", "transporte", "inovação"],
    popularity_score: 81.7,
    updated_at: daysAgo(16),
    type: "article",
    url: "https://example.com/articles/mobilidade-urbana",
  },
  {
    title: "O Papel das Redes Sociais na Sociedade Atual",
    description: "Como as redes sociais influenciam comportamentos, opiniões e tendências.",
    categories: ["sociedade", "comunicação"],
    tags: ["redes sociais", "influência digital", "comportamento"],
    popularity_score: 86.2,
    updated_at: daysAgo(17),
    type: "article",
    url: "https://example.com/articles/redes-sociais",
  },
  {
    title: "Alimentação Orgânica: Vantagens e Desafios",
    description: "Os benefícios e obstáculos do consumo de alimentos orgânicos.",
    categories: ["alimentação", "saúde"],
    tags: ["orgânicos", "saúde", "agricultura"],
    popularity_score: 74.6,
    updated_at: daysAgo(18),
    type: "article",
    url: "https://example.com/articles/alimentacao-organica",
  },
  {
    title: "O Impacto dos Podcasts na Educação",
    description: "Como os podcasts estão sendo usados como ferramenta de aprendizado.",
    categories: ["educação", "tecnologia"],
    tags: ["podcasts", "aprendizado", "educação digital"],
    popularity_score: 79.4,
    updated_at: daysAgo(19),
    type: "article",
    url: "https://example.com/articles/podcasts-educacao",
  },
  {
    title: "Tendências de Turismo Pós-Pandemia",
    description: "O que mudou no setor de turismo após a pandemia e o que esperar para o futuro.",
    categories: ["viagem", "sociedade"],
    tags: ["turismo", "pandemia", "tendências"],
    popularity_score: 76.5,
    updated_at: daysAgo(20),
    type: "article",
    url: "https://example.com/articles/turismo-pos-pandemia",
  },
  {
    title: "Mercado de Trabalho: Novas Profissões em Alta",
    description: "Profissões que estão em alta demanda e tendências para o futuro do trabalho.",
    categories: ["carreira", "economia"],
    tags: ["mercado de trabalho", "profissões", "tendências"],
    popularity_score: 88.0,
    updated_at: daysAgo(21),
    type: "article",
    url: "https://example.com/articles/novas-profissoes",
  },
];

const events: BaseDoc[] = Array.from({ length: 20 }).map((_, i) => ({
  title: `Evento de Elasticsearch ${i + 1}`,
  description: `Hands-on de Elasticsearch 8.x, mappings e aggregations ${i + 1}.`,
  categories: ["eventos", "workshop"],
  tags: ["elasticsearch", "workshop", "nlp"],
  popularity_score: Math.floor(Math.random() * 800) / 10,
  updated_at: daysAgo(i + 4),
  type: "event",
  url: `https://example.com/events/${i + 1}`,
}));

async function seed() {
  const body: any[] = [];

  for (const d of products) {
    body.push({ index: { _index: "products" } });
    body.push(d);
  }
  for (const d of articles) {
    body.push({ index: { _index: "articles" } });
    body.push(d);
  }
  for (const d of events) {
    body.push({ index: { _index: "events" } });
    body.push(d);
  }

  const res = await esClient.bulk({ refresh: true, body });
  if ((res as any).errors) {
    logger.error({ res }, "Erro no Bulk");
    process.exit(1);
  }
  logger.info("Inclusão dos seeds realizada com sucesso");
}

seed().catch((err) => {
  logger.error({ err }, "erros dos dados");
  process.exit(1);
});


