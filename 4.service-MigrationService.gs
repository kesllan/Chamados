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
      // 1. Prioridade: Escolas vindas do Formulário (Aba Chamados)
      report.push(this.migrateSchoolsFromTickets());

      // 2. Complemento: Escolas da aba de Contatos
      report.push(this.migrateSchoolsFromContacts());
      
      report.push(this.migrateTechnicians());
      report.push(this.migrateSchoolsFromSectors());
      report.push(this.migrateLegacyTickets());
      
      return { success: true, message: report.join("\n") };
    } catch (e) {
      Logger.log("Erro em MigrationService.migrateAll: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },

  /**
   * Extrai escolas únicas da aba Chamados (fonte: Google Forms) e as cadastra na Dim_Escolas.
   * Esta é tratada como a fonte primária de verdade.
   */
  migrateSchoolsFromTickets: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheetChamados = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    if (!sheetChamados || !sheetDim) return "Forms: Abas não encontradas.";

    var data = sheetChamados.getDataRange().getValues();
    var headers = data[0];
    var colEscola = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA);
    var colInep = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA);
    var colEmail = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL);
    var colMunic = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.MUNICIPIO);

    // Cache de INEPs já cadastrados na Dim_Escolas
    var inepsVistos = this._getExistingIneps(sheetDim);
    var novasEscolas = 0;

    for (var i = 1; i < data.length; i++) {
      var inep = String(data[i][colInep]).trim();
      var nomeEscolaRaw = String(data[i][colEscola]).trim();
      
      // Se não tem INEP no chamado, tenta extrair do nome (ex: "123456 - Nome")
      if (!inep || inep === "") {
        var match = nomeEscolaRaw.match(/^(\d+)/);
        if (match) inep = match[0];
      }

      if (inep && inep !== "" && !inepsVistos[inep]) {
        var rowObj = {};
        rowObj[AppConfig.COLUMNS_ESCOLAS.COD_INEP] = inep;
        // Limpa o nome da escola para o padrão (remove INEP se houver)
        rowObj[AppConfig.COLUMNS_ESCOLAS.NOME_ESCOLA_PADRAO] = nomeEscolaRaw.replace(/^\d+\s*-\s*/, "");
        rowObj[AppConfig.COLUMNS_ESCOLAS.MUNICIPIO] = data[i][colMunic] || "";
        rowObj[AppConfig.COLUMNS_ESCOLAS.EMAIL_INSTITUCIONAL] = data[i][colEmail] || "";
        
        BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.DIM_ESCOLAS, rowObj);
        inepsVistos[inep] = true;
        novasEscolas++;
      }
    }

    return "Forms: " + novasEscolas + " novas escolas identificadas via Google Forms.";
  },

  /**
   * Helper para obter cache de INEPs existentes.
   */
  _getExistingIneps: function(sheet) {
    var vistos = {};
    if (sheet.getLastRow() > 1) {
      var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var idx = h.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
      var vals = sheet.getRange(2, idx + 1, sheet.getLastRow() - 1, 1).getValues();
      vals.forEach(function(r) { vistos[String(r[0]).trim()] = true; });
    }
    return vistos;
  },

  /**
   * Popula a Dim_Escolas com base na aba legada "Contatos Diretores".
   * PROTEÇÃO: Verifica se o INEP já existe antes de importar para evitar duplicatas.
   */
  migrateSchoolsFromContacts: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheetContacts = ss.getSheetByName(AppConfig.SHEET_NAMES.CONTATOS_DIRETORES);
    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    if (!sheetContacts || !sheetDim) return "Contatos: Abas não encontradas.";
    
    var data = sheetContacts.getDataRange().getValues();
    if (data.length < 2) return "Contatos: Aba de origem vazia.";

    // 1. Mapeia cabeçalhos da origem (Contatos Diretores)
    var headersOrigem = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var colCidade = headersOrigem.indexOf("CIDADE");
    var colInepOrigem = headersOrigem.indexOf("CÓD. ESCOLA");
    var colEscola = headersOrigem.indexOf("ESCOLA");
    var colDiretor = headersOrigem.indexOf("DIRETOR");
    var colEmail = -1;
    for(var i=0; i<headersOrigem.length; i++) { if(headersOrigem[i].indexOf("EMAIL INSTITUCIONAL") > -1) { colEmail = i; break; } }
    var colCelular = headersOrigem.indexOf("CELULAR/ WHATSAAP") > -1 ? headersOrigem.indexOf("CELULAR/ WHATSAAP") : headersOrigem.indexOf("CELULAR");

    // 2. Cache de INEPs já existentes na Dim_Escolas para evitar busca lenta
    var inepsExistentes = {};
    if (sheetDim.getLastRow() > 1) {
      var hDim = sheetDim.getRange(1, 1, 1, sheetDim.getLastColumn()).getValues()[0];
      var colInepDim = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
      var dadosExistentes = sheetDim.getRange(2, colInepDim + 1, sheetDim.getLastRow() - 1, 1).getValues();
      dadosExistentes.forEach(function(row) { inepsExistentes[String(row[0]).trim()] = true; });
    }

    var totalImportado = 0;
    var totalIgnorado = 0;

    for (var i = 1; i < data.length; i++) {
      var inep = String(data[i][colInepOrigem]).trim();
      if (!inep || inep === "" || inepsExistentes[inep]) {
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
      
      BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.DIM_ESCOLAS, rowObj);
      inepsExistentes[inep] = true;
      totalImportado++;
    }

    return "Contatos: " + totalImportado + " novas escolas importadas. " + totalIgnorado + " ignoradas (já existiam ou vazias).";
  },

  migrateTechnicians: function() {
    var sheet = BaseRepository.getSpreadsheet().getSheetByName(AppConfig.SHEET_NAMES.CONFIG_TECNICOS);
    if (!sheet || sheet.getLastRow() > 1) return "Técnicos: Estrutura pronta.";
    var adminObj = {};
    adminObj[AppConfig.COLUMNS_TECNICOS.EMAIL_TECNICO] = "admin@exemplo.com";
    adminObj[AppConfig.COLUMNS_TECNICOS.NOME_EXIBICAO] = "Admin";
    adminObj[AppConfig.COLUMNS_TECNICOS.SETOR_RESPONSAVEL] = "Todos";
    adminObj[AppConfig.COLUMNS_TECNICOS.PERMISSAO_ADMIN] = "TRUE";
    BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.CONFIG_TECNICOS, adminObj);
    return "Técnicos: Admin padrão criado.";
  },

  migrateSchoolsFromSectors: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheets = ss.getSheets();
    var mapaSetores = { ineps: {}, municipios: {} };
    sheets.forEach(function(sheet) {
      var nomeAba = sheet.getName();
      if (nomeAba.toLowerCase().indexOf("setor") > -1) {
        var matchSetor = nomeAba.match(/(\d+)/);
        if (matchSetor) {
          var idSetor = matchSetor[0];
          var dados = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow()-1), 2).getValues();
          var ultimaCidade = "";
          dados.forEach(function(row) {
            var cidade = String(row[0]).trim();
            if (cidade !== "") ultimaCidade = cidade;
            if (ultimaCidade !== "") mapaSetores.municipios[MigrationService.normalizar(ultimaCidade)] = idSetor;
            var matchInep = String(row[1]).match(/^(\d+)/);
            if (matchInep) mapaSetores.ineps[matchInep[0]] = idSetor;
          });
        }
      }
    });
    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    if (!sheetDim) return "Setores: Aba Dim_Escolas não encontrada.";
    var range = sheetDim.getDataRange();
    var dadosDim = range.getValues();
    var colInep = dadosDim[0].indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
    var colMun = dadosDim[0].indexOf(AppConfig.COLUMNS_ESCOLAS.MUNICIPIO);
    var colSetor = dadosDim[0].indexOf(AppConfig.COLUMNS_ESCOLAS.SETOR_REGIAO);
    for (var i = 1; i < dadosDim.length; i++) {
      var inep = String(dadosDim[i][colInep]).trim();
      var mun = MigrationService.normalizar(dadosDim[i][colMun]);
      var novoSetor = mapaSetores.ineps[inep] || mapaSetores.municipios[mun];
      if (novoSetor) sheetDim.getRange(i + 1, colSetor + 1).setValue(novoSetor);
    }
    return "Setores: Escolas vinculadas.";
  },

  migrateLegacyTickets: function() {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
    if (!sheet) return "Chamados: Aba não encontrada.";
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var colInep = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA);
    var colSetor = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.SETOR_ID);
    var colTecnico = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.TECNICO);
    var colEscolaForm = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA);
    var colData = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.DATA_ABERTURA);
    var colMes = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA);

    // Mapas para busca rápida
    var schoolsMap = SchoolRepository.getAllSchoolsMap();
    
    var totalAtualizado = 0;

    for (var i = 1; i < data.length; i++) {
      var rowIndex = i + 1;
      var updates = {};
      var alterou = false;

      var nomeEscolaRaw = String(data[i][colEscolaForm]).trim();
      var inepEncontrado = "";
      
      // 1. Tenta extrair INEP do nome da escola (padrão "123456 - Nome")
      var matchInep = nomeEscolaRaw.match(/^(\d+)/);
      if (matchInep) inepEncontrado = matchInep[0];

      // 2. Preenche Cod_INEP_Escola se estiver vazio
      if (colInep > -1 && !data[i][colInep] && inepEncontrado) {
        updates[AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA] = inepEncontrado;
        alterou = true;
      }

      // Busca dados da escola para obter o Setor
      var schoolInfo = schoolsMap[nomeEscolaRaw] || (inepEncontrado ? schoolsMap[inepEncontrado] : null);

      // 3. Preenche Setor_ID se estiver vazio
      if (colSetor > -1 && !data[i][colSetor] && schoolInfo && schoolInfo.setor) {
        updates[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] = schoolInfo.setor;
        alterou = true;
      }

      // 4. Preenche Técnico com base no setor se estiver vazio
      var idSetor = updates[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] || (colSetor > -1 ? data[i][colSetor] : "");
      if (colTecnico > -1 && !data[i][colTecnico] && idSetor) {
        var emailTecnico = ConfigController.findTechnicianBySector(idSetor);
        if (emailTecnico) {
          updates[AppConfig.COLUMNS_CHAMADOS.TECNICO] = emailTecnico;
          alterou = true;
        }
      }

      // 5. Preenche Mês de Referência se estiver vazio
      if (colMes > -1 && !data[i][colMes]) {
        var dt = DateUtils.ensureDate(data[i][colData]);
        if (dt) {
          updates[AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA] = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM");
          alterou = true;
        }
      }

      if (alterou) {
        TicketRepository.updateTicketData(rowIndex, updates);
        totalAtualizado++;
      }
    }
    return "Chamados: " + totalAtualizado + " registros enriquecidos com dados de escola, setor e técnico.";
  },

  normalizar: function(t) {
    if (!t) return "";
    return String(t).trim().toUpperCase()
      .replace(/[ÁÀÂÃ]/g, "A").replace(/[ÉÈÊ]/g, "E")
      .replace(/[ÍÌÎ]/g, "I").replace(/[ÓÒÔÕ]/g, "O")
      .replace(/[ÚÙÛ]/g, "U").replace(/[Ç]/g, "C");
  }
};
