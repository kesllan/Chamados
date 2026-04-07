// src/repository/TicketRepository.js

/**
 * Repositório de Chamados.
 * Responsável por ler e manipular dados na aba "Chamados".
 */
var TicketRepository = {
  // Config
  SHEET_NAME: AppConfig.SHEET_NAMES.CHAMADOS,
  COLUMNS: AppConfig.COLUMNS_CHAMADOS,

  /**
   * Busca um ticket pelo protocolo.
   */
  findByProtocol: function(protocolo) {
    try {
      var data = BaseRepository.getSheetData(this.SHEET_NAME);
      if (!data.length) return null;

      var headers = data[0];
      var colProtocolo = headers.indexOf(this.COLUMNS.PROTOCOLO);
      if (colProtocolo === -1) {
        throw new Error("Coluna de Protocolo '" + this.COLUMNS.PROTOCOLO + "' não encontrada na aba " + this.SHEET_NAME);
      }

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colProtocolo]) === String(protocolo)) {
          var t = this._mapRowToTicket(data[i], headers);
          t._row = i + 1;
          return t;
        }
      }
      return null;
    } catch (e) {
      Logger.log("ERRO TicketRepository.findByProtocol: " + e.toString());
      throw e; // Propaga o erro para o controlador
    }
  },

  /**
   * Lista tickets com filtro opcional.
   */
  findAll: function(filterStatus) {
    try {
      var data = BaseRepository.getSheetData(this.SHEET_NAME);
      // BaseRepository já lança exceção se a aba estiver vazia ou não existir
      
      var headers = data[0];
      var colStatus = headers.indexOf(this.COLUMNS.STATUS);
      
      if (colStatus === -1) {
        throw new Error("Coluna de Status '" + this.COLUMNS.STATUS + "' não encontrada na aba " + this.SHEET_NAME + ". Verifique os cabeçalhos.");
      }

      var result = [];
      for (var i = 1; i < data.length; i++) {
        if (!filterStatus || data[i][colStatus] === filterStatus) {
          var t = this._mapRowToTicket(data[i], headers);
          t._row = i + 1;
          result.push(t);
        }
      }
      return result;
    } catch (e) {
      Logger.log("ERRO TicketRepository.findAll: " + e.toString());
      throw e; // Propaga o erro para o controlador
    }
  },

  /**
   * Atualiza o status de um ticket.
   */
  updateStatus: function(protocolo, newStatus, newDate) {
    try {
      var ss = BaseRepository.getSpreadsheet();
      var sheet = ss.getSheetByName(this.SHEET_NAME);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      var colProtocolo = headers.indexOf(this.COLUMNS.PROTOCOLO) + 1;
      var colStatus = headers.indexOf(this.COLUMNS.STATUS) + 1;
      var colUltimaAtu = headers.indexOf(this.COLUMNS.ULTIMA_ATUALIZACAO) + 1;

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colProtocolo - 1]) === String(protocolo)) {
          var row = i + 1;
          sheet.getRange(row, colStatus).setValue(newStatus);
          var dataAtu = newDate || new Date();
          if (colUltimaAtu > 0) {
            sheet.getRange(row, colUltimaAtu).setValue(dataAtu);
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      Logger.log("ERRO TicketRepository.updateStatus: " + e.toString());
      throw e;
    }
  },

  /**
   * Atualiza dados de um chamado existente.
   */
  updateTicketData: function(rowIndex, updates) {
    try {
      BaseRepository.updateRowMapped(this.SHEET_NAME, rowIndex, updates);
    } catch (e) {
      Logger.log("ERRO TicketRepository.updateTicketData: " + e.toString());
      throw e;
    }
  },

  /**
   * Mapeamento interno: Array -> Objeto Ticket
   */
  _mapRowToTicket: function(row, headers) {
    var ticket = {};
    var self = TicketRepository; // Referência ao objeto TicketRepository
    
    var getVal = function(colName) {
      var idx = headers.indexOf(colName);
      if (idx === -1) {
        // Logger.log("AVISO: Coluna '" + colName + "' não encontrada no ticket."); // Comentado para evitar log excessivo
        return ""; // Retorna string vazia para colunas não encontradas
      }
      return row[idx];
    };

    // Obtenha os valores brutos primeiro
    var rawDataAbertura = getVal(self.COLUMNS.DATA_ABERTURA);
    var rawUltimaAtualizacao = getVal(self.COLUMNS.ULTIMA_ATUALIZACAO);
    var rawDataAgendamento = getVal(self.COLUMNS.PREVISAO);

    ticket.protocolo = getVal(self.COLUMNS.PROTOCOLO);
    ticket.status = getVal(self.COLUMNS.STATUS);
    ticket.tecnico = getVal(self.COLUMNS.TECNICO);
    ticket.escola = getVal(self.COLUMNS.ESCOLA);
    ticket.municipio = getVal(self.COLUMNS.MUNICIPIO);
    ticket.tipo = getVal(self.COLUMNS.TIPO_SOLICITACAO);
    ticket.detalhe = getVal(self.COLUMNS.DETALHE_PROBLEMA);
    ticket.anexos = getVal(self.COLUMNS.ANEXOS);
    ticket.obs = getVal(self.COLUMNS.OBSERVACOES);
    ticket.solucao = getVal(self.COLUMNS.SOLUCAO_TECNICA);
    ticket.solicitante = getVal(self.COLUMNS.SOLICITANTE_NOME);
    ticket.cargo = getVal(self.COLUMNS.SOLICITANTE_CARGO);
    ticket.celular = getVal(self.COLUMNS.SOLICITANTE_CELULAR);
    ticket.masp = getVal(self.COLUMNS.SOLICITANTE_MASP);
    ticket.inep = getVal(self.COLUMNS.COD_INEP);
    ticket.diasAberto = getVal(self.COLUMNS.DIAS_ABERTO);
    ticket.diasUteis = getVal(self.COLUMNS.DIAS_UTEIS);
    ticket.slaEstourado = getVal(self.COLUMNS.SLA_ESTOURADO);
    ticket.linkTermo = getVal(self.COLUMNS.LINK_TERMO_PDF);
    ticket.tipoAtendimento = getVal(self.COLUMNS.TIPO_ATENDIMENTO);
    ticket.setor = getVal(self.COLUMNS.SETOR_ID);

    // Formate as datas para string explicitamente, como no código antigo
    ticket.dataAbertura = (rawDataAbertura instanceof Date) ? DateUtils.format(rawDataAbertura) : (rawDataAbertura || "");
    ticket.ultimaAtualizacao = (rawUltimaAtualizacao instanceof Date) ? DateUtils.format(rawUltimaAtualizacao) : (rawUltimaAtualizacao || "");
    ticket.dataAgendamento = (rawDataAgendamento instanceof Date) ? DateUtils.format(rawDataAgendamento) : (rawDataAgendamento || "");
    
    // O timestamp deve refletir a data de abertura para fins de antiguidade (SLA)
    var dtForTimestamp = rawDataAbertura;
    
    // Tratamento robusto para strings de data para timestamp
    function parseDateToNum(dt) {
      if (!dt) return 0;
      if (dt instanceof Date) return dt.getTime();
      if (typeof dt === 'string') {
        var parts = dt.split(' ');
        var dateParts = parts[0].split('/');
        if(dateParts.length === 3) {
          var timeParts = parts[1] ? parts[1].split(':') : [0,0,0];
          var d = new Date(dateParts[2], dateParts[1]-1, dateParts[0], timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        }
        var d2 = new Date(dt);
        return isNaN(d2.getTime()) ? 0 : d2.getTime();
      }
      return 0;
    }

    ticket.timestamp = parseDateToNum(rawDataAbertura);
    ticket.scheduledTimestamp = parseDateToNum(rawDataAgendamento);
    
    // Mantenha compatibilidade com o DashboardController que espera escola e municipio formatados
    // Estes serão preenchidos no DashboardController se não existirem
    // ticket.escolaNome = ""; 
    // ticket.municipio = "";
    // ticket.latitude = "";
    // ticket.longitude = "";
    // ticket.contatoDiretor = "";

    return ticket;
  }
};
