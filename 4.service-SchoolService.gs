// src/service/SchoolService.js

/**
 * Serviço de Negócio para Escolas.
 */
var SchoolService = {

  /**
   * Sincroniza dados da escola em um chamado.
   * Busca e preenche: Email Institucional, INEP, Município e Setor se estiverem vazios.
   * @param {Object} ticket - Objeto Ticket
   * @return {Object} Dados complementares { email, inep, municipio, setor }
   */
  syncSchoolData: function(ticket) {
    if (!ticket || !ticket.escola) return {};

    var school = SchoolRepository.findByName(ticket.escola);
    if (!school) {
      Logger.log("Aviso: Escola não encontrada em Dim_Escolas: " + ticket.escola);
      return {};
    }

    return {
      email: school.email || "",
      inep: school.inep || "",
      municipio: school.municipio || "",
      setor: school.setor || ""
    };
  }
};
