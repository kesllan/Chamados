// src/service/FormService.js

/**
 * Serviço de Integração com Google Forms.
 * Permite sincronizar escolas e buscar opções dinâmicas do formulário.
 */
var FormService = {

  /**
   * Obtém o formulário configurado.
   */
  getForm: function() {
    if (!AppConfig.GOOGLE_FORM_ID) throw new Error("ID do formulário não configurado no AppConfig.");
    try {
      return FormApp.openById(AppConfig.GOOGLE_FORM_ID);
    } catch (e) {
      throw new Error("Não foi possível abrir o formulário. Verifique se o ID no AppConfig é o de EDIÇÃO e se você tem permissão. Erro: " + e.message);
    }
  },

  /**
   * Obtém as opções de uma pergunta específica por título.
   */
  getOptionsByTitle: function(title) {
    try {
      var form = this.getForm();
      var items = form.getItems();
      
      for (var i = 0; i < items.length; i++) {
        var itemTitle = items[i].getTitle().trim();
        // Comparação flexível (ignora case e espaços extras)
        if (itemTitle.toLowerCase() === title.trim().toLowerCase()) {
          var itemType = items[i].getType();
          
          if (itemType === FormApp.ItemType.LIST) {
            return items[i].asListItem().getChoices().map(function(c) { return c.getValue(); });
          } else if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
            return items[i].asMultipleChoiceItem().getChoices().map(function(c) { return c.getValue(); });
          } else if (itemType === FormApp.ItemType.CHECKBOX) {
            return items[i].asCheckboxItem().getChoices().map(function(c) { return c.getValue(); });
          }
        }
      }
      Logger.log("Aviso: Pergunta '" + title + "' não encontrada no formulário.");
      return [];
    } catch (e) {
      Logger.log("Erro em getOptionsByTitle: " + e.message);
      return [];
    }
  },

  /**
   * Sincroniza a Dim_Escolas com base na pergunta "Nome da Escola:".
   */
  syncSchoolsFromForm: function() {
    var formEscolas = this.getOptionsByTitle(AppConfig.FORM_FIELDS.ESCOLA);
    if (formEscolas.length === 0) {
      return "Erro: Nenhuma escola encontrada no formulário. Verifique se o nome da pergunta está correto: '" + AppConfig.FORM_FIELDS.ESCOLA + "'";
    }

    var ss = BaseRepository.getSpreadsheet();
    var sheetDim = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
    var sheetContatos = ss.getSheetByName(AppConfig.SHEET_NAMES.CONTATOS_DIRETORES);
    
    if (!sheetDim) return "Erro: Aba Dim_Escolas não encontrada.";

    var dataDim = sheetDim.getDataRange().getValues();
    var hDim = dataDim[0];
    var colInepDim = hDim.indexOf(AppConfig.COLUMNS_ESCOLAS.COD_INEP);
    var colStatusDim = hDim.indexOf("Status_Integracao");

    // Garante que a coluna de status exista
    if (colStatusDim === -1) {
      colStatusDim = hDim.length;
      sheetDim.getRange(1, colStatusDim + 1).setValue("Status_Integracao").setBackground("#f3f3f3").setFontWeight("bold");
    }

    // Mapa de escolas atuais na Dim_Escolas
    var dimMap = {};
    for (var i = 1; i < dataDim.length; i++) {
      var inepExistente = String(dataDim[i][colInepDim]).trim();
      if (inepExistente) dimMap[inepExistente] = i + 1;
    }

    // Mapa de contatos diretores para enriquecimento
    var contactsMap = {};
    if (sheetContatos) {
      var dataContatos = sheetContatos.getDataRange().getValues();
      var hCont = dataContatos[0].map(h => String(h).trim().toUpperCase());
      var cInep = hCont.indexOf("CÓD. ESCOLA");
      var cCidade = hCont.indexOf("CIDADE");
      var cDiretor = hCont.indexOf("DIRETOR");
      var cEmail = -1;
      for(var k=0; k<hCont.length; k++) if(hCont[k].indexOf("EMAIL INSTITUCIONAL") > -1) cEmail = k;
      var cCel = hCont.indexOf("CELULAR/ WHATSAAP") > -1 ? hCont.indexOf("CELULAR/ WHATSAAP") : hCont.indexOf("CELULAR");

      for (var j = 1; j < dataContatos.length; j++) {
        var inepC = String(dataContatos[j][cInep]).trim();
        if (inepC) {
          contactsMap[inepC] = {
            municipio: dataContatos[j][cCidade],
            diretor: dataContatos[j][cDiretor],
            email: cEmail > -1 ? dataContatos[j][cEmail] : "",
            celular: cCel > -1 ? dataContatos[j][cCel] : ""
          };
        }
      }
    }

    var inepsNoForm = {};
    var adicionadas = 0;
    var reativadas = 0;

    formEscolas.forEach(function(escolaRaw) {
      var match = escolaRaw.match(/^(\d+)/);
      if (match) {
        var inep = match[0];
        inepsNoForm[inep] = true;

        if (!dimMap[inep]) {
          var contact = contactsMap[inep] || {};
          var rowObj = {};
          rowObj[AppConfig.COLUMNS_ESCOLAS.COD_INEP] = inep;
          rowObj[AppConfig.COLUMNS_ESCOLAS.NOME_ESCOLA_PADRAO] = escolaRaw;
          rowObj[AppConfig.COLUMNS_ESCOLAS.MUNICIPIO] = contact.municipio || "";
          rowObj[AppConfig.COLUMNS_ESCOLAS.NOME_DIRETOR_ATUAL] = contact.diretor || "";
          rowObj[AppConfig.COLUMNS_ESCOLAS.EMAIL_INSTITUCIONAL] = contact.email || "";
          rowObj[AppConfig.COLUMNS_ESCOLAS.CELULAR_DIRETOR] = contact.celular || "";
          rowObj["Status_Integracao"] = "Ativa";
          
          BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.DIM_ESCOLAS, rowObj);
          adicionadas++;
        } else {
          sheetDim.getRange(dimMap[inep], colStatusDim + 1).setValue("Ativa");
          reativadas++;
        }
      }
    });

    // MARCAR COMO INATIVA AS QUE NÃO ESTÃO NO FORM
    var inativadas = 0;
    Object.keys(dimMap).forEach(function(inep) {
      if (!inepsNoForm[inep]) {
        sheetDim.getRange(dimMap[inep], colStatusDim + 1).setValue("Inativa");
        inativadas++;
      }
    });

    return "Sincronização concluída!\n" + 
           "- Novas: " + adicionadas + "\n" +
           "- Ativas: " + reativadas + "\n" +
           "- Inativadas: " + inativadas;
  },

  /**
   * Retorna as opções para o frontend.
   */
  getTicketOptions: function() {
    return {
      cargos: this.getOptionsByTitle(AppConfig.FORM_FIELDS.CARGO),
      tiposSolicitacao: this.getOptionsByTitle(AppConfig.FORM_FIELDS.TIPO_SOLICITACAO)
    };
  }
};
