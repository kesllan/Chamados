// 5.controller-WebController.gs

/**
 * Controller do Web App (doGet).
 * Responsável por servir a aplicação HTML completa.
 */
var WebController = {

  /**
   * Ponto de entrada do doGet.
   * Implementa trava de segurança global.
   */
  handleGet: function(e) {
    // 1. Verifica se o usuário está na lista de técnicos autorizados
    var userInfo = ConfigController.getAppUserInfo();
    
    if (!userInfo.isAuthorized) {
      return this._renderAccessDenied(userInfo.email);
    }

    // 2. Se autorizado, carrega o sistema normalmente
    var template = HtmlService.createTemplateFromFile('View_Index');
    return template.evaluate()
        .setTitle('Gestão de Chamados NTE')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  },

  /**
   * Renderiza uma página simples de acesso negado.
   */
  _renderAccessDenied: function(email) {
    var html = "<div style='font-family: Arial, sans-serif; text-align: center; padding-top: 100px; color: #334155;'>" +
               "<h1 style='color: #dc2626;'>⛔ Acesso Negado</h1>" +
               "<p style='font-size: 18px;'>O e-mail <strong>" + email + "</strong> não está autorizado a acessar este sistema.</p>" +
               "<p>Se você deveria ter acesso, entre em contato com o administrador para cadastrar seu e-mail na lista de técnicos.</p>" +
               "<hr style='width: 300px; margin: 20px auto; border: 0; border-top: 1px solid #e2e8f0;'>" +
               "<small style='color: #94a3b8;'>Núcleo de Tecnologia Educacional - NTE</small>" +
               "</div>";
    return HtmlService.createHtmlOutput(html)
        .setTitle('Acesso Negado')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
};

/**
 * Helper global para incluir arquivos HTML parciais.
 */
function include(filename) {
  var target = 'View_' + filename.charAt(0).toUpperCase() + filename.slice(1);
  return HtmlService.createHtmlOutputFromFile(target).getContent();
}
