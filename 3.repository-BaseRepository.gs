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
   * Garante que a estrutura das planilhas esteja correta.
   * Cria colunas faltantes baseadas no AppConfig sem perder dados.
   */
  ensureColumns: function(sheetName, expectedColumns) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
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
      Logger.log("Manutenção: Adicionadas colunas " + colunasParaAdicionar.join(", ") + " na aba " + sheetName);
    }
  },

  /**
   * Executa a manutenção completa da estrutura do banco de dados.
   */
  autoMaintenance: function() {
    try {
      this.ensureColumns(AppConfig.SHEET_NAMES.CHAMADOS, AppConfig.COLUMNS_CHAMADOS);
      this.ensureColumns(AppConfig.SHEET_NAMES.CONFIG_TECNICOS, ["Email_Tecnico", "Nome_Exibicao", "Masp", "Setor_Responsavel", "Permissao_Admin"]);
      this.ensureColumns(AppConfig.SHEET_NAMES.DIM_ESCOLAS, ["Cod_INEP", "Nome_Escola", "Municipio", "Setor_Regiao", "Email_Diretor", "Celular_Diretor", "Endereco", "Latitude", "Longitude"]);
      this.ensureColumns(AppConfig.SHEET_NAMES.LOG_STATUS, ["Data_Hora", "Protocolo", "Acao", "Status_De", "Status_Para", "Tecnico_Executor", "Observacoes"]);
      
      return { success: true, message: "Estrutura do Banco de Dados verificada/atualizada!" };
    } catch (e) {
      Logger.log("Erro em autoMaintenance: " + e.toString());
      return { success: false, message: e.toString() };
    }
  }
};
