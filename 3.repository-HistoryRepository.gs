// src/repository/HistoryRepository.js

/**
 * Repositório para o Histórico de Status (Audit Log).
 * Registra todas as movimentações críticas dos chamados.
 */
var HistoryRepository = {
  
  SHEET_NAME: AppConfig.SHEET_NAMES.LOG_STATUS,

  /**
   * Registra uma mudança de status com mapeamento unificado de colunas.
   * @param {string} protocolo - Número do protocolo.
   * @param {string} newStatus - Novo status definido.
   * @param {string} userEmail - E-mail de quem realizou a alteração.
   * @param {string} justification - Comentário/Observação do usuário.
   * @param {string} oldStatus - Status anterior à mudança.
   */
  logStatusChange: function(protocolo, newStatus, userEmail, justification, oldStatus) {
    try {
      var now = new Date();
      var idLog = "LOG_" + now.getTime();
      
      var rowObj = {};
      rowObj[AppConfig.COLUMNS_LOG.ID_LOG] = idLog;
      rowObj[AppConfig.COLUMNS_LOG.DATA_HORA] = now;
      rowObj[AppConfig.COLUMNS_LOG.PROTOCOLO] = protocolo;
      rowObj[AppConfig.COLUMNS_LOG.USUARIO_EXECUTOR] = userEmail || "Sistema";
      rowObj[AppConfig.COLUMNS_LOG.ACAO] = "Alteração de Status";
      rowObj[AppConfig.COLUMNS_LOG.STATUS_DE] = oldStatus || "";
      rowObj[AppConfig.COLUMNS_LOG.STATUS_PARA] = newStatus;
      rowObj[AppConfig.COLUMNS_LOG.DETALHE_REGISTRO] = "Log de movimentação de fluxo.";
      rowObj[AppConfig.COLUMNS_LOG.OBSERVACOES] = justification || "";
      rowObj[AppConfig.COLUMNS_LOG.LINK_EVIDENCIA_FOTO] = "";

      BaseRepository.appendRowMapped(this.SHEET_NAME, rowObj);
    } catch (e) {
      Logger.log("Erro ao gravar histórico: " + e.toString());
    }
  }
};
