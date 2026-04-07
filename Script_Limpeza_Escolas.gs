/**
 * SCRIPT DE LIMPEZA DE DUPLICATAS - DIM_ESCOLAS
 * Remove duplicatas mantendo apenas a primeira ocorrência de cada INEP.
 */
function cleanDuplicateSchools() {
  var ss = BaseRepository.getSpreadsheet();
  var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
  var range = sheet.getDataRange();
  var data = range.getValues();
  var headers = data[0];
  
  var colInep = headers.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
  if (colInep === -1) {
    Logger.log("Erro: Coluna INEP não encontrada.");
    return;
  }

  var inepsVistos = {};
  var newData = [headers]; // Mantém o cabeçalho
  var removidos = 0;

  for (var i = 1; i < data.length; i++) {
    var inep = String(data[i][colInep]).trim();
    if (inep === "" || inepsVistos[inep]) {
      removidos++;
      continue;
    }
    inepsVistos[inep] = true;
    newData.push(data[i]);
  }

  if (removidos > 0) {
    sheet.clearContents();
    sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
    Logger.log("Sucesso: " + removidos + " duplicatas removidas da Dim_Escolas.");
  } else {
    Logger.log("Nenhuma duplicata encontrada.");
  }
}
