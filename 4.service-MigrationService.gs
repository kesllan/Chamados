/**
 * SERVIÇO DE MIGRAÇÃO E TRANSIÇÃO DE DADOS LEGADOS
 * Responsável por mover dados das estruturas antigas para as novas.
 */
var MigrationService = {

  /**
   * Executa o fluxo completo de migração.
   */
  migrateAll: function() {
    var report = [];
    try {
      // 1. Popula Dim_Escolas a partir de Contatos Diretores
      report.push(this.migrateSchoolsFromContacts());
      
      // 2. Migra técnicos
      report.push(this.migrateTechnicians());
      
      // 3. Vincula setores (Tabs Setor -> Dim_Escolas)
      report.push(this.migrateSchoolsFromSectors());
      
      // 4. Enriquece chamados legados
      report.push(this.migrateLegacyTickets());
      
      return { success: true, message: report.join("\n") };
    } catch (e) {
      Logger.log("Erro em MigrationService.migrateAll: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },

  /**
   * Popula a Dim_Escolas com base na aba legada "Contatos Diretores".
   * Header legado: [CIDADE, CÓD. ESCOLA, ESCOLA, DIRETOR, CELULAR, CELULAR/ WHATSAAP, EMAIL INSTITUCIONAL]
   */
  migrateSchoolsFromContacts: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheetContacts = ss.getSheetByName(AppConfig.SHEET_NAMES.CONTATOS_DIRETORES);
    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    
    if (!sheetContacts) return "Contatos: Aba '" + AppConfig.SHEET_NAMES.CONTATOS_DIRETORES + "' não encontrada. Pulando.";
    if (!sheetDim) return "Contatos: Aba Dim_Escolas não encontrada.";
    
    var data = sheetContacts.getDataRange().getValues();
    if (data.length < 2) return "Contatos: Aba de contatos vazia.";

    // Mapeamento dinâmico de cabeçalhos Dim_Escolas
    var hDim = sheetDim.getRange(1, 1, 1, sheetDim.getLastColumn()).getValues()[0];
    var colInepDim = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);

    var headers = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var colCidade = headers.indexOf("CIDADE");
    var colInep = headers.indexOf("CÓD. ESCOLA");
    var colEscola = headers.indexOf("ESCOLA");
    var colDiretor = headers.indexOf("DIRETOR");
    
    var colEmail = -1;
    for(var i=0; i<headers.length; i++) {
      if(headers[i].indexOf("EMAIL INSTITUCIONAL") > -1) { colEmail = i; break; }
    }

    var colCelular = headers.indexOf("CELULAR/ WHATSAAP") > -1 ? headers.indexOf("CELULAR/ WHATSAAP") : headers.indexOf("CELULAR");
    var colWhatsapp = headers.indexOf("CELULAR/ WHATSAAP") > -1 ? headers.indexOf("CELULAR/ WHATSAAP") : -1;

    // Cache de INEPs já existentes na Dim_Escolas
    var inepsExistentes = {};
    if (sheetDim.getLastRow() > 1) {
      var dadosExistentes = sheetDim.getRange(2, colInepDim + 1, sheetDim.getLastRow() - 1, 1).getValues();
      dadosExistentes.forEach(function(row) { inepsExistentes[String(row[0]).trim()] = true; });
    }

    var totalImportado = 0;
    var totalIgnorado = 0;

    for (var i = 1; i < data.length; i++) {
      var inep = String(data[i][colInep]).trim();
      if (!inep || inepsExistentes[inep]) {
        totalIgnorado++;
        continue;
      }

      var rowObj = {};
      rowObj[AppConfig.COLUMNS_ESCOLAS.COD_INEP] = inep;
      rowObj[AppConfig.COLUMNS_ESCOLAS.NOME_ESCOLA_PADRAO] = data[i][colEscola];
      rowObj[AppConfig.COLUMNS_ESCOLAS.MUNICIPIO] = data[i][colCidade];
      rowObj[AppConfig.COLUMNS_ESCOLAS.NOME_DIRETOR_ATUAL] = data[i][colDiretor];
      rowObj[AppConfig.COLUMNS_ESCOLAS.EMAIL_INSTITUCIONAL] = colEmail > -1 ? data[i][colEmail] : "";
      rowObj[AppConfig.COLUMNS_ESCOLAS.CELULAR_DIRETOR] = data[i][colCelular];
      rowObj[AppConfig.COLUMNS_ESCOLAS.WHATSAPP_DIRETOR] = colWhatsapp > -1 ? data[i][colWhatsapp] : "";
      
      BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.DIM_ESCOLAS, rowObj);
      inepsExistentes[inep] = true;
      totalImportado++;
    }

    return "Contatos: " + totalImportado + " novas escolas importadas. " + totalIgnorado + " já existiam.";
  },

  /**
   * Migra técnicos da aba legada para a nova estrutura.
   */
  migrateTechnicians: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.CONFIG_TECNICOS);
    if (!sheet) return "Técnicos: Aba não encontrada.";
    
    // Se só tem o cabeçalho, adiciona o admin padrão como no Setup_DB legado
    if (sheet.getLastRow() === 1) {
       var adminObj = {};
       adminObj[AppConfig.COLUMNS_TECNICOS.EMAIL_TECNICO] = "admin@exemplo.com";
       adminObj[AppConfig.COLUMNS_TECNICOS.NOME_EXIBICAO] = "Admin";
       adminObj[AppConfig.COLUMNS_TECNICOS.SETOR_RESPONSAVEL] = "Todos";
       adminObj[AppConfig.COLUMNS_TECNICOS.PERMISSAO_ADMIN] = "TRUE";
       BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.CONFIG_TECNICOS, adminObj);
       return "Técnicos: Admin padrão criado.";
    }

    return "Técnicos: Estrutura pronta.";
  },

  /**
   * Lê as abas "Setor X" e atualiza a Dim_Escolas.
   */
  migrateSchoolsFromSectors: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheets = ss.getSheets();
    var totalEscolas = 0;
    var abasProcessadas = 0;

    var mapaSetores = { ineps: {}, municipios: {} };

    sheets.forEach(function(sheet) {
      var nomeAba = sheet.getName();
      if (nomeAba.toLowerCase().indexOf("setor") > -1) {
        var matchSetor = nomeAba.match(/(\d+)/);
        if (matchSetor) {
          var idSetor = matchSetor[0];
          var lastRow = sheet.getLastRow();
          if (lastRow >= 2) {
            var dados = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
            var ultimaCidade = "";
            
            dados.forEach(function(row) {
              var cidade = String(row[0]).trim();
              var escolaRaw = String(row[1]).trim();
              
              if (cidade !== "") ultimaCidade = cidade;
              
              if (ultimaCidade !== "") {
                mapaSetores.municipios[MigrationService.normalizar(ultimaCidade)] = idSetor;
              }
              
              var matchInep = escolaRaw.match(/^(\d+)/);
              if (matchInep) {
                mapaSetores.ineps[matchInep[0]] = idSetor;
              }
            });
            abasProcessadas++;
          }
        }
      }
    });

    if (abasProcessadas === 0) return "Setores: Nenhuma aba de Setor encontrada para migração.";

    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    if (!sheetDim) return "Setores: Aba Dim_Escolas não encontrada.";

    var range = sheetDim.getDataRange();
    var dadosDim = range.getValues();
    var hDim = dadosDim[0];
    
    var colInep = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
    var colMun = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.MUNICIPIO);
    var colSetor = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.SETOR_REGIAO);

    if (colInep === -1 || colMun === -1 || colSetor === -1) {
      Logger.log("Erro de Mapeamento: " + colInep + " | " + colMun + " | " + colSetor);
      return "Setores: Colunas da Dim_Escolas não mapeadas corretamente.";
    }

    for (var i = 1; i < dadosDim.length; i++) {
      var inep = String(dadosDim[i][colInep]).trim();
      var mun = MigrationService.normalizar(dadosDim[i][colMun]);
      
      var novoSetor = mapaSetores.ineps[inep] || mapaSetores.municipios[mun];
      if (novoSetor) {
        sheetDim.getRange(i + 1, colSetor + 1).setValue(novoSetor);
        totalEscolas++;
      }
    }

    return "Setores: " + abasProcessadas + " abas processadas. " + totalEscolas + " escolas vinculadas aos setores na Dim_Escolas.";
  },

  /**
   * Processa a aba Chamados para preencher dados faltantes em registros legados.
   */
  migrateLegacyTickets: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
    if (!sheet) return "Chamados: Aba não encontrada.";

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return "Chamados: Sem dados para processar.";

    var headers = data[0];
    var colInep = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA);
    var colSetor = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.SETOR_ID);
    var colMes = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA);
    var colOrigem = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ORIGEM_CHAMADO);
    var colTecnico = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.TECNICO);
    var colEscolaForm = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA);
    var colData = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.DATA_ABERTURA);

    // Mapas para busca rápida
    var schoolsMap = SchoolRepository.getAllSchoolsMap();
    var tecnicosPorSetor = {};
    var tecnicos = TechnicianRepository.findAll();
    tecnicos.forEach(function(t) {
      if (t.setor && t.setor !== "Todos") {
        tecnicosPorSetor[t.setor] = t.email; // Agora mapeia para o e-mail
      }
    });

    var totalAtualizado = 0;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 1;
      var updates = {};
      var alterou = false;

      var nomeEscolaRaw = String(row[colEscolaForm]).trim();
      var inepEncontrado = "";
      
      // 1. Tenta extrair INEP do nome da escola (padrão "123456 - Nome")
      var matchInep = nomeEscolaRaw.match(/^(\d+)/);
      if (matchInep) inepEncontrado = matchInep[0];

      // 2. Preenche Cod_INEP_Escola
      if (colInep > -1 && !row[colInep] && inepEncontrado) {
        updates[AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA] = inepEncontrado;
        alterou = true;
      }

      // Busca dados da escola na Dim_Escolas para Setor
      var schoolInfo = schoolsMap[nomeEscolaRaw] || (inepEncontrado ? schoolsMap[inepEncontrado] : null);

      // 3. Preenche Setor_ID
      if (colSetor > -1 && !row[colSetor] && schoolInfo && schoolInfo.setor) {
        updates[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] = schoolInfo.setor;
        alterou = true;
      }

      // 4. Preenche Mes_Referencia
      if (colMes > -1 && !row[colMes]) {
        var dt = DateUtils.ensureDate(row[colData]);
        if (dt) {
          updates[AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA] = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM");
          alterou = true;
        }
      }

      // 5. Preenche Origem_Chamado
      if (colOrigem > -1 && !row[colOrigem]) {
        updates[AppConfig.COLUMNS_CHAMADOS.ORIGEM_CHAMADO] = "Externo – Técnico";
        alterou = true;
      }

      // 6. Preenche Técnico com base no setor (se estiver vazio)
      var idSetor = updates[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] || row[colSetor];
      if (colTecnico > -1 && !row[colTecnico] && idSetor && tecnicosPorSetor[idSetor]) {
        updates[AppConfig.COLUMNS_CHAMADOS.TECNICO] = tecnicosPorSetor[idSetor];
        alterou = true;
      }

      if (alterou) {
        TicketRepository.updateTicketData(rowIndex, updates);
        totalAtualizado++;
      }
    }

    return "Chamados: " + totalAtualizado + " registros legados enriquecidos.";
  },

  normalizar: function(t) {
    if (!t) return "";
    return String(t).trim().toUpperCase()
      .replace(/[ÁÀÂÃ]/g, "A").replace(/[ÉÈÊ]/g, "E")
      .replace(/[ÍÌÎ]/g, "I").replace(/[ÓÒÔÕ]/g, "O")
      .replace(/[ÚÙÛ]/g, "U").replace(/[Ç]/g, "C");
  }
};
