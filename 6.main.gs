/**
 * Ponto de entrada principal do Google Apps Script.
 * Contém os Triggers, Menus e Triggers de Tempo.
 */

// =================================================================================
// TRIGGERS DE SISTEMA (Chamadas pelo Google, não pelo Frontend)
// =================================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ Admin NTE (Novo)')
    .addItem('🔄 Sincronizar Escolas', 'runSchoolSync')
    .addItem('📊 Processar Métricas (SLA/Dias)', 'runMetricsUpdate')
    .addItem('📦 Migrar Chamados Legados (Enriquecer)', 'runLegacyMigration')
    .addSeparator()
    .addItem('🛠️ Configurar/Reparar Banco de Dados', 'runDatabaseSetup')
    .addItem('🔍 Diagnóstico de Usuário', 'runDiagnostics')
    .addItem('🛠️ Diagnóstico de Planilha', 'runSheetDiagnostics')
    .addToUi();
}

function onEdit(e) {
  try {
    TicketService.handleEdit(e);
  } catch (err) {
    Logger.log("Erro em onEdit: " + err.toString());
  }
}

function onFormSubmit(e) {
  try {
    TicketService.processNewTicket(e);
  } catch (err) {
    Logger.log("ERRO CRÍTICO em onFormSubmit: " + err.toString());
  }
}

function doGet(e) {
  try {
    return WebController.handleGet(e);
  } catch (err) {
    return HtmlService.createHtmlOutput("<h1>Erro Crítico de Inicialização</h1><p>" + err.toString() + "</p>");
  }
}

// =================================================================================
// FUNÇÕES AUXILIARES INTERNAS (Chamadas pelos Triggers ou Outras Funções)
// =================================================================================

function runMetricsUpdate() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.runMetricsUpdate(); 
    if(result.success) ui.alert("Sucesso", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runSchoolSync() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.syncSchools(); 
    if(result.success) ui.alert("Sucesso", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runDailyJob() {
  // Chamado por um Trigger de tempo, sem UI
  try {
    AdminController.runMetricsUpdate();
  } catch (e) {
    Logger.log("Erro no Job Diário: " + e.toString());
  }
}

function runAutoMaintenance() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = BaseRepository.autoMaintenance(); 
    if(result.success) ui.alert("Sucesso", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runDiagnostics() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.diagnoseUser(); 
    if(result.success) ui.alert("Diagnóstico", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runSheetDiagnostics() { 
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.diagnoseSheet(); 
    if(result.success) ui.alert("Diagnóstico de Planilha", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runDatabaseSetup() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.setupDatabase(); 
    if(result.success) ui.alert("Sucesso", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

function runLegacyMigration() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = AdminController.runLegacyMigration(); 
    if(result.success) ui.alert("Migração Concluída", result.message, ui.ButtonSet.OK);
    else ui.alert("Erro na Migração", result.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Erro", e.toString(), ui.ButtonSet.OK);
  }
}

// =================================================================================
// HELPER PARA TEMPLATES HTML
// =================================================================================
function include(filename) {
  var target = 'View_' + filename.charAt(0).toUpperCase() + filename.slice(1);
  return HtmlService.createHtmlOutputFromFile(target).getContent();
}
