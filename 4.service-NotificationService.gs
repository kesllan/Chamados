// src/service/NotificationService.js

/**
 * Serviço de Notificações.
 * Encapsula o envio de emails para desacoplar a lógica de negócio do MailApp.
 */
var NotificationService = {

  /**
   * Envia confirmação de abertura de chamado.
   * @param {string} to - Email do solicitante.
   * @param {Object} ticketData - Dados do chamado (protocolo, assunto, previsao, etc).
   */
  sendTicketOpened: function(to, ticketData) {
    if (!to || !ticketData.protocolo) return;

    var subject = "Chamado Criado: " + ticketData.protocolo + " - " + (ticketData.assunto || "Sem Assunto");
    var bodyHtml = "<html><body style='font-family: Arial, sans-serif;'>" +
                   "<h2 style='color: #008800;'>Chamado Recebido com Sucesso</h2>" +
                   "<p>Seu chamado foi registrado sob o protocolo <strong>" + ticketData.protocolo + "</strong>.</p>" +
                   "<p><strong>Assunto:</strong> " + (ticketData.assunto || "") + "</p>" +
                   "<p><strong>Previsão de Atendimento:</strong> " + (ticketData.previsao || "N/A") + "</p>" +
                   "<p>Você será notificado a cada atualização.</p>" +
                   "<hr><p>Atenciosamente,<br>Equipe NTE</p></body></html>";
    
    try {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        htmlBody: bodyHtml
      });
      Logger.log("Confirmação enviada para: " + to);
    } catch (e) {
      Logger.log("Erro ao enviar confirmação: " + e.message);
    }
  },

  /**
   * Envia alerta de SLA Estourado.
   * @param {Object} ticket - Objeto Ticket.
   */
  sendSlaAlert: function(ticket) {
    if (!ticket || !ticket.protocolo) return;

    var to = AppConfig.EMAILS.COORDENADOR;
    var cc = ticket.tecnico; // Se existir
    
    var subject = "ALERTA SLA: Chamado " + ticket.protocolo + " Estourado";
    var body = "O chamado " + ticket.protocolo + " ultrapassou o limite de SLA.\n" +
               "Dias Úteis em Aberto: " + (ticket.diasUteis || "N/A") + "\n" +
               "Técnico Responsável: " + (ticket.tecnico || "N/D");
               
    try {
      MailApp.sendEmail({
        to: to,
        cc: cc,
        subject: subject,
        body: body
      });
      Logger.log("Alerta SLA enviado para: " + to);
    } catch (e) {
      Logger.log("Erro ao enviar alerta SLA: " + e.message);
    }
  },

  /**
   * Envia alerta de Ociosidade (chamado parado há dias).
   * @param {Object} ticket
   * @param {number} daysInactive
   */
  sendInactivityAlert: function(ticket, daysInactive) {
    if (!ticket || !ticket.tecnico) return;

    var subject = "ALERTA OCIOSIDADE: Chamado " + ticket.protocolo;
    var body = "O chamado " + ticket.protocolo + " não recebe atualizações há " + daysInactive + " dias.\n" +
               "Por favor, verifique e atualize o status.";

    try {
      MailApp.sendEmail({
        to: ticket.tecnico,
        subject: subject,
        body: body
      });
    } catch (e) {
      Logger.log("Erro ao enviar alerta Ociosidade: " + e.message);
    }
  },

  /**
   * Envia email de mudança de status para o cliente.
   * @param {Object} ticket
   * @param {Object} schoolInfo - { nome, emailInstitucional }
   */
  sendStatusUpdate: function(ticket, schoolInfo) {
    if (!schoolInfo || !schoolInfo.emailInstitucional) return;

    var subject = "Atualização Chamado " + ticket.protocolo + " - Status: " + ticket.status;
    var bodyHtml = "<html><body style='font-family: Arial, sans-serif;'>" +
                   "<h2 style='color: #005596;'>Chamado " + ticket.protocolo + " Atualizado</h2>" +
                   "<p><strong>Status Atual:</strong> " + ticket.status + "</p>" +
                   "<p><strong>Escola:</strong> " + (schoolInfo.nome || ticket.escola) + "</p>" +
                   "<hr><p>Atenciosamente,<br>Equipe NTE</p></body></html>";

    try {
      MailApp.sendEmail({
        to: schoolInfo.emailInstitucional,
        subject: subject,
        htmlBody: bodyHtml
      });
    } catch (e) {
      Logger.log("Erro ao enviar update Status: " + e.message);
    }
  },

  /**
   * Notifica a escola sobre alteração de protocolo devido a manutenção/correção.
   */
  sendProtocolCorrection: function(email, dados) {
    if (!email) return;
    
    var subject = "⚠️ ATUALIZAÇÃO DE PROTOCOLO - Chamado NTE: " + dados.escola;
    var body = "Olá,\n\n" +
                "Informamos que, devido a uma manutenção de rotina em nosso banco de dados para garantir a integridade das informações, o número de protocolo do seu chamado foi atualizado.\n\n" +
                "• ESCOLA: " + dados.escola + "\n" +
                "• PROTOCOLO ANTERIOR: " + dados.antigo + "\n" +
                "• NOVO PROTOCOLO: " + dados.novo + "\n\n" +
                "Por favor, utilize o NOVO número para qualquer consulta futura em nosso sistema.\n" +
                "As demais informações e o histórico do seu chamado permanecem inalterados.\n\n" +
                "Atenciosamente,\nEquipe NTE - Suporte Técnico";
    
    try {
      MailApp.sendEmail(email, subject, body);
      Logger.log("Notificação de correção enviada para: " + email);
    } catch (e) {
      Logger.log("Erro ao enviar notificação de correção: " + e.toString());
    }
  }
};
