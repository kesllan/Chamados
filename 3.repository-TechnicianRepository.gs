// Refatorado/src/3.repository-TechnicianRepository.gs

/**
 * Repositório de Técnicos (Config_Tecnicos).
 */
var TechnicianRepository = {
  SHEET_NAME: AppConfig.SHEET_NAMES.CONFIG_TECNICOS,

  /**
   * Retorna todos os técnicos como array de objetos.
   */
  findAll: function() {
    // Garante que a coluna Masp existe antes de ler
    BaseRepository.ensureColumns(this.SHEET_NAME, ["Masp"]);

    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    if (!data || data.length < 2) return [];

    var headers = data[0];
    
    // Função auxiliar para encontrar coluna por parte do nome
    function findCol(name) {
      for(var i=0; i<headers.length; i++) {
        if(headers[i].toLowerCase().indexOf(name.toLowerCase()) > -1) return i;
      }
      return -1;
    }

    var colEmail = findCol('Email');
    var colNome = findCol('Nome');
    var colMasp = findCol('Masp');
    var colSetor = findCol('Setor');
    var colAdmin = findCol('Admin');

    var list = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      list.push({
        email: colEmail > -1 ? row[colEmail] : row[0],
        nome: colNome > -1 ? row[colNome] : row[1],
        masp: colMasp > -1 ? row[colMasp] : "",
        setor: colSetor > -1 ? row[colSetor] : row[2],
        admin: colAdmin > -1 ? row[colAdmin] : row[3]
      });
    }
    return list;
  },

  /**
   * Salva ou atualiza um técnico.
   */
  save: function(dados) {
    var data = BaseRepository.getSheetData(this.SHEET_NAME);
    var headers = data[0];
    
    function findHeader(name) {
      return headers.find(h => h.toLowerCase().indexOf(name.toLowerCase()) > -1) || name;
    }

    var hEmail = findHeader('Email');
    var hNome = findHeader('Nome');
    var hMasp = findHeader('Masp');
    var hSetor = findHeader('Setor');
    var hAdmin = findHeader('Admin');

    var colEmailIdx = headers.indexOf(hEmail);
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colEmailIdx]).toLowerCase() === String(dados.email).toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    var rowObj = {};
    rowObj[hEmail] = dados.email;
    rowObj[hNome] = dados.nome;
    rowObj[hMasp] = dados.masp || "";
    rowObj[hSetor] = dados.setor;
    rowObj[hAdmin] = dados.admin;

    if (rowIndex > 0) {
      BaseRepository.updateRowMapped(this.SHEET_NAME, rowIndex, rowObj);
      return { success: true, message: "Técnico atualizado." };
    } else {
      BaseRepository.appendRowMapped(this.SHEET_NAME, rowObj);
      return { success: true, message: "Técnico adicionado." };
    }
  },

  /**
   * Remove um técnico pelo email.
   */
  delete: function(email) {
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(this.SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var colEmail = -1;
    for(var i=0; i<headers.length; i++) {
      if(headers[i].toLowerCase().indexOf('email') > -1) { colEmail = i; break; }
    }
    if (colEmail === -1) colEmail = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colEmail]).toLowerCase() === String(email).toLowerCase()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Técnico removido." };
      }
    }
    return { success: false, message: "Técnico não encontrado." };
  }
};

