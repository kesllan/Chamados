// src/repository/BaseRepository.js

/**
 * Repositório Base para CRUD simples em Google Sheets.
 * Centraliza a lógica de acesso ao SpreadsheetApp.
 */
var BaseRepository = {
  _ss: null, // Singleton da planilha (lazy load)

  /**
   * Retorna a instância da planilha.
   * Prioriza o ID configurado em AppConfig, caindo para Active se não houver ID.
   */
  getSpreadsheet: function() {
    if (this._ss) return this._ss;

    try {
      if (AppConfig.SPREADSHEET_ID) {
        this._ss = SpreadsheetApp.openById(AppConfig.SPREADSHEET_ID);
      } else {
        this._ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } catch (e) {
      Logger.log("Erro ao acessar planilha: " + e.message + ". Tentando getActiveSpreadsheet() como fallback.");
      // Tenta getActiveSpreadsheet como fallback se openById falhar
      this._ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!this._ss) {
      throw new Error("Não foi possível acessar a planilha de dados. Verifique o SPREADSHEET_ID em AppConfig.gs e as permissões de acesso.");
    }
    
    return this._ss;
  },

  /**
   * Obtém os dados completos de uma aba.
   * @param {string} sheetName - Nome da aba.
   * @return {Array<Array<any>>} Dados brutos ou array vazio.
   */
  getSheetData: function(sheetName) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Aba '" + sheetName + "' não encontrada na planilha. Verifique o nome da aba.");
    }
    
    var range = sheet.getDataRange();
    if (range.getNumRows() < 1) {
      throw new Error("Aba '" + sheetName + "' está vazia ou contém apenas cabeçalhos.");
    }
    
    return range.getValues();
  },

  /**
   * Adiciona uma linha (objeto) mapeada para colunas.
   * @param {string} sheetName - Nome da aba.
   * @param {Object} dataObj - Objeto com { Coluna: Valor }.
   */
  appendRowMapped: function(sheetName, dataObj) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Aba não encontrada: " + sheetName);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = [];

    // Mapeia objeto -> array na ordem do header
    headers.forEach(function(h) {
      row.push(dataObj[h] || "");
    });

    sheet.appendRow(row);
    return sheet.getLastRow();
  },

  /**
   * Atualiza uma linha baseada em um mapa de colunas.
   * @param {string} sheetName
   * @param {number} rowIndex (1-based)
   * @param {Object} dataObj { 'NomeColuna': Valor }
   */
  updateRowMapped: function(sheetName, rowIndex, dataObj) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Aba não encontrada: " + sheetName);
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Object.keys(dataObj).forEach(function(colName) {
      var colIdx = headers.indexOf(colName);
      if (colIdx >= 0) {
        // +1 pois sheet é 1-based
        sheet.getRange(rowIndex, colIdx + 1).setValue(dataObj[colName]);
      } else {
        Logger.log("Aviso: Coluna não encontrada para update: " + colName);
      }
    });
  },

  /**
   * Obtém um valor de configuração da aba Config_Sistema.
   */
  getSystemConfig: function(key) {
    try {
      var ss = this.getSpreadsheet();
      var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.APP_CONTROLE);
      if (!sheet) return null;

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) { // Pula cabeçalho
        if (data[i][0] === key) return data[i][1];
      }
      return null;
    } catch (e) {
      Logger.log("Erro em getSystemConfig: " + e.toString());
      return null;
    }
  },

  /**
   * Salva um valor de configuração na aba Config_Sistema.
   * Agora suporta uma descrição para facilitar o preenchimento manual.
   */
  setSystemConfig: function(key, value, description) {
    try {
      var ss = this.getSpreadsheet();
      var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.APP_CONTROLE);
      
      // Se a aba não existe ou está vazia, reconstrói com os novos rótulos
      if (!sheet || sheet.getLastRow() === 0) {
        this._initAppControleSheet();
        sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.APP_CONTROLE);
      }

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value);
          if (description) sheet.getRange(i + 1, 3).setValue(description);
          return;
        }
      }
      // Se não encontrou, adiciona nova linha
      sheet.appendRow([key, value, description || "Configuração do sistema"]);
    } catch (e) {
      Logger.log("Erro em setSystemConfig: " + e.toString());
    }
  },

  /**
   * Inicializa a aba de controle com rótulos amigáveis e formatação.
   */
  _initAppControleSheet: function() {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.APP_CONTROLE);
    if (!sheet) {
      sheet = ss.insertSheet(AppConfig.SHEET_NAMES.APP_CONTROLE);
    } else {
      sheet.clear();
    }
    
    var headers = ["Identificador (Key)", "Valor Atual", "Descrição do Parâmetro"];
    sheet.getRange(1, 1, 1, 3).setValues([headers])
         .setBackground("#334155")
         .setFontColor("white")
         .setFontWeight("bold")
         .setHorizontalAlignment("center");
    
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 450);
    sheet.setFrozenRows(1);
  },

  /**
   * Garante que a estrutura das planilhas esteja correta.
   */
  ensureColumns: function(sheetName, expectedColumns) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var names = [];
      if (typeof expectedColumns === 'object') {
        for (var k in expectedColumns) names.push(expectedColumns[k]);
      } else {
        names = expectedColumns;
      }
      sheet.getRange(1, 1, 1, names.length).setValues([names])
           .setBackground("#1e40af")
           .setFontColor("white")
           .setFontWeight("bold");
      return;
    }

    var lastCol = sheet.getLastColumn();
    var currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var colunasParaAdicionar = [];

    // Obtém os nomes das colunas esperadas
    var names = [];
    if (typeof expectedColumns === 'object') {
      for (var k in expectedColumns) names.push(expectedColumns[k]);
    } else {
      names = expectedColumns;
    }

    names.forEach(function(colName) {
      if (currentHeaders.indexOf(colName) === -1) {
        colunasParaAdicionar.push(colName);
      }
    });

    if (colunasParaAdicionar.length > 0) {
      var startCol = currentHeaders.length + 1;
      sheet.getRange(1, startCol, 1, colunasParaAdicionar.length).setValues([colunasParaAdicionar])
           .setBackground("#f3f3f3")
           .setFontWeight("bold");
    }
  },

  /**
   * Executa a manutenção completa da estrutura do banco de dados.
   */
  autoMaintenance: function() {
    try {
      this.ensureColumns(AppConfig.SHEET_NAMES.CHAMADOS, AppConfig.COLUMNS_CHAMADOS);
      this.ensureColumns(AppConfig.SHEET_NAMES.CONFIG_TECNICOS, AppConfig.COLUMNS_TECNICOS);
      this.ensureColumns(AppConfig.SHEET_NAMES.DIM_ESCOLAS, AppConfig.COLUMNS_ESCOLAS);
      this.ensureColumns(AppConfig.SHEET_NAMES.LOG_STATUS, AppConfig.COLUMNS_LOG);
      this.ensureColumns(AppConfig.SHEET_NAMES.CONFIG_FERIADOS, AppConfig.COLUMNS_FERIADOS);
      
      // Inicializa/Repara Aba de Controle
      var ss = this.getSpreadsheet();
      var sheetCtrl = ss.getSheetByName(AppConfig.SHEET_NAMES.APP_CONTROLE);
      if (!sheetCtrl || sheetCtrl.getLastRow() === 0 || sheetCtrl.getRange(1,1).getValue() !== "Identificador (Key)") {
        this._initAppControleSheet();
      }

      return { success: true, message: "Estrutura do Banco de Dados verificada/atualizada!" };
    } catch (e) {
      Logger.log("Erro em autoMaintenance: " + e.toString());
      return { success: false, message: e.toString() };
    }
  }
};
};
