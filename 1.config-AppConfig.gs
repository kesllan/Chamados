// src/config/AppConfig.js

/**
 * Mapeamento centralizado de colunas e abas da planilha.
 * Chaves e valores seguem exatamente a lista fornecida pelo usuário.
 */
var AppConfig = {
  SPREADSHEET_ID: '', 
  GOOGLE_FORM_ID: '1Lt5KmIrN238bcjrC42HsckAah_Suvffr3IXChTii8wY',

  SHEET_NAMES: {
    CHAMADOS: 'Chamados',
    CONFIG_TECNICOS: 'Config_Tecnicos',
    CONFIG_FERIADOS: 'Config_Feriados',
    DIM_ESCOLAS: 'Dim_Escolas',
    LOG_STATUS: 'BD_Historico_Status',
    CONTATOS_DIRETORES: 'Contatos Diretores'
  },

  FORM_FIELDS: {
    ESCOLA: 'Nome da Escola:',
    CARGO: 'Cargo do Solicitante',
    TIPO_SOLICITACAO: 'Qual o tipo de solicitação?'
  },
  
  // Aba: Config_Tecnicos
  COLUMNS_TECNICOS: {
    EMAIL_TECNICO: 'Email_Tecnico',
    NOME_EXIBICAO: 'Nome_Exibicao',
    SETOR_RESPONSAVEL: 'Setor_Responsavel',
    PERMISSAO_ADMIN: 'Permissao_Admin',
    MASP: 'Masp'
  },

  // Aba: Dim_Escolas (LISTA LITERAL DE 11 CAMPOS)
  COLUMNS_ESCOLAS: {
    COD_INEP: 'Cod_INEP',
    NOME_ESCOLA_PADRAO: 'Nome_Escola_Padrao',
    MUNICIPIO: 'Municipio',
    SETOR_REGIAO: 'Setor_Regiao',
    NOME_DIRETOR_ATUAL: 'Nome_Diretor_Atual',
    CELULAR_DIRETOR: 'Celular_Diretor',
    WHATSAPP_DIRETOR: 'Whatsapp_Diretor',
    EMAIL_INSTITUCIONAL: 'Email_Institucional',
    ENDERECO_COMPLETO: 'Endereco_Completo',
    GEO_LATITUDE: 'Geo_Latitude',
    GEO_LONGITUDE: 'Geo_Longitude'
  },
  
  // Aba: Chamados
  COLUMNS_CHAMADOS: {
    DATA_ABERTURA: 'Carimbo de data/hora',
    ESCOLA: 'Nome da Escola:',
    EMAIL_INSTITUCIONAL: 'Endereço de e-mail',
    MUNICIPIO: 'Município',
    SOLICITANTE_NOME: 'Nome do Solicitante',
    SOLICITANTE_MASP: 'MASP do Solicitante',
    SOLICITANTE_CARGO: 'Cargo do Solicitante',
    SOLICITANTE_CELULAR: 'Celular/Whatsapp (Opcional)',
    TIPO_SOLICITACAO: 'Qual o tipo de solicitação?',
    DETALHE_PROBLEMA: 'Detalhamento do problema:',
    ANEXOS: 'Anexos (Opcional)',
    PROTOCOLO: 'Protocolo',
    STATUS: 'Status',
    TECNICO: 'Técnico',
    OBSERVACOES: 'Observações / Justificativas',
    CONFIRMACAO: 'Confirmação',
    COD_INEP_ESCOLA: 'Cod_INEP_Escola',
    ULTIMA_ATUALIZACAO: 'Ultima_Atualizacao',
    CATEGORIA_MACRO: 'Categoria_Macro',
    CAUSA_RAIZ: 'Causa_Raiz',
    LINK_TERMO_PDF: 'Link_Termo_PDF',
    DIAS_EM_ABERTO: 'Dias_Em_Aberto',
    DIAS_UTEIS_ABERTO: 'Dias_Uteis_Aberto',
    SLA_ESTOURADO: 'SLA_Estourado',
    DATA_PREVISAO: 'Data_Previsao',
    SOLUCAO_TECNICA: 'Solucao_Tecnica',
    SETOR_ID: 'Setor_ID',
    MES_REFERENCIA: 'Mes_Referencia',
    CONFIRMACAO_LEITURA: 'Confirmação_Leitura',
    ORIGEM_CHAMADO: 'Origem_Chamado',
    TIPO_ATENDIMENTO: 'Tipo_Atendimento'
  },

  // Aba: BD_Historico_Status
  COLUMNS_LOG: {
    ID_LOG: 'ID_Log',
    DATA_HORA: 'Data_Hora',
    PROTOCOLO: 'Protocolo',
    USUARIO_EXECUTOR: 'Usuario_Executor',
    ACAO: 'Acao',
    STATUS_DE: 'Status_De',
    STATUS_PARA: 'Status_Para',
    DETALHE_REGISTRO: 'Detalhe_Registro',
    OBSERVACOES: 'Observacoes',
    LINK_EVIDENCIA_FOTO: 'Link_Evidencia_Foto'
  },

  // Aba: Config_Feriados
  COLUMNS_FERIADOS: {
    DATA: 'Data',
    DESCRICAO: 'Descricao'
  },

  SLA: { DIAS_UTEIS_PADRAO: 8, DIAS_OCIOSIDADE_ALERTA: 8 },
  EMAILS: { COORDENADOR: 'sre.totoni.supor@educacao.mg.gov.br' }
};
