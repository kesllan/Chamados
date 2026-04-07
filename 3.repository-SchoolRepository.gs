// src/repository/SchoolRepository.js

/**
 * Repositório de Escolas (Dim_Escolas).
 */
var SchoolRepository = {
  
  SHEET_NAME: AppConfig.SHEET_NAMES.DIM_ESCOLAS,
  _cache: null,

  getAllSchoolsMap: function() {
    if (this._cache) return this._cache;
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    if (!data || data.length < 2) return {};
    var headers = data[0];
    
    var colNome = this._findHeader(headers, ['Nome', 'Escola', 'Nome da Escola', 'Nome_Escola', 'Nome_Escola_Padrao']);
    var colEmail = this._findHeader(headers, ['Email', 'E-mail', 'Email Institucional', 'Email_Institucional', 'Email_Diretor']);
    var colInep = this._findHeader(headers, ['INEP', 'Código INEP', 'Cod_INEP', 'Cod_INEP_Escola']);
    var colMunic = this._findHeader(headers, ['Município', 'Cidade', 'Municipio']);
    var colSetor = this._findHeader(headers, ['Setor', 'Setor_Regiao']);
    var colFone = this._findHeader(headers, ['Celular_Diretor', 'Whatsapp_Diretor', 'Telefone']);
    var colLat = this._findHeader(headers, ['Latitude', 'Geo_Latitude']);
    var colLong = this._findHeader(headers, ['Longitude', 'Geo_Longitude']);
    var colDiretor = this._findHeader(headers, ['Nome_Diretor_Atual', 'Diretor', 'Diretora']);

    var map = {};
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var nome = (colNome > -1 && row[colNome]) ? String(row[colNome]).trim() : "";
      var inep = (colInep > -1 && row[colInep]) ? String(row[colInep]).trim() : "";
      
      var schoolObj = {
        nome: nome,
        email: (colEmail > -1) ? row[colEmail] : "",
        inep: inep,
        municipio: (colMunic > -1) ? row[colMunic] : "",
        setor: (colSetor > -1) ? row[colSetor] : "",
        fone: (colFone > -1) ? row[colFone] : "",
        lat: (colLat > -1) ? row[colLat] : "",
        long: (colLong > -1) ? row[colLong] : "",
        diretor: (colDiretor > -1) ? row[colDiretor] : ""
      };

      if (nome) map[nome] = schoolObj;
      if (inep) map[inep] = schoolObj;
    }
    this._cache = map;
    return map;
  },

  getAll: function() {
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    if (!data || data.length < 2) return [];
    var headers = data[0];
    
    return data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, idx) { obj[h] = row[idx]; });
      return {
        Cod_INEP: obj['Cod_INEP'] || obj['Cod_INEP_Escola'] || row[0],
        Nome_Escola: obj['Nome_Escola'] || obj['Nome_Escola_Padrao'] || row[1],
        Municipio: obj['Municipio'] || obj['Município'] || row[2],
        Setor_Regiao: obj['Setor_Regiao'] || obj['Setor'] || row[3],
        Email_Diretor: obj['Email_Diretor'] || obj['Email_Institucional'] || "",
        inep: obj['Cod_INEP'] || obj['Cod_INEP_Escola'] || row[0],
        nome: obj['Nome_Escola'] || obj['Nome_Escola_Padrao'] || row[1],
        municipio: obj['Municipio'] || obj['Município'] || row[2],
        setor: obj['Setor_Regiao'] || obj['Setor'] || row[3]
      };
    });
  },

  save: function(dados) {
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    var headers = data[0];
    var colInep = this._findHeader(headers, ['Cod_INEP', 'Cod_INEP_Escola', 'INEP']);
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colInep]) === String(dados.Cod_INEP)) { rowIndex = i + 1; break; }
    }
    if (rowIndex > 0) {
      BaseRepository.updateRowMapped(this.SHEET_NAME, rowIndex, dados);
      return { success: true, message: "Escola atualizada." };
    } else {
      BaseRepository.appendRowMapped(this.SHEET_NAME, dados);
      return { success: true, message: "Escola adicionada." };
    }
  },

  delete: function(inep) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colInep = this._findHeader(headers, ['Cod_INEP', 'Cod_INEP_Escola', 'INEP']);
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colInep]) === String(inep)) { sheet.deleteRow(i + 1); return { success: true, message: "Escola removida." }; }
    }
    return { success: false, message: "Escola não encontrada." };
  },

  updateSector: function(inep, setor) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colInep = this._findHeader(headers, ['Cod_INEP', 'Cod_INEP_Escola', 'INEP']);
    var colSetor = this._findHeader(headers, ['Setor_Regiao', 'Setor']);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colInep]) === String(inep)) { sheet.getRange(i + 1, colSetor + 1).setValue(setor); return { success: true }; }
    }
    return { success: false };
  },

  updateMunicipalitySector: function(municipio, setor) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colMun = this._findHeader(headers, ['Municipio', 'Município']);
    var colSetor = this._findHeader(headers, ['Setor_Regiao', 'Setor']);
    var data = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colMun]).toLowerCase() === String(municipio).toLowerCase()) { sheet.getRange(i + 1, colSetor + 1).setValue(setor); count++; }
    }
    return { success: true, count: count };
  },

  _findHeader: function(headers, variations) {
    if (!headers || !variations) return -1;
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i]).toLowerCase();
      for (var j = 0; j < variations.length; j++) { if (h.indexOf(variations[j].toLowerCase()) > -1) return i; }
    }
    return -1;
  },

  findByName: function(name) {
    if (!name) return null;
    var map = this.getAllSchoolsMap();
    return map[String(name).trim()] || null;
  }
};
