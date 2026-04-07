// 5.controller-DashboardController.gs

var DashboardController = {

  /**
   * Retorna os dados para o Dashboard com paginação e filtro.
   */
  getData: function(page, limit, filter) {
    var debugInfo = {}; // Objeto para coletar informações de depuração

    try {
      page = page || 1;
      limit = limit || 9;
      filter = filter || 'abertos';

      // 1. Permissões e Contexto
      var userEmail = Session.getActiveUser().getEmail();
      var userInfo = ConfigController.getAppUserInfo(); 
      var isAdmin = userInfo.isAdmin;
      debugInfo.userEmail = userEmail;
      debugInfo.isAdmin = isAdmin;

      // 2. Busca Dados Brutos
      var allTickets = [];
      var fetchError = null;
      try {
        allTickets = TicketRepository.findAll(); 
        debugInfo.allTicketsCount = allTickets.length;
      } catch (e) {
        fetchError = e.message;
        Logger.log("ERRO ao buscar tickets em DashboardController: " + e.toString());
        debugInfo.fetchError = e.toString();
      }
      
      if (!allTickets || allTickets.length === 0) {
        return { 
          chamados: [], 
          total: 0, 
          pagina: 1, 
          totalPaginas: 1, 
          filtroAtivo: filter, 
          success: true, 
          message: (fetchError || "Nenhum chamado encontrado."),
          debug: debugInfo
        };
      }

      var schoolsMap = SchoolRepository.getAllSchoolsMap(); 
      
      // Mapeamento de Técnicos para exibir nomes em vez de e-mails
      var techs = TechnicianRepository.findAll();
      var techsMap = {};
      techs.forEach(function(tec) {
        if (tec.email) {
          techsMap[String(tec.email).toLowerCase().trim()] = tec.nome;
        }
      });

      // 3. Filtragem e Enriquecimento
      var filtered = [];
      var statusAbertos = ['Novo', 'Agendado', 'Pendente', 'Atrasado'];

      for (var i = 0; i < allTickets.length; i++) {
        var t = allTickets[i];
        var ticketStatus = String(t.status || '').trim();

        // Filtro de Permissão (Unificado com a lógica do frontend para consistência)
        var passedPermissionFilter = this._isTicketVisible(t, userInfo);

        if (passedPermissionFilter) {
          // Enriquecimento: Nomes, Localização e Contatos
          var escolaInfo = schoolsMap[t.escola] || schoolsMap[t.inep] || {};
          
          if (!escolaInfo.nome && t.escola) {
             var extractedInep = String(t.escola).split(' - ')[0].trim();
             escolaInfo = schoolsMap[extractedInep] || {};
          }

          t.escolaNome = escolaInfo.nome || t.escola || "Não identificada";
          t.municipio = t.municipio || escolaInfo.municipio || "";
          t.latitude = escolaInfo.lat || "";
          t.longitude = escolaInfo.long || "";
          t.contatoDiretor = escolaInfo.fone || ""; 
          t.diretorNome = escolaInfo.diretor || "";
          
          // RESOLUÇÃO DE NOME DO TÉCNICO
          var emailTec = String(t.tecnico || '').toLowerCase().trim();
          t.tecnicoNome = techsMap[emailTec] || (t.tecnico ? t.tecnico.split('@')[0] : 'Sem técnico');
          
          filtered.push(t);
        }
      }

      // 4. Ordenação (Mais recente primeiro)
      filtered.sort(function(a, b) {
        var timeA = a.timestamp || 0;
        var timeB = b.timestamp || 0;
        return (timeB || 0) - (timeA || 0);
      });

      // 5. Paginação
      var total = filtered.length;
      var totalPaginas = Math.ceil(total / limit) || 1;
      
      if (page > totalPaginas) page = totalPaginas;
      if (page < 1) page = 1;

      var inicio = (page - 1) * limit;
      var paginated = filtered.slice(inicio, inicio + limit);

      return {
        chamados: paginated,
        total: total,
        pagina: page,
        totalPaginas: totalPaginas,
        filtroAtivo: filter,
        success: true,
        message: "Dashboard carregado.",
        debug: debugInfo
      };

    } catch (e) {
      Logger.log("ERRO DashboardController: " + e.toString());
      return { success: false, message: "Erro: " + e.message };
    }
  },

  /**
   * Helper privado para replicar lógica de visibilidade do servidor.
   */
  _isTicketVisible: function(t, userInfo) {
    if (!userInfo) return false;
    var userEmail = String(userInfo.email || '').toLowerCase().trim();
    var userSectors = (userInfo.setores || []).map(function(s) { 
      return String(s).toUpperCase().replace('SETOR', '').trim(); 
    });
    
    var ticketSector = String(t.setor || '').toUpperCase().replace('SETOR', '').trim();
    var ticketTech = String(t.tecnico || '').toLowerCase().trim();

    if (userSectors.indexOf('TODOS') > -1) return true;
    if (userInfo.isAdmin && userSectors.indexOf(ticketSector) > -1) return true;
    
    return (ticketTech === userEmail) || (userSectors.indexOf(ticketSector) > -1);
  }
};
