// 5.controller-TicketController.gs

var TicketController = {

  /**
   * Cria um chamado manualmente via Painel Técnico.
   * @param {Object} dados - DTO vindo do frontend.
   */
  createManualTicket: function(dados) {
    try {
      // Validação básica
      if (!dados.inep || !dados.escola || !dados.tipoSolicitacao) {
        return { success: false, message: "Dados obrigatórios ausentes (INEP, Escola ou Tipo)." };
      }
      
      return TicketService.createManualTicket(dados);
    } catch (e) {
      Logger.log("Erro em TicketController.createManualTicket: " + e.toString());
      return { success: false, message: "Erro ao criar chamado: " + e.message };
    }
  },

  /**
   * Atualiza status do chamado e pode disparar geração de PDF.
   * @param {Object} payload - Dados da alteração.
   */
  updateStatus: function(payload) {
    try {
      // Validação: Exige protocolo e (novo status OU apenas gerar termo)
      if (!payload.protocolo || (!payload.novoStatus && !payload.apenasGerarTermo)) {
        return { success: false, message: "Protocolo e novo status (ou instrução de termo) são obrigatórios." };
      }
      
      return TicketService.updateStatus(payload);
    } catch (e) {
      Logger.log("Erro em TicketController.updateStatus: " + e.toString());
      return { success: false, message: "Erro ao atualizar status: " + e.message };
    }
  },

  /**
   * Remove o termo PDF associado a um chamado.
   */
  handleTermDeletion: function(protocolo) {
    try {
      if (!protocolo) return { success: false, message: "Protocolo é obrigatório." };
      return TicketService.deleteTermPdf(protocolo);
    } catch (e) {
      Logger.log("Erro em TicketController.handleTermDeletion: " + e.toString());
      return { success: false, message: e.message };
    }
  }
};
