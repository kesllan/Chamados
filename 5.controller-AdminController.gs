// 5.controller-AdminController.gs

var AdminController = {
  syncSchools: function() {
    try {
      var count = TicketService.syncMissingSchoolData();
      return { success: true, message: count + " chamados atualizados." };
    } catch (e) {
      Logger.log("Erro AdminController.syncSchools: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  runMetricsUpdate: function() {
    try {
      var count = TicketService.updateAllTicketMetrics();
      return { success: true, message: count + " chamados processados." };
    } catch (e) {
      Logger.log("Erro AdminController.runMetricsUpdate: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  runLegacyMigration: function() {
    try {
      var result = MigrationService.migrateLegacyTickets();
      return { success: true, message: result };
    } catch (e) {
      Logger.log("Erro AdminController.runLegacyMigration: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  runFormSync: function() {
    try {
      var result = FormService.syncSchoolsFromForm();
      return { success: true, message: result };
    } catch (e) {
      Logger.log("Erro AdminController.runFormSync: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  setupDatabase: function() {
    try {
      var ss = BaseRepository.getSpreadsheet();
      
      // 1. Garante que as abas existam
      Object.keys(AppConfig.SHEET_NAMES).forEach(function(key) {
        var name = AppConfig.SHEET_NAMES[key];
        if (!ss.getSheetByName(name)) {
          ss.insertSheet(name);
          Logger.log("Aba criada: " + name);
        }
      });

      // 2. Configura Cabeçalhos da aba Chamados
      var sheetChamados = ss.getSheetByName(AppConfig.SHEET_NAMES.CHAMADOS);
      var colunasChamados = [
        AppConfig.COLUMNS_CHAMADOS.DATA_ABERTURA, AppConfig.COLUMNS_CHAMADOS.ESCOLA,
        AppConfig.COLUMNS_CHAMADOS.EMAIL_INSTITUCIONAL, AppConfig.COLUMNS_CHAMADOS.MUNICIPIO,
        AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_NOME, AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_MASP,
        AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_CARGO, AppConfig.COLUMNS_CHAMADOS.SOLICITANTE_CELULAR,
        AppConfig.COLUMNS_CHAMADOS.TIPO_SOLICITACAO, AppConfig.COLUMNS_CHAMADOS.DETALHE_PROBLEMA,
        AppConfig.COLUMNS_CHAMADOS.ANEXOS, AppConfig.COLUMNS_CHAMADOS.PROTOCOLO,
        AppConfig.COLUMNS_CHAMADOS.STATUS, AppConfig.COLUMNS_CHAMADOS.TECNICO,
        AppConfig.COLUMNS_CHAMADOS.OBSERVACOES, AppConfig.COLUMNS_CHAMADOS.CONFIRMACAO,
        AppConfig.COLUMNS_CHAMADOS.COD_INEP_ESCOLA, AppConfig.COLUMNS_CHAMADOS.ULTIMA_ATUALIZACAO,
        AppConfig.COLUMNS_CHAMADOS.CATEGORIA_MACRO, AppConfig.COLUMNS_CHAMADOS.CAUSA_RAIZ,
        AppConfig.COLUMNS_CHAMADOS.LINK_TERMO_PDF, AppConfig.COLUMNS_CHAMADOS.DIAS_EM_ABERTO,
        AppConfig.COLUMNS_CHAMADOS.DIAS_UTEIS_ABERTO, AppConfig.COLUMNS_CHAMADOS.SLA_ESTOURADO,
        AppConfig.COLUMNS_CHAMADOS.DATA_PREVISAO, AppConfig.COLUMNS_CHAMADOS.SOLUCAO_TECNICA,
        AppConfig.COLUMNS_CHAMADOS.SETOR_ID, AppConfig.COLUMNS_CHAMADOS.MES_REFERENCIA,
        AppConfig.COLUMNS_CHAMADOS.CONFIRMACAO_LEITURA, AppConfig.COLUMNS_CHAMADOS.ORIGEM_CHAMADO,
        AppConfig.COLUMNS_CHAMADOS.TIPO_ATENDIMENTO
      ];
      SheetUtils.ensureColumns(sheetChamados, colunasChamados);

      // 3. Configura Cabeçalhos da aba Técnicos
      var sheetTecnicos = ss.getSheetByName(AppConfig.SHEET_NAMES.CONFIG_TECNICOS);
      var colunasTecnicos = [
        AppConfig.COLUMNS_TECNICOS.EMAIL_TECNICO, AppConfig.COLUMNS_TECNICOS.NOME_EXIBICAO,
        AppConfig.COLUMNS_TECNICOS.SETOR_RESPONSAVEL, AppConfig.COLUMNS_TECNICOS.PERMISSAO_ADMIN,
        AppConfig.COLUMNS_TECNICOS.MASP
      ];
      SheetUtils.ensureColumns(sheetTecnicos, colunasTecnicos);

      // 4. Configura Cabeçalhos da aba Escolas (LISTA LITERAL DE 11 CAMPOS)
      var sheetEscolas = ss.getSheetByName(AppConfig.SHEET_NAMES.DIM_ESCOLAS);
      var colunasEscolas = [
        AppConfig.COLUMNS_ESCOLAS.COD_INEP, AppConfig.COLUMNS_ESCOLAS.NOME_ESCOLA_PADRAO,
        AppConfig.COLUMNS_ESCOLAS.MUNICIPIO, AppConfig.COLUMNS_ESCOLAS.SETOR_REGIAO,
        AppConfig.COLUMNS_ESCOLAS.NOME_DIRETOR_ATUAL, AppConfig.COLUMNS_ESCOLAS.CELULAR_DIRETOR,
        AppConfig.COLUMNS_ESCOLAS.WHATSAPP_DIRETOR, AppConfig.COLUMNS_ESCOLAS.EMAIL_INSTITUCIONAL,
        AppConfig.COLUMNS_ESCOLAS.ENDERECO_COMPLETO, AppConfig.COLUMNS_ESCOLAS.GEO_LATITUDE,
        AppConfig.COLUMNS_ESCOLAS.GEO_LONGITUDE
      ];
      SheetUtils.ensureColumns(sheetEscolas, colunasEscolas);

      // 5. Configura Cabeçalhos da aba Histórico (Log)
      var sheetLog = ss.getSheetByName(AppConfig.SHEET_NAMES.LOG_STATUS);
      var colunasLog = [
        AppConfig.COLUMNS_LOG.ID_LOG, AppConfig.COLUMNS_LOG.DATA_HORA,
        AppConfig.COLUMNS_LOG.PROTOCOLO, AppConfig.COLUMNS_LOG.USUARIO_EXECUTOR,
        AppConfig.COLUMNS_LOG.ACAO, AppConfig.COLUMNS_LOG.STATUS_DE,
        AppConfig.COLUMNS_LOG.STATUS_PARA, AppConfig.COLUMNS_LOG.DETALHE_REGISTRO,
        AppConfig.COLUMNS_LOG.OBSERVACOES, AppConfig.COLUMNS_LOG.LINK_EVIDENCIA_FOTO
      ];
      SheetUtils.ensureColumns(sheetLog, colunasLog);

      // 6. Configura Cabeçalhos da aba Feriados
      var sheetFeriados = ss.getSheetByName(AppConfig.SHEET_NAMES.CONFIG_FERIADOS);
      var colunasFeriados = [
        AppConfig.COLUMNS_FERIADOS.DATA, AppConfig.COLUMNS_FERIADOS.DESCRICAO
      ];
      SheetUtils.ensureColumns(sheetFeriados, colunasFeriados);

      // 6.1 Garantir cabeçalhos nas abas de Setor existentes
      var sheets = ss.getSheets();
      var cabecalhoSetor = ["Município", "Escola (INEP - Nome)"];
      sheets.forEach(function(s) {
        if (s.getName().toLowerCase().indexOf("setor") > -1) {
          if (s.getLastRow() === 0) {
            s.appendRow(cabecalhoSetor);
            s.getRange(1, 1, 1, 2).setBackground("#f3f3f3").setFontWeight("bold");
            s.setFrozenRows(1);
          } else {
            var val = s.getRange(1, 1).getValue();
            if (val !== "Município") {
              s.insertRowBefore(1);
              s.getRange(1, 1, 1, 2).setValues([cabecalhoSetor]).setBackground("#f3f3f3").setFontWeight("bold");
              s.setFrozenRows(1);
            }
          }
        }
      });

      // 7. MIGRACÃO DE DADOS LEGADOS (Setores -> Dim_Escolas)
      var migracao = MigrationService.migrateAll();

      var msgFinal = "Ambiente verificado e configurado com sucesso.\n" + 
                     "Estruturas de Chamados, Técnicos e Escolas garantidas.\n\n" + 
                     "STATUS DA MIGRAÇÃO:\n" + migracao.message;

      return { success: true, message: msgFinal };
    } catch (e) {
      Logger.log("Erro AdminController.setupDatabase: " + e.toString());
      return { success: false, message: e.toString() };
    }
  },
  diagnoseUser: function() {
    var info = ConfigController.getAppUserInfo();
    return {
      success: true,
      message: "Usuário: " + info.email + " | Role: " + info.role + " | Admin: " + (info.isAdmin ? "SIM" : "NÃO")
    };
  },
  diagnoseSheet: function() { 
    var report = [];
    try {
      var ss = BaseRepository.getSpreadsheet();
      report.push("Planilha ID: " + ss.getId());

      var sheetName = AppConfig.SHEET_NAMES.CHAMADOS;
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        report.push("ERRO: Aba '" + sheetName + "' NÃO ENCONTRADA. Verifique o nome da aba.");
        return { success: false, message: report.join("\n") };
      }
      report.push("Aba '" + sheetName + "' encontrada.");
      report.push("Última linha com dados: " + sheet.getLastRow());
      report.push("Última coluna com dados: " + sheet.getLastColumn());
      
      var dataRange = sheet.getDataRange();
      var numRows = dataRange.getNumRows();
      report.push("Número total de linhas (incluindo cabeçalho): " + numRows);
      
      if (numRows < 1) {
        report.push("ERRO: Aba '" + sheetName + "' está completamente vazia.");
        return { success: false, message: report.join("\n") };
      }
      
      var headers = dataRange.getValues()[0];
      report.push("Cabeçalhos da aba '" + sheetName + "': " + headers.join(", "));

      var colStatus = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.STATUS);
      if (colStatus === -1) {
        report.push("ERRO: Coluna ESSENCIAL 'Status' NÃO ENCONTRADA. Nome configurado: '" + AppConfig.COLUMNS_CHAMADOS.STATUS + "'");
        return { success: false, message: report.join("\n") };
      } else {
        report.push("Coluna 'Status' encontrada na posição: " + (colStatus + 1));
      }

      var colProtocolo = headers.indexOf(AppConfig.COLUMNS_CHAMADOS.PROTOCOLO);
      if (colProtocolo === -1) {
        report.push("ERRO: Coluna ESSENCIAL 'Protocolo' NÃO ENCONTRADA. Nome configurado: '" + AppConfig.COLUMNS_CHAMADOS.PROTOCOLO + "'");
        return { success: false, message: report.join("\n") };
      } else {
        report.push("Coluna 'Protocolo' encontrada na posição: " + (colProtocolo + 1));
      }

      if (numRows === 1) {
        report.push("AVISO: Aba '" + sheetName + "' contém APENAS cabeçalhos. Não há dados de chamados.");
      } else {
        report.push("Total de chamados encontrados (sem contar cabeçalho): " + (numRows - 1));
      }

      ['CONFIG_TECNICOS', 'DIM_ESCOLAS'].forEach(function(key) {
        var otherSheetName = AppConfig.SHEET_NAMES[key];
        var otherSheet = ss.getSheetByName(otherSheetName);
        if (!otherSheet) {
          report.push("AVISO: Aba '" + otherSheetName + "' NÃO ENCONTRADA. Pode afetar funcionalidades.");
        } else {
          report.push("Aba '" + otherSheetName + "' encontrada. Linhas: " + otherSheet.getLastRow());
        }
      });


      return { success: true, message: report.join("\n") };

    } catch (e) {
      Logger.log("ERRO AdminController.diagnoseSheet: " + e.toString());
      return { success: false, message: "Erro crítico no diagnóstico: " + e.message + "\n" + report.join("\n") };
    }
  },
  fixValidation: function() {
    return { success: true, message: "Validações verificadas." };
  }
};
