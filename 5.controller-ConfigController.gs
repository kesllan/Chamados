// Refatorado/src/5.controller-ConfigController.gs

/**
 * Controller de Configurações (Técnicos e Feriados).
 */
var ConfigController = {

  /**
   * Helper privado para verificar permissão administrativa.
   * Lança erro se não for admin.
   */
  _checkAdmin: function() {
    var info = this.getAppUserInfo();
    if (!info.isAdmin) {
      throw new Error("ACESSO NEGADO: Você não tem permissão para acessar as configurações do sistema.");
    }
  },

  /**
   * Retorna informações do usuário atual e suas permissões.
   * Trava de segurança: Identifica se o usuário está autorizado.
   */
  getAppUserInfo: function() {
    var email = Session.getActiveUser().getEmail().toLowerCase().trim();
    var tecnicos = TechnicianRepository.findAll();
    
    var userRecord = tecnicos.find(function(t) {
      var recordEmail = String(t.email || "").toLowerCase().trim();
      return recordEmail === email;
    });

    var isAdmin = false;
    var isAuthorized = false;

    if (userRecord) {
      isAuthorized = true; // Está na lista, está autorizado
      if (userRecord.admin !== undefined) {
        var adminVal = String(userRecord.admin).toUpperCase().trim();
        isAdmin = (adminVal === 'TRUE' || adminVal === 'VERDADEIRO');
      }
    }

    return {
      email: email,
      isAuthorized: isAuthorized,
      isAdmin: isAdmin,
      role: isAdmin ? 'Admin' : (isAuthorized ? 'Técnico' : 'Não Autorizado'),
      nome: userRecord ? userRecord.nome : 'Usuário Externo',
      setores: userRecord ? String(userRecord.setor || '').split(',').map(function(s) { return s.trim(); }) : []
    };
  },

  /**
   * Retorna lista de todos os técnicos.
   */
  getTechnicians: function() {
    this._checkAdmin();
    return TechnicianRepository.findAll();
  },

  /**
   * Retorna um mapa { Setor: NomeTécnico }.
   */
  getTechniciansMap: function() {
    // Esta função é usada no dashboard, então não precisa de checkAdmin
    var list = TechnicianRepository.findAll();
    var map = {};
    list.forEach(function(t) {
      if (t.setor) {
        var setores = String(t.setor).split(',');
        setores.forEach(function(s) {
          map[s.trim()] = t.nome;
        });
      }
    });
    return map;
  },

  /**
   * Encontra o email do técnico responsável por um setor.
   */
  findTechnicianBySector: function(sectorId) {
    var list = TechnicianRepository.findAll();
    var target = list.find(function(t) {
      var setores = String(t.setor).split(',').map(function(s) { return s.trim(); });
      return setores.indexOf(String(sectorId)) > -1 || t.setor === 'Todos';
    });
    return target ? target.email : AppConfig.EMAILS.COORDENADOR;
  },

  saveTechnician: function(dados) {
    this._checkAdmin();
    return TechnicianRepository.save(dados);
  },

  deleteTechnician: function(email) {
    this._checkAdmin();
    return TechnicianRepository.delete(email);
  },

  /**
   * FERIADOS
   */
  getHolidays: function() {
    this._checkAdmin();
    var list = HolidayRepository.findAllWithDescription();
    return list.map(function(item) {
      var d = item.data;
      return {
        dataRaw: d,
        data: Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        dataFmt: Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy"),
        descricao: item.descricao
      };
    });
  },

  saveHoliday: function(dados) {
    this._checkAdmin();
    return HolidayRepository.save(dados);
  },

  deleteHoliday: function(id) {
    this._checkAdmin();
    return HolidayRepository.delete(id);
  },

  /**
   * Executa a manutenção completa da estrutura do banco de dados.
   */
  runDatabaseMaintenance: function() {
    try {
      this._checkAdmin();
      return BaseRepository.autoMaintenance();
    } catch (e) {
      Logger.log("Erro em ConfigController.runDatabaseMaintenance: " + e.toString());
      return { success: false, message: e.message };
    }
  }
};
