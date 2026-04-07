// src/utils/SheetUtils.js

/**
 * Utilitários para manipular planilhas de forma segura e limpa.
 */
var SheetUtils = {

  /**
   * Converte uma matriz de dados (com header na primeira linha)
   * em um array de objetos JSON baseados nas chaves mapeadas.
   *
   * @param {Array<Array<any>>} data - Dados da planilha (incluindo header).
   * @param {Object} columnMap - Mapeamento { CHAVE_OBJETO: "Nome Coluna na Planilha" }.
   * @return {Array<Object>} Lista de objetos convertidos.
   */
  toObjectList: function(data, columnMap) {
    if (!data || data.length < 2) return [];

    var headers = data[0];
    var result = [];

    // Cria um mapa reverso de NomeColuna -> Indice
    var headerIndexMap = {};
    headers.forEach(function(h, idx) {
      headerIndexMap[h] = idx;
    });

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = { _row: i + 1 }; // Mantém referência da linha para updates futuros

      for (var key in columnMap) {
        var colName = columnMap[key];
        var colIdx = headerIndexMap[colName];
        
        if (colIdx !== undefined) {
          obj[key] = row[colIdx];
        } else {
          // Se a coluna não existe no header, loga erro silencioso ou ignora
          obj[key] = null; 
        }
      }
      result.push(obj);
    }
    return result;
  },

  /**
   * Encontra o índice (base 1) de uma coluna pelo nome.
   * Retorna -1 se não encontrar.
   */
  getColumnIndex: function(sheet, columnName) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idx = headers.indexOf(columnName);
    return idx > -1 ? idx + 1 : -1;
  },

  /**
   * Garante que todas as colunas listadas existam no header.
   * Cria as faltantes no final.
   * Corrigido para lidar com abas recém-criadas (vazias).
   */
  ensureColumns: function(sheet, requiredColumns) {
    var lastCol = sheet.getLastColumn();
    var headers = [];
    
    if (lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }

    var missing = [];
    requiredColumns.forEach(function(col) {
      if (headers.indexOf(col) === -1) {
        missing.push(col);
      }
    });

    if (missing.length > 0) {
      var startCol = headers.length + 1;
      sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
      
      // Estilização básica para novos cabeçalhos
      sheet.getRange(1, startCol, 1, missing.length)
           .setBackground("#f3f3f3")
           .setFontWeight("bold");
           
      return missing.length; // Quantas criou
    }
    return 0;
  }
};
