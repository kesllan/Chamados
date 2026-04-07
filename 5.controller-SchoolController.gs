// 5.controller-SchoolController.gs

var SchoolController = {

  getAll: function() {
    var schools = SchoolRepository.getAll();
    var tecnicos = ConfigController.getTechniciansMap(); // Precisa implementar
    return { escolas: schools, mapaTecnicos: tecnicos };
  },

  save: function(dados) {
    return SchoolRepository.save(dados);
  },

  delete: function(inep) {
    return SchoolRepository.delete(inep);
  },

  getSectorDashboard: function() {
    var all = SchoolRepository.getAll();
    var tecnicos = ConfigController.getTechniciansMap();
    
    var dashboard = {};
    
    all.forEach(function(esc) {
      var sId = esc.setor || "S/S";
      var mun = esc.municipio || "S/M";
      
      if (!dashboard[sId]) {
        dashboard[sId] = {
          tecnico: tecnicos[sId] || tecnicos["Todos"] || "Não Atribuído",
          municipios: {}
        };
      }
      
      if (!dashboard[sId].municipios[mun]) {
        dashboard[sId].municipios[mun] = [];
      }
      
      dashboard[sId].municipios[mun].push({
        inep: esc.inep,
        nome: esc.nome
      });
    });
    
    return dashboard;
  },

  reassignSchool: function(inep, setor) {
    return SchoolRepository.updateSector(inep, setor);
  },

  reassignMunicipality: function(municipio, setor) {
    return SchoolRepository.updateMunicipalitySector(municipio, setor);
  }
};
