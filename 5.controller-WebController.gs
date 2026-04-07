// 5.controller-WebController.gs

/**
 * Controller do Web App (doGet).
 * Responsável por servir a aplicação HTML completa.
 */
var WebController = {

  /**
   * Ponto de entrada do doGet.
   */
  handleGet: function(e) {
    var template = HtmlService.createTemplateFromFile('View_Index');
    
    // Injeta dados iniciais se necessário
    // template.userEmail = Session.getActiveUser().getEmail();
    
    return template.evaluate()
        .setTitle('Gestão de Chamados NTE')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
};

/**
 * Helper global para incluir arquivos HTML parciais.
 * O Apps Script exige que essa função esteja no escopo global para funcionar no template.
 */
function include(filename) {
  // Ajuste para encontrar os arquivos com prefixo View_ se necessário, ou direto
  // Como renomeamos para View_Css.html, o include('css') deve buscar 'View_Css'
  
  var target = 'View_' + filename.charAt(0).toUpperCase() + filename.slice(1);
  return HtmlService.createHtmlOutputFromFile(target).getContent();
}
