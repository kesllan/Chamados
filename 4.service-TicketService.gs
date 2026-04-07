// src/service/TicketService.js

/**
 * Serviço de Negócio para Chamados.
 */
var TicketService = {

  /**
   * Processa novo chamado via Formulário (Trigger).
   * @param {Object} e - Objeto do evento onFormSubmit.
   */
  processNewTicket: function(e) {
    if (!e || !e.range) {
      Logger.log("Erro: Evento inválido em processNewTicket");
      return;
    }

    var row = e.range.getRow();
    var values = e.namedValues; // { "HeaderName": ["Value"] }

    // Gera Protocolo: YYYYNNNN (Ex: 20260001)
    var protocolo = this._generateNextProtocol();
    var now = new Date();

    // Extrai dados do formulário
    var escolaKey = AppConfig.COLUMNS_CHAMADOS.ESCOLA;
    var nomeEscola = (values[escolaKey] && values[escolaKey][0]) ? values[escolaKey][0] : "";
    
    // Sincroniza dados da Escola (Enriquecimento)
    var schoolData = SchoolService.syncSchoolData({ escola: nomeEscola });

    // Busca Técnico Responsável pelo Setor da Escola
    var tecnicoResponsavel = "";
    if (schoolData.setor) {
      tecnicoResponsavel = ConfigController.findTechnicianBySector(schoolData.setor);
    }

    // Calcula Prazo (SLA)
    var feriados = HolidayRepository.findAll();
    var feriadosStr = feriados.map(function(d) {
        return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    });
    
    // Assumindo SLA padrão de 8 dias úteis (conforme AppConfig)
    var prazo = DateUtils.addBusinessDays(now, AppConfig.SLA.DIAS_UTEIS_PADRAO, feriadosStr);

    // Prepara Updates na Planilha
    var updates = {};
    updates[AppConfig.COLUMNS_CHAMADOS.PROTOCOLO] = protocolo;
    updates[AppConfig.COLUMNS_CHAMADOS.STATUS] = "Novo";
    updates[AppConfig.COLUMNS_CHAMADOS.PREVISAO] = prazo;
    updates[AppConfig.COLUMNS_CHAMADOS.ULTIMA_ATUALIZACAO] = now;
    updates[AppConfig.COLUMNS_CHAMADOS.TECNICO] = tecnicoResponsavel;
    
    // Dados da Escola (se encontrados)
    if (schoolData.email) updates[AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL] = schoolData.email;
    if (schoolData.municipio) updates[AppConfig.COLUMNS_CHAMADOS.MUNICIPIO] = schoolData.municipio;
    if (schoolData.inep) updates[AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA] = schoolData.inep;
    if (schoolData.setor) updates[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] = schoolData.setor;
    
    // Inicializa métricas zeradas
    updates[AppConfig.COLUMNS_CHAMADOS.DIAS_EM_ABERTO] = 0;
    updates[AppConfig.COLUMNS_CHAMADOS.DIAS_UTEIS_ABERTO] = 0;
    updates[AppConfig.COLUMNS_CHAMADOS.SLA_ESTOURADO] = false;

    // Persiste
    TicketRepository.updateTicketData(row, updates);

    // Envia Notificação
    var emailKey = AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL;
    var assuntoKey = AppConfig.COLUMNS_CHAMADOS.TIPO_SOLICITACAO;
    
    // Tenta email do form, se falhar, usa o da escola
    var emailForm = (values[emailKey] && values[emailKey][0]) ? values[emailKey][0] : "";
    var emailFinal = emailForm || schoolData.email;

    var assunto = (values[assuntoKey] && values[assuntoKey][0]) ? values[assuntoKey][0] : "Sem Assunto";
    
    if (emailFinal) {
      NotificationService.sendTicketOpened(emailFinal, {
        protocolo: protocolo,
        assunto: assunto,
        previsao: Utilities.formatDate(prazo, Session.getScriptTimeZone(), "dd/MM/yyyy")
      });
    }
  },

  /**
   * Cria um chamado manualmente via Painel Técnico.
   * @param {Object} dados - DTO vindo do frontend.
   */
  createManualTicket: function(dados) {
    try {
      var ss = BaseRepository.getSpreadsheet();
      var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
      if (!sheet) throw new Error("Aba Chamados não encontrada.");

      var now = new Date();
      var protocolo = this._generateNextProtocol();
      var userEmail = Session.getActiveUser().getEmail();

      // Busca dados complementares
      var tecnicoResponsavel = ConfigController.findTechnicianBySector(dados.setor);
      var schoolData = SchoolService.syncSchoolData({ escola: dados.escola });
      
      // Monta linha
      var newTicket = {};
      // Mapeamento DTO -> Colunas
      newTicket[AppConfig.COLUMNS_CHAMADOS.DATA_ABERTURA] = now;
      newTicket[AppConfig.COLUMNS_CHAMADOS.ESCOLA] = dados.inep + " - " + dados.escola;
      newTicket[AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL] = schoolData.email || "";
      newTicket[AppConfig.COLUMNS_CHAMADOS.MUNICIPIO] = dados.municipio || "";
      newTicket[AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_NOME] = dados.solicitante || "Abertura Técnica";
      newTicket[AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_MASP] = dados.masp || "";
      newTicket[AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_CARGO] = dados.cargo || "Técnico";
      newTicket[AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_CELULAR] = dados.celular || "";
      newTicket[AppConfig.COLUMNS_CHAMADOS.TIPO_SOLICITACAO] = dados.tipoSolicitacao;
      newTicket[AppConfig.COLUMNS_CHAMADOS.DETALHE_PROBLEMA] = dados.descricao;
      newTicket[AppConfig.COLUMNS_CHAMADOS.PROTOCOLO] = protocolo;
      newTicket[AppConfig.COLUMNS_CHAMADOS.STATUS] = "Novo";
      newTicket[AppConfig.COLUMNS_CHAMADOS.TECNICO] = tecnicoResponsavel;
      newTicket[AppConfig.COLUMNS_CHAMADOS.OBSERVACOES] = "Abertura Manual por: " + userEmail;
      
      // Campos de Sistema
      newTicket[AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA] = dados.inep;
      newTicket[AppConfig.COLUMNS_CHAMADOS.ULTIMA_ATUALIZACAO] = now;
      newTicket[AppConfig.COLUMNS_CHAMADOS.SETOR_ID] = dados.setor;
      newTicket[AppConfig.COLUMNS_CHAMADOS.ORIGEM_CHAMADO] = dados.origem;
      newTicket[AppConfig.COLUMNS_CHAMADOS.DIAS_EM_ABERTO] = 0;
      newTicket[AppConfig.COLUMNS_CHAMADOS.DIAS_UTEIS_ABERTO] = 0;
      newTicket[AppConfig.COLUMNS_CHAMADOS.SLA_ESTOURADO] = false;
      newTicket[AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA] = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM");

      // Salva
      BaseRepository.appendRowMapped(AppConfig.SHEET_NAMES.CHAMADOS, newTicket);
      
      // Histórico
      HistoryRepository.logStatusChange(protocolo, "Novo", userEmail, "Abertura técnica manual", "");

      return { success: true, protocolo: protocolo };
    } catch (e) {
      Logger.log(e);
      return { success: false, message: e.message };
    }
  },

  /**
   * Atualiza status e gera termo se necessário.
   */
  updateStatus: function(payload) {
    try {
      var ticket = TicketRepository.findByProtocol(payload.protocolo);
      if (!ticket) throw new Error("Protocolo não encontrado.");
      
      var updates = {};
      var now = new Date();
      var userEmail = Session.getActiveUser().getEmail();
      var oldStatus = ticket.status;

      // Se não for apenas geração de termo, atualiza o status
      if (!payload.apenasGerarTermo) {
        updates[AppConfig.COLUMNS_CHAMADOS.STATUS] = payload.novoStatus;
        updates[AppConfig.COLUMNS_CHAMADOS.ULTIMA_ATUALIZACAO] = now;
        
        // Dados específicos por status
        if (payload.novoStatus === "Agendado" && payload.dataAgendamento) {
          updates[AppConfig.COLUMNS_CHAMADOS.PREVISAO] = payload.dataAgendamento;
        } else if (payload.novoStatus === "Concluído") {
          updates[AppConfig.COLUMNS_CHAMADOS.CATEGORIA_MACRO] = payload.categoria || "";
          updates[AppConfig.COLUMNS_CHAMADOS.CAUSA_RAIZ] = payload.causa || "";
          updates[AppConfig.COLUMNS_CHAMADOS.SOLUCAO_TECNICA] = payload.solucao || "";
          updates[AppConfig.COLUMNS_CHAMADOS.TIPO_ATENDIMENTO] = payload.tipoAtendimento || "";
        }

        // Consolida observações: Mantém o que já existia e anexa a nova justificativa
        if (payload.justificativa) {
          var obsAnterior = ticket.obs || "";
          var dataFormatada = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yy HH:mm");
          var novaEntrada = "\n[" + dataFormatada + " - " + payload.novoStatus + "]: " + payload.justificativa;
          updates[AppConfig.COLUMNS_CHAMADOS.OBSERVACOES] = (obsAnterior + novaEntrada).trim();
        }

        TicketRepository.updateTicketData(ticket._row, updates);
        
        // Log Histórico (agora com justificativa e status anterior)
        HistoryRepository.logStatusChange(payload.protocolo, payload.novoStatus, userEmail, payload.justificativa, oldStatus);
      }
      
      // Se for apenas solicitação manual de termo (ou após a conclusão via frontend)
      var urlPdf = "";
      if (payload.apenasGerarTermo) {
        urlPdf = PdfService.generateTerm(payload, ticket);
        
        // Salva o link no chamado
        var pdfUpdate = {};
        pdfUpdate[AppConfig.COLUMNS_CHAMADOS.LINK_TERMO_PDF] = urlPdf;
        TicketRepository.updateTicketData(ticket._row, pdfUpdate);
      }
      
      return { success: true, message: "Atualizado com sucesso!", urlPdf: urlPdf };
    } catch (e) {
      Logger.log("Erro em TicketService.updateStatus: " + e.toString());
      return { success: false, message: e.message };
    }
  },


  /**
   * Remove o termo PDF de um chamado e tenta excluir do Drive.
   */
  deleteTermPdf: function(protocolo) {
    try {
      var ticket = TicketRepository.findByProtocol(protocolo);
      if (!ticket) throw new Error("Protocolo não encontrado.");

      var linkAnterior = ticket.linkTermo;
      
      // 1. Limpa o campo na Planilha (Mantém o status atual)
      var updates = {};
      updates[AppConfig.COLUMNS_CHAMADOS.LINK_TERMO_PDF] = "";
      TicketRepository.updateTicketData(ticket._row, updates);

      // 2. Tenta excluir o arquivo do Drive se houver link
      if (linkAnterior) {
        try {
          var fileId = linkAnterior.match(/[-\w]{25,}/); 
          if (fileId) {
            DriveApp.getFileById(fileId[0]).setTrashed(true);
          }
        } catch (err) {
          Logger.log("Aviso: Não foi possível excluir arquivo do Drive: " + err.message);
        }
      }

      // 3. Log Histórico
      var userEmail = Session.getActiveUser().getEmail();
      HistoryRepository.logStatusChange(protocolo, ticket.status, userEmail, "Termo PDF removido pelo técnico.", ticket.status);

      return { success: true, message: "Termo removido com sucesso!" };
    } catch (e) {
      Logger.log("Erro em TicketService.deleteTermPdf: " + e.toString());
      return { success: false, message: e.message };
    }
  },

  /**
   * Processa edições manuais na planilha (Trigger onEdit).
   * Monitora mudanças de Status para atualizar timestamp, log e notificar.
   * @param {Object} e - Evento de edição.
   */
  handleEdit: function(e) {
    if (!e || !e.range) return;

    var sheet = e.range.getSheet();
    // Verifica se é a aba Chamados
    if (sheet.getName() !== AppConfig.SHEET_NAMES.CHAMADOS) return;

    var rowIndex = e.range.getRow();
    var colIndex = e.range.getColumn();
    
    if (rowIndex <= 1) return; // Ignora cabeçalho

    // Mapeia colunas dinamicamente
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colStatus = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.STATUS) + 1;
    
    // Se a edição não foi no Status, ignora
    if (colIndex !== colStatus) return;

    var newStatus = e.value;
    var oldStatus = e.oldValue;

    // Se houve mudança real
    if (newStatus && newStatus !== oldStatus) {
       var colProtocolo = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.PROTOCOLO) + 1;
       var colEscola = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA) + 1;
       var colEmail = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL) + 1;
       var colUltimaAtu = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ULTIMA_ATUALIZACAO) + 1;

       var protocolo = sheet.getRange(rowIndex, colProtocolo).getValue();
       var nomeEscola = sheet.getRange(rowIndex, colEscola).getValue();
       var emailEscola = sheet.getRange(rowIndex, colEmail).getValue();

       // 1. Atualiza Data de Última Atualização
       if (colUltimaAtu > 0) {
         sheet.getRange(rowIndex, colUltimaAtu).setValue(new Date());
       }

       // 2. Registra no Histórico
       try {
         var user = Session.getActiveUser().getEmail(); // Requer auth scope
         HistoryRepository.logStatusChange(protocolo, newStatus, user, "Edição manual na planilha", oldStatus);
       } catch (err) {
         Logger.log("Erro ao logar histórico (pode ser restrição de trigger simples): " + err.message);
       }

       // 3. Notifica Solicitante (Se houver email)
       if (emailEscola) {
         NotificationService.sendStatusUpdate(
           { protocolo: protocolo, status: newStatus, escola: nomeEscola },
           { emailInstitucional: emailEscola, nome: nomeEscola }
         );
       }
    }
  },

  /**
   * Processa métricas de SLA e Dias em Aberto para todos os chamados não concluídos.
   * Unifica a lógica de 'ProcessarDadosLegados' e 'StatusAtrasado'.
   */
  updateAllTicketMetrics: function() {
    var tickets = TicketRepository.findAll(); // Busca todos
    var holidays = HolidayRepository.findAll();
    var holidayStrings = holidays.map(function(d) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    });
    
    var today = new Date();
    var countProcessed = 0;

    // Obtém Spreadsheet e Sheet uma vez para updates
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(TicketRepository.SHEET_NAME);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Mapeia índices para update direto (Performance)
    var colDiasAberto = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.DIAS_EM_ABERTO) + 1;
    var colDiasUteis = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.DIAS_UTEIS_ABERTO) + 1;
    var colSla = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.SLA_ESTOURADO) + 1;
    var colStatus = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.STATUS) + 1;

    tickets.forEach(function(ticket) {
      // Ignora chamados já finalizados para recálculo de dias abertos HOJE
      if (ticket.status === "Concluído" || ticket.status === "Cancelado") return;

      if (!ticket.dataAbertura) return;

      // Garante objeto Date para cálculo
      var dtAbertura = DateUtils.ensureDate(ticket.dataAbertura);
      if (!dtAbertura) return;

      var diasCorridos = Math.floor((today - dtAbertura) / (1000 * 60 * 60 * 24));
      var diasUteis = DateUtils.calculateBusinessDays(dtAbertura, today, holidayStrings);
      
      var isSlaBreached = (diasUteis > AppConfig.SLA.DIAS_UTEIS_PADRAO);
      
      if (ticket._row) {
        if (colDiasAberto > 0) sheet.getRange(ticket._row, colDiasAberto).setValue(diasCorridos);
        if (colDiasUteis > 0) sheet.getRange(ticket._row, colDiasUteis).setValue(diasUteis);
        if (colSla > 0) sheet.getRange(ticket._row, colSla).setValue(isSlaBreached);
        
        // Regra de Negócio: Se estourou SLA e não é "Atrasado", muda status?
        if (isSlaBreached && ticket.status === "Novo") {
           if (colStatus > 0) sheet.getRange(ticket._row, colStatus).setValue("Atrasado");
        }
        
        if (isSlaBreached && !ticket.slaEstourado) {
          NotificationService.sendSlaAlert(ticket);
        }
      }
      countProcessed++;
    });

    return countProcessed;
  },

  /**
   * Sincroniza dados de escola para todos os chamados que possuem campos vazios.
   * Útil para preencher dados retroativos ou corrigir falhas.
   * @return {number} Quantidade de chamados atualizados.
   */
  syncMissingSchoolData: function() {
    var count = 0;
    
    // Cache de escolas para evitar lookups repetidos
    var schoolsMap = SchoolRepository.getAllSchoolsMap();
    
    // Índices para update direto
    var ss = BaseRepository.getSpreadsheet();
    var sheet = ss.getSheetByName(TicketRepository.SHEET_NAME);
    if (!sheet) return 0;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var colEscola = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.ESCOLA);
    var colEmail = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL) + 1;
    var colMunic = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.MUNICIPIO) + 1;
    var colInep = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA) + 1;

    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var nomeEscola = row[colEscola];
      var rowIndex = i + 1;
      
      if (!nomeEscola) continue;

      var emailAtual = (colEmail > 0) ? row[colEmail-1] : "";
      var municAtual = (colMunic > 0) ? row[colMunic-1] : "";
      var inepAtual = (colInep > 0) ? row[colInep-1] : "";

      if (emailAtual && municAtual && inepAtual) continue;

      var school = schoolsMap[String(nomeEscola).trim()];
      
      if (school) {
        var updated = false;
        
        if (!emailAtual && school.email && colEmail > 0) {
          sheet.getRange(rowIndex, colEmail).setValue(school.email);
          updated = true;
        }
        if (!municAtual && school.municipio && colMunic > 0) {
          sheet.getRange(rowIndex, colMunic).setValue(school.municipio);
          updated = true;
        }
        if (!inepAtual && school.inep && colInep > 0) {
          sheet.getRange(rowIndex, colInep).setValue(school.inep);
          updated = true;
        }
        
        if (updated) count++;
      }
    }
    
    return count;
  },

  /**
   * Gera o próximo protocolo no padrão YYYYNNNN (ex: 20260027).
   * Otimizado: Lê e atualiza o último protocolo na aba de controle.
   * @return {string} O novo protocolo formatado.
   */
  _generateNextProtocol: function() {
    try {
      var now = new Date();
      var year = now.getFullYear().toString();
      
      // Tenta obter o último protocolo do controle
      var lastProtocol = BaseRepository.getSystemConfig("ULTIMO_PROTOCOLO");
      var nextSeq = 1;

      if (lastProtocol && String(lastProtocol).length === 8) {
        var lastYear = String(lastProtocol).substring(0, 4);
        var lastSeq = parseInt(String(lastProtocol).substring(4), 10);

        if (lastYear === year) {
          // Mesmo ano, incrementa
          nextSeq = lastSeq + 1;
        } else {
          // Mudou o ano, reinicia em 0001
          nextSeq = 1;
        }
      } else {
        // Se não houver no controle, busca o maior na planilha (Fallback de segurança na primeira vez)
        var ss = BaseRepository.getSpreadsheet();
        var sheet = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          var colIdx = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.PROTOCOLO);
          if (colIdx >= 0) {
            var protocols = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
            var maxSeq = 0;
            for (var i = 0; i < protocols.length; i++) {
              var p = String(protocols[i][0]);
              if (p.indexOf(year) === 0 && p.length === 8) {
                var s = parseInt(p.substring(4), 10);
                if (s > maxSeq) maxSeq = s;
              }
            }
            nextSeq = maxSeq + 1;
          }
        }
      }

      var nextProtocol = year + ("0000" + nextSeq).slice(-4);
      
      // Salva no controle para o próximo com descrição clara
      BaseRepository.setSystemConfig(
        "ULTIMO_PROTOCOLO", 
        nextProtocol, 
        "Armazena o último protocolo gerado pelo sistema para garantir sequência única e evitar duplicidade."
      );
      
      return nextProtocol;

    } catch (e) {
      Logger.log("Erro ao gerar protocolo (controle): " + e.toString());
      return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
    }
  }
};
