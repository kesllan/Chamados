/**
 * GATEWAY DE COMUNICAÇÃO FRONTEND -> BACKEND
 * Centraliza todas as funções chamadas pelo google.script.run.
 * Estas funções atuam como proxies para os Controllers.
 */

// =================================================================================
// USUÁRIO E PERMISSÕES
// =================================================================================
function getAppUserInfo() {
  return ConfigController.getAppUserInfo();
}

// =================================================================================
// DASHBOARD E GESTÃO DE CHAMADOS (TICKETS)
// =================================================================================
function getDadosDashboard(page, limit, filter) {
  return DashboardController.getData(page, limit, filter);
}

function salvarChamadoManualTecnico(dados) {
  return TicketController.createManualTicket(dados);
}

function salvarAlteracaoStatus(payload) {
  return TicketController.updateStatus(payload);
}

function removerTermoPdf(protocolo) {
  return TicketController.handleTermDeletion(protocolo);
}

// =================================================================================
// ESCOLAS E SETORES (DIM_ESCOLAS)
// =================================================================================
function getListaEscolas() {
  return SchoolController.getAll();
}

function salvarEscola(dados) {
  return SchoolController.save(dados);
}

function excluirEscola(inep) {
  return SchoolController.delete(inep);
}

function getDadosSetores() {
  return SchoolController.getSectorDashboard();
}

function remanezarEscola(inep, setor) {
  return SchoolController.reassignSchool(inep, setor);
}

function remanezarMunicipio(municipio, setor) {
  return SchoolController.reassignMunicipality(municipio, setor);
}

// =================================================================================
// CONFIGURAÇÕES (TÉCNICOS E FERIADOS)
// =================================================================================
function getTecnicos() {
  return ConfigController.getTechnicians();
}

function salvarTecnico(dados) {
  return ConfigController.saveTechnician(dados);
}

function excluirTecnico(email) {
  return ConfigController.deleteTechnician(email);
}

function getFeriados() {
  return ConfigController.getHolidays();
}

function salvarFeriado(dados) {
  return ConfigController.saveHoliday(dados);
}

function excluirFeriado(id) { 
  return ConfigController.deleteHoliday(id);
}

// =================================================================================
// FERRAMENTAS ADMINISTRATIVAS (MENUS E DIAGNÓSTICO)
// =================================================================================
function sincronizarDimEscolas() {
  return AdminController.syncSchools();
}

function processarChamadosExistentes() {
  return AdminController.runMetricsUpdate();
}

function setupDatabase() {
  return AdminController.setupDatabase();
}

function diagnosticarUsuario() {
  return AdminController.diagnoseUser();
}

function corrigirValidacaoDados() {
  return AdminController.fixValidation();
}
