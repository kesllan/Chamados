// src/repository/HolidayRepository.js

/**
 * Repositório de Feriados.
 */
var HolidayRepository = {
  SHEET_NAME: AppConfig.SHEET_NAMES.CONFIG_FERIADOS,

  /**
   * Retorna lista de datas de feriados.
   * @return {Array<Date>}
   */
  findAll: function() {
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    var holidays = [];

    // Ignora header
    for (var i = 1; i < data.length; i++) {
      var d = data[i][0];
      if (d instanceof Date) {
        holidays.push(d);
      }
    }
    return holidays;
  },

  /**
   * Retorna feriados com descrição.
   */
  findAllWithDescription: function() {
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    var holidays = [];

    for (var i = 1; i < data.length; i++) {
      var d = data[i][0];
      if (d instanceof Date) {
        holidays.push({
          data: d,
          descricao: data[i][1] || ""
        });
      }
    }
    return holidays;
  },

  save: function(dados) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    var dataInput = new Date(dados.data + "T12:00:00");
    var dataInputStr = Utilities.formatDate(dataInput, Session.getScriptTimeZone(), "yyyy-MM-dd");

    for (var i = 1; i < data.length; i++) {
      var d = data[i][0];
      if (d instanceof Date) {
        var dStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (dStr === dataInputStr) {
          sheet.getRange(i + 1, 2).setValue(dados.descricao);
          return { success: true, message: "Feriado atualizado." };
        }
      }
    }

    sheet.appendRow([dataInput, dados.descricao]);
    return { success: true, message: "Feriado adicionado." };
  },

  delete: function(dataString) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var d = data[i][0];
      if (d instanceof Date) {
        var dStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (dStr === dataString) {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Feriado removido." };
        }
      }
    }
    return { success: false, message: "Data não encontrada." };
  }
};
